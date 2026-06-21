#!/usr/bin/env python3
"""
Enrich squads.json with a Wikipedia article URL per player (socials.wikipedia).

Uses the Wikidata *entity* API (wbsearchentities + wbgetentities) — NOT the
Query Service (WDQS), which is frequently rate-limited/outaged. Each candidate is
disambiguated by:
  - occupation (P106) ∈ {association football player, footballer}, AND
  - date of birth (P569) matching the player's dateOfBirth in squads.json.

squads.json stores a full dateOfBirth for every player, so the DOB match makes
this reliable even for common names. Prefers the Portuguese article, falling back
to English. Only fills players missing socials.wikipedia; never overwrites. Safe
to re-run.

Usage:
    python3 scripts/enrich-squads-wikipedia.py [--dry-run] [--limit N]
"""

import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

SQUADS_PATH = Path(__file__).parent.parent / "src" / "data" / "squads.json"
WD_API = "https://www.wikidata.org/w/api.php"
USER_AGENT = "agora-na-copa-squad-enrichment/1.0 (https://github.com/mpbarbosa/agora_na_copa_2026)"
DELAY_S = 0.25  # polite pause between players

# Wikidata occupation QIDs that mark a person as a footballer.
FOOTBALLER_QIDS = {"Q937857", "Q628099"}  # association football player, footballer
# Sitelink preference: Portuguese first (pt-BR app), then English.
WIKI_PREFERENCE = ("ptwiki", "enwiki")


def api(params: dict) -> dict:
    url = WD_API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def search_candidates(name: str, language: str) -> list[str]:
    data = api({
        "action": "wbsearchentities", "search": name, "language": language,
        "uselang": language, "format": "json", "limit": "7", "type": "item",
    })
    return [hit["id"] for hit in data.get("search", [])]


def resolve_article(name: str, dob: str) -> str | None:
    """Return the best Wikipedia URL for `name` whose Wikidata item is a
    footballer born on `dob` (YYYY-MM-DD)."""
    seen: set[str] = set()
    for language in ("en", "pt"):
        qids = [q for q in search_candidates(name, language) if q not in seen]
        seen.update(qids)
        if not qids:
            continue
        entities = api({
            "action": "wbgetentities", "ids": "|".join(qids),
            "props": "claims|sitelinks/urls", "format": "json",
        }).get("entities", {})

        for qid in qids:  # preserve search-rank order
            entity = entities.get(qid, {})
            claims = entity.get("claims", {})
            occupations = {
                c["mainsnak"].get("datavalue", {}).get("value", {}).get("id")
                for c in claims.get("P106", [])
            }
            if not (occupations & FOOTBALLER_QIDS):
                continue
            dobs = [
                c["mainsnak"].get("datavalue", {}).get("value", {}).get("time", "")
                for c in claims.get("P569", [])
            ]
            if not any(d.lstrip("+").startswith(dob) for d in dobs):
                continue
            sitelinks = entity.get("sitelinks", {})
            for wiki in WIKI_PREFERENCE:
                if wiki in sitelinks:
                    return sitelinks[wiki]["url"]
            return None  # right person, but no pt/en article
    return None


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])

    with open(SQUADS_PATH, encoding="utf-8") as f:
        squads: dict[str, dict] = json.load(f)

    todo = [
        (fid, p) for fid, p in squads.items()
        if not (p.get("socials") or {}).get("wikipedia") and p.get("dateOfBirth")
    ]
    if limit:
        todo = todo[:limit]

    print(f"Total players          : {len(squads)}")
    print(f"Needing a Wikipedia URL: {len(todo)}")
    if dry_run:
        print("Dry-run: squads.json will NOT be written.")
    print()

    filled = 0
    not_found = 0
    for i, (fid, player) in enumerate(todo, 1):
        name = player.get("fullName") or player.get("name") or ""
        dob = player["dateOfBirth"]
        try:
            url = resolve_article(name, dob)
        except Exception as exc:
            print(f"[{i}/{len(todo)}] {name}: ERROR {exc}", file=sys.stderr)
            time.sleep(DELAY_S)
            continue

        if url:
            player.setdefault("socials", {})["wikipedia"] = url
            filled += 1
            tag = "pt" if "pt.wikipedia" in url else "en"
            print(f"[{i}/{len(todo)}] {name} -> ({tag}) {url}")
        else:
            not_found += 1
            print(f"[{i}/{len(todo)}] {name} -> (no match)")

        time.sleep(DELAY_S)

    print()
    print(f"Wikipedia URLs filled : {filled}")
    print(f"No confident match    : {not_found}")

    if not dry_run and filled:
        with open(SQUADS_PATH, "w", encoding="utf-8") as f:
            json.dump(squads, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print("\nsquads.json updated.")
    elif dry_run:
        print("\nDry run complete — squads.json unchanged.")


if __name__ == "__main__":
    main()

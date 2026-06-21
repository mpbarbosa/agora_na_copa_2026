#!/usr/bin/env python3
"""
Enrich squads.json with the player's current club from Wikidata.

The FIFA player API exposes no club field and Wikidata's FIFA-ID property
(P2071) does not use FIFA's digital-hub IDs, so this script matches by the
player's `fullName` instead. To stay safe it only fills a club when:

  * exactly one Wikidata human who is an association football player
    (P106 = Q937857) carries that exact English/multilingual label, and
  * that person has an unambiguous current club — a P54 (member of sports
    team) statement pointing at an association football club (P31/P279* of
    Q476028) with no end date (P582); ties are broken by the latest start
    date (P580).

It never overwrites an existing club and skips ambiguous matches. Safe to run
repeatedly. Review with --dry-run before applying.

Usage:
    python3 scripts/enrich-squads-club-wikidata.py [--dry-run]
"""

import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

SQUADS_PATH = Path(__file__).parent.parent / "src" / "data" / "squads.json"
SPARQL_URL = "https://query.wikidata.org/sparql"
DELAY_S = 1.2
USER_AGENT = "agora-na-copa-squad-enrichment/1.0 (https://github.com/mpbarbosa/agora_na_copa_2026)"

# A player is "association football player"; a club is an "association football club".
FOOTBALLER_QID = "wd:Q937857"
CLUB_QID = "wd:Q476028"

QUERY = """SELECT ?p ?clubLabel ?countryLabel ?end ?start WHERE {{
  ?p rdfs:label|skos:altLabel "{name}"@en .
  ?p wdt:P106 {footballer} .
  OPTIONAL {{ ?p wdt:P27 ?country . }}
  ?p p:P54 ?st . ?st ps:P54 ?club .
  ?club wdt:P31/wdt:P279* {club} .
  OPTIONAL {{ ?st pq:P582 ?end . }}
  OPTIONAL {{ ?st pq:P580 ?start . }}
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
}}"""


def sparql(name: str) -> list[dict]:
    query = QUERY.format(name=name.replace('"', ""), footballer=FOOTBALLER_QID, club=CLUB_QID)
    url = SPARQL_URL + "?" + urllib.parse.urlencode({"query": query, "format": "json"})
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=40) as resp:
        return json.loads(resp.read())["results"]["bindings"]


def pick_club(rows: list[dict]) -> tuple[str | None, str | None, str]:
    """Return (club, country, reason). club is None when ambiguous/none."""
    people = {r["p"]["value"] for r in rows}
    if len(people) == 0:
        return None, None, "no match"
    if len(people) > 1:
        return None, None, f"ambiguous ({len(people)} people)"

    country = next((r["countryLabel"]["value"] for r in rows if "countryLabel" in r), None)
    current = [r for r in rows if "end" not in r]
    pool = current if current else rows
    # Latest start date wins; statements without a start sort last.
    pool.sort(key=lambda r: r.get("start", {}).get("value", ""), reverse=True)
    clubs_current = {r["clubLabel"]["value"] for r in current}
    if len(clubs_current) > 1:
        # More than one open-ended club — pick latest-started but flag it.
        return pool[0]["clubLabel"]["value"], country, f"multi-current {sorted(clubs_current)}"
    return pool[0]["clubLabel"]["value"], country, "ok" if current else "no-current (latest former)"


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    with open(SQUADS_PATH, encoding="utf-8") as f:
        squads: dict[str, dict] = json.load(f)

    targets = [
        (fid, p) for fid, p in squads.items()
        if (not p.get("club") or not p.get("club").strip()) and p.get("fullName", "").strip()
    ]
    print(f"Players with empty club + fullName: {len(targets)}")
    if dry_run:
        print("Dry-run: squads.json will NOT be written.\n")

    filled = 0
    skipped = 0
    for i, (fid, p) in enumerate(targets, 1):
        name = p["fullName"].strip()
        try:
            rows = sparql(name)
            club, country, reason = pick_club(rows)
        except Exception as e:
            club, country, reason = None, None, f"ERROR {e!r}"

        tag = f"[{p['teamCode']}]"
        if club and reason in ("ok",):
            print(f"[{i}/{len(targets)}] {tag:6} {name:28} -> {club}  ({country})")
            if not dry_run:
                p["club"] = club
            filled += 1
        else:
            print(f"[{i}/{len(targets)}] {tag:6} {name:28} -- SKIP: {reason}"
                  + (f" [{club} / {country}]" if club else ""))
            skipped += 1
        time.sleep(DELAY_S)

    print(f"\nFilled: {filled}   Skipped: {skipped}")
    if not dry_run and filled:
        with open(SQUADS_PATH, "w", encoding="utf-8") as f:
            json.dump(squads, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print("squads.json updated.")
    elif not dry_run:
        print("No confident matches — squads.json unchanged.")


if __name__ == "__main__":
    main()

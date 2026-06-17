#!/usr/bin/env python3
"""
Enrich squads.json with dateOfBirth and height from Wikidata.

Uses FIFA player ID (Wikidata property P2071) to look players up — no
name-matching required. Only fills in missing fields; never overwrites
existing values. Safe to run multiple times.

Usage:
    python3 scripts/enrich-squads-wikidata.py [--dry-run]
"""

import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

SQUADS_PATH = Path(__file__).parent.parent / "src" / "data" / "squads.json"
SPARQL_URL = "https://query.wikidata.org/sparql"
BATCH_SIZE = 50       # players per SPARQL request (stay well under URI limits)
DELAY_S = 1.2         # seconds between batches (Wikidata rate limit: 1 req/s)
USER_AGENT = "agora-na-copa-squad-enrichment/1.0 (https://github.com/mpbarbosa/agora_na_copa_2026)"

# Wikidata unit entity IDs for height
UNIT_METRE = "http://www.wikidata.org/entity/Q11573"
UNIT_CENTIMETRE = "http://www.wikidata.org/entity/Q174728"


def sparql_query(query: str) -> list[dict]:
    url = f"{SPARQL_URL}?query={urllib.parse.quote(query)}&format=json"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/sparql-results+json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
    return data["results"]["bindings"]


def fetch_wikidata_batch(fifa_ids: list[str]) -> dict[str, dict]:
    """
    Returns a dict keyed by FIFA ID with any of: dateOfBirth (str), height (int cm).
    """
    values = " ".join(f'"{fid}"' for fid in fifa_ids)
    query = f"""
SELECT ?fifaId ?dob ?height ?heightUnit WHERE {{
  VALUES ?fifaId {{ {values} }}
  ?player wdt:P2071 ?fifaId .
  OPTIONAL {{ ?player wdt:P569 ?dob }}
  OPTIONAL {{
    ?player p:P2048/psv:P2048 ?hv .
    ?hv wikibase:quantityAmount ?height .
    ?hv wikibase:quantityUnit ?heightUnit .
  }}
}}
"""
    bindings = sparql_query(query)
    results: dict[str, dict] = {}

    for b in bindings:
        fid = b["fifaId"]["value"]
        entry = results.setdefault(fid, {})

        if "dob" in b and "dateOfBirth" not in entry:
            raw = b["dob"]["value"]          # e.g. "+1993-07-28T00:00:00Z"
            date_part = raw.lstrip("+").split("T")[0]   # "1993-07-28"
            if len(date_part) == 10:         # sanity: must be full YYYY-MM-DD
                entry["dateOfBirth"] = date_part

        if "height" in b and "height" not in entry:
            raw_val = float(b["height"]["value"])
            unit = b.get("heightUnit", {}).get("value", "")
            if unit == UNIT_METRE:
                cm = round(raw_val * 100)
            elif unit == UNIT_CENTIMETRE:
                cm = round(raw_val)
            else:
                # No unit info: heuristic — metres if < 3, cm if >= 100
                cm = round(raw_val * 100) if raw_val < 3 else round(raw_val)
            if 150 <= cm <= 220:             # sanity: reasonable player height
                entry["height"] = cm

    return results


def main() -> None:
    dry_run = "--dry-run" in sys.argv

    with open(SQUADS_PATH, encoding="utf-8") as f:
        squads: dict[str, dict] = json.load(f)

    # Only process players that are missing at least one enrichable field
    to_enrich = {
        fid: player
        for fid, player in squads.items()
        if not player.get("dateOfBirth") or not player.get("height")
    }

    print(f"Total players in squads.json : {len(squads)}")
    print(f"Players needing enrichment   : {len(to_enrich)}")
    if dry_run:
        print("Dry-run mode: squads.json will NOT be written.")
    print()

    fifa_ids = list(to_enrich.keys())
    updated_dob = 0
    updated_height = 0
    not_found = 0

    for batch_start in range(0, len(fifa_ids), BATCH_SIZE):
        batch = fifa_ids[batch_start : batch_start + BATCH_SIZE]
        batch_num = batch_start // BATCH_SIZE + 1
        total_batches = (len(fifa_ids) + BATCH_SIZE - 1) // BATCH_SIZE
        print(f"Batch {batch_num}/{total_batches} ({len(batch)} players)...", end=" ", flush=True)

        try:
            results = fetch_wikidata_batch(batch)
        except Exception as exc:
            print(f"ERROR: {exc}", file=sys.stderr)
            if batch_start + BATCH_SIZE < len(fifa_ids):
                time.sleep(DELAY_S)
            continue

        batch_hits = 0
        for fid in batch:
            enrichment = results.get(fid, {})
            if not enrichment:
                not_found += 1
                continue
            player = squads[fid]
            if "dateOfBirth" in enrichment and not player.get("dateOfBirth"):
                player["dateOfBirth"] = enrichment["dateOfBirth"]
                updated_dob += 1
                batch_hits += 1
            if "height" in enrichment and not player.get("height"):
                player["height"] = enrichment["height"]
                updated_height += 1
                batch_hits += 1

        print(f"{batch_hits} field(s) added")

        if batch_start + BATCH_SIZE < len(fifa_ids):
            time.sleep(DELAY_S)

    print()
    print(f"dateOfBirth filled : {updated_dob}")
    print(f"height filled      : {updated_height}")
    print(f"Not found on Wikidata: {not_found}")

    if not dry_run:
        with open(SQUADS_PATH, "w", encoding="utf-8") as f:
            json.dump(squads, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print()
        print("squads.json updated.")
    else:
        print()
        print("Dry run complete — squads.json unchanged.")


if __name__ == "__main__":
    main()

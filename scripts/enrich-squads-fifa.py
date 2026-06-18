#!/usr/bin/env python3
"""
Enrich squads.json with dateOfBirth and height from the FIFA player API.

Uses the FIFA player ID (already stored in squads.json) to fetch bio data
directly from https://api.fifa.com/api/v3/players/{id}. Only fills in
missing fields; never overwrites existing values. Safe to run multiple times.

Usage:
    python3 scripts/enrich-squads-fifa.py [--dry-run]
"""

import json
import sys
import time
import urllib.request
from pathlib import Path

SQUADS_PATH = Path(__file__).parent.parent / "src" / "data" / "squads.json"
FIFA_API_BASE = "https://api.fifa.com/api/v3"
DELAY_S = 0.15        # seconds between requests (~6 req/s — stays polite)
USER_AGENT = "agora-na-copa-squad-enrichment/1.0 (https://github.com/mpbarbosa/agora_na_copa_2026)"


def fetch_player(fifa_id: str) -> dict | None:
    url = f"{FIFA_API_BASE}/players/{fifa_id}?language=pt"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception:
        return None


def parse_birth_date(raw: str | None) -> str | None:
    if not raw:
        return None
    date_part = raw.rstrip("Z").split("T")[0]
    if len(date_part) == 10:
        return date_part
    return None


def parse_height(raw: float | None) -> int | None:
    if raw is None:
        return None
    cm = round(raw)
    if 150 <= cm <= 220:
        return cm
    return None


def main() -> None:
    dry_run = "--dry-run" in sys.argv

    with open(SQUADS_PATH, encoding="utf-8") as f:
        squads: dict[str, dict] = json.load(f)

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

    updated_dob = 0
    updated_height = 0
    not_found = 0
    errors = 0

    for i, (fid, player) in enumerate(to_enrich.items(), 1):
        name = player.get("fullName") or player.get("name", fid)
        print(f"[{i}/{len(to_enrich)}] {name} ({fid})...", end=" ", flush=True)

        data = fetch_player(fid)
        if data is None:
            print("ERROR")
            errors += 1
            time.sleep(DELAY_S)
            continue

        dob = parse_birth_date(data.get("BirthDate"))
        height = parse_height(data.get("Height"))

        added = []
        if dob and not player.get("dateOfBirth"):
            player["dateOfBirth"] = dob
            updated_dob += 1
            added.append(f"dob={dob}")
        if height and not player.get("height"):
            player["height"] = height
            updated_height += 1
            added.append(f"h={height}cm")

        if added:
            print(", ".join(added))
        elif dob is None and height is None:
            print("not found")
            not_found += 1
        else:
            print("already complete")

        time.sleep(DELAY_S)

    print()
    print(f"dateOfBirth filled : {updated_dob}")
    print(f"height filled      : {updated_height}")
    print(f"Not found on FIFA  : {not_found}")
    print(f"Errors             : {errors}")

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

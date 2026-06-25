#!/usr/bin/env python3
"""
Build src/data/knockoutBracket.json from the official FIFA calendar API.

The app's knockout bracket was hand-invented and WRONG (e.g. it paired Brazil with
Norway; FIFA's official bracket is 1C vs 2F). This pulls the authoritative structure
straight from FIFA: every knockout match (#73-104) with its official slot labels
(PlaceHolderA/B like "1C", "2F", "3CEFHI", "W74"), date (UTC), and venue. Any team
already clinched (Home/Away populated) is captured as a 3-letter code too.

Slot label grammar:
  1X / 2X  -> winner / runner-up of group X
  3XYZ...  -> a best-third from one of those groups (FIFA allocation table)
  W##      -> winner of match ##

Usage:
    python3 scripts/build-knockout-bracket.py            # write the JSON
    python3 scripts/build-knockout-bracket.py --dry-run  # print to stdout
"""

import json
import os
import sys
import urllib.request

API_URL = (
    "https://api.fifa.com/api/v3/calendar/matches"
    "?language=en&idCompetition=17&idSeason=285023&count=400"
)
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "src", "data", "knockoutBracket.json")

STAGE_ID = {  # FIFA StageName.Description -> our short stage code
    "Round of 32": "R32",
    "Round of 16": "R16",
    "Quarter-final": "QF",
    "Semi-final": "SF",
    "Play-off for third place": "TP",
    "Final": "F",
}


def desc(node) -> str:
    return node[0].get("Description", "") if isinstance(node, list) and node else ""


def team_of(side) -> dict | None:
    if not side:
        return None
    code = side.get("Abbreviation") or side.get("IdCountry")
    name = desc(side.get("TeamName")) or side.get("ShortClubName")
    if not name:
        return None
    return {"code": code, "name": name}


def main() -> None:
    dry_run = "--dry-run" in sys.argv[1:]
    req = urllib.request.Request(API_URL, headers={"User-Agent": "agora/1.0", "Accept": "application/json"})
    results = json.loads(urllib.request.urlopen(req, timeout=30).read()).get("Results", [])

    matches = []
    for m in results:
        stage = STAGE_ID.get(desc(m.get("StageName")))
        if not stage:  # skip the group stage
            continue
        stadium = m.get("Stadium") or {}
        matches.append(
            {
                "matchNumber": m.get("MatchNumber"),
                "stage": stage,
                "dateUtc": m.get("Date"),
                "stadium": desc(stadium.get("Name")),
                "city": desc(stadium.get("CityName")),
                "slotA": m.get("PlaceHolderA"),
                "slotB": m.get("PlaceHolderB"),
                "teamA": team_of(m.get("Home")),
                "teamB": team_of(m.get("Away")),
            }
        )

    matches.sort(key=lambda x: x["matchNumber"] or 0)
    payload = json.dumps({"matches": matches}, indent=2, ensure_ascii=False) + "\n"

    if dry_run:
        sys.stdout.write(payload)
        return

    with open(os.path.normpath(OUT_PATH), "w", encoding="utf-8") as fh:
        fh.write(payload)
    clinched = sum(1 for x in matches if x["teamA"] or x["teamB"])
    print(f"Wrote {len(matches)} knockout matches ({clinched} with a clinched team) to {os.path.normpath(OUT_PATH)}")


if __name__ == "__main__":
    main()

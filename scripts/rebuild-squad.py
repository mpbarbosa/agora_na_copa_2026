#!/usr/bin/env python3
"""
rebuild-squad.py  <TEAM_CODE> <MATCH_ID>

Fetches the FIFA live/finished match endpoint for MATCH_ID, extracts the squad
for TEAM_CODE (auto-detects home/away), and rebuilds that team's entries in
src/data/squads.json with real FIFA IDs and picture URLs.

Clubs are carried over from the existing squads.json entry where the shirt
number matches; left blank for new players that have no prior entry.

Usage:
    python3 scripts/rebuild-squad.py POR 400021502
    python3 scripts/rebuild-squad.py BRA 400021456
"""

import json
import sys
import urllib.request
import collections
import os

SQUADS_PATH = os.path.join(os.path.dirname(__file__), "..", "src", "data", "squads.json")

POS_MAP = {0: "GK", 1: "DF", 2: "MF", 3: "FW"}

def fetch(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "agora-na-copa-2026/rebuild-squad"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.load(r)

def get_display_name(player: dict) -> str:
    short = " ".join(n.get("Description", "") for n in (player.get("ShortName") or [])).title()
    full  = " ".join(n.get("Description", "") for n in (player.get("PlayerName") or [])).title()
    return short if short else full

def get_full_name(player: dict) -> str:
    return " ".join(n.get("Description", "") for n in (player.get("PlayerName") or [])).title()

def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    team_code = sys.argv[1].upper()
    match_id  = sys.argv[2]

    print(f"Fetching match {match_id} from FIFA live API…")
    url  = f"https://api.fifa.com/api/v3/live/football/{match_id}?language=en"
    data = fetch(url)

    home_country = (data.get("HomeTeam") or {}).get("IdCountry", "")
    away_country = (data.get("AwayTeam") or {}).get("IdCountry", "")
    print(f"  Match: {home_country} vs {away_country}  Status={data.get('MatchStatus')}  Time={data.get('MatchTime')}")

    if team_code == home_country:
        side = "HomeTeam"
    elif team_code == away_country:
        side = "AwayTeam"
    else:
        print(f"ERROR: {team_code} not found in this match ({home_country} vs {away_country})")
        sys.exit(1)

    players = (data.get(side) or {}).get("Players") or []
    if not players:
        print(f"ERROR: No players found for {side} in match {match_id}")
        sys.exit(1)

    print(f"  Found {len(players)} players for {team_code} ({side})")

    # Load existing squads to carry over club data by shirt number
    with open(SQUADS_PATH) as f:
        squads = json.load(f, object_pairs_hook=collections.OrderedDict)

    old_entries = {k: v for k, v in squads.items() if v.get("teamCode") == team_code}
    club_by_shirt = {v["number"]: v.get("club", "") for v in old_entries.values()}
    socials_by_shirt = {v["number"]: v["socials"] for v in old_entries.values() if v.get("socials")}

    # Remove old entries
    for k in list(old_entries.keys()):
        del squads[k]
    print(f"  Removed {len(old_entries)} old {team_code} entries")

    # Build new entries
    added = 0
    no_pic = []
    for p in sorted(players, key=lambda x: x.get("ShirtNumber", 99)):
        fid    = p.get("IdPlayer", "")
        shirt  = p.get("ShirtNumber", 0)
        pos    = POS_MAP.get(p.get("Position", 0), "MF")
        name   = get_display_name(p)
        full   = get_full_name(p)
        pic    = (p.get("PlayerPicture") or {}).get("PictureUrl", "")

        if not fid:
            print(f"  WARNING: No IdPlayer for #{shirt} {name}, skipping")
            continue

        entry = collections.OrderedDict([
            ("fifaId",     fid),
            ("teamCode",   team_code),
            ("name",       name),
            ("fullName",   full),
            ("number",     shirt),
            ("position",   pos),
            ("club",       club_by_shirt.get(shirt, "")),
            ("pictureUrl", pic),
        ])
        if shirt in socials_by_shirt:
            entry["socials"] = socials_by_shirt[shirt]

        squads[fid] = entry
        added += 1
        if not pic:
            no_pic.append(f"#{shirt} {name}")

    with open(SQUADS_PATH, "w") as f:
        json.dump(squads, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"  Added {added} new {team_code} entries")
    if no_pic:
        print(f"  No picture URL for: {', '.join(no_pic)}")

    # Quick verification
    with open(SQUADS_PATH) as f:
        verify = json.load(f)
    new_entries = {k: v for k, v in verify.items() if v.get("teamCode") == team_code}
    shirts = sorted(v["number"] for v in new_entries.values())
    print(f"  Shirts: {shirts}")
    print(f"Done. {team_code}: {len(new_entries)} players in squads.json")

if __name__ == "__main__":
    main()

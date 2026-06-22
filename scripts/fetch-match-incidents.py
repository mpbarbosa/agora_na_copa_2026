#!/usr/bin/env python3
"""
Fetch a match's incidents (goals, cards, substitutions) from the live production API.

WHY THIS EXISTS: the production API returns large JSON payloads. Reading them through
a summarizing tool (e.g. an LLM "fetch + summarize") silently truncates large arrays
and can falsely report data as missing — `/api/match-overlays` carries all ~72 matches,
but a summarizer only surfaces the first handful. Always read these endpoints as RAW
JSON. This script does exactly that and parses the result deterministically.

Usage:
    python3 scripts/fetch-match-incidents.py <match-id>     # e.g. tur-par-2026
    python3 scripts/fetch-match-incidents.py --list         # list every match id + score
    python3 scripts/fetch-match-incidents.py <match-id> --json   # raw incidents as JSON

Match ids follow "<teamA>-<teamB>-2026" (lowercase codes), e.g. ned-swe-2026.
"""

import json
import sys
import urllib.request

API_URL = "https://copa2026.mpbarbosa.com/api/match-overlays"
USER_AGENT = "agora-na-copa-incidents/1.0 (https://github.com/mpbarbosa/agora_na_copa_2026)"


def fetch_overlays() -> dict:
    req = urllib.request.Request(API_URL, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def team_label(overlay: dict, side: str) -> str:
    # matchState may expose team codes; fall back to A/B.
    state = overlay.get("matchState") or {}
    teams = state.get("teams") or {}
    code = (teams.get(side) or {}).get("code")
    return code or side


def main() -> None:
    args = [a for a in sys.argv[1:]]
    if not args or "--help" in args or "-h" in args:
        print(__doc__)
        sys.exit(0 if args else 1)

    as_json = "--json" in args
    args = [a for a in args if a != "--json"]

    overlays = fetch_overlays().get("overlays", {})

    if "--list" in args:
        print(f"{len(overlays)} matches:")
        for mid, ov in overlays.items():
            state = ov.get("matchState") or {}
            score = state.get("score") or {}
            sc = f"{score.get('teamA', '-')}x{score.get('teamB', '-')}" if score else "-"
            print(f"  {mid:18} {state.get('status', '?'):9} {sc}")
        return

    match_id = args[0]
    overlay = overlays.get(match_id)
    if not overlay:
        print(f"Match '{match_id}' not found. Use --list to see all ids.", file=sys.stderr)
        sys.exit(1)

    state = overlay.get("matchState") or {}
    incidents = state.get("incidents") or []

    if as_json:
        print(json.dumps(incidents, ensure_ascii=False, indent=2))
        return

    score = state.get("score") or {}
    sc = f"{score.get('teamA', '-')} x {score.get('teamB', '-')}" if score else "-"
    print(f"{match_id} | {state.get('status', '?')} | {sc}")
    print(f"{len(incidents)} incident(s):")
    for inc in incidents:
        mentions = inc.get("playerMentions") or []
        who = mentions[0].get("name") if mentions else None
        text = inc.get("text") or who or ""
        print(f"  {str(inc.get('time', '--')):>7}  {inc.get('type', ''):14} {inc.get('team', ''):2}  {text}")


if __name__ == "__main__":
    main()

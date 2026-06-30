#!/usr/bin/env python3
"""
Build src/data/goalTimeline.json from the live production API.

The static `Match` model carries no goal-timing data — incidents only exist live, via
`/api/match-overlays`. This script reads those incidents (the same RAW-JSON path as
fetch-match-incidents.py — never a summarizing fetch, which truncates large arrays) and
extracts, per FINISHED match, the elapsed minute of every goal. It powers the Dashboard's
"goals by minute" scatter plot (x = minute, y = number of goals at that minute).

Minute parsing (elapsed clock, so a goal's literal timestamp):
    "7'"     -> 7
    "45'+5'" -> 50   (base 45 + 5 of first-half stoppage)
    "90'+2'" -> 92
Every incident with type == "GOAL" counts (own goals and penalties are all "GOAL" in the
feed and all change the score), so the per-match goal count reconciles with the scoreline.
Goals are split by the side they are credited to (`incident.team` "A"/"B", which aligns
with the side the score increments), so the Dashboard can filter the plot by national team.
The side → team code mapping is resolved in TypeScript from APP_MATCHES (which knows each
match's teamA/teamB, group and knockout alike), so this file stays minimal — just the sides.

Output shape (keyed by match id, value = goal minutes split by side, each sorted):
    {
      "usa-par-2026": { "teamA": [7, 50], "teamB": [31, 73] },
      ...
    }

Only FINISHED matches with at least one goal are written. Re-run to refresh after new
matches finish; do not hand-edit (regenerate instead).

Usage:
    python3 scripts/build-goal-timeline.py            # write src/data/goalTimeline.json
    python3 scripts/build-goal-timeline.py --dry-run  # print to stdout, write nothing
"""

import json
import os
import re
import sys
import urllib.request

API_URL = "https://copa2026.mpbarbosa.com/api/match-overlays"
USER_AGENT = "agora-na-copa-goal-timeline/1.0 (https://github.com/mpbarbosa/agora_na_copa_2026)"
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "src", "data", "goalTimeline.json")

_MINUTE_RE = re.compile(r"(\d+)'(?:\+(\d+)')?")


def fetch_overlays() -> dict:
    req = urllib.request.Request(API_URL, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read()).get("overlays", {})


def parse_minute(time_label: str) -> int | None:
    """'45'+5'' -> 50; '7'' -> 7; unparseable -> None."""
    if not time_label:
        return None
    m = _MINUTE_RE.match(time_label.strip())
    if not m:
        return None
    return int(m.group(1)) + (int(m.group(2)) if m.group(2) else 0)


def goal_minutes_by_side(incidents: list) -> dict:
    """Goal minutes split by the side credited (`incident.team`): {"teamA": [...], "teamB": [...]}."""
    sides: dict = {"teamA": [], "teamB": []}
    for ev in incidents:
        if ev.get("type") != "GOAL":
            continue
        minute = parse_minute(ev.get("time", ""))
        if minute is None:
            continue
        side = ev.get("team")
        if side == "A":
            sides["teamA"].append(minute)
        elif side == "B":
            sides["teamB"].append(minute)
    sides["teamA"].sort()
    sides["teamB"].sort()
    return sides


def main() -> None:
    dry_run = "--dry-run" in sys.argv[1:]
    overlays = fetch_overlays()

    result: dict = {}
    for mid, ov in overlays.items():
        state = ov.get("matchState") or {}
        if state.get("status") != "FINISHED":
            continue
        sides = goal_minutes_by_side(state.get("incidents") or [])
        if sides["teamA"] or sides["teamB"]:
            result[mid] = sides

    # Stable, diff-friendly ordering.
    result = {k: result[k] for k in sorted(result)}
    payload = json.dumps(result, indent=2, ensure_ascii=False) + "\n"

    if dry_run:
        sys.stdout.write(payload)
        return

    with open(os.path.normpath(OUT_PATH), "w", encoding="utf-8") as fh:
        fh.write(payload)
    total = sum(len(v["teamA"]) + len(v["teamB"]) for v in result.values())
    print(f"Wrote {len(result)} matches ({total} goals) to {os.path.normpath(OUT_PATH)}")


if __name__ == "__main__":
    main()

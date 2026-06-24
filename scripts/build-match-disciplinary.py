#!/usr/bin/env python3
"""
Build src/data/matchDisciplinary.json from the live production API.

Fair play (FIFA WC 2026 Regulations, Art. 13.2f) is a group-stage tiebreaker, but
the static `Match` model carries no card data — incidents only exist live, via
`/api/match-overlays`. This script reads those incidents (the same RAW-JSON path as
fetch-match-incidents.py — never a summarizing fetch, which truncates large arrays)
and reduces them to per-team disciplinary OUTCOME COUNTS per match.

It stores COUNTS (not pre-summed points) so the −1/−3/−4/−5 fair-play formula lives in
code (src/disciplinary.ts, unit-tested) and the data stays auditable against real cards.

Output shape (keyed by match id, then by match side):
    {
      "mex-rsa-2026": {
        "teamA": { "yellow": 0, "secondYellow": 0, "directRed": 1, "yellowAndDirectRed": 0 },
        "teamB": { "yellow": 1, "secondYellow": 0, "directRed": 2, "yellowAndDirectRed": 0 }
      }
    }

Side ("teamA"/"teamB") mirrors the incident `team` field ("A"/"B"), which aligns with
the Match's teamA/teamB — so computeStandings can attribute counts without slug guessing.

Only FINISHED matches with at least one card are written (a match absent from the file
contributes 0 fair-play points — identical to today's behaviour). Re-run to refresh.

Card-outcome classification per player (grouped by team side + player name):
  - exactly one yellow, no red      -> yellow            (−1)
  - two yellows, no red             -> secondYellow      (−3)  [the red is implied]
  - red preceded by a yellow        -> secondYellow      (−3)
  - red, no preceding yellow        -> directRed         (−4)
Note: the feed cannot distinguish a true "yellow + separate direct red" (−5) from a
second-yellow (−3); both surface as yellow→red. We classify them as secondYellow. No
such case exists in current data, so this assumption never bites real results today.

Usage:
    python3 scripts/build-match-disciplinary.py            # write src/data/matchDisciplinary.json
    python3 scripts/build-match-disciplinary.py --dry-run  # print to stdout, write nothing
"""

import json
import os
import sys
import urllib.request
from collections import defaultdict

API_URL = "https://copa2026.mpbarbosa.com/api/match-overlays"
USER_AGENT = "agora-na-copa-disciplinary/1.0 (https://github.com/mpbarbosa/agora_na_copa_2026)"
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "src", "data", "matchDisciplinary.json")

EMPTY = {"yellow": 0, "secondYellow": 0, "directRed": 0, "yellowAndDirectRed": 0}


def fetch_overlays() -> dict:
    req = urllib.request.Request(API_URL, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read()).get("overlays", {})


def player_key(event: dict) -> str:
    mentions = event.get("playerMentions") or []
    if mentions and mentions[0].get("name"):
        return mentions[0]["name"]
    return event.get("text", "")  # fall back to the raw text so distinct players stay distinct


def counts_for_match(incidents: list) -> dict:
    """Return {"teamA": {...counts}, "teamB": {...counts}} for one match's incidents."""
    # Group each player's card events by side, preserving feed order (chronological).
    by_player: dict = defaultdict(list)  # (side, player) -> [event_type, ...]
    for ev in incidents:
        kind = ev.get("type")
        if kind not in ("YELLOW_CARD", "RED_CARD"):
            continue
        side = "teamA" if ev.get("team") == "A" else "teamB" if ev.get("team") == "B" else None
        if side is None:
            continue
        by_player[(side, player_key(ev))].append(kind)

    out = {"teamA": dict(EMPTY), "teamB": dict(EMPTY)}
    for (side, _player), kinds in by_player.items():
        yellows = kinds.count("YELLOW_CARD")
        reds = kinds.count("RED_CARD")
        bucket = out[side]
        if reds:
            # red present -> sending-off; second-yellow if any yellow preceded it.
            bucket["secondYellow" if yellows else "directRed"] += 1
        elif yellows >= 2:
            bucket["secondYellow"] += 1  # two cautions = a sending-off even if no red logged
        elif yellows == 1:
            bucket["yellow"] += 1
    return out


def has_any_card(counts: dict) -> bool:
    return any(sum(side.values()) for side in counts.values())


def main() -> None:
    dry_run = "--dry-run" in sys.argv[1:]
    overlays = fetch_overlays()

    result: dict = {}
    for mid, ov in overlays.items():
        state = ov.get("matchState") or {}
        if state.get("status") != "FINISHED":
            continue
        counts = counts_for_match(state.get("incidents") or [])
        if has_any_card(counts):
            result[mid] = counts

    # Stable, diff-friendly ordering.
    result = {k: result[k] for k in sorted(result)}
    payload = json.dumps(result, indent=2, ensure_ascii=False) + "\n"

    if dry_run:
        sys.stdout.write(payload)
        return

    with open(os.path.normpath(OUT_PATH), "w", encoding="utf-8") as fh:
        fh.write(payload)
    cards = sum(
        sum(side.values()) for m in result.values() for side in m.values()
    )
    print(f"Wrote {len(result)} matches ({cards} sending-off/caution outcomes) to {os.path.normpath(OUT_PATH)}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Sync match status and final scores from the FIFA calendar API into matches.json.

Finds every local match whose status or score has drifted from what the FIFA
calendar reports and corrects it in-place.  Only touches `status` and `score`
— never modifies lineups, broadcasters, or any other curated field.

Run this before every deploy so the build always bakes in current results.

Usage:
    python3 scripts/sync-match-results.py [--dry-run] [--verbose]

Exit codes:
    0  Success (including "nothing to update")
    1  FIFA API fetch failed — matches.json left unchanged
"""

import json
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

MATCHES_PATH = Path(__file__).parent.parent / "src" / "matches.json"
FIFA_CALENDAR_URL = "https://api.fifa.com/api/v3/calendar/matches"
COMPETITION_ID = "17"    # FIFA World Cup
SEASON_ID = "285023"     # 2026
USER_AGENT = "agora-na-copa-sync/1.0"

# Matches are paired by team codes + kickoff time within this window.
# Large enough to absorb timezone offset arithmetic, small enough to not
# confuse two matches on the same day between the same teams (impossible in
# group stage; theoretically possible in a hypothetical replayed final).
KICKOFF_TOLERANCE_S = 30 * 60

STATUS_MAP: dict[int, str] = {
    0: "FINISHED",
    1: "PRE_GAME",
    # 3 → LIVE, handled below as the default
}


# ── helpers ───────────────────────────────────────────────────────────────────

def fetch_calendar() -> list[dict]:
    all_matches: list[dict] = []
    page = 0
    while True:
        url = (
            f"{FIFA_CALENDAR_URL}"
            f"?idCompetition={COMPETITION_ID}&idSeason={SEASON_ID}"
            f"&language=en&count=100&page={page}"
        )
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
        results = data.get("Results", [])
        if not results:
            break
        all_matches.extend(results)
        if len(results) < 100:
            break
        page += 1
        time.sleep(0.3)
    return all_matches


def to_utc_ts(iso_str: str) -> float | None:
    if not iso_str:
        return None
    try:
        s = iso_str.rstrip("Z")
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.timestamp()
    except ValueError:
        return None


def find_local(local_matches: list[dict], home: str, away: str, kick_ts: float) -> dict | None:
    codes = {home, away}
    for m in local_matches:
        if {m["teamA"]["code"], m["teamB"]["code"]} != codes:
            continue
        local_ts = to_utc_ts(m.get("kickoffTimestamp", ""))
        if local_ts is not None and abs(local_ts - kick_ts) <= KICKOFF_TOLERANCE_S:
            return m
    return None


# ── main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    dry_run = "--dry-run" in sys.argv
    verbose = "--verbose" in sys.argv

    with open(MATCHES_PATH, encoding="utf-8") as f:
        local_matches: list[dict] = json.load(f)

    if verbose:
        print(f"Loaded {len(local_matches)} local matches")

    try:
        fifa_matches = fetch_calendar()
    except Exception as exc:
        print(f"ERROR: could not fetch FIFA calendar: {exc}", file=sys.stderr)
        sys.exit(1)

    if verbose:
        print(f"Fetched {len(fifa_matches)} FIFA calendar matches")

    changes: list[tuple[str, str, object, object]] = []  # (match_id, field, before, after)

    for fm in fifa_matches:
        home_code = fm.get("Home", {}).get("Abbreviation", "")
        away_code = fm.get("Away", {}).get("Abbreviation", "")
        fifa_date  = fm.get("Date", "")
        fifa_status_raw = fm.get("MatchStatus")

        if not home_code or not away_code or not fifa_date:
            continue

        kick_ts = to_utc_ts(fifa_date)
        if kick_ts is None:
            continue

        local = find_local(local_matches, home_code, away_code, kick_ts)
        if local is None:
            continue

        new_status: str = STATUS_MAP.get(fifa_status_raw, "LIVE")

        # ── status ────────────────────────────────────────────────────────────
        if new_status != local.get("status"):
            changes.append((local["id"], "status", local.get("status"), new_status))
            if not dry_run:
                local["status"] = new_status

        # ── score (only when FIFA has real scores) ────────────────────────────
        score_home = fm.get("Home", {}).get("Score")
        score_away = fm.get("Away", {}).get("Score")
        if score_home is not None and score_away is not None:
            # Map Home/Away to our teamA/teamB
            if local["teamA"]["code"] == home_code:
                new_score = {"teamA": score_home, "teamB": score_away}
            else:
                new_score = {"teamA": score_away, "teamB": score_home}

            if new_score != local.get("score"):
                changes.append((local["id"], "score", local.get("score"), new_score))
                if not dry_run:
                    local["score"] = new_score

    # ── report ────────────────────────────────────────────────────────────────
    if not changes:
        if verbose:
            print("matches.json is already in sync — nothing to update.")
        sys.exit(0)

    col = 28
    print(f"{'match':<{col}} {'field':<8} {'before':<22} after")
    print("─" * 72)
    for match_id, field, before, after in changes:
        print(f"{match_id:<{col}} {field:<8} {str(before):<22} {after}")

    if dry_run:
        print(f"\nDry run — {len(changes)} change(s) detected, matches.json unchanged.")
        sys.exit(0)

    with open(MATCHES_PATH, "w", encoding="utf-8") as f:
        json.dump(local_matches, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"\n{len(changes)} change(s) written to matches.json.")


if __name__ == "__main__":
    main()

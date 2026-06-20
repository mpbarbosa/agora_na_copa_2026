#!/usr/bin/env python3
"""
Sync match status and scores from the production environment to local dev data.

Fetches current match states from copa2026.mpbarbosa.com and applies them to:
  - src/matches.json            (curated matches with lineups)
  - src/data/fifaScheduledMatches.ts  (schedule seeds)

Only touches `status` and `score` — never modifies lineups, broadcasters,
timestamps, venues, or any other curated field.

Usage:
    python3 scripts/sync-from-prod.py [--dry-run] [--verbose]

Exit codes:
    0  Success (including "nothing to update")
    1  Could not reach production API
"""

import json
import re
import sys
import urllib.request
from pathlib import Path

PROD_URL = "https://copa2026.mpbarbosa.com/api/match-states"
MATCHES_PATH = Path(__file__).parent.parent / "src" / "matches.json"
SCHEDULED_PATH = Path(__file__).parent.parent / "src" / "data" / "fifaScheduledMatches.ts"


def fetch_prod_states() -> dict:
    req = urllib.request.Request(PROD_URL, headers={"User-Agent": "sync-from-prod/1.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read())
    return data["states"]  # match_id → {status, score?, incidents?}


# ── matches.json ──────────────────────────────────────────────────────────────

def sync_matches_json(states: dict, dry_run: bool, verbose: bool) -> int:
    with open(MATCHES_PATH, encoding="utf-8") as f:
        matches: list[dict] = json.load(f)

    changes = 0
    for m in matches:
        mid = m["id"]
        if mid not in states:
            continue
        state = states[mid]
        new_status = state["status"]
        new_score = state.get("score")

        updated = False
        if m.get("status") != new_status:
            if verbose:
                print(f"  {mid}: status {m.get('status')!r} → {new_status!r}")
            if not dry_run:
                m["status"] = new_status
            updated = True

        if new_score is not None and m.get("score") != new_score:
            if verbose:
                print(f"  {mid}: score {m.get('score')} → {new_score}")
            if not dry_run:
                m["score"] = new_score
                m["countdownTargetSeconds"] = 0
            updated = True

        if updated:
            changes += 1

    if not dry_run and changes:
        with open(MATCHES_PATH, "w", encoding="utf-8") as f:
            json.dump(matches, f, indent=2, ensure_ascii=False)
            f.write("\n")

    return changes


# ── fifaScheduledMatches.ts ───────────────────────────────────────────────────

# Each seed is a single line like:
#   { teamA: "USA", teamB: "AUS", kickoffTimestamp: "...", status: "PRE_GAME", ...v("USA", "AUS") },
# or with a score already:
#   { teamA: "QAT", teamB: "SUI", ..., status: "FINISHED", score: { teamA: 1, teamB: 1 }, ...v(...) },

_SEED_RE = re.compile(
    r'^(?P<indent>\s*)'
    r'\{ teamA: "(?P<a>[A-Z]+)", teamB: "(?P<b>[A-Z]+)", '
    r'kickoffTimestamp: "(?P<ts>[^"]+)", '
    r'status: "(?P<status>[^"]+)"'
    r'(?:, score: \{ teamA: \d+, teamB: \d+ \})?'
    r'(?P<tail>, \.\.\.v\("[^"]+", "[^"]+"\) \},?)\s*$'
)


def _build_seed_line(indent: str, a: str, b: str, ts: str, status: str,
                     score: dict | None, tail: str) -> str:
    score_part = ""
    if score is not None:
        score_part = f', score: {{ teamA: {score["teamA"]}, teamB: {score["teamB"]} }}'
    return f'{indent}{{ teamA: "{a}", teamB: "{b}", kickoffTimestamp: "{ts}", status: "{status}"{score_part}{tail}'


def sync_scheduled_ts(states: dict, dry_run: bool, verbose: bool) -> int:
    content = SCHEDULED_PATH.read_text(encoding="utf-8")
    lines = content.splitlines(keepends=True)
    changes = 0
    new_lines = []

    for line in lines:
        m = _SEED_RE.match(line.rstrip("\n"))
        if not m:
            new_lines.append(line)
            continue

        team_a = m.group("a")
        team_b = m.group("b")
        mid = f"{team_a.lower()}-{team_b.lower()}-2026"

        if mid not in states:
            new_lines.append(line)
            continue

        state = states[mid]
        new_status = state["status"]
        new_score = state.get("score")

        cur_status = m.group("status")
        # Reconstruct existing score from the regex (not captured; re-derive from line)
        cur_score_m = re.search(r'score: \{ teamA: (\d+), teamB: (\d+) \}', line)
        cur_score = {"teamA": int(cur_score_m.group(1)), "teamB": int(cur_score_m.group(2))} if cur_score_m else None

        status_changed = new_status != cur_status
        score_changed = new_score is not None and new_score != cur_score

        if not status_changed and not score_changed:
            new_lines.append(line)
            continue

        new_line = _build_seed_line(
            indent=m.group("indent"),
            a=team_a, b=team_b,
            ts=m.group("ts"),
            status=new_status,
            score=new_score if new_score is not None else cur_score,
            tail=m.group("tail"),
        ) + "\n"

        if verbose:
            print(f"  {mid}: {line.rstrip()}")
            print(f"       → {new_line.rstrip()}")

        changes += 1
        new_lines.append(new_line if not dry_run else line)

    if not dry_run and changes:
        SCHEDULED_PATH.write_text("".join(new_lines), encoding="utf-8")

    return changes


# ── main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    dry_run = "--dry-run" in sys.argv
    verbose = "--verbose" in sys.argv or dry_run

    print(f"Fetching match states from {PROD_URL} …")
    try:
        states = fetch_prod_states()
    except Exception as exc:
        print(f"ERROR: could not reach production API: {exc}", file=sys.stderr)
        sys.exit(1)

    finished = sum(1 for s in states.values() if s["status"] == "FINISHED")
    live = sum(1 for s in states.values() if s["status"] == "LIVE")
    print(f"  {len(states)} matches — {finished} FINISHED, {live} LIVE\n")

    print("Syncing src/matches.json …")
    n = sync_matches_json(states, dry_run, verbose)
    print(f"  {n} change(s)" + (" (dry run)" if dry_run else ""))

    print("Syncing src/data/fifaScheduledMatches.ts …")
    n2 = sync_scheduled_ts(states, dry_run, verbose)
    print(f"  {n2} change(s)" + (" (dry run)" if dry_run else ""))

    total = n + n2
    if total == 0:
        print("\nAlready in sync — nothing to update.")
    elif dry_run:
        print(f"\nDry run — {total} change(s) detected, no files written.")
    else:
        print(f"\n{total} change(s) written.")


if __name__ == "__main__":
    main()

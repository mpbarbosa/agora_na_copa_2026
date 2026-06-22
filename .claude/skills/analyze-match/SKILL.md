---
name: analyze-match
description: >
  Write an editorial analysis for one World Cup 2026 match and add it to
  src/data/matchAnalysis.json, grounded in the REAL match incidents pulled from
  the production API (never invented). Auto-detects pre-game (a "Prévia") vs
  finished (a "Destaques da partida" recap with actual scorers/cards). Use when
  the user asks to "analyze the X vs Y match", "analyze the <id> match", or wants
  a match preview/post-match write-up.
---

## Overview

Four stages:

1. **Resolve** the match id and its current status from production.
2. **Pull real incidents** (goals, cards, subs — minute + player) via the helper script.
3. **Draft** the analysis in the `## Section` format and write it to `matchAnalysis.json`.
4. **Validate + deploy** via test-bump-deploy.

The analysis renders on the match page under the **"Pré-jogo" tab** (`MatchDetailView`):
the panel title is **"Destaques da partida"** when the match is `FINISHED`, else
**"Prévia da partida"**. So the content must match the status.

---

## Stage 1 — Resolve the match id and status

Match ids are `<teamA>-<teamB>-2026` with lowercase FIFA codes (home team first),
e.g. `bra-hai-2026`, `ned-swe-2026`. The user may give an id, or "X vs Y".

```bash
# List every match with status + score to find/confirm the id.
python3 scripts/fetch-match-incidents.py --list | grep -iE "<teamA>|<teamB>"
```

If "X vs Y" is ambiguous about home/away, the `--list` output shows the real id.
Note the **status** (`PRE_GAME` / `LIVE` / `FINISHED`) — it decides preview vs recap.

> **Why production, not local:** the local seed (`fifaScheduledMatches.ts`) lags;
> production runs the FIFA sync. Always trust production for status/score/incidents.

---

## Stage 2 — Pull the REAL incidents (do NOT invent scorers)

```bash
python3 scripts/fetch-match-incidents.py <match-id>
```

This reads the production `/api/match-overlays` endpoint as **raw JSON** and prints
the final score plus every incident (goal/card/substitution) with minute and player.

**Critical:** never guess goalscorers, cards, or minutes. The script is the source of
truth. (Do NOT read incidents via a summarizing web-fetch — it truncates the large
payload and silently drops round-2+ matches. See `reference_copa2026_api_fetch_raw_json`
memory.) If `--json` output is easier to parse, pass `--json`.

For group/standings context, either compute locally
(`npx tsx -e 'import { computeStandings } from "./src/standings"; ...'`) or read
`https://copa2026.mpbarbosa.com/api/team-view/<CODE>` (raw JSON, not summarized).

---

## Stage 3 — Draft and write the analysis

Add (or overwrite) the entry in `src/data/matchAnalysis.json`, keyed by match id.
Value is a single string of `## Section` blocks (parsed by `src/utils/noteSections.ts`).

Edit via a small Node script to avoid JSON-escaping pitfalls:

```bash
node -e '
const fs=require("fs"); const p="src/data/matchAnalysis.json";
const a=JSON.parse(fs.readFileSync(p,"utf8"));
a["<match-id>"]=[
  "## <Seção>","<parágrafo>",
  "## <Seção>","<parágrafo>"
].join("\n");
fs.writeFileSync(p, JSON.stringify(a,null,2)+"\n");
JSON.parse(fs.readFileSync(p,"utf8")); console.log("JSON valid ✓");
'
```

Section conventions (pt-BR, broadcast voice — see `CONTEXT.md`):

- **FINISHED → recap.** Suggested sections: `## Destaques`, a hero/turning-point
  section, `## Disciplina` (cards), `## Situação no grupo`, `## Veredito`.
  Attribute every goal/card to the real player + minute from Stage 2.
- **PRE_GAME → preview.** Suggested sections: `## Situação no grupo`,
  `## Como chegam`, `## O que esperar`, `## Expectativa`. No invented results.
- **LIVE →** prefer a preview framing; do not assert a final score.

Keep it accurate: if the script lacks a detail, omit it rather than guess. Coaches and
star players can be confirmed in `TEAM_COACHES` / `squads.json` if needed.

Then type-check:

```bash
npx tsc --noEmit
```

---

## Stage 4 — Deploy

Run the **test-bump-deploy** skill (full Docker test gate → version bump →
commit/push → production deploy). Use a commit subject like
`chore: bump version to X.Y.Z; add <ID> <preview|post-match> analysis`.

---

## Notes

- One match per run; for several, repeat or batch the edits before a single deploy.
- The "Pré-jogo" tab button only appears for matches that have an analysis entry —
  adding one here makes the tab show up automatically.
- Re-analyzing a match that already has a preview (now finished) is expected:
  overwrite the entry with the recap; the panel title flips to "Destaques da partida".

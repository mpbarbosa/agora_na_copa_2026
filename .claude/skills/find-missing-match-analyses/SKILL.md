---
name: find-missing-match-analyses
description: >
  Find all finished World Cup 2026 matches that have no post-match analysis
  ("Destaques da partida") in src/data/matchAnalysis.json — both matches with no
  entry at all and matches whose entry is still a pre-game "Prévia" — and
  generate a real-incident-grounded recap for each, then deploy once. Use when
  the user asks to "find missing match analyses", "analyze all finished matches",
  or wants to top up post-match analysis coverage after new matches have finished.
---

## Overview

Batch companion to [[analyze-match]] (which handles a single match). This skill
discovers every finished match that still lacks a post-match recap and runs the
`analyze-match` procedure for each, batching all edits into a single deploy.

Three stages:

1. **Identify** — reconcile `src/data/matchAnalysis.json` against the
   **production** live match-states to find FINISHED matches with no recap.
2. **Generate** — for each, run the [[analyze-match]] flow: reconcile the seed,
   pull the REAL incidents, and write a `## Section` recap.
3. **Deploy** — type-check and run [[test-bump-deploy]] **once** for the whole batch.

> A match "has a post-match analysis" only if its `matchAnalysis.json` entry is a
> **recap** (a "Destaques da partida"). A finished match needs work in two cases:
> it has **no entry**, or it has an entry that is still a **pre-game Prévia**
> (written before kickoff) — that stale preview must be overwritten with a recap.

---

## Stage 1 — Identify finished matches with no recap

**Production is the authoritative source of finished-match truth.** The local dev
server's FIFA sync and `src/matches.json` both lag (the FIFA API is often
unreachable from the dev environment, and `matches.json` only curates a subset —
many fixtures live in the runtime merge layer of `src/appMatches.ts`). So
reconcile against `https://copa2026.mpbarbosa.com/api/match-states`, which runs on
AWS and reaches FIFA reliably, and name matches from `APP_MATCHES` (the merged set).

```bash
# Fetch production live match-states (authoritative).
curl -sk --max-time 30 https://copa2026.mpbarbosa.com/api/match-states -o /tmp/prod-match-states.json

# List FINISHED matches that have no recap (no entry OR a stale pre-game preview).
npx tsx -e "
import { APP_MATCHES } from './src/appMatches';
import * as fs from 'fs';
const prod = JSON.parse(fs.readFileSync('/tmp/prod-match-states.json','utf8')).states ?? {};
const analysis = JSON.parse(fs.readFileSync('src/data/matchAnalysis.json','utf8'));
const byId = Object.fromEntries(APP_MATCHES.map(m => [m.id, m]));
// A recap carries post-match section headers; a Prévia does not.
const isRecap = (t: string) => /##\s*(Destaques|Disciplina|Veredito)/i.test(t || '');
const need = Object.entries(prod)
  .filter(([id, s]: any) => s.status === 'FINISHED' && !isRecap(analysis[id]));
if (!need.length) { console.log('All finished matches have a post-match analysis.'); process.exit(0); }
for (const [id, s] of need) {
  const m = byId[id]; const sc: any = (s as any).score;
  const state = analysis[id] ? 'STALE PREVIEW — overwrite' : 'no entry';
  console.log(id + '\t' + (m ? m.teamA.name + ' x ' + m.teamB.name : '(unknown)') + '\t' + (sc ? sc.teamA + '-' + sc.teamB : '') + '\t(' + state + ')');
}
"
```

> If the `curl` fails (sandboxed network), retry it with the sandbox disabled —
> the production host is read-only and safe to query. As a last-resort fallback,
> use a local `node -e "..."` check against `src/matches.json`, but treat its
> result as a lower bound (it under-reports).

If output is "All finished matches have a post-match analysis." — stop here,
nothing to do.

---

## Stage 2 — Generate a recap for each match

For **each** match from Stage 1, run the [[analyze-match]] procedure. Do not
invent any detail — every scorer, card, and minute must come from the incident
script. Repeat these steps per match, accumulating the edits (do **not** deploy
between matches):

### 2a. Reconcile the seed (mandatory, per match)

Production is authoritative for status/score. If the local seed disagrees, fix it
first or the match page renders the wrong status/tab and any local
`computeStandings()` context will be stale.

```bash
# Compare production status/score (Stage 1) vs the local seed line.
grep -nE "<CODEA>.*<CODEB>|<CODEB>.*<CODEA>" src/data/fifaScheduledMatches.ts
```

If production shows the match `FINISHED` with a score but the seed has it
`PRE_GAME`/`LIVE`, edit that line in `src/data/fifaScheduledMatches.ts`: set
`status: "FINISHED"` and the real `score: { teamA, teamB }` (teamA = the seed's
home team). Matches curated in `src/matches.json` are already authoritative and
need no seed edit.

### 2b. Pull the REAL incidents

```bash
python3 scripts/fetch-match-incidents.py <match-id>
```

This reads the production `/api/match-overlays` endpoint as **raw JSON** and
prints the final score plus every goal/card/substitution with minute and player.
**Never** read incidents via a summarizing web-fetch — it truncates the large
payload and silently drops round-2+ matches (see the
`reference_copa2026_api_fetch_raw_json` memory). Use `--json` if easier to parse.

For group context, after the seed is reconciled, compute locally:

```bash
npx tsx -e 'import { computeStandings } from "./src/standings"; const g = computeStandings().filter(r => r.group === "Grupo X"); for (const r of g) console.log(r.code, r.points, r.played, r.goalsFor + "-" + r.goalsAgainst);'
```

or read `https://copa2026.mpbarbosa.com/api/team-view/<CODE>` (raw JSON).

### 2c. Write the recap

Add (or **overwrite** a stale preview) the entry in `src/data/matchAnalysis.json`,
keyed by match id. The value is a single string of `## Section` blocks (parsed by
`src/utils/noteSections.ts`). Edit via a small Node script to avoid JSON-escaping
pitfalls:

```bash
node -e '
const fs=require("fs"); const p="src/data/matchAnalysis.json";
const a=JSON.parse(fs.readFileSync(p,"utf8"));
a["<match-id>"]=[
  "## Destaques","<parágrafo>",
  "## <Seção do lance decisivo>","<parágrafo>",
  "## Disciplina","<parágrafo>",
  "## Situação no grupo","<parágrafo>",
  "## Veredito","<parágrafo>"
].join("\n");
fs.writeFileSync(p, JSON.stringify(a,null,2)+"\n");
JSON.parse(fs.readFileSync(p,"utf8")); console.log("JSON valid ✓");
'
```

Recap section conventions (pt-BR, broadcast voice — see `CONTEXT.md`): suggested
sections are `## Destaques`, a hero/turning-point section, `## Disciplina`
(cards), `## Situação no grupo`, `## Veredito`. Attribute every goal/card to the
real player + minute from 2b. If the script lacks a detail, omit it rather than
guess. Coaches/star players can be confirmed in `TEAM_COACHES` / `squads.json`.

### 2d. Type-check after all matches are written

```bash
npx tsc --noEmit
```

---

## Stage 3 — Deploy

Run the [[test-bump-deploy]] skill **once** for the whole batch (full Docker test
gate → version bump → commit → publish → production deploy).

---

## Commit message convention

```
chore: bump version to X.Y.Z; add post-match analysis for <match list>
```

Example: `chore: bump version to 0.0.293; add post-match analysis for NZL×EGY, ESP×KSA, URU×CPV`

---

## Notes

- Match IDs follow the pattern `<teamA_code_lower>-<teamB_code_lower>-2026`. The
  `teamA` is always the home/first team as listed in `src/matches.json`.
- One deploy for the whole batch — never deploy between matches.
- A finished match with a stale Prévia is expected to be overwritten with the
  recap; the panel title flips from "Prévia da partida" to "Destaques da partida".
- The "Pré-jogo" tab button only appears for matches that have an analysis entry —
  adding one makes the tab show up automatically.
- If a match has only just finished and the incident script returns no goals/cards
  yet, note it and skip rather than write an empty recap.

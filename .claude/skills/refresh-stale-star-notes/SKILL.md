---
name: refresh-stale-star-notes
description: >
  Find star players (those with a worldCupNote in src/data/squads.json) whose note
  is behind their team's most recent finished match, and refresh each note from the
  REAL latest incidents and standings, then deploy. The player analog of
  update-stale-team-analyses. Use when the user asks to "refresh stale star notes",
  "update the star players that are behind", or wants player performance notes
  brought current after new matches have finished.
---

## Overview

A "star" is a player carrying a `worldCupNote` in `squads.json` (keyed by fifaId) —
the same field [[mark-star-players]] writes and `PlayerOverlayCard` renders. Notes
go stale as their team plays on. This skill finds the behind-the-times ones and
brings them current.

Unlike `teamAnalysis` ([[update-stale-team-analyses]]), a `worldCupNote` has **no
`updatedAt`** — it is a plain string. So staleness is detected from the note's own
`## Números` line: every star note states the team's game count as `J<n>`. A note
is **behind** when its `J<n>` is lower than the team's actual finished-match count.

Three stages:

1. **Identify** stale star notes (parsed `J<n>` < team's finished matches).
2. **Refresh** each — pull the new match's REAL incidents and rewrite the note.
3. **Deploy** once via [[test-bump-deploy]].

---

## Stage 1 — Identify stale star notes

**Production is authoritative for finished-match counts** (the seed lags).

```bash
curl -sk --max-time 30 https://copa2026.mpbarbosa.com/api/match-states -o /tmp/prod-match-states.json

npx tsx -e '
import { APP_MATCHES } from "./src/appMatches";
import * as fs from "fs";
const prod = JSON.parse(fs.readFileSync("/tmp/prod-match-states.json","utf8")).states ?? {};
const squads = JSON.parse(fs.readFileSync("src/data/squads.json","utf8"));
const playedByCode: Record<string, number> = {};
for (const m of APP_MATCHES) {
  if (prod[m.id]?.status !== "FINISHED") continue;
  for (const c of [m.teamA.code, m.teamB.code]) playedByCode[c] = (playedByCode[c] || 0) + 1;
}
let any = false;
for (const [id, p] of Object.entries<any>(squads)) {
  if (!p.worldCupNote) continue;
  const mJ = /J\s*(\d+)/.exec(p.worldCupNote);
  const noteJ = mJ ? parseInt(mJ[1], 10) : null;
  const teamPlayed = playedByCode[p.teamCode] ?? 0;
  if (noteJ !== null && noteJ >= teamPlayed) continue; // current
  any = true;
  const tag = noteJ === null ? "UNPARSED — review manually" : "BEHIND";
  console.log(`${p.teamCode}\t${(p.fullName||p.name)}\t${id}\tnoteJ=${noteJ ?? "?"}\tteamPlayed=${teamPlayed}\t${tag}`);
}
if (!any) console.log("All star notes are current with their teams.");
'
```

If output is "All star notes are current with their teams." — stop here.

Two result kinds:
- **`BEHIND`** — confident: the note's `J<n>` is genuinely lower than the team's
  finished-match count. Refresh it.
- **`UNPARSED — review manually`** — the note has no `J<n>` to compare (older
  free-form note). Open it and judge by eye whether it predates the latest match;
  refresh only if actually behind.

> **Caveat:** a starred player may have missed a match (injury/bench), so `J<n>`
> below the team count is a *signal*, not proof. In Stage 2, confirm from the
> incidents whether the player actually featured/contributed in the newer match
> before rewriting — if he sat out, update the team-context numbers but say so
> honestly rather than inventing a contribution.

---

## Stage 2 — Refresh each stale note (per player)

For **each** flagged player, accumulate edits (do **not** deploy between players).
This is the [[mark-star-players]] write flow applied as an overwrite:

```bash
# The player's team matches + the player's incidents in the newer match(es):
python3 scripts/fetch-match-incidents.py --list | grep -i "<TEAMCODE_lower>"
python3 scripts/fetch-match-incidents.py <new-match-id>   # grep the player name for goals/cards/minute
```

```bash
# Team standing for the refreshed "## Números":
npx tsx -e '
import { computeStandings } from "./src/standings";
const me = computeStandings().find(r => r.code === "<TEAMCODE>");
const pos = computeStandings().filter(r=>r.group===me!.group).sort((a,b)=>b.points-a.points||b.goalDifference-a.goalDifference).findIndex(r=>r.code===me!.code)+1;
console.log(me?.group, "pos"+pos, "J"+me?.played, me?.points+"pts", "SG"+me?.goalDifference);
'
```

Reconcile any stale seed result first (set `status: "FINISHED"` + real `score` in
`fifaScheduledMatches.ts`) — same safeguard as [[analyze-match]]. Then overwrite the
note (keep the same `## Leitura / ## Desempenho / ## Números` voice; carry forward
the still-true earlier story, append the new match, and bump the `J<n>` and table):

```bash
node -e '
const fs=require("fs"); const p="src/data/squads.json";
const a=JSON.parse(fs.readFileSync(p,"utf8"));
a["<FIFAID>"].worldCupNote=[
  "## Leitura","<parágrafo>",
  "## Desempenho","<parágrafo, incluindo o jogo mais recente com gols/minutos reais>",
  "## Números","J<n> · <gols> · <cartões> · <posição do time no grupo>"
].join("\n");
fs.writeFileSync(p, JSON.stringify(a,null,2)+"\n");
JSON.parse(fs.readFileSync(p,"utf8")); console.log("JSON valid ✓");
'
```

> Only set `worldCupNote`. Never touch factual fields — they are script-generated.
> Always include an updated `J<n>` in `## Números` so the next staleness check works.

Then type-check:

```bash
npx tsc --noEmit
```

---

## Stage 3 — Deploy

Run the [[test-bump-deploy]] skill **once** for the whole batch (keep the full
Docker run — this is real runtime data).

---

## Commit message convention

```
feat(data): refresh stale star notes for <CODE list>
```

Example: `feat(data): refresh stale star notes for ESP Yamal, BRA Casemiro`

---

## Notes

- pt-BR broadcast voice (see `CONTEXT.md`). Ground every new goal/card/minute in
  Stage 2; never invent. If the player sat out the new match, refresh only the team
  context honestly.
- One deploy for the whole batch — never deploy between players.
- The `J<n>` convention in `## Números` is what makes notes self-describing for
  staleness — preserve it in every refresh (and in new notes via [[mark-star-players]]).
- To CREATE notes for newly-emerged stars (not yet marked), use [[mark-star-players]];
  this skill only refreshes players who already have a note.

---
name: update-group-analysis
description: >
  Refresh the editorial "Análise do grupo" for one World Cup 2026 group
  (A–L) in src/data/groupAnalysis.json, grounded in the REAL current standings
  and results, and stamp it with an updated timestamp. Use when the user asks to
  "update the Group X analysis", "refresh the group X analysis", or wants a group
  write-up rewritten after new rounds were played.
---

## Overview

Four stages:

1. **Resolve** the group and pull its REAL current standings + results.
2. **Reconcile** any stale match results in the seed (so the table is accurate).
3. **Rewrite** the group's `{ text, updatedAt }` entry with a fresh timestamp.
4. **Validate + deploy** via test-bump-deploy.

Rendered in `StandingsView`: each group card has a collapsible **"Análise do grupo"**
`<details>`; the `updatedAt` shows automatically as an "Atualizado em …" footer line.

---

## Stage 1 — Resolve the group and get the real table

Input is a single group letter `A`–`L` (the data key). Its four teams and current
table come from `computeStandings()`:

```bash
npx tsx -e '
import { computeStandings } from "./src/standings";
for (const r of computeStandings().filter(r => r.group === "Grupo <X>"))
  console.log(`${r.code} J${r.played} ${r.points}pts V${r.won} E${r.drawn} D${r.lost} GP${r.goalsFor} GC${r.goalsAgainst} SG${r.goalDifference}`);
'
```

Cross-check the group's match results/statuses against production (the seed lags):

```bash
python3 scripts/fetch-match-incidents.py --list | grep -iE "<code1>|<code2>|<code3>|<code4>"
```

### Qualification status — let the code decide who is "eliminado" (NEVER eyeball it)

⚠️ **The single most common factual error in these analyses is calling a 3rd-placed
team "eliminada".** In the 48-team format the **eight best third-placed teams advance**
(Art. 12.5), so a team finishing 3rd is **NOT** eliminated — it is `contention` until
the other groups' results settle the best-thirds table. Only the **4th-placed team**
(once its group is complete) is reliably out. Never derive elimination from points or
your reading of the table — read it from the code, which already encodes the rule:

```bash
npx tsx -e '
import { computeStandings, groupStandings, rankBestThirds } from "./src/standings";
const groups = groupStandings(computeStandings());
for (const g of groups.filter(g => g.group === "Grupo <X>"))
  console.log(g.rows.map((r,i)=>`${i+1}.${r.code} ${r.points}pts SG${r.goalDifference} [${g.qualification.get(r.code)}]`).join("  "));
console.log("Best thirds (provisional, top 8 advance):");
for (const t of rankBestThirds(groups)) console.log(`  ${t.groupLetter} ${t.row.code} ${t.row.points}pts SG${t.row.goalDifference} -> ${t.qualifies ? "IN" : "out"}`);
'
```

Then write the verdict to MATCH the `qualification` status, never contradict it:
- `qualified` → "classificado(a) / avança às oitavas".
- `eliminated` → "eliminado(a)" (this is the ONLY status that may be called out).
- `contention` (incl. every 3rd place of a *finished* group) → frame as **still alive**:
  "em 3º, na disputa por uma das oito vagas de melhor terceiro; depende dos outros
  grupos". Use the `rankBestThirds` IN/out flag + saldo to color it ("provisoriamente
  dentro" vs "em posição frágil") — but it is **never** "eliminada" while `contention`.

---

## Stage 2 — Reconcile stale results (if any)

`computeStandings()` reads the local seed. If production shows a match `FINISHED`
(or with a score) that the seed still has as `PRE_GAME`/`LIVE`, the local table is
stale. Fix the seed line in `src/data/fifaScheduledMatches.ts` for that match —
set `status: "FINISHED"` and the real `score: { teamA, teamB }` (teamA = the seed's
home team) — then recompute Stage 1. Only then is the table trustworthy.

> Real scorers (if you want to name them) come from
> `python3 scripts/fetch-match-incidents.py <match-id>` — never invent them.

---

## Stage 3 — Rewrite the group entry (text + timestamp)

`src/data/groupAnalysis.json` is keyed by group letter; each value is
`{ text, updatedAt }`. `text` is a `## Section` string (parsed by
`src/utils/noteSections.ts`); `updatedAt` is ISO-8601 with the `-03:00` (Brasília)
offset and renders as "Atualizado em DD/MM/AAAA HHhMM" automatically.

Get the timestamp, then write via Node (avoids JSON-escaping pitfalls):

```bash
TS=$(date "+%Y-%m-%dT%H:%M:00-03:00")
node -e '
const fs=require("fs"); const p="src/data/groupAnalysis.json";
const a=JSON.parse(fs.readFileSync(p,"utf8"));
a["<X>"]={
  text:[
    "## Panorama","<parágrafo>",
    "## <Seção>","<parágrafo>",
    "## Veredito","<parágrafo>"
  ].join("\n"),
  updatedAt: process.argv[1]
};
fs.writeFileSync(p, JSON.stringify(a,null,2)+"\n");
JSON.parse(fs.readFileSync(p,"utf8")); console.log("JSON valid ✓");
' "$TS"
```

Section conventions (pt-BR, broadcast voice — see `CONTEXT.md`). Keep a `## Panorama`
opener and a `## Veredito` closer; in between use what fits the group, e.g.
`## Líder isolado`, `## Briga pela vaga`, `## Em baixa`, `## O que vem`,
`## Decisão de hoje`. Reflect the ACTUAL table and results from Stage 1 — points,
goal difference, who leads, who is eliminated, the decisive remaining fixtures.
Apply the qualification-status rule from Stage 1: only call a team "eliminada" when
the code reports `eliminated`; a 3rd-placed team in a finished group is `contention`
(alive for a best-third spot), never eliminated. Do not invent results; if a round-3
game hasn't happened, frame it as upcoming.

Then type-check:

```bash
npx tsc --noEmit
```

> The standings e2e (`tests/e2e/standings.spec.ts`) asserts every group carries an
> analysis and that Group H shows a timestamp. Updating an existing group keeps that
> invariant — no test change needed.

---

## Stage 4 — Deploy

Run the **test-bump-deploy** skill (Docker test gate → version bump → commit/push →
production deploy). Commit subject like
`chore: bump version to X.Y.Z; refresh Group <X> analysis`.

---

## Notes

- One group per run. For several, batch the edits before a single deploy.
- All 12 groups already have an entry — this skill overwrites one in place.
- The timestamp is structural (`updatedAt`), not text — never write the date into
  the `## Section` body.

---
name: update-stale-team-analyses
description: >
  Find every national-team page whose editorial "Análise da seleção"
  (src/data/teamAnalysis.json) is behind the team's most recent finished match,
  rewrite that analysis grounded in the REAL current standings and results, stamp
  it with a fresh updatedAt timestamp, and render that "Atualizado em …" line on
  the team page. Use when the user asks to "update stale team analyses", "refresh
  the team pages that are behind", or wants per-team write-ups brought current
  after new matches have finished.
---

## Overview

Team analyses live in `src/data/teamAnalysis.json`, keyed by 3-letter team code
(`BRA`, `ARG`, …), and are rendered as the **"Análise da seleção"** panel in
`TeamLineupView` (attached to `/api/team-view/:teamCode` by `server.ts`). This
skill keeps them current: it finds teams whose analysis predates their last
finished match, regenerates the text, and stamps a visible timestamp.

Stages:

0. **Infrastructure (one-time, idempotent)** — give each entry a `{ text, updatedAt }`
   shape and render the timestamp on the page, mirroring how `groupAnalysis.json`
   already works for `StandingsView`. **This is app-code work — ship it from the
   code/`main` checkout, not the data worktree** (see
   [[project_concurrent_code_data_worktree]]). Skip entirely once it exists.
1. **Identify** — list teams whose `updatedAt` is missing or older than their most
   recent FINISHED match (production-authoritative).
2. **Regenerate + restamp** — rewrite each stale team's `text` from the real table
   and results, set `updatedAt` to now.
3. **Deploy** — type-check and run [[test-bump-deploy]] once for the whole batch.

This is the per-team analog of [[update-group-analysis]] (which already does the
`{ text, updatedAt }` + "Atualizado em …" pattern for groups).

---

## Stage 0 — Infrastructure (run once, then skip)

Check first — if `teamAnalysis.json` values are already objects, this stage is
done; go to Stage 1.

```bash
node -e 'const a=JSON.parse(require("fs").readFileSync("src/data/teamAnalysis.json","utf8")); const k=Object.keys(a)[0]; console.log(typeof a[k]==="object" ? "DONE — {text,updatedAt} shape" : "TODO — still plain strings");'
```

If `TODO`, make these four changes. **They touch app code (`server.ts`,
`src/types.ts`, `TeamLineupView.tsx`) — do them in the `main` checkout and ship
on `main`, then `git -C ../agora-data merge main` to bring the data worktree
current** before running Stages 1–3.

**(a) Migrate the data** — wrap each string as `{ text, updatedAt }`. Backfill
`updatedAt` with each team's most recent FINISHED-match kickoff (a conservative
"current as of last match" baseline so the first run doesn't flag every team).
This needs `APP_MATCHES` + production states, so use `tsx`:

```bash
curl -sk --max-time 30 https://copa2026.mpbarbosa.com/api/match-states -o /tmp/prod-match-states.json
npx tsx -e '
import { APP_MATCHES } from "./src/appMatches";
import * as fs from "fs";
const prod = JSON.parse(fs.readFileSync("/tmp/prod-match-states.json","utf8")).states ?? {};
const a = JSON.parse(fs.readFileSync("src/data/teamAnalysis.json","utf8"));
const ko = (m: any) => new Date(m.kickoffTimestamp ?? 0).getTime();
const last: Record<string, any> = {};
for (const m of APP_MATCHES) {
  if (prod[m.id]?.status !== "FINISHED") continue;
  for (const c of [m.teamA.code, m.teamB.code]) if (!last[c] || ko(m) > ko(last[c])) last[c] = m;
}
const out: Record<string, any> = {};
for (const [code, val] of Object.entries(a)) {
  if (val && typeof val === "object") { out[code] = val; continue; }
  const lm = last[code];
  const stamp = lm ? new Date(ko(lm)).toISOString() : null;
  out[code] = { text: val, updatedAt: stamp };
}
fs.writeFileSync("src/data/teamAnalysis.json", JSON.stringify(out, null, 2) + "\n");
console.log("migrated", Object.keys(out).length, "entries");
'
```

**(b) `server.ts`** — the cast (around line 28) becomes
`Record<string, { text: string; updatedAt: string | null }>`, and the payload
(around line 1501) attaches both fields. Keep the existing `teamAnalysis` string
field and add a sibling so `TeamLineupView`'s `parseNoteSections(teamAnalysis)`
keeps working:

```ts
const TEAM_ANALYSIS_BY_CODE = TEAM_ANALYSIS as Record<string, { text: string; updatedAt: string | null }>;
// …in buildTeamViewPayload’s returned object:
teamAnalysis: TEAM_ANALYSIS_BY_CODE[normalizedTeamCode]?.text ?? null,
teamAnalysisUpdatedAt: TEAM_ANALYSIS_BY_CODE[normalizedTeamCode]?.updatedAt ?? null,
```

**(c) `src/types.ts`** — in `TeamViewResponse` (near the existing
`teamAnalysis: string | null;`, ~line 412) add:

```ts
teamAnalysisUpdatedAt: string | null;
```

**(d) Rendering** — extract `formatAnalysisTimestamp` from `StandingsView.tsx`
(lines 18–34) into `src/utils/dateFormat.ts`, import it in both `StandingsView`
and `TeamLineupView` (DRY). In `TeamLineupView.tsx`, just below the analysis
sections `<div>` (~line 898), mirror the group footer:

```tsx
{formatAnalysisTimestamp(teamView.teamAnalysisUpdatedAt) && (
  <p className={`mt-3 font-mono text-[9px] uppercase tracking-wider ${mutedClasses}`}
     data-testid={`team-analysis-updated-${teamView.team.code.toLowerCase()}`}>
    {formatAnalysisTimestamp(teamView.teamAnalysisUpdatedAt)}
  </p>
)}
```

Type-check (`npx tsc --noEmit`) and consider a small `tests/e2e/team-view.spec.ts`
assertion that a team with a timestamp renders the "Atualizado em …" line.

---

## Stage 1 — Identify teams behind their last match

**Production is authoritative for finished-match truth** (the local seed lags). A
team is stale when its `updatedAt` is missing or older than the kickoff of its
most recent FINISHED match.

```bash
curl -sk --max-time 30 https://copa2026.mpbarbosa.com/api/match-states -o /tmp/prod-match-states.json
npx tsx -e '
import { APP_MATCHES } from "./src/appMatches";
import * as fs from "fs";
const prod = JSON.parse(fs.readFileSync("/tmp/prod-match-states.json","utf8")).states ?? {};
const a = JSON.parse(fs.readFileSync("src/data/teamAnalysis.json","utf8"));
const ko = (m: any) => new Date(m.kickoffTimestamp ?? 0).getTime();
const byCode = Object.fromEntries(APP_MATCHES.flatMap((m: any) => [[m.teamA.code, m.teamA.name], [m.teamB.code, m.teamB.name]]));
const last: Record<string, any> = {};
for (const m of APP_MATCHES) {
  if (prod[m.id]?.status !== "FINISHED") continue;
  for (const c of [m.teamA.code, m.teamB.code]) if (!last[c] || ko(m) > ko(last[c])) last[c] = m;
}
const stale = Object.keys(a).map((code) => {
  const entry: any = a[code];
  const updatedAt = entry && typeof entry === "object" ? entry.updatedAt : undefined;
  const lm = last[code];
  const behind = lm && (!updatedAt || new Date(updatedAt).getTime() < ko(lm));
  return { code, updatedAt, lm, behind };
}).filter((r) => r.behind);
if (!stale.length) { console.log("All team analyses are current with their last match."); process.exit(0); }
for (const r of stale) {
  const s = prod[r.lm.id]?.score;
  console.log(`${r.code}\t${(byCode[r.code]||"?").padEnd(18)}\tlast=${r.lm.id} ${s?s.teamA+"-"+s.teamB:""}\tstamp=${r.updatedAt ?? "NONE"}`);
}
'
```

If output is "All team analyses are current with their last match." — stop here.

> If the `curl` fails (sandboxed network), retry with the sandbox disabled — the
> production host is read-only and safe to query.

---

## Stage 2 — Regenerate and restamp each stale team

For **each** stale team, accumulate edits (do **not** deploy between teams):

### 2a. Get the real table and results

```bash
# The team's group table (group comes from computeStandings):
npx tsx -e '
import { computeStandings } from "./src/standings";
const me = computeStandings().find(r => r.code === "<CODE>");
console.log("group:", me?.group);
for (const r of computeStandings().filter(r => r.group === me?.group))
  console.log(`${r.code} J${r.played} ${r.points}pts V${r.won} E${r.drawn} D${r.lost} GP${r.goalsFor} GC${r.goalsAgainst} SG${r.goalDifference}`);
'
```

Cross-check the team's results against production, and reconcile any stale seed
line in `src/data/fifaScheduledMatches.ts` first (set `status: "FINISHED"` + real
`score`) — same safeguard as [[update-group-analysis]] / [[analyze-match]]. Pull
real scorers from `python3 scripts/fetch-match-incidents.py <match-id>` (raw JSON;
never a summarizing fetch, never invented).

### 2b. Rewrite the entry (text + fresh timestamp)

Match the existing team-analysis voice and sections: `## Leitura` (overview),
`## Desempenho` (how it played its matches), `## Números` (J-count, record, goals,
SG, group position, top scorer, next fixtures). Reflect the ACTUAL table and the
real last result — points, position, who they beat/drew/lost to, what's next.

```bash
TS=$(date "+%Y-%m-%dT%H:%M:00-03:00")
node -e '
const fs=require("fs"); const p="src/data/teamAnalysis.json";
const a=JSON.parse(fs.readFileSync(p,"utf8"));
a["<CODE>"]={
  text:[
    "## Leitura","<parágrafo>",
    "## Desempenho","<parágrafo>",
    "## Números","<parágrafo>"
  ].join("\n"),
  updatedAt: process.argv[1]
};
fs.writeFileSync(p, JSON.stringify(a,null,2)+"\n");
JSON.parse(fs.readFileSync(p,"utf8")); console.log("JSON valid ✓");
' "$TS"
```

### 2c. Type-check after all teams are written

```bash
npx tsc --noEmit
```

---

## Stage 3 — Deploy

Run the [[test-bump-deploy]] skill **once** for the whole batch. If Stage 0 ran
this session, that infra commit is **app code → publish on `main`** per the
worktree policy; the Stage 2 data edits then ride along (or follow as a data-only
release if Stage 0 already shipped earlier).

---

## Commit message convention

```
chore: bump version to X.Y.Z; refresh team analysis for <CODE list>
```

Example: `chore: bump version to 0.0.300; refresh team analysis for NED, JPN, SWE, TUN`

---

## Notes

- The timestamp is structural (`updatedAt`), not text — never write the date into
  the `## Section` body.
- One deploy for the whole batch — never deploy between teams.
- `teamAnalysis.json` has 48 entries (one per team that has a page). A team with no
  finished match yet is never "behind" — it is skipped by Stage 1.
- Ground every claim in the real table/incidents; if a detail is unavailable, omit
  it rather than guess. Coaches/stars can be confirmed in `TEAM_COACHES` /
  `squads.json`.

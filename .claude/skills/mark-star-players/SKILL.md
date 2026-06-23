---
name: mark-star-players
description: >
  Mark standout World Cup 2026 players as "stars" (like Messi/CR7) by adding a
  hand-maintained worldCupNote to their src/data/squads.json entry — the same
  field that renders as the per-player performance analysis in the player overlay
  card. Works from an explicit player list or auto-detects the tournament's top
  scorers/leaders that lack a note. Grounds every note in REAL incidents and
  standings, then deploys. Use when the user asks to "mark <player> as a star",
  "add a world cup note for <player>", or "mark the top scorers as stars".
---

## Overview

A player is a "star" purely by having a `worldCupNote` on their `squads.json`
entry — there is no separate flag. That note IS the player performance analysis:
`server.ts` merges it via `resolvePlayerEntry` and `PlayerOverlayCard` renders its
`## Section` blocks (parsed by `src/utils/noteSections.ts`), exactly like Messi's.

`squads.json` is keyed by **fifaId**. **Factual fields are generated — do NOT
hand-edit them** (see `src/data/CLAUDE.md`). The two hand-maintained editorial
fields are `worldCupNote` and its companion `worldCupNoteUpdatedAt` (ISO-8601) —
this skill writes **both** and nothing else. `worldCupNoteUpdatedAt` drives the
**Atualizada/Desatualizada** freshness badge on the player card
(`PlayerNoteFreshness`, via `isAnalysisUpToDate` against the team's last finished
match); a note written without it would render Desatualizada immediately.

Four stages:

1. **Identify** the players to star (explicit list, or auto = top scorers/leaders
   without a note) and resolve each to its `squads.json` fifaId.
2. **Gather** each player's REAL contributions (goals/cards/minute from incidents)
   and team context (standings). Never invent.
3. **Write** a `worldCupNote` per player into `squads.json`, batching all edits.
4. **Deploy** once via [[test-bump-deploy]].

---

## Stage 1 — Identify and resolve the players

### Mode A — explicit players

The user names them (e.g. "M Salah / EGY", "Haaland"). For each, resolve the
fifaId from the team squad (names in the leaders feed and lineups can differ —
"Leo Messi" vs "Lionel Messi" — so verify):

```bash
npx tsx -e '
import { getTeamSquad } from "./src/data/playerRegistry";
for (const p of getTeamSquad("EGY")) console.log(p.fifaId, "|", p.number, "|", p.fullName || p.name, p.worldCupNote ? "[HAS NOTE]" : "");
'
```

### Mode B — auto-detect top scorers/leaders without a note

```bash
curl -sk --max-time 30 https://copa2026.mpbarbosa.com/api/tournament-leaders -o /tmp/leaders.json

npx tsx -e '
import { getTeamSquad } from "./src/data/playerRegistry";
import * as fs from "fs";
const leaders = JSON.parse(fs.readFileSync("/tmp/leaders.json","utf8"));
const squads = JSON.parse(fs.readFileSync("src/data/squads.json","utf8"));
const norm = (s: string) => (s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z ]/g,"").trim();
const scorers = leaders.playerLeaders?.topScorers ?? [];
for (const s of scorers) {
  // resolve fifaId by normalized name within the team squad
  const squad = getTeamSquad(s.teamCode) ?? [];
  const hit = squad.find((p: any) => norm(p.fullName) === norm(s.name) || norm(p.name) === norm(s.name))
           ?? squad.find((p: any) => norm(p.fullName).includes(norm(s.name).split(" ").pop()));
  const fifaId = hit?.fifaId;
  const has = fifaId ? !!squads[fifaId]?.worldCupNote : false;
  console.log(`${s.teamCode}\t${s.name}\tgoals=${s.goals}\tfifaId=${fifaId ?? "UNRESOLVED — resolve via Mode A"}\t${has ? "HAS NOTE — skip" : (fifaId ? "NEEDS NOTE" : "")}`);
}
'
```

`topScorers` entries carry `{ name, teamCode, goals, yellowCards, redCards }` and a
slug `id` (`<team>-<name>`), **not** a fifaId — that is why resolution is required.
Process the `NEEDS NOTE` rows; skip `HAS NOTE`; for `UNRESOLVED`, fall back to
Mode A to find the fifaId by hand. The `teamLeaders` block (bestAttack, etc.) can
suggest more candidates if the user wants defenders/keepers starred too.

If every leader already has a note — stop, nothing to do.

---

## Stage 2 — Gather each player's REAL data (per player)

Star notes must be grounded — never invent goals, cards, or minutes.

```bash
# The player's team matches + their incidents (goals/cards with minute):
python3 scripts/fetch-match-incidents.py --list | grep -i "<TEAMCODE_lower>"
python3 scripts/fetch-match-incidents.py <match-id>   # for each finished team match; grep the player name
```

For aggregate stats and team context:

```bash
# Goals/cards already tallied in the leaders feed (/tmp/leaders.json) for top scorers.
# Team standing for the "Números" section:
npx tsx -e '
import { computeStandings } from "./src/standings";
const me = computeStandings().find(r => r.code === "<TEAMCODE>");
console.log("group:", me?.group, "| pts:", me?.points, "J:", me?.played, "pos in group");
'
```

You may also read `https://copa2026.mpbarbosa.com/api/player-stats/<CODE>/<name>`
(raw JSON) for a per-player breakdown. Reconcile any stale seed result first
(set `status: "FINISHED"` + real `score` in `fifaScheduledMatches.ts`) — same
safeguard as [[analyze-match]].

---

## Stage 3 — Write the worldCupNote into squads.json

Mirror the established star-note voice (see Messi `229397`, CR7 `201200`): three
sections — `## Leitura` (why he is the star / what is at stake), `## Desempenho`
(what he actually did, match by match, with real goals/cards/minutes), `## Números`
(Jn · goals · cards · team position). Keyed by fifaId. Write via `tsx` (not `node`)
so the same script can stamp `worldCupNoteUpdatedAt` to the kickoff of the team's
most recent finished match — the one the note covers (repeat the block per player,
or set several keys before writing). Production states give the authoritative last
finished match (the seed lags):

```bash
curl -sk --max-time 30 https://copa2026.mpbarbosa.com/api/match-states -o /tmp/prod-match-states.json

npx tsx -e '
import { APP_MATCHES } from "./src/appMatches";
import * as fs from "fs";
const prod = JSON.parse(fs.readFileSync("/tmp/prod-match-states.json","utf8")).states ?? {};
const FIFAID = "<FIFAID>", TEAM = "<TEAMCODE>";
const ko = (m: any) => new Date(m.kickoffTimestamp).getTime();
const finished = APP_MATCHES
  .filter((m: any) => (m.teamA.code === TEAM || m.teamB.code === TEAM) && prod[m.id]?.status === "FINISHED")
  .sort((a: any, b: any) => ko(a) - ko(b));
const stamp = finished.length ? new Date(ko(finished[finished.length - 1])).toISOString() : null;

const p = "src/data/squads.json";
const a = JSON.parse(fs.readFileSync(p, "utf8"));
a[FIFAID].worldCupNote = [
  "## Leitura", "<parágrafo>",
  "## Desempenho", "<parágrafo>",
  "## Números", "J<n> · <gols> · <cartões> · <posição do time no grupo>"
].join("\n");
a[FIFAID].worldCupNoteUpdatedAt = stamp;   // stamp so the freshness badge reads Atualizada
fs.writeFileSync(p, JSON.stringify(a, null, 2) + "\n");
JSON.parse(fs.readFileSync(p, "utf8")); console.log("JSON valid ✓ — stamped", stamp);
'
```

> Set **both** `worldCupNote` and `worldCupNoteUpdatedAt`; never touch factual
> fields (`name`, `club`, `dateOfBirth`, `height`, `pictureUrl`, `socials`) — they
> are script-generated. A note with no finished match to ground it has `stamp =
> null` — but Stage 1 already skips players with no finished match, so this should
> not arise.

Then type-check:

```bash
npx tsc --noEmit
```

---

## Stage 4 — Deploy

Run the [[test-bump-deploy]] skill **once** for the whole batch (Docker test gate →
version bump → role-aware publish → production deploy). Because this changes real
runtime data, keep the full Docker test run (don't skip e2e).

---

## Commit message convention

```
feat(data): mark <CODE list> as star players with world cup performance notes
```

Example: `feat(data): mark GER Undav, CAN David, JPN Ueda as star players with world cup performance notes`

---

## Notes

- pt-BR broadcast voice (see `CONTEXT.md`). Attribute every goal/card to the real
  minute from Stage 2; if a detail is unavailable, omit it rather than guess.
- One deploy for the whole batch — never deploy between players.
- A player with no finished match yet has nothing to ground a note in — skip them.
- The worldCupNote also surfaces in the Jogadores view and match-incident player
  overlays, so a starred player lights up across the app automatically.
- Re-marking a player who already has a note means refreshing it (overwrite) after
  newer matches — same write, newer facts. Bringing already-marked players current
  after new rounds is what [[refresh-stale-star-notes]] is for.
- `worldCupNoteUpdatedAt` and the `J<n>` in `## Números` must stay in lockstep:
  both describe the latest match the note covers, one for the freshness badge and
  one for the staleness check. Set them together on every write.

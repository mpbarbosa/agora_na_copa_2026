# src/data/

Static data layer for "Agora na Copa 26". Each file has a different owner and edit rule — check before modifying.

## File map

| File | Owner | Edit rule |
|------|-------|-----------|
| `squads.json` | Generated | **Do not hand-edit.** Populated by `scripts/bootstrap-squads.ts` (FIFA API), enriched by `scripts/enrich-squads-fifa.py` and `scripts/enrich-squads-wikidata.py`. Run the relevant script instead. |
| `tournament.ts` | Hand-maintained | Seed standings (all-zero stats), 16 stadium records, bracket skeleton, news entries. Edit directly for team/stadium/bracket/news changes. |
| `fifaMatchVenues.ts` | Hand-maintained | Maps FIFA match IDs to official stadium name + city. Update when FIFA changes a venue assignment. |
| `fifaScheduledMatches.ts` | Hand-maintained | Group-stage schedule seeds (kickoff timestamps + venue references). Status defaults to `PRE_GAME`; the live-sync layer in `server.ts` overwrites at runtime. |
| `playerRegistry.ts` | Generated logic | Index over `squads.json` — do not edit. Exposes `getPlayerByFifaId`, `getTeamSquad`, `resolvePlayerEntry`. |
| `news.ts` | Hand-maintained | Static news articles. Add entries here for new announcements. |
| `questions.ts` | Hand-maintained | Fan Zone trivia questions. Add entries here. |
| `wikipediaCountries.ts` | Hand-maintained | Maps country codes to Wikipedia article titles used by `/api/country-info`. Add entries for new country codes. |
| `matchVideos.json` | Hand-maintained | Match highlight video links. Small; edit directly. |
| `matchAnalysis.json` | Hand-maintained | Editorial per-match analysis ("Destaques da partida"), keyed by match id. Value is a string with optional `## Section` headers (parsed by `src/utils/noteSections.ts`); rendered in `MatchDetailView`. Edit directly. |
| `groupAnalysis.json` | Hand-maintained | Editorial per-group analysis ("Análise do grupo"), keyed by group letter (`A`–`L`). Same `## Section` string format (parsed by `src/utils/noteSections.ts`); rendered inside each group card in `StandingsView`. Edit directly. |
| `teamAnalysis.json` | Hand-maintained | Editorial per-team analysis ("Análise da seleção"), keyed by team code (e.g. `ARG`). Same `## Section` string format (parsed by `src/utils/noteSections.ts`); attached to the `/api/team-view/:teamCode` payload in `server.ts` and rendered in `TeamLineupView`. Edit directly. |

## Source-of-truth hierarchy

```
src/matches.json          ← curated match fixtures + full 23-player lineups with x/y coords
src/data/squads.json      ← full 32-team × 32-player registry (generated; richer metadata)
src/data/tournament.ts    ← seed standings + stadiums + bracket skeleton
```

`matches.json` lives at `src/matches.json` (not inside `src/data/`). It is the source of truth for all match data consumed by `src/appMatches.ts`.

`squads.json` supplements `matches.json` lineups with `pictureUrl`, `socials`, `dateOfBirth`, `height`. It is resolved at runtime via `playerRegistry.ts` — not merged statically.

## playerRegistry.ts

Provides three exports used by `server.ts` and `fifa-sync-core.ts`:

- `resolvePlayerEntry(teamCode, name, number, fifaId?)` — finds a `SquadPlayer` by FIFA ID first, then shirt number, then normalised name.
- `getPlayerByFifaId(fifaId)` — direct ID lookup.
- `getTeamSquad(teamCode)` — all players for a team.

Never import raw `squads.json` directly; always go through `playerRegistry.ts`.

## Verification

```
npm run lint          # after any TypeScript change here
npm run test:unit     # if standings.ts behaviour is affected by tournament.ts changes
```

# Naming Guide

Naming is the primary documentation of code. In this project, naming carries an extra constraint: user-facing labels are in Brazilian Portuguese, domain vocabulary is defined in `CONTEXT.md`, and FIFA API field names must be translated into domain terms at the adapter boundary — not propagated inward.

## Goal

Establish naming conventions that make every identifier interpretable from its name alone, keep domain vocabulary consistent with `CONTEXT.md`, and prevent FIFA API terminology from leaking into domain code.

## What Consistent Naming Means Here

1. TypeScript identifiers use domain vocabulary from `CONTEXT.md` (e.g., `partida`, `transmissão`, `tabela`, `chaveamento`).
2. User-facing strings (component labels, `note` fields in API responses) are in pt-BR.
3. FIFA API field names (`IdMatch`, `HomeTeamScore`, `MatchStatus`) appear only in `fifa-sync-core.ts` adapter functions and dedicated `Fifa*` types — never in `src/types.ts` domain shapes or component props.
4. Functions are verb phrases; types are specific nouns; boolean functions are predicates.
5. The resilience convention is uniform: every `note` field in API responses is a pt-BR human-readable string.

## Naming and the FIFA API Boundary

`fifa-sync-core.ts` types prefixed with `Fifa` (`FifaCalendarMatch`, `FifaLiveMatch`, `FifaWatchSource`) are adapter types — they mirror the raw FIFA API shape. The adapter functions (`buildMatchStateEntry`, `normalizeBroadcasters`, `findCalendarMatch`) are the translation point: `Fifa*` types enter, `src/types.ts` domain types exit.

> **Rule**: `Fifa*` identifiers must not appear in `src/types.ts`, React components, or `src/standings.ts`. They belong exclusively in `fifa-sync-core.ts` and the consuming `server.ts` adapter calls.

## Naming by Symbol Type

| Symbol | Convention | Good example | Bad example |
|--------|-----------|-------------|-------------|
| Domain type | Specific noun, PascalCase | `BroadcastGuideEntry`, `MatchStateEntry` | `BroadcastData`, `MatchInfo` |
| FIFA adapter type | `Fifa` prefix | `FifaCalendarMatch`, `FifaLivePlayer` | `CalendarMatchData`, `ApiPlayer` |
| Function | Verb + specific noun | `buildMatchStateEntry`, `computeStandings` | `process`, `handleMatch` |
| Boolean function | Predicate: `is*`, `has*` | `isLiveMatch()`, `hasLineup()` | `checkLive()`, `liveStatus()` |
| Constant | Semantic meaning | `BROADCAST_GUIDE_CACHE_TTL_MS`, `CIRCUIT_BREAKER_FAILURE_THRESHOLD` | `FIVE_MINUTES`, `THREE` |
| UI label string | pt-BR | `"Ao Vivo"`, `"Dados do torneio"` | `"Live"`, `"Tournament data"` |
| Component | Domain concept, PascalCase | `PitchLineup`, `MatchDetailView` | `LineupComponent`, `MatchViewer` |
| Test name | Scenario + outcome | `returns fallback when FIFA API is unreachable` | `testBuildMatchState` |

## Abbreviations in This Project

Permitted abbreviations (universally understood):
- `id`, `url`, `api`, `ms` (milliseconds suffix), `ttl`, `svg`
- FIFA competition acronyms: `QF` (quarterfinals), `SF` (semifinals), `F` (final), `R16`, `R32`
- Country codes: `BR`, `USA`, `MEX`, etc. — when used as identifiers, not display labels

Prohibited without expansion:
- `tmp`, `cfg`, `proc`, `mgr`, `val`, `usr`
- `msg` (use `note` or `message` per context)

## Domain Vocabulary Anchors

Domain concept names live in `CONTEXT.md`. Before naming a new type, constant, or function, check the glossary there. Common anchors:

| Concept | Use in code | Do not use |
|---------|------------|-----------|
| A football match | `match`, `partida` (in UI strings) | `game`, `fixture` |
| Broadcast rights holder | `broadcaster` | `channel`, `network` |
| Live match state | `matchState`, `MatchStateEntry` | `liveData`, `matchInfo` |
| Bracket round | `stage` (e.g., `"QF"`, `"R16"`) | `round`, `phase` |
| Group standings | `standings`, `StandingsRow` | `leaderboard`, `ranking` |
| Official TV listings | `broadcastGuide`, `BroadcastGuideEntry` | `schedule`, `tvGuide` |

## Review Heuristics

### Domain Test

Would a Brazilian football broadcast domain expert — someone fluent in the business but not in the code — recognize and interpret this name correctly? `transmissão` and `broadcaster` pass; `channelSource` and `mediaProvider` fail.

### Boundary Test

Does the identifier appear in both `fifa-sync-core.ts` (adapter) and `src/types.ts` (domain)? If yes, confirm it is a domain name and not a FIFA API name that leaked through.

### Cold Read Test

Given only the function name and parameter names, can you predict what it returns without opening the file? `buildMatchStateEntry(fifaMatch, appMatch)` passes. `process(data, ctx)` fails.

### Predicate Test

Does every boolean-returning function read correctly in a conditional?
`if (isLiveMatch(match))` — pass. `if (checkMatchLive(match))` — fail.

## Positive Signals

- Components receive `match: Match` (domain type), not `data: FifaCalendarMatch`.
- All user-visible strings in components are in pt-BR.
- FIFA field names (`IdMatch`, `HomeTeamScore`) appear only in `fifa-sync-core.ts`.
- `note` fields in API responses contain pt-BR human-readable strings, not error codes.
- Test names in `tests/fifa-sync-core.test.ts` describe scenarios: `returns LIVE status when FIFA MatchStatus is 3`.

## Warning Signs

- `FifaCalendarMatch` imported in a React component.
- `note: "match state built from FIFA API"` (English in a user-facing field).
- A function named `handle`, `process`, or `manage` with no domain noun.
- `const data = ...` inside a domain function (use `const matchState`, `const broadcastGuide`, etc.).
- Type named `MatchObject`, `PlayerData`, or `BroadcasterInfo` (generic suffixes that add no meaning).
- FIFA field `MatchStatus: 3` compared inline in a route handler rather than named via `buildMatchStateEntry`.

## Related Guides

- [LIGHTWEIGHT_DDD_GUIDE.md](./LIGHTWEIGHT_DDD_GUIDE.md) — ubiquitous language and keeping code vocabulary aligned with domain vocabulary in `CONTEXT.md`.
- [DOMAIN_DESIGN_CONTROL_GUIDE.md](./DOMAIN_DESIGN_CONTROL_GUIDE.md) — language gate for reviewing new domain concepts.
- [LLM_CONTEXT_GUIDE.md](./LLM_CONTEXT_GUIDE.md) — naming as context compression: precise names reduce body reads.
- [CLAUDE_CODE_WORKFLOW_GUIDE.md](./CLAUDE_CODE_WORKFLOW_GUIDE.md) — naming precision reduces Claude Code correction loops.

## Summary Checklist

- [ ] New domain types are in `src/types.ts` with domain vocabulary names, not FIFA API names.
- [ ] `Fifa*` types appear only in `fifa-sync-core.ts` and `server.ts` adapter calls.
- [ ] All user-facing strings in components are in pt-BR.
- [ ] Every function name contains a verb.
- [ ] Boolean-returning functions use predicate form (`is*`, `has*`).
- [ ] No generic unprefixed names (`data`, `result`, `info`, `manager`).
- [ ] Abbreviations are only permitted ones listed above.
- [ ] Test names describe the scenario and expected outcome.
- [ ] New domain terms are checked against `CONTEXT.md` before being introduced.

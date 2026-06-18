# Node.js Module Structure Guide

Node.js module structure is an architectural discipline for the backend of this project: keeping pure FIFA API logic isolated from Express wiring, and controlling what each module exposes.

## Goal

Organize backend Node.js modules so that any module's responsibility is obvious from its name and location, dependencies flow in one direction, and the pure core logic can be tested without infrastructure setup.

## What Node.js Module Structure Means Here

The backend is split across three files with distinct roles:

| Module | Role | May import from |
|--------|------|----------------|
| `src/types.ts` | Domain type contracts | Nothing |
| `fifa-sync-core.ts` | Pure FIFA API logic — match-finding, broadcaster normalization, lineup building, match-state building | `src/types.ts`, `src/data/playerRegistry` |
| `server.ts` | HTTP entry point — Express routes, FIFA API HTTP calls, caching, circuit breaker | Everything above |

Supporting modules:
| Module | Role |
|--------|------|
| `src/appMatches.ts` | Assembles `APP_MATCHES` from `matches.json` + supplemental data |
| `src/standings.ts` | Computes `StandingsRow[]` from match results |
| `src/data/` | Static data files, player registry |

`fifa-sync-core.ts` is the project's **pure functional core**: it accepts data as parameters and returns domain-typed results with no HTTP calls, no caching, no Express.

`server.ts` is the **imperative shell**: it calls the FIFA API, feeds responses to `fifa-sync-core.ts`, caches results, and returns them via Express routes.

## Why It Matters

1. `fifa-sync-core.ts` can be unit-tested (`npm run test:unit`) by passing fixtures — no network, no running server.
2. The FIFA API HTTP logic is isolated in `server.ts`. Changing base URLs, headers, or retry behavior requires only changes there.
3. Downstream consumers of the pure core (tests, future CLI scripts) do not need Express or a network environment.
4. Single-responsibility modules make Claude Code sessions narrow: a session working on broadcaster normalization only needs `fifa-sync-core.ts` and `src/types.ts`.

## Required Rules

1. `fifa-sync-core.ts` must export named functions and types only. No default exports.
2. `fifa-sync-core.ts` must not import Express, make `fetch()` calls, or read environment variables. These are `server.ts` responsibilities.
3. `src/types.ts` must not import from any module above it. It is the base layer.
4. `server.ts` routes must not contain logic that could be unit-tested in isolation — extract to `fifa-sync-core.ts` or a peer module.
5. Module scope in `fifa-sync-core.ts` must be free of side effects: importing it must not trigger network calls, file I/O, or timers.

## Pure Functional Core Pattern

`fifa-sync-core.ts` follows the pure core / imperative shell split:

```ts
// Pure core in fifa-sync-core.ts — accepts data, returns domain types, no I/O
export function buildMatchStateEntry(
  fifaMatch: FifaLiveMatch,
  appMatch: Match,
): MatchStateEntry { ... }

// Imperative shell in server.ts — fetches from FIFA API, calls the pure core
const fifaData = await fetch(`${FIFA_API_BASE_URL}/live/football/...`);
const stateEntry = buildMatchStateEntry(await fifaData.json(), appMatch);
```

The pure core is easy to test deterministically. See [REFERENTIAL_TRANSPARENCY.md](./REFERENTIAL_TRANSPARENCY.md) for the broader principle.

## Review Heuristics

### Hidden Dependency Test

Does `fifa-sync-core.ts` contain any `fetch()`, `process.env`, or Express types? If yes, infrastructure has leaked into the pure core.

### Module Focus Test

Can the purpose of `fifa-sync-core.ts` be described in one sentence without "and"? (Currently: "translates FIFA API shapes into domain-typed match states and lineup entries.") If new responsibilities appear that don't fit this sentence, they should move to a new module.

### Side Effect Test

Does `import { buildMatchStateEntry } from './fifa-sync-core'` in a test trigger any network call, log output, or timer? If yes, module-scope side effects are present.

## Positive Signals

- `npm run test:unit` tests `fifa-sync-core.ts` functions with fixture data and no network setup.
- `fifa-sync-core.ts` has no `import express` or `import fetch`.
- All FIFA API `fetch()` calls are in `server.ts`.
- A new broadcast-normalization rule can be added to `fifa-sync-core.ts` without touching `server.ts`'s route structure.

## Warning Signs

- `fetch()` appearing inside `fifa-sync-core.ts`.
- Constants like `FIFA_API_BASE_URL` or `CIRCUIT_BREAKER_FAILURE_THRESHOLD` defined in `fifa-sync-core.ts`.
- A `server.ts` route handler that contains 50+ lines of inline match-state logic that belongs in `fifa-sync-core.ts`.
- Tests for `fifa-sync-core.ts` that require a running Express server.
- Default exports in `fifa-sync-core.ts`.

## Related Guides

- [CLEAN_ARCHITECTURE_GUIDE.md](./CLEAN_ARCHITECTURE_GUIDE.md) — the broader layer map across the full stack.
- [REFERENTIAL_TRANSPARENCY.md](./REFERENTIAL_TRANSPARENCY.md) — the pure functional core pattern that `fifa-sync-core.ts` follows.
- [HIGH_COHESION_GUIDE.md](./HIGH_COHESION_GUIDE.md) — keeping each module to one focused responsibility.
- [LOW_COUPLING_GUIDE.md](./LOW_COUPLING_GUIDE.md) — minimal, explicit imports across modules.
- [UNIT_TEST_GUIDE.md](./UNIT_TEST_GUIDE.md) — writing fast, isolated tests that the pure core makes possible.

## Summary Checklist

- [ ] `fifa-sync-core.ts` exports named functions and types; no default exports.
- [ ] `fifa-sync-core.ts` has no `fetch()`, `process.env`, or Express imports.
- [ ] `src/types.ts` imports from nothing.
- [ ] Domain logic extractable from routes lives in `fifa-sync-core.ts`, not inline in `server.ts`.
- [ ] Module scope in `fifa-sync-core.ts` is free of side effects at import time.
- [ ] `npm run test:unit` exercises core logic without a running server or network.

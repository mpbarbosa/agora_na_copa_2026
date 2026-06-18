# Defensive Coding Guide

Defensive coding means invalid inputs are rejected at the Express route boundary, and `fifa-sync-core.ts` functions trust the data they receive. Validation logic must not be scattered across route handlers, pure logic functions, and React components.

## Goal

Ensure that all external inputs — URL route params, FIFA API responses, query strings — are validated at the `server.ts` boundary before entering `fifa-sync-core.ts` or `src/standings.ts`, so that inner logic can trust its inputs and focus on domain behavior.

## Boundaries in This Project

| Boundary | What crosses it | Validation responsibility |
|----------|----------------|--------------------------|
| Express route params | `:matchId`, `:teamCode` URL segments | Validate in route handler: must exist in `APP_MATCHES_BY_ID` or be a known team code |
| FIFA API responses | `FifaCalendarMatch[]`, `FifaLiveMatch`, `FifaWatchSource[]` | Validate shape in `server.ts` before passing to `fifa-sync-core.ts` |
| React component props | `Match`, `Player`, `BroadcastGuideEntry`, etc. | TypeScript enforces at compile time; no runtime re-validation in components |
| `fifa-sync-core.ts` functions | Pre-validated `FifaLiveMatch`, `Match` | Trust the caller — no re-validation inside pure logic |

## Required Rules

1. Route params (`:matchId`, `:teamCode`) must be validated before any FIFA API call or `fifa-sync-core.ts` invocation. An invalid ID returns 400.
2. FIFA API response shapes must be checked for required fields in `server.ts` before passing to `fifa-sync-core.ts`. Missing required fields return a `source: "fallback"` response.
3. `fifa-sync-core.ts` functions must not validate their inputs — they receive validated or pre-checked data from `server.ts`.
4. `src/types.ts` TypeScript types enforce component prop contracts at compile time. Do not add runtime prop validation in React components.
5. `null` and `undefined` from FIFA API responses must be resolved in `server.ts` before passing downstream — not propagated into `fifa-sync-core.ts` as nullable parameters.

## Parse, Don't Validate

At the route boundary, transform the raw URL param into a validated domain value before proceeding:

```ts
// In a server.ts route handler — parse and reject early
const matchId = req.params.matchId;
const appMatch = APP_MATCHES_BY_ID.get(matchId);
if (!appMatch) {
  return res.status(400).json({ error: `Partida não encontrada: ${matchId}` });
}
// appMatch is now a trusted Match — pass it to fifa-sync-core.ts
const stateEntry = buildMatchStateEntry(fifaData, appMatch);
```

The domain value (`appMatch: Match`) is passed into all downstream logic. `matchId` (raw string) does not appear again.

## Guard Clauses

Route handlers should guard early and flatten the success path:

```ts
// Early return on invalid param — body executes only in the valid state
const appMatch = APP_MATCHES_BY_ID.get(req.params.matchId);
if (!appMatch) return res.status(400).json({ error: "..." });

const teamCode = req.params.teamCode.toUpperCase();
if (!isKnownTeamCode(teamCode)) return res.status(400).json({ error: "..." });

// From here: valid inputs, no further guards needed
```

Prefer guard clauses that return early over conditions that wrap the entire body.

## FIFA API Response Validation

FIFA API responses may be incomplete. Check required fields before passing to pure logic:

```ts
// In server.ts — validate FIFA response before passing to fifa-sync-core.ts
if (!fifaData?.Results?.length) {
  return { source: "fallback", note: "Nenhuma partida encontrada na FIFA API.", updatedAt: new Date().toISOString() };
}
```

Do not pass `undefined` or `null` into `buildMatchStateEntry` or `normalizeBroadcasters` — those functions trust their inputs.

## Validation Error vs. Fallback

| Scenario | Response |
|----------|---------|
| `:matchId` not in `APP_MATCHES_BY_ID` | 400 — client error, not a FIFA API fallback |
| `:teamCode` not a recognized FIFA team | 400 — client error |
| FIFA API unreachable | `source: "fallback"` with cached data — infrastructure error |
| FIFA API returns unexpected shape | `source: "fallback"` after shape validation in `server.ts` |

A 400 is not a fallback. A fallback is not a 400.

## Review Heuristics

### Route Boundary Test

Does every route that accepts `:matchId` or `:teamCode` validate the param before any FIFA API call? A missing validation means an invalid ID can reach `fifa-sync-core.ts` or generate a futile FIFA API request.

### Re-validation Test

Does any logic inside `fifa-sync-core.ts` check whether the `Match` or `Player` it received is `null`? If yes, the route boundary validation is incomplete or not trusted.

### Null Propagation Test

Can a `null` or `undefined` from a FIFA API response reach a `fifa-sync-core.ts` parameter? If yes, resolve it at the boundary in `server.ts`.

### 400 vs Fallback Test

Is every 400 response caused by a client error (bad param), and every `source: "fallback"` caused by an infrastructure error (FIFA API unavailable)? The two must not be conflated.

## Current Repo Reality

Route param validation is present for most routes. The gap is FIFA API response-shape validation — when the FIFA API returns a partial or unexpected shape, some routes may pass it to `fifa-sync-core.ts` rather than detecting the shape problem at the boundary and returning `source: "fallback"`.

## Positive Signals

- All route handlers guard-clause early on invalid params before any FIFA API call.
- `fifa-sync-core.ts` tests in `tests/fifa-sync-core.test.ts` pass pre-validated fixture data — no null/undefined edge cases in unit tests.
- A request for `/api/match-lineup/invalid-id` returns 400, not 500.
- FIFA API shape problems surface as `source: "fallback"` with an explanatory `note`, not as a runtime error.

## Warning Signs

- `buildMatchStateEntry(null, appMatch)` called without a null check on the FIFA data.
- A route that calls the FIFA API before validating `:matchId`.
- Null checks on `match.teamA` or `match.lineup` inside `fifa-sync-core.ts`.
- A validation error (bad client param) returning `source: "fallback"` instead of 400.
- Duplicated `APP_MATCHES_BY_ID.get(matchId)` null-checks in both the route handler and the `fifa-sync-core.ts` function it calls.

## Related Guides

- [ERROR_HANDLING_GUIDE.md](./ERROR_HANDLING_GUIDE.md) — distinguishing validation errors (400) from infrastructure fallbacks (`source: "fallback"`).
- [INTERFACE_FIRST_GUIDE.md](./INTERFACE_FIRST_GUIDE.md) — declaring preconditions in the type contract before implementing routes.
- [CLEAN_ARCHITECTURE_GUIDE.md](./CLEAN_ARCHITECTURE_GUIDE.md) — validation at the outer layer (routes), trust in the inner layer (`fifa-sync-core.ts`).
- [LOW_COUPLING_GUIDE.md](./LOW_COUPLING_GUIDE.md) — "parse, don't validate" reduces coupling by passing typed domain values instead of raw strings.
- [UNIT_TEST_GUIDE.md](./UNIT_TEST_GUIDE.md) — testing validation explicitly: every invalid input class must have a corresponding rejection test.

## Summary Checklist

- [ ] Route params (`:matchId`, `:teamCode`) are validated before any FIFA API call.
- [ ] Invalid params return 400; infrastructure failures return `source: "fallback"`.
- [ ] `fifa-sync-core.ts` functions receive validated, non-null inputs — no guard clauses inside pure logic.
- [ ] FIFA API response shapes are checked in `server.ts` before passing to `fifa-sync-core.ts`.
- [ ] `null`/`undefined` from FIFA API responses are resolved at the `server.ts` boundary.
- [ ] No duplicated validation checks across route handler and downstream function.
- [ ] Every invalid input class has a corresponding E2E or unit test.

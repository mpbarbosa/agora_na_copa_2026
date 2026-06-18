# Error Handling Guide

Error handling in this project has a distinctive shape: when the FIFA API is unreachable, every endpoint returns a fallback response with `source: "fallback"`, a human-readable `note`, and the last `updatedAt` timestamp — rather than an HTTP error. This resilience contract is an architectural decision, not just a convention.

## Goal

Ensure every API endpoint declares its failure modes explicitly, FIFA API errors are caught at the `server.ts` adapter boundary and translated into the resilience shape, and no infrastructure error propagates to clients without a domain-meaningful fallback.

## What Consistent Error Handling Means Here

In practice:

1. Every route response type in `src/types.ts` includes `source: "fifa" | "fallback"`, `note: string`, `updatedAt: string`.
2. FIFA API HTTP errors are caught in `server.ts` and transformed into `source: "fallback"` responses — never surfaced as raw 500s.
3. The circuit breaker in `server.ts` is the infrastructure-error recovery mechanism — it is not reimplemented inside `fifa-sync-core.ts`.
4. Every `catch` block either recovers (returns fallback data), wraps and re-throws, or fails fast. Empty catches are prohibited.
5. Validation errors — invalid `matchId`, unknown `teamCode` in route params — return 400 with a structured error; they do not reach `fifa-sync-core.ts`.

It does **not** mean wrapping React component code in error handlers for FIFA API failures — that belongs at the server boundary only.

## Error Taxonomy

| Class | In this project | Rule |
|-------|----------------|------|
| Domain error | `source: "fallback"` path — FIFA match not found for the requested `appMatch` | Declare in response type; client reads `source` field |
| Validation error | Invalid `matchId` / `teamCode` URL param | Reject at route handler boundary; return 400 |
| Infrastructure error | FIFA API timeout, 5xx, unreachable host | Catch in `server.ts`; return `source: "fallback"` with cached data if available |
| Programming error | `APP_MATCHES_BY_ID.get(id)` returns `undefined` when id should always exist | Fail fast; do not recover silently |

## The Resilience Shape

Every FIFA-sourced route must return:

```ts
{
  source: "fifa" | "fallback",
  note: string,        // pt-BR human-readable explanation
  updatedAt: string,   // ISO 8601 timestamp
  // ... domain fields
}
```

A `source: "fallback"` response uses the last successfully cached value plus a `note` explaining the fallback reason. A response that omits these fields breaks the client contract. See [INTERFACE_FIRST_GUIDE.md](./INTERFACE_FIRST_GUIDE.md).

## Circuit Breaker

`server.ts` implements a circuit breaker for FIFA API calls:
- After `CIRCUIT_BREAKER_FAILURE_THRESHOLD` consecutive failures, the circuit opens.
- While open, routes return fallback responses immediately without attempting the FIFA API.
- The circuit resets after `CIRCUIT_BREAKER_OPEN_MS`.

This is infrastructure-level error recovery. Routes must still handle the case where the circuit is open and return `source: "fallback"` with a meaningful `note`.

## Required Rules

1. Every route response type must include the resilience fields — declared in `src/types.ts` before the route is implemented.
2. FIFA API `fetch()` calls in `server.ts` must be wrapped in `try/catch`. The catch must return a fallback response, not rethrow to Express's default error handler.
3. Validation of route params (`:matchId`, `:teamCode`) happens at the route handler, before any FIFA API call or `fifa-sync-core.ts` invocation.
4. `fifa-sync-core.ts` functions must not call `fetch()` or throw infrastructure errors — they receive pre-fetched data.
5. A catch block that does not recover, log, or re-throw is prohibited.

## Propagation Decisions

At every `catch` in `server.ts`:

- **Recover and continue**: Use cached fallback data; set `source: "fallback"` with an explanatory `note`.
- **Fail fast**: For programming errors (e.g., `APP_MATCHES_BY_ID` missing an entry that should always exist), throw immediately.
- **400 for client errors**: Invalid route params are not fallback scenarios — return 400 with a structured message.

## Review Heuristics

### Resilience Coverage Test

Does every route that calls the FIFA API have a `catch` block that returns a `source: "fallback"` response? A route that lets a FIFA API timeout propagate as an uncaught error is non-conforming.

### Swallow Test

Does every `catch` block produce at least one of: a fallback response, a log entry, or a re-throw? Any empty `catch (e) {}` is a silent swallow.

### Leakage Test

Do any `FifaCalendarMatch`, `FifaLiveMatch`, or raw `fetch` error types appear in `src/types.ts` interface definitions? If yes, infrastructure error types have leaked through the adapter boundary.

### Boundary Test

Are validation errors (bad URL params) handled before FIFA API calls begin? A FIFA API call made with an invalid `matchId` wastes a network request and muddies error attribution.

## Positive Signals

- Every API response in `src/types.ts` includes `source`, `note`, `updatedAt`.
- `npm run test:e2e` includes a test for the fallback path (e.g., `navigation.spec.ts` verifies the page loads even when FIFA data is stale).
- Route handlers have a `try { ... } catch (e) { return fallback(...) }` pattern for FIFA API calls.
- `note` strings are in pt-BR and describe the actual fallback reason (e.g., `"Usando dados em cache — FIFA API indisponível"`).
- Circuit breaker constants are named semantically: `CIRCUIT_BREAKER_FAILURE_THRESHOLD`, not `THREE`.

## Warning Signs

- A route that returns HTTP 500 when the FIFA API is unreachable.
- `catch (e) { console.error(e); }` with no fallback response.
- An empty `catch {}` anywhere in `server.ts`.
- `note: ""` in a `source: "fallback"` response (no explanation for the fallback).
- A FIFA API error type appearing as a thrown exception from `fifa-sync-core.ts`.
- A route param validation error that causes a FIFA API call with an invalid ID.
- The same resilience fields declared inline per-route instead of in a shared `src/types.ts` type.

## Related Guides

- [INTERFACE_FIRST_GUIDE.md](./INTERFACE_FIRST_GUIDE.md) — declaring the resilience shape in `src/types.ts` before implementing routes.
- [DEFENSIVE_CODING_GUIDE.md](./DEFENSIVE_CODING_GUIDE.md) — validating route params at the boundary before any downstream call.
- [CLEAN_ARCHITECTURE_GUIDE.md](./CLEAN_ARCHITECTURE_GUIDE.md) — catching infrastructure errors at the `server.ts` adapter boundary, not inside pure logic.
- [REST_API_GUIDE.md](./REST_API_GUIDE.md) — translating error classifications into consistent HTTP status codes.
- [UNIT_TEST_GUIDE.md](./UNIT_TEST_GUIDE.md) — testing the fallback path in `fifa-sync-core.ts` unit tests.

## Summary Checklist

- [ ] Every route response type in `src/types.ts` includes `source`, `note`, `updatedAt`.
- [ ] All FIFA API `fetch()` calls in `server.ts` are wrapped in `try/catch` with a fallback return.
- [ ] No empty `catch` blocks anywhere in `server.ts`.
- [ ] Route param validation happens before FIFA API calls.
- [ ] `note` strings are in pt-BR and explain the fallback reason.
- [ ] `fifa-sync-core.ts` functions receive pre-fetched data; they do not call `fetch()`.
- [ ] Circuit breaker state is handled — open circuit returns `source: "fallback"` immediately.
- [ ] Every declared fallback path has a corresponding test.

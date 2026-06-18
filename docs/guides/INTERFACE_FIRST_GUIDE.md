# Interface-First Guide

Interface-first design means every public function, API route, and component prop has a declared TypeScript contract before any implementation is written. `src/types.ts` is the project's primary interface-first artifact: it defines all domain contracts in one place, independently of any framework or implementation.

## Goal

Ensure every public boundary — API response shapes, component props, FIFA API adapter outputs, domain query results — has a complete TypeScript type declared in `src/types.ts` before the implementing code is written, so that implementations can be verified against a specification rather than inferred from behavior.

## What Interface-First Design Means Here

In practice:

1. A new API response type is added to `src/types.ts` before the route handler is written.
2. Error shapes — including the `source: "fifa" | "fallback"`, `note`, `updatedAt` resilience fields — are declared in types before any route returns them.
3. Component props are TypeScript interfaces before the component is implemented.
4. `fifa-sync-core.ts` function signatures are declared (name, parameter types, return type, error cases) before the function body exists.
5. The interface is the review target. A reviewer checking a new route confirms the implementation conforms to the declared type in `src/types.ts`.

It does **not** mean writing formal interface declarations for every private helper inside `fifa-sync-core.ts` or `server.ts`. The principle applies to public boundaries.

## Why It Matters

1. The resilience shape (`source`, `note`, `updatedAt`) in every API response is a contract. Declaring it in `src/types.ts` — shared by `BroadcastGuideEntry`, `MatchStateEntry`, `LineupEntry`, `TeamViewResponse`, etc. — ensures every route conforms without re-discovering the pattern.
2. When Claude Code generates a new endpoint, giving it the declared `TypeScript` response type produces a conforming implementation. Without a declared type, it generates a convenient shape that may differ from every other endpoint.
3. `npm run lint` (type-check via `tsc --noEmit`) catches conformance failures at the type boundary before any runtime test.
4. Breaking changes to shared types in `src/types.ts` surface immediately as compile errors across every consumer.

## Resilience Shape Convention

Every FIFA-sourced response must carry:

```ts
source: "fifa" | "fallback";
note: string;
updatedAt: string;
```

This is the declared error contract for infrastructure uncertainty. New endpoints must declare this shape in their response type before implementing fallback logic.

## Best Practices

### Writing the Contract in `src/types.ts`

1. Add the response type to `src/types.ts` first. Include the resilience fields.
2. Declare parameter types for `fifa-sync-core.ts` functions as named interfaces in `src/types.ts` or inline where they are not reused.
3. Error cases that callers must handle — `source: "fallback"` plus `note` — are part of the type, not implementation notes.
4. No `any`, no `object`, no inline `Record<string, unknown>` in public response types.

### Contract and Tests

1. Write tests in `tests/fifa-sync-core.test.ts` against the declared `MatchStateEntry` / `LineupEntry` shapes, not against the implementation's internal representation.
2. Test the fallback path explicitly: a test that returns `source: "fallback"` must exist for every function that can fall back.
3. Playwright tests in `tests/e2e/` assert visible UI state that corresponds to the contract — they survive implementation changes.

## Review Heuristics

### Contract Completeness Test

Does the TypeScript type for every API response include the resilience fields (`source`, `note`, `updatedAt`)? A route returning a shape without these fields is non-conforming.

### Leakage Test

Does any type in `src/types.ts` reference `express.Request`, `express.Response`, or a FIFA API SDK type? If yes, infrastructure has leaked into the domain contract layer.

### Caller Sufficiency Test

Can a React component use a `BroadcastGuideEntry` or `TeamViewResponse` correctly — including handling `source: "fallback"` — without reading `server.ts`? If it must read the route handler to know what fields may be absent, the type is incomplete.

### Stability Test

Does changing a `server.ts` route implementation require changing a type in `src/types.ts`? If yes, the type is exposing implementation decisions rather than domain contracts.

## Positive Signals

- Every API response type in `src/types.ts` includes the resilience fields.
- `npm run lint` (type-check) catches a missed field before any test runs.
- A new `fifa-sync-core.ts` function is added to `tests/fifa-sync-core.test.ts` before the implementation is complete.
- React components reference `src/types.ts` types; no inline `as any` casts at prop boundaries.
- The `src/types.ts` diff appears in a commit before the implementing route or component diff.

## Warning Signs

- A route handler in `server.ts` returning `res.json({ ...data, extra: someValue })` with no declared type for `extra`.
- `as any` or `as unknown as SomeType` in component code to work around a missing type declaration.
- A `fifa-sync-core.ts` function with `any` return type.
- Error cases (e.g., what happens when the FIFA API is unreachable) undocumented in the response type.
- Implementations written before the type is declared, with the type added retroactively.

## Related Guides

- [CLEAN_ARCHITECTURE_GUIDE.md](./CLEAN_ARCHITECTURE_GUIDE.md) — `src/types.ts` as the innermost, import-free domain layer.
- [ERROR_HANDLING_GUIDE.md](./ERROR_HANDLING_GUIDE.md) — declaring error/fallback cases in the type contract.
- [DEFENSIVE_CODING_GUIDE.md](./DEFENSIVE_CODING_GUIDE.md) — enforcing preconditions at route boundaries at runtime.
- [UNIT_TEST_GUIDE.md](./UNIT_TEST_GUIDE.md) — writing tests against the declared interface.
- [CLAUDE_CODE_WORKFLOW_GUIDE.md](./CLAUDE_CODE_WORKFLOW_GUIDE.md) — declaring the interface in `src/types.ts` as the first stage of any new-endpoint session.

## Summary Checklist

- [ ] Every new API response type is declared in `src/types.ts` before the route handler is written.
- [ ] Every response type includes the resilience fields: `source`, `note`, `updatedAt`.
- [ ] No infrastructure type (`express.Request`, FIFA SDK type) appears in `src/types.ts`.
- [ ] `npm run lint` passes after the type is declared, before the implementation exists.
- [ ] Fallback behavior (`source: "fallback"`) is declared in the type, not discovered in the implementation.
- [ ] Tests assert against the declared TypeScript interface shapes.
- [ ] React components can consume a response type correctly without reading `server.ts`.

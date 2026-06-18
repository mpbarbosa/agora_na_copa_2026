# Clean Architecture Guide

Clean architecture is the structural rule that governs how this codebase keeps domain types, FIFA API logic, and Express HTTP wiring from collapsing into each other.

## Goal

Organize the system into layers where inner layers hold stable domain types and pure logic, and outer layers hold volatile infrastructure. All dependencies point inward. No inner layer knows anything about the outer layers that use it.

## What Clean Architecture Means Here

In practice:

1. `src/types.ts` defines all domain types with no framework imports — it is the innermost layer.
2. `fifa-sync-core.ts` and `src/standings.ts` contain pure logic that imports from `src/types.ts` only.
3. `src/appMatches.ts` assembles the full `APP_MATCHES` array — orchestration layer, no HTTP.
4. `server.ts` routes own all Express, FIFA API HTTP calls, caching, and circuit-breaker wiring — the outermost layer.
5. React components in `src/components/` consume `src/types.ts` types and call API endpoints — a separate outer layer on the frontend side.

It does **not** mean introducing formal repository classes or service objects. Use as many layers as the actual complexity warrants.

## Layer Reference

| Layer | Location | Allowed imports |
|-------|----------|-----------------|
| Domain types | `src/types.ts` | None — no external imports |
| Pure logic | `fifa-sync-core.ts`, `src/standings.ts` | `src/types.ts`, Node builtins only |
| Assembly / orchestration | `src/appMatches.ts`, `src/data/` | `src/types.ts`, static JSON, peer data modules |
| HTTP API / infrastructure | `server.ts` routes | Everything — Express, FIFA API, cache, pure logic modules |
| UI components | `src/components/` | `src/types.ts`, React, Tailwind; fetch from `/api/*` |

## Why It Matters

1. `fifa-sync-core.ts` can be unit-tested (`npm run test:unit`) without starting Express or calling the FIFA API.
2. The FIFA API URL can be changed or mocked at the `server.ts` boundary without touching `fifa-sync-core.ts`.
3. A new endpoint can be added to `server.ts` without modifying domain types or pure logic.
4. Claude Code sessions stay focused: a question about match-state logic only needs `fifa-sync-core.ts` and `src/types.ts` in context.

## Required Rules

1. **`src/types.ts` must have no framework, Express, or FIFA API imports.** It is the stable contract layer.
2. **`fifa-sync-core.ts` must not import from Express or make HTTP calls directly.** HTTP is a `server.ts` responsibility.
3. **`server.ts` routes must not contain reusable domain logic.** Extract to `fifa-sync-core.ts` or a standalone module if logic is needed elsewhere.
4. **React components must not bypass `/api/*` to call the FIFA API directly.** All FIFA data flows through the server.

## Review Heuristics

### Framework Import Test

Does any file in `src/types.ts`, `fifa-sync-core.ts`, or `src/standings.ts` import from `express`, `vite`, or an external HTTP SDK? If yes, infrastructure has leaked into the inner layers.

### Isolation Test

Can `npm run test:unit` run the FIFA sync logic and standings computations without starting Express or calling `api.fifa.com`? If no, the boundary between pure logic and infrastructure is too weak.

### Composition Root Test

Is Express wiring, caching, circuit-breaker setup, and FIFA API URL configuration concentrated in `server.ts`? Any such setup appearing in `fifa-sync-core.ts` or `src/standings.ts` is a composition boundary violation.

## Current Repo Reality

The architecture is well-aligned. The main area of ongoing pressure is `server.ts` (62 KB): it contains routes, caching, circuit-breaker logic, FIFA API adapters, and some inline data assembly. Further extraction into purpose-named modules (e.g., a `matchStateMachine.ts` or a `fifaApiAdapter.ts`) would reduce both file size and context cost per question.

## Positive Signals

- `fifa-sync-core.ts` functions are exercisable from `tests/fifa-sync-core.test.ts` with no HTTP setup.
- `src/types.ts` has no `import ... from 'express'` or `from 'vite'`.
- A new React view can be added without touching `server.ts`.
- A new API route can be added without modifying `src/types.ts`.

## Warning Signs

- An Express `Request` or `Response` type appearing in `fifa-sync-core.ts`.
- FIFA API `fetch()` calls inside `src/standings.ts` or a React component.
- Caching or TTL constants defined inside `fifa-sync-core.ts`.
- Business rules that belong in `fifa-sync-core.ts` written inline in a route handler.
- A test for pure logic that requires `npm run dev` to be running.

## Related Guides

- [HIGH_COHESION_GUIDE.md](./HIGH_COHESION_GUIDE.md) — keeping each module to one clear responsibility within its layer.
- [LOW_COUPLING_GUIDE.md](./LOW_COUPLING_GUIDE.md) — keeping imports directional and dependencies minimal.
- [LIGHTWEIGHT_DDD_GUIDE.md](./LIGHTWEIGHT_DDD_GUIDE.md) — naming domain concepts and separating policy logic from infrastructure.
- [REFERENTIAL_TRANSPARENCY.md](./REFERENTIAL_TRANSPARENCY.md) — keeping pure logic side-effect-free and testable.
- [NODE_MODULE_GUIDE.md](./NODE_MODULE_GUIDE.md) — layer structure within the Node.js backend modules.
- [ERROR_HANDLING_GUIDE.md](./ERROR_HANDLING_GUIDE.md) — wrapping FIFA API errors at the `server.ts` adapter boundary.

## Summary Checklist

- [ ] `src/types.ts` has no framework, Express, or external SDK imports.
- [ ] `fifa-sync-core.ts` and `src/standings.ts` have no Express or HTTP imports.
- [ ] Server routes in `server.ts` do not contain reusable domain logic.
- [ ] React components fetch from `/api/*`; they do not call the FIFA API directly.
- [ ] `npm run test:unit` exercises pure logic without a running server.
- [ ] A reviewer can identify the layer of any file from its imports and name alone.

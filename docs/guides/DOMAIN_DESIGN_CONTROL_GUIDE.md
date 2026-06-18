# Domain Design Control Guide

This guide defines domain-design review expectations for changes that touch domain types, API response shapes, user-facing vocabulary, or the FIFA API adapter boundary. Use it to review the domain-design quality of implementation changes.

## Source of Truth

Use this guide together with:

- [LIGHTWEIGHT_DDD_GUIDE.md](./LIGHTWEIGHT_DDD_GUIDE.md)
- [REST_API_GUIDE.md](./REST_API_GUIDE.md)
- [MOBILE_FIRST_GUIDE.md](./MOBILE_FIRST_GUIDE.md)
- [CLEAN_ARCHITECTURE_GUIDE.md](./CLEAN_ARCHITECTURE_GUIDE.md)
- [CODE_QUALITY_CONTROL_GUIDE.md](./CODE_QUALITY_CONTROL_GUIDE.md)

## Goal

Catch domain design regressions early by checking that new code:

1. uses the project's established ubiquitous language (from `CONTEXT.md`) consistently
2. keeps FIFA API terminology at the adapter boundary in `fifa-sync-core.ts`
3. exposes HTTP API routes that are resource-oriented, consistent, and resilience-shaped
4. delivers interfaces that are mobile-first and progressively enhanced
5. keeps domain logic free from Express, FIFA API SDK, and transport concerns

## Domain Design and Claude Code

Consistent domain design also improves Claude Code session quality.

When `CONTEXT.md` vocabulary is used consistently across `src/types.ts`, route names, and component identifiers, a Claude Code session adding a new concept or endpoint is less likely to introduce conflicting terminology, leak `Fifa*` types into domain code, or produce an API shape that breaks the resilience contract. Rigorous domain design pays twice: it keeps human review grounded, and it gives Claude Code stable, well-named signals.

## Review Gates

### 1. Language Gate

- Use the domain vocabulary from `CONTEXT.md` consistently across code, tests, and API contracts.
- Every new concept must have one agreed name — in both code identifiers and pt-BR user-facing strings.
- FIFA API field names (`IdMatch`, `HomeTeamScore`, `MatchStatus: number`) must not appear in `src/types.ts` or component code.
- When a change introduces a term that conflicts with the existing vocabulary in `CONTEXT.md`, resolve the conflict before merging.

### 2. FIFA API Adapter Boundary Gate

- `Fifa*` types (`FifaCalendarMatch`, `FifaLiveMatch`, `FifaWatchSource`) must remain in `fifa-sync-core.ts`.
- Adapter functions (`buildMatchStateEntry`, `normalizeBroadcasters`, `findCalendarMatch`) are the only translation points from `Fifa*` shapes to `src/types.ts` domain shapes.
- Domain types (`Match`, `MatchStateEntry`, `BroadcastGuideEntry`) must not import or reference FIFA API field names directly.

### 3. API Response Gate

- Every route response type must be declared in `src/types.ts` before the route is implemented. See [INTERFACE_FIRST_GUIDE.md](./INTERFACE_FIRST_GUIDE.md).
- Every FIFA-sourced response must include `source: "fifa" | "fallback"`, `note: string`, `updatedAt: string`. See [ERROR_HANDLING_GUIDE.md](./ERROR_HANDLING_GUIDE.md).
- Route paths must identify resources as plural nouns: `/api/match-states`, `/api/broadcast-guide`, `/api/standings`. No verbs in path segments.
- HTTP status codes must accurately reflect the outcome: 200 for success, 400 for client error (bad param), 500 for unhandled server error.
- Error responses must follow one structure. Do not invent new error shapes per route.

### 4. Mobile-First Gate

- New UI features must define the base layout for the smallest supported viewport first. See [MOBILE_FIRST_GUIDE.md](./MOBILE_FIRST_GUIDE.md).
- Interactive controls must be touch-safe by default (44×44 px minimum target, no hover-only primary flows).
- Anton / Archivo Narrow / JetBrains Mono font assignments must match their defined roles in `DESIGN.md`.

### 5. Separation Gate

- Domain logic must remain in `fifa-sync-core.ts` or `src/standings.ts` — free of Express imports or FIFA API `fetch()` calls.
- `src/types.ts` must not import from `express`, `vite`, or any external SDK.
- Business rules extracted during a PR must be unit-testable via `npm run test:unit` without a running server.

### 6. Documentation Gate

- Update `CONTEXT.md` when a new domain concept, bounded context, or integration pattern is introduced.
- Update the `CLAUDE.md` guide table only after the new guide file exists in `docs/guides/`.
- Breaking API changes (removed fields, changed types) must be noted in `CHANGELOG.md`.

### 7. Validation Gate

Run all three before merging a substantive domain change:

1. `npm run lint` — TypeScript type-check (`tsc --noEmit`)
2. `npm run test:unit` — pure logic unit tests
3. `npm run test:e2e` — full Playwright suite (or the relevant spec: `npx playwright test tests/e2e/<spec>.ts`)

## Positive Signals

- Every new concept has one name used consistently in `src/types.ts`, component props, route paths, and `note` strings.
- `Fifa*` types are confined to `fifa-sync-core.ts`; components import from `src/types.ts` only.
- Every new endpoint has its response type declared in `src/types.ts` with the resilience fields.
- The base mobile layout works without a media query on a 375 px viewport.
- `npm run lint && npm run test:unit` pass after the change.

## Warning Signs

- A `FifaCalendarMatch` field name appearing in a React component prop.
- A route returning HTTP 200 with `{ error: "..." }` in the body.
- Different endpoints returning different error envelope shapes.
- An API route that skips the `source` / `note` / `updatedAt` resilience fields.
- New domain concepts introduced without updating `CONTEXT.md`.
- A `CLAUDE.md` guide table entry pointing to a guide file that doesn't exist yet.
- CSS that assumes desktop width and overrides for mobile with `max-width` rules.

## Summary Checklist

- [ ] Every new concept has one agreed name consistent across code, tests, and pt-BR UI strings.
- [ ] `Fifa*` types appear only in `fifa-sync-core.ts` and `server.ts` adapter calls.
- [ ] Every new route response type is declared in `src/types.ts` with resilience fields.
- [ ] Route paths use plural resource nouns; no verbs in path segments.
- [ ] HTTP status codes accurately reflect outcomes (200 / 400 / 500).
- [ ] All error responses share one envelope structure.
- [ ] New domain logic is in `fifa-sync-core.ts` or `src/standings.ts`, free of Express imports.
- [ ] Base UI layout works at 375 px without media queries.
- [ ] `CONTEXT.md` updated for new domain concepts.
- [ ] `npm run lint && npm run test:unit` pass after the change.

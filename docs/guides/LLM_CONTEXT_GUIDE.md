# LLM Context Efficiency Guide

Code structure determines how much Claude Code must read to reason accurately about any given change. This guide treats the context window as a finite resource. `server.ts` (62 KB) is the clearest signal in this project that context cost management matters.

## Goal

Structure code so that the minimum necessary context answers any question Claude Code is asked — reducing wasted tokens, keeping relevant code within the context window, and making generated edits more accurate and correctly scoped.

## What LLM Context Efficiency Means Here

1. Each file has a single, nameable responsibility — its purpose is inferable without reading its body.
2. `fifa-sync-core.ts` answers questions about FIFA API translation without needing `server.ts` in context.
3. `src/types.ts` answers "what types exist?" in its entirety — the public API surface in one place.
4. Patterns are consistent: all API responses share the resilience shape (`source`, `note`, `updatedAt`); all API routes follow the same structure in `server.ts`.
5. Public names carry semantics: `buildMatchStateEntry`, `normalizeBroadcasters`, `computeStandings` are self-describing.

It does **not** mean splitting every file into micro-modules. Over-granular modules scatter related context. The goal is the minimum context per question, not the minimum file size.

## Context Cost Reference

| Code property | Context cost | Example in this project |
|---------------|-------------|------------------------|
| Large mixed-concern file | High | `server.ts` (62 KB) — a question about caching TTLs loads route logic too |
| Single-concern module | Low | `src/standings.ts` — one question, one file |
| Generic name | High | A function named `handle` or `process` in a route handler |
| Precise semantic name | Low | `buildMatchStateEntry`, `normalizeBroadcasters` |
| Scattered public API | High | Types spread across `server.ts`, `fifa-sync-core.ts`, and component files |
| Single declared surface | Low | `src/types.ts` — one file answers "what types does this project use?" |
| Inconsistent patterns | High | If each API route returned a different resilience shape, every route would need to be read |
| Consistent patterns | Low | All routes follow the same `source/note/updatedAt` shape — one route documents all |

## Required Rules

1. Every file must have a single, nameable responsibility. `fifa-sync-core.ts`: "translates FIFA API shapes into domain-typed match states and lineup entries." `src/standings.ts`: "computes group-stage standings from match results."
2. Every exported function name must be interpretable from its name alone without reading the body.
3. All API response types are declared in `src/types.ts` — not inline in route handlers.
4. All routes follow the same resilience pattern (`source`, `note`, `updatedAt`). Pattern divergence within route responses is not permitted.
5. `fifa-sync-core.ts` has no side effects at import time — no module-level `fetch()`, no global state initialization.

## The `server.ts` Context Problem

`server.ts` is 62 KB and growing. It currently mixes:
- Express app setup and middleware
- Route handlers (9 API endpoints)
- FIFA API HTTP calls and response parsing
- In-memory caching and TTL logic
- Circuit breaker state management
- Background warm-up scheduling

A question about broadcast guide caching loads all route logic. A question about the circuit breaker loads all caching logic. Any extraction that separates these concerns reduces the context cost of focused questions.

**Candidates for extraction:**
- `fifaApiClient.ts` — FIFA API HTTP calls, retry, circuit breaker
- `matchStateCache.ts` — per-endpoint TTL caching logic

See [NODE_MODULE_GUIDE.md](./NODE_MODULE_GUIDE.md) for the extraction pattern and [CLEAN_ARCHITECTURE_GUIDE.md](./CLEAN_ARCHITECTURE_GUIDE.md) for layer guidance.

## Naming Density

Prefer names that eliminate the need to read the body:

| Instead of | Use |
|-----------|-----|
| `process(data, ctx)` | `buildMatchStateEntry(fifaMatch, appMatch)` |
| `getInfo(code)` | `fetchTeamViewResponse(teamCode)` |
| `const result = ...` | `const matchState = ...`, `const broadcastGuide = ...` |
| `isOk()` | `isLiveMatch()`, `hasActiveLineup()` |

## Pattern Consistency

When all API routes follow the same structure and all responses carry the same resilience fields, Claude Code can generate a new conforming route from one existing example. Structural divergence requires loading every route to understand which convention applies.

The single most important consistency invariant: **every FIFA-sourced response includes `source`, `note`, `updatedAt`.**

## Review Heuristics

### 10-Line Scan Test

Read only a file's import block and its first declaration. Is the file's complete responsibility clear? `fifa-sync-core.ts` passes. `server.ts` does not pass cleanly — it is the primary extraction target.

### Cold Name Test

Given only `buildMatchStateEntry(fifaMatch, appMatch)`, can you predict what it returns without reading the body? If yes, the name carries its semantic load.

### Dependency Radius Test

To answer "what does `buildMatchStateEntry` return on a LIVE match?", how many files must be in context? Correctly: `fifa-sync-core.ts` + `src/types.ts`. If `server.ts` must also be loaded, the function has leaked dependencies.

### Pattern Recognition Test

Pick two API routes in `server.ts`. Do they follow the same structural template — same resilience fields, same error handling, same cache-check pattern? If not, each route pays full context cost independently.

## Current Repo Reality

`src/types.ts` and `fifa-sync-core.ts` are well-structured. `server.ts` is the primary context-cost problem. Extracting the FIFA API HTTP client and the caching layer into separate modules would be the highest-value structural improvement. This is a known pressure point, not a blocker.

## Positive Signals

- A question about broadcaster normalization is fully answerable from `fifa-sync-core.ts` alone.
- `src/types.ts` answers "what are all the API response shapes?" without reading route handlers.
- A new route written by Claude Code follows the exact same structure as existing routes without correction.
- `fifa-sync-core.ts` test output is predictable from function names alone.

## Warning Signs

- A Claude Code session working on one route loads all of `server.ts` unnecessarily.
- New types declared inline in route handlers instead of `src/types.ts`.
- A `buildMatchStateEntry` variant added to `server.ts` instead of `fifa-sync-core.ts`.
- Two routes in `server.ts` that return similar shapes but with different field names for the same concept.
- An LLM-generated edit that touches `server.ts` and `fifa-sync-core.ts` for a change that only concerns pure logic.

## Related Guides

- [CLAUDE_CODE_WORKFLOW_GUIDE.md](./CLAUDE_CODE_WORKFLOW_GUIDE.md) — session discipline that consumes context-efficient code.
- [NODE_MODULE_GUIDE.md](./NODE_MODULE_GUIDE.md) — extraction patterns that reduce `server.ts` context cost.
- [CLEAN_ARCHITECTURE_GUIDE.md](./CLEAN_ARCHITECTURE_GUIDE.md) — layer boundaries that limit context radius.
- [HIGH_COHESION_GUIDE.md](./HIGH_COHESION_GUIDE.md) — single-responsibility modules as low-cost context units.
- [NAMING_GUIDE.md](./NAMING_GUIDE.md) — naming as context compression.

## Summary Checklist

- [ ] Every file has a single, nameable responsibility describable in one sentence.
- [ ] Every exported function is interpretable from its name and parameter names.
- [ ] All API response types are declared in `src/types.ts`, not inline in route handlers.
- [ ] All API routes follow the same resilience pattern — no structural divergence.
- [ ] `fifa-sync-core.ts` has no side effects at import time.
- [ ] New domain logic added to `server.ts` inline is extracted to `fifa-sync-core.ts` if reusable or testable.
- [ ] A question about any single route or function requires at most 2–3 files in context.

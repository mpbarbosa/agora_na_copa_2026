# Incremental Change Guide

Incremental change is the practice of structuring Claude Code work into units small enough that each one can be fully reviewed and verified before the next begins. In this project, "one unit" typically means one of: a new type in `src/types.ts`, a new function in `fifa-sync-core.ts`, a new route in `server.ts`, or a new React component — not a full feature delivered in a single session.

## Goal

Ensure every change targets a single behavioral concern, is verifiable with `npm run lint`, `npm run test:unit`, or `npm run test:e2e` before the next change starts, and produces a diff that a reviewer can assess independently.

## What Incremental Change Means Here

1. Work is decomposed into an ordered sequence before any code is generated.
2. Each change targets one concern: one type, one function, one route, one component.
3. Each change has an explicit "done" condition — `npm run lint` passes, a unit test passes, a Playwright spec passes — before the next change begins.
4. Prompts are scoped to one file or one concern. A prompt asking for "the full match-state feature" produces a diff too large to review.
5. Each verified change is committed before the next begins.

It does **not** mean every one-liner is a separate commit. Related changes that belong to the same behavioral concern (e.g., a type declaration in `src/types.ts` and the corresponding route handler skeleton in `server.ts`) are one change.

## The Stacked Change Pattern

For any new capability — new API endpoint, new FIFA sync behavior, new UI view:

| Stage | Output | Verification |
|-------|--------|-------------|
| 1. Interface | Type in `src/types.ts` + function signature in `fifa-sync-core.ts` | `npm run lint` passes |
| 2. Tests | Unit tests in `tests/fifa-sync-core.test.ts` — all failing | Tests run and fail for the right reason |
| 3. Implementation | `fifa-sync-core.ts` function body + `server.ts` route | All declared unit tests pass; `npm run lint` clean |
| 4. UI | React component in `src/components/` | `npm run test:e2e` spec passes |

Do not proceed to stage N+1 until stage N is verified and committed. A Playwright test written against a wrong type has verified the wrong thing.

## Examples

**Adding a new API endpoint (e.g., `/api/player-incidents/:playerId`):**

1. Declare `PlayerIncidentsPayload` in `src/types.ts` — commit + `npm run lint`
2. Write unit tests for the aggregation logic — commit (tests fail)
3. Implement `buildPlayerIncidents` in `fifa-sync-core.ts` — commit + `npm run test:unit`
4. Add route handler in `server.ts` — commit + manual smoke test
5. Add Playwright spec in `tests/e2e/` — commit + `npm run test:e2e`

**Adding a new React view (e.g., Fan Zone):**

1. Declare any new types needed in `src/types.ts`
2. Add the nav entry to `src/navigation.ts` — commit
3. Implement the component in `src/components/FanZoneView.tsx` — commit + `npm run lint`
4. Wire into `src/App.tsx` routing — commit + visual verification in browser

**Updating FIFA sync logic:**

1. Write a failing unit test in `tests/fifa-sync-core.test.ts` for the new behavior
2. Update the function in `fifa-sync-core.ts` to make it pass
3. Run `npm run test:unit` — all pass, commit
4. Run `npm run test:e2e` to confirm no regressions

## Verification by Layer

| Changed layer | Command |
|--------------|---------|
| TypeScript types (`src/types.ts`) | `npm run lint` |
| Pure logic (`fifa-sync-core.ts`, `src/standings.ts`) | `npm run test:unit` |
| Server routes (`server.ts`) | `npm run lint` + manual or `npm run test:e2e` |
| React components (`src/components/`) | `npm run lint` + `npm run test:e2e` |
| Full stack | `npm run test:e2e` |
| Single Playwright spec | `npx playwright test tests/e2e/<spec>.ts` |

## Prompt Scoping Rules

1. One concern per prompt. "Add the `MatchStateEntry` type to `src/types.ts`" is correctly scoped. "Add the full match-state endpoint including type, logic, and route" is not.
2. Include the declared type in the prompt when generating an implementation. The type is the specification.
3. Include a failing test when generating the implementation. The failing test defines "done."
4. Exclude unrelated files from context. Sending all of `server.ts` for a `fifa-sync-core.ts` change dilutes signal.

## Review Heuristics

### Concern Count Test

How many distinct behavioral concerns does this diff address? A diff that adds a type to `src/types.ts`, implements a function in `fifa-sync-core.ts`, adds a route in `server.ts`, and updates a React component is four concerns. Each should be a separate committed step.

### Verification Gate Test

Was there an explicit passing verification command before this commit was made? A commit of `fifa-sync-core.ts` changes without a `npm run test:unit` run is an unverified foundation.

### Interface-First Test

Does the `src/types.ts` type appear in the commit log before the implementing route or component? If not, the interface stage was skipped.

## Positive Signals

- `src/types.ts` commits precede implementing code commits in the log.
- Unit test commits show failing tests, followed by a passing implementation commit.
- Each commit message names one concern: `feat(types): add PlayerIncidentsPayload`, `feat(server): add /api/player-incidents route`.
- Reverting any single commit does not affect unrelated behavior.

## Warning Signs

- A single prompt generating changes to `src/types.ts`, `fifa-sync-core.ts`, `server.ts`, and a React component at once.
- A route committed without `npm run lint` passing.
- Implementation and type appearing in the same commit with no prior type-only commit.
- A commit message containing "and": `feat: add type and route and tests`.
- A Playwright spec written before the API route is verified.

## Related Guides

- [CLAUDE_CODE_WORKFLOW_GUIDE.md](./CLAUDE_CODE_WORKFLOW_GUIDE.md) — session-level discipline: scope declaration, tool-call review, verification gates.
- [INTERFACE_FIRST_GUIDE.md](./INTERFACE_FIRST_GUIDE.md) — declaring types in `src/types.ts` as the first stage of every stacked change.
- [LLM_CONTEXT_GUIDE.md](./LLM_CONTEXT_GUIDE.md) — scoping prompt context to the minimum necessary file set.
- [ERROR_HANDLING_GUIDE.md](./ERROR_HANDLING_GUIDE.md) — declaring fallback/error cases in the type stage so they are tested and implemented incrementally.
- [CODE_QUALITY_CONTROL_GUIDE.md](./CODE_QUALITY_CONTROL_GUIDE.md) — quality gates that incremental verification supports.

## Summary Checklist

- [ ] Work decomposed into a named sequence of single-concern changes before generation begins.
- [ ] Each change has an explicit verification command defined before generation starts.
- [ ] Interface (`src/types.ts`) declared and reviewed before its implementation is generated.
- [ ] Unit tests written before `fifa-sync-core.ts` implementation exists.
- [ ] Each verified change committed before the next change begins.
- [ ] Each commit message names one concern without "and."
- [ ] No change extended before its verification condition is met.
- [ ] Prompts scoped to one file or concern; unrelated files excluded from context.

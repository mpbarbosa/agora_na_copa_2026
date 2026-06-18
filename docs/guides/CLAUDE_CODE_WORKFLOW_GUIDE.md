# Claude Code Workflow Guide

A Claude Code session on this project is most effective when it has a single declared concern, a known verification command, and a commit gate before the next session begins. This guide covers how to structure sessions, review tool calls, correct course, and keep `CLAUDE.md` accurate.

For structural patterns that keep sessions efficient, see [LLM_CONTEXT_GUIDE.md](./LLM_CONTEXT_GUIDE.md). This guide covers the session itself.

## Goal

Produce small, verifiable, independently reviewable diffs — one concern at a time — with each change confirmed before the next begins.

## Before a Session Starts

Answer three questions:

1. **What is the one concern?** One type in `src/types.ts`, one function in `fifa-sync-core.ts`, one route in `server.ts`, one React component. Not "the full match-state feature."
2. **What is the verification command?** Know it before starting: `npm run lint`, `npm run test:unit`, `npx playwright test tests/e2e/<spec>.ts`, or browser verification via `npm run dev`.
3. **Is `CLAUDE.md` accurate for the target area?** If you are touching `src/appMatches.ts` data flow, confirm the data flow description in `CLAUDE.md` still matches.

If you cannot answer all three, scope the task further before opening the session.

## Prompt Construction

A good prompt includes:

- **Desired behavior, not implementation**: "The route should return `source: "fallback"` with the cached value when the FIFA API is unreachable" — not "use the `cachedBroadcastGuide` variable."
- **A reference pattern**: paste the signature of one existing similar function in `fifa-sync-core.ts` or the structure of one existing route handler in `server.ts`.
- **Explicit scope**: "Add only the `buildPlayerIncidents` function. Do not refactor `buildMatchStateEntry`. Do not add error handling for cases not described here."
- **The relevant guide** (by name): "Following the interface-first stage in INCREMENTAL_CHANGE_GUIDE."

## Verification by Layer

| Changed layer | Verification command |
|--------------|---------------------|
| Type declarations (`src/types.ts`) | `npm run lint` |
| Pure logic (`fifa-sync-core.ts`, `src/standings.ts`) | `npm run test:unit` |
| Server routes (`server.ts`) | `npm run lint` + `npm run deploy:preflight` or manual test |
| React components (`src/components/`) | `npm run lint` + browser via `npm run dev` + `npm run test:e2e` |
| Full regression | `npm run test:e2e` |
| Single spec | `npx playwright test tests/e2e/<spec>.ts` |

Do not treat `npm run lint` passing as sufficient for a route change — run the relevant Playwright spec too.

## Reviewing Tool Calls Before Approving

Claude Code shows a description before executing each tool call. Read it.

| Tool call type | What to check |
|----------------|--------------|
| File read | Is this file in scope for the stated concern? |
| File write / edit | Does the change match the one concern? Is `server.ts` being modified when only `fifa-sync-core.ts` should be? |
| `git add` | Does the staged set match only the intended files? Run `git status` before approving. |
| `git commit` | Does the message name one concern without "and"? |
| `npm run deploy` | Is this intended? Deployment is not a session verification step. |
| Shell command | Is the command reversible? Does it match the task? |

**Watch for unsolicited additions:**
- Refactoring of existing `fifa-sync-core.ts` functions the task did not touch
- New error handling for FIFA API cases not described in the prompt
- New React component abstractions not asked for
- Additional routes or type fields beyond the declared scope

If any appear, redirect immediately — do not let them accumulate.

## Commit Discipline

| Prefix | Use for |
|--------|---------|
| `feat:` | New user-visible behavior or shipped capability |
| `fix:` | Bug fix in existing behavior |
| `test:` | Adding or fixing tests |
| `docs:` | Guide or `CLAUDE.md` / `CONTEXT.md` changes only |
| `refactor:` | Structural change with no behavioral change |
| `chore:` | Version bumps, CI config, repo operations |
| `ci:` | GitHub Actions / CI/CD workflow changes |

A commit message requiring "and" is two commits. `feat(types): add PlayerIncidentsPayload` is correct. `feat: add type and route and tests` is three commits.

## Course Correction

When Claude Code produces something outside the stated scope, correct immediately with a specific rule reference:

- "Do not refactor `buildMatchStateEntry` here — that is a separate concern. Revert that change and add only the new function."
- "The `FifaCalendarMatch` type must not appear in `src/App.tsx`. Use `Match` from `src/types.ts` instead."
- "The commit message has 'and'. Split into: one commit for the type declaration, one for the implementation."

Vague corrections produce vague re-attempts. Reference the specific guide or rule violated.

## Keeping `CLAUDE.md` Accurate

`CLAUDE.md` describes the architecture, data flow, and API endpoints. If it describes a pattern that no longer exists, future sessions will follow the wrong model.

Review `CLAUDE.md` whenever:
- A new API endpoint is added (update the endpoints list in `CLAUDE.md`)
- `src/appMatches.ts` data flow changes
- A new React component category is introduced that changes the navigation model
- A guide is imported into `docs/guides/` (update the guide table in `CLAUDE.md` only after the guide file exists)

`CLAUDE.md` inaccuracy is silent — no lint catches it. Treat it as infrastructure.

## Session Anti-Patterns

### The "while I'm in here" drift

Claude Code refactors a neighboring function in `fifa-sync-core.ts`, adds extra fallback cases not in scope, or cleans up types that were not asked for. Approve only what was requested; redirect with an explicit scope statement.

### Skipping verification

Approving a route commit before running the relevant Playwright spec. If `npm run test:e2e` then fails, the fix is a new commit and the history becomes noisy.

### Growing session

A single conversation accumulates changes to `src/types.ts`, `fifa-sync-core.ts`, `server.ts`, and two React components. Each new change inherits context from the previous ones, making failures harder to isolate. Commit and verify between concerns within the same session.

### Approving a broad `git add`

Staging `server.ts` and `.env` together. Always confirm `git status` before approving the staged set — the production `.env` is preserved across deploys and must not be committed.

## Positive Signals

- Each session ends with `npm run lint` and the relevant test suite passing.
- Diffs are readable in under 30 seconds.
- Commit messages name one concern without "and."
- `CLAUDE.md` endpoint list is updated when a new route is added.
- Out-of-scope additions are redirected before a second tool call executes.
- `src/types.ts` commits precede their implementing commits in the log.

## Warning Signs

- A diff touching `src/types.ts`, `fifa-sync-core.ts`, `server.ts`, and a component for a single stated concern.
- Verification run after the commit rather than before.
- `CLAUDE.md` listing 9 API endpoints when 10 now exist.
- A session that continues past an out-of-scope addition without redirecting.
- A `fifa-sync-core.ts` change committed without `npm run test:unit` passing.

## Related Guides

- [INCREMENTAL_CHANGE_GUIDE.md](./INCREMENTAL_CHANGE_GUIDE.md) — stacked change pattern and per-stage verification; the structural complement to this guide.
- [LLM_CONTEXT_GUIDE.md](./LLM_CONTEXT_GUIDE.md) — structure code so sessions load less context per change.
- [INTERFACE_FIRST_GUIDE.md](./INTERFACE_FIRST_GUIDE.md) — declare the type in `src/types.ts` before generating any implementation.
- [CODE_QUALITY_CONTROL_GUIDE.md](./CODE_QUALITY_CONTROL_GUIDE.md) — quality gates at the verification step of each session.
- [NAMING_GUIDE.md](./NAMING_GUIDE.md) — naming rules that reduce prompt ambiguity and correction loops.

## Summary Checklist

- [ ] One concern defined before starting the session.
- [ ] Verification command known before the first tool call.
- [ ] `CLAUDE.md` confirmed accurate for the target area.
- [ ] Every file write reviewed before approving.
- [ ] Out-of-scope additions redirected immediately with a specific rule.
- [ ] Verification passes before committing.
- [ ] Commit message names one concern without "and."
- [ ] `CLAUDE.md` updated if a new route or architectural pattern was added.

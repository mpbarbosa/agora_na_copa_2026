# Code Quality Control Guide

This guide defines quality-control expectations for implementation changes in
Agora na Copa 26, with focus on boundary-heavy integration code: the FIFA API
adapter and broadcaster normalization (`fifa-sync-core.ts`), the other external
adapters (`weather-core.ts`, `trends-core.ts`), the pure simulators
(`predict-core.ts`, `qualification-sim-core.ts`), and match data assembly
(`src/appMatches.ts`).

It is intentionally narrow: use it to review the quality of implementation
changes, not as a replacement for the architecture and design guides.

## Source of truth

Use this guide together with:

- [High Cohesion Guide](./HIGH_COHESION_GUIDE.md)
- [Low Coupling Guide](./LOW_COUPLING_GUIDE.md)
- [Referential Transparency Guide](./REFERENTIAL_TRANSPARENCY.md)
- [DRY Guide](./DRY_GUIDE.md)
- [Lightweight DDD Guide](./LIGHTWEIGHT_DDD_GUIDE.md)
- [React Guide](./REACT_GUIDE.md)
- [Unit Test Guide](./UNIT_TEST_GUIDE.md)
- [End-to-End Test Guide](./E2E_TEST_GUIDE.md)

## Goal

Catch quality regressions early by checking that new code:

1. lands in the correct bounded context
2. keeps public APIs clear and intentional
3. isolates third-party SDK details at adapter boundaries
4. preserves deterministic helper logic where practical
5. stays covered by repository validation and focused tests

## In this project

Primary integration boundaries to review:

| Boundary | Location | What to check |
|---|---|---|
| FIFA API → internal model | `fifa-sync-core.ts` | FIFA shapes (`FifaCalendarMatch`, `FifaLiveMatch`, …) stay in the core; not leaking into `src/types.ts` |
| Other external APIs → internal model | `weather-core.ts` (Open-Meteo), `trends-core.ts` (Google Trends RSS) | Provider response parsed inside the core; only the resilience-shaped result crosses into `server.ts` |
| Pure domain logic | `predict-core.ts`, `qualification-sim-core.ts` | Deterministic (RNG seeded where applicable); no I/O, no SDK; unit-tested in isolation |
| In-memory session state | `chat-core.ts`, `presence-core.ts` | Pure state transitions; HTTP/transport wiring stays in `server.ts` |
| Internal model → API response | `server.ts` route handlers | Consistent resilience shape (`source`, `note`, `updatedAt`) |
| API response → React components | `src/types.ts` interfaces | Components consuming typed shapes, not raw fetch results |
| External data → match fixtures | `src/appMatches.ts` | Merge logic stays correct when FIFA data shape changes |
| React component tree | `src/components/` | Single responsibility per component; props typed; state local; reusable side effects in named hooks (`src/hooks/`); view-scoped fetches may stay in component `useEffect` with proper cancellation — see [React Guide](./REACT_GUIDE.md) |

The pure backend logic lives in seven root-level `*-core.ts` modules —
`fifa-sync-core.ts`, `trends-core.ts`, `weather-core.ts`, `predict-core.ts`,
`qualification-sim-core.ts`, `chat-core.ts`, `presence-core.ts` — each imported
by both `server.ts` and a matching `tests/<name>.test.ts`. New pure logic
extracted from a route belongs in the relevant core (or a new one), not inlined
in the handler.

When reviewing `server.ts` changes: verify each new route follows the resilience
shape, returns the narrowest accurate status code, and delegates domain logic to
the relevant `*-core.ts` module rather than inlining it in the route handler.

## Code Quality Control and Code LLMs

Quality control discipline also improves the quality of LLM-assisted coding.

Code-focused models produce better edits when each component has a clear
boundary, duplication is avoided, and tests lock down the intended contract.
When those conditions hold, a model generating or modifying code is less likely
to place logic in the wrong layer, duplicate knowledge that already exists, or
produce a change that passes individual unit tests but breaks the broader system.

This does not replace engineering review. It means rigorous quality control is
useful twice: it keeps human reasoning accurate, and it gives code models a
well-structured codebase to reason against.

### Why LLMs Benefit

- Clear responsibility boundaries make it obvious which file an edit belongs in.
- Explicit adapter boundaries prevent infrastructure assumptions from leaking
  into generated domain logic.
- A single source of truth for each rule means a model edits the right copy,
  not a stale duplicate.
- Consistent naming in the ubiquitous language reduces ambiguity in code
  generation.
- A full test suite at unit, integration, and end-to-end levels gives reliable
  feedback after each generated change.

### Where Weak Quality Control Hurts LLMs

- Broad, mixed-responsibility files make it hard to scope a safe edit.
- SDK shapes leaking into domain types cause generated code to couple business
  logic to external providers.
- Duplicated logic means a model may update one copy and silently leave others
  stale.
- Missing or flaky tests make it impossible to confirm whether a generated
  change preserved the intended behavior.
- Infrastructure wiring scattered across layers causes generated changes to
  introduce unwanted side effects in the wrong layer.

## Quality gates

Every substantive code change should satisfy these gates.

### 1. Responsibility gate

- A file, class, or document should keep one clear primary job.
- Wrapper modules should orchestrate runtime behavior, not become generic
  buckets for parsing, mapping, compatibility glue, and policy logic at once.
- If a component description needs repeated "and", split or extract.

### 2. Boundary gate

- Public APIs should expose library-owned concepts by default.
- Third-party SDK shapes should cross into public APIs only when the leak is
  explicit, justified, and documented.
- Dependency quirks, dynamic imports, and version compatibility workarounds
  should stay in narrow internal adapters.

### 3. DDD-alignment gate

- Use the project's established ubiquitous language consistently across all
  modules and documents. See [Lightweight DDD Guide](./LIGHTWEIGHT_DDD_GUIDE.md)
  and `CONTEXT.md` for the canonical terms.
- Prefer value-style modeling for requests, responses, configs, and parsed
  outputs — `src/types.ts` is the single source of truth for these shapes.
- Avoid adding abstractions whose main effect is ceremony rather than clarity.

### 4. Purity gate

- Keep pure mapping, parsing, normalization, and validation logic in small
  reusable helpers where practical.
- Keep filesystem, process, environment, network, and SDK session work in
  explicit runtime-facing modules.
- Do not hide side effects behind utility-sounding names.

### 5. DRY gate

- Every piece of knowledge — logic, configuration, validation rule, or
  documentation — should have one authoritative representation. See
  [DRY Guide](./DRY_GUIDE.md) for the full rule set.
- Extract logic that appears more than once into a named abstraction.
- Keep configuration in one place and reference it everywhere it is needed.
- Do not copy documentation sections — write them once and cross-link.
- Flag "keep in sync" comments as unresolved duplication that must be
  consolidated before merging.

### 6. Test gate

- Changes to public behavior require focused tests at the affected boundary.
- Extracted helper logic should gain direct unit coverage (`npm run test:unit`)
  when its behavior is significant enough to regress independently.
- Critical user-visible flows require end-to-end coverage against the assembled
  stack (`npm run test:e2e`). See [End-to-End Test Guide](./E2E_TEST_GUIDE.md).
- Split tests along responsibility seams when a refactor separates pure logic
  from effectful orchestration.

### 7. Documentation gate

- Update user-facing docs when public API behavior, exports, or recommended
  usage changes.
- Cross-link to related design guides instead of restating them.
- This repo has no `CHANGELOG.md`; record intentional breaking cleanup in the
  commit message using the conventional-commit style already in history
  (`feat:` / `fix:` / `chore:` / `data:`) so the change is discoverable.

### 8. Architecture gate

The project's layering (see `CLAUDE.md` for the full architecture):

- The pure core modules (`fifa-sync-core.ts`, `trends-core.ts`, `weather-core.ts`,
  `predict-core.ts`, `qualification-sim-core.ts`, `chat-core.ts`,
  `presence-core.ts`) must not import from `server.ts` — the dependency is
  one-way: `server.ts` imports them.
- `src/types.ts` shapes should not embed FIFA (or other provider) API response
  structures directly — translate at the relevant `*-core.ts` boundary.
- React components (`src/components/`) must not import from `server.ts`. They
  consume typed shapes from `src/types.ts`. Reusable or view-spanning fetch logic
  belongs in a named hook in `src/hooks/` (e.g. `useTeamLineups`,
  `usePlayerStats`); view-specific one-off fetches may live in a component
  `useEffect` but must use an `active`/`cancelled` flag and return a cleanup.
- `server.ts` is the composition root: it owns routing, caching, and wiring. Do
  not spread these concerns into `fifa-sync-core.ts` or component files.
- New pure logic extracted from `server.ts` must be unit-testable without
  starting the server (`npm run test:unit`).

### 9. React component gate

Apply [React Guide](./REACT_GUIDE.md) rules to every component change:

- Each component has one user-visible responsibility describable without "and".
- Props are typed; components accept only the fields they use, not whole domain objects.
- Data flows down through props; events flow up through callback props.
- State is placed at the narrowest scope where correctness allows.
- Reusable logic with side effects belongs in a named custom hook in `src/hooks/`. View-specific data loading can stay in a component `useEffect` when it does not need to be shared.
- Each `useEffect` targets one external side effect and returns a cleanup function when it opens a resource or issues a fetch (use an `active`/`cancelled` flag to discard stale responses).
- Derived values are computed inline rather than stored as parallel state.

### 10. Validation gate

Run these commands for substantive code changes:

1. Type-check: `npm run lint` (runs `tsc --noEmit`)
2. Unit tests: `npm run test:unit`
3. Build: `npm run build`
4. E2E tests: `npm run test:e2e` (for changes to user-visible flows)
5. Preflight: `npm run deploy:preflight` (before deploying — builds and
   smoke-tests the production bundle locally)

## Positive Signals

- Files and classes have one clear job that can be described in a single
  sentence without "and".
- Public API names reflect the domain language, not the names of the underlying
  SDK or framework.
- Third-party adapter details are isolated to the outermost layer.
- Pure helpers are short, stateless, and directly testable.
- Each piece of logic has one home; changing it requires editing one file.
- Unit, integration, and end-to-end tests are clearly separated and all pass.
- Docs are updated as part of the change — and the commit message records any
  breaking cleanup — not in a follow-up.
- A reviewer can identify the layer and responsibility of any changed file from
  its imports and contents alone.

## Warning Signs

- A file orchestrates behavior, maps data, handles errors, and manages
  configuration all at once.
- SDK types appear in public APIs or domain models with no justification.
- Compatibility workarounds are mixed in with business logic.
- The same calculation or validation appears in more than one place.
- A "keep in sync" comment guards duplicated logic.
- New behavior is only covered by the test that already existed, with no
  dedicated focused test.
- Documentation changes are missing from a PR that modifies public behavior.
- An inner-layer file imports from a framework, database client, or SDK.
- Infrastructure wiring is spread across domain or use-case files.

## Summary Checklist

- [ ] The change belongs to the correct module boundary.
- [ ] Public names reflect domain concepts rather than accidental SDK naming.
- [ ] Compatibility shims are isolated from business-facing APIs.
- [ ] Pure helpers are separated from runtime orchestration where practical.
- [ ] No logic or knowledge is duplicated — each fact has one authoritative home.
- [ ] New abstractions improve clarity more than they increase indirection.
- [ ] Unit tests cover the changed boundary and any newly extracted critical helper.
- [ ] Cross-boundary behavior is covered by integration tests against real boundaries.
- [ ] Critical user-visible flows are covered by end-to-end tests.
- [ ] Docs reflect any meaningful API or behavior change, and the commit message
      records any intentional breaking cleanup (this repo has no `CHANGELOG.md`).
- [ ] Repository validation commands still pass.
- [ ] No inner-layer file (domain, use case) imports from an outer layer.
- [ ] Domain and use-case files have no framework, database, or SDK imports.
- [ ] Use-case logic delegates I/O through inner-layer interfaces, not by constructing infrastructure directly.
- [ ] Adapter translation code does not leak into domain types or use-case logic.
- [ ] Infrastructure wiring is confined to the outermost layer or composition root.
- [ ] Each React component has one describable responsibility (no "and").
- [ ] Component props are typed and carry only the fields the component uses.
- [ ] State is placed at the narrowest correct scope; derived values are computed inline.
- [ ] Reusable or view-spanning fetch logic is in a named hook in `src/hooks/`; view-scoped `useEffect` fetches use an `active`/`cancelled` flag and return a cleanup.
- [ ] No component imports from `server.ts`; consumed API shapes are typed via `src/types.ts`.

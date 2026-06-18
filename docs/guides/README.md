# Engineering Guides

Adapted from the [doc_template_lib](https://github.com/mpbarbosa/doc_template_lib) template library.
The CLAUDE.md guide table is the canonical entry point — consult the relevant guide before making changes in that area.

## Imported Guides

| Guide | Rationale for this project |
|-------|---------------------------|
| [CLEAN_ARCHITECTURE_GUIDE.md](./CLEAN_ARCHITECTURE_GUIDE.md) | Maps the three-layer split (`src/types.ts` → `fifa-sync-core.ts` → `server.ts`) and enforces that inner layers stay free of Express and FIFA API SDK imports. |
| [CLAUDE_CODE_WORKFLOW_GUIDE.md](./CLAUDE_CODE_WORKFLOW_GUIDE.md) | Claude Code is the primary development tool; session discipline (scope, verify, commit) directly determines diff quality and `CLAUDE.md` accuracy. |
| [CODE_QUALITY_CONTROL_GUIDE.md](./CODE_QUALITY_CONTROL_GUIDE.md) | Catch-all quality gate for reviewing any PR in this repo. |
| [DEFENSIVE_CODING_GUIDE.md](./DEFENSIVE_CODING_GUIDE.md) | Route params (`:matchId`, `:teamCode`) and FIFA API responses are the two external input surfaces that must be validated before reaching pure logic. |
| [DOMAIN_DESIGN_CONTROL_GUIDE.md](./DOMAIN_DESIGN_CONTROL_GUIDE.md) | Keeps `Fifa*` adapter types at the `fifa-sync-core.ts` boundary, enforces the resilience shape on every API response, and protects the pt-BR vocabulary. |
| [DRY_GUIDE.md](./DRY_GUIDE.md) | The resilience shape (`source`/`note`/`updatedAt`) and broadcaster normalization patterns are high-duplication risks; `src/types.ts` as the single type source is the primary DRY mechanism. |
| [E2E_TEST_GUIDE.md](./E2E_TEST_GUIDE.md) | The full Playwright suite in `tests/e2e/` is the primary integration verification method. |
| [ERROR_HANDLING_GUIDE.md](./ERROR_HANDLING_GUIDE.md) | The FIFA API fallback contract (`source: "fallback"`, `note`, `updatedAt`) is a first-class architectural decision requiring consistent error classification and propagation rules. |
| [HIGH_COHESION_GUIDE.md](./HIGH_COHESION_GUIDE.md) | Pressure to add logic to `server.ts` when it belongs in `fifa-sync-core.ts` is the primary cohesion risk. |
| [INCREMENTAL_CHANGE_GUIDE.md](./INCREMENTAL_CHANGE_GUIDE.md) | Structures Claude Code work into declare-type → write-test → implement → UI stages so each stage has a verification gate. |
| [INTERFACE_FIRST_GUIDE.md](./INTERFACE_FIRST_GUIDE.md) | `src/types.ts` is the interface-first hub; every new API response type, component prop shape, and `fifa-sync-core.ts` function signature must be declared there before any implementation. |
| [LIGHTWEIGHT_DDD_GUIDE.md](./LIGHTWEIGHT_DDD_GUIDE.md) | Guides vocabulary alignment between `CONTEXT.md` domain terms and code identifiers; prevents FIFA API terminology from leaking into domain names. |
| [LLM_CONTEXT_GUIDE.md](./LLM_CONTEXT_GUIDE.md) | `server.ts` (62 KB) is the clearest signal that context cost management matters; this guide governs extraction decisions and naming density. |
| [LOW_COUPLING_GUIDE.md](./LOW_COUPLING_GUIDE.md) | The `server.ts` → `fifa-sync-core.ts` → `src/types.ts` dependency direction must be unidirectional; this guide keeps it explicit. |
| [MOBILE_FIRST_GUIDE.md](./MOBILE_FIRST_GUIDE.md) | The app is a match-day companion viewed on mobile; all UI is designed mobile-first per `DESIGN.md`. |
| [NAMING_GUIDE.md](./NAMING_GUIDE.md) | Domain vocabulary is bilingual (pt-BR labels, English identifiers) with a FIFA API adapter boundary — naming discipline prevents leakage and ambiguity. |
| [NODE_MODULE_GUIDE.md](./NODE_MODULE_GUIDE.md) | Governs the pure-core / imperative-shell split between `fifa-sync-core.ts` (testable without network) and `server.ts` (Express + FIFA API calls). |
| [REACT_GUIDE.md](./REACT_GUIDE.md) | React 19 component design, state management, and data-flow conventions for `src/components/`. |
| [REFERENTIAL_TRANSPARENCY.md](./REFERENTIAL_TRANSPARENCY.md) | `fifa-sync-core.ts` and `src/standings.ts` are the pure-logic modules; this guide keeps them side-effect-free and unit-testable. |
| [REST_API_GUIDE.md](./REST_API_GUIDE.md) | The 9 API endpoints in `server.ts` must follow resource-oriented design, consistent status codes, and the shared resilience envelope. |
| [UNIT_TEST_GUIDE.md](./UNIT_TEST_GUIDE.md) | `tests/fifa-sync-core.test.ts` and `tests/standings.test.ts` are the unit test suite; this guide governs their structure and scope. |

## Not Imported

| Guide | Reason |
|-------|--------|
| `DDD_GUIDE.md` | Full strategic DDD (aggregates, bounded-context maps, domain events) is overkill for a broadcast companion app. `LIGHTWEIGHT_DDD_GUIDE.md` covers the relevant vocabulary and separation concerns. Import when the domain model grows to require aggregate-root invariant enforcement. |
| `INTEGRATION_TEST_GUIDE.md` | No integration tests exist yet (middle tier: Express routes + real FIFA API responses). The current unit + E2E combination covers the space. Import when API integration tests are added — e.g., route tests using a real FIFA API fixture server. |
| `OBSERVABILITY_GUIDE.md` | No structured logging, metrics, or distributed tracing infrastructure exists. `console.error` and `console.log` are used informally. Import when structured log emission (JSON fields, log levels, trace IDs) is added to `server.ts`. |
| `SOLID_GUIDE.md` | The relevant SOLID principles (single responsibility, open/closed, dependency inversion) are already covered by `HIGH_COHESION_GUIDE.md`, `LOW_COUPLING_GUIDE.md`, and `CLEAN_ARCHITECTURE_GUIDE.md`. Full SOLID would add abstract overhead for this project size. |

## How to Use These Guides

1. **Starting a new feature**: Read [INCREMENTAL_CHANGE_GUIDE.md](./INCREMENTAL_CHANGE_GUIDE.md) for decomposition, then [INTERFACE_FIRST_GUIDE.md](./INTERFACE_FIRST_GUIDE.md) before writing any code.
2. **Reviewing a PR**: Start with [CODE_QUALITY_CONTROL_GUIDE.md](./CODE_QUALITY_CONTROL_GUIDE.md), then pull the domain-specific guide for whatever area changed (`REST_API_GUIDE.md`, `REACT_GUIDE.md`, `NODE_MODULE_GUIDE.md`, etc.).
3. **Running a Claude Code session**: Read [CLAUDE_CODE_WORKFLOW_GUIDE.md](./CLAUDE_CODE_WORKFLOW_GUIDE.md) before starting; use [LLM_CONTEXT_GUIDE.md](./LLM_CONTEXT_GUIDE.md) to decide what context to include.
4. **Adding a new API endpoint**: `INTERFACE_FIRST_GUIDE.md` → `ERROR_HANDLING_GUIDE.md` → `DEFENSIVE_CODING_GUIDE.md` → `REST_API_GUIDE.md`.
5. **Checking architecture decisions**: `CLEAN_ARCHITECTURE_GUIDE.md` for layer placement, `DOMAIN_DESIGN_CONTROL_GUIDE.md` for domain-boundary review.

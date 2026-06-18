---
name: import-adapt-guides
description: >
  Analyze the reusable guide templates in the sibling doc_template_lib repo,
  assess which guides suit this project, copy the selected ones into
  docs/guides/, adapt each guide against the actual codebase, and update the
  docs/guides/README.md index. Use this skill when the user asks to import,
  refresh, or sync engineering guides from the shared template library.
---

## Overview

The guide template library lives at:

```
/home/mpb/Documents/GitHub/doc_template_lib/
```

It contains reusable Markdown guides in three folders:

| Folder | Content |
|--------|---------|
| `code_quality/` | Cross-cutting engineering principles (architecture, testing, naming, etc.) |
| `domain_specific/` | Domain-model, API, platform, and framework-family guides |
| `frontend/` | React and browser-platform guidance |

The target repo stores adapted guides in `docs/guides/`. The index is `docs/guides/README.md`.

---

## Steps

### Step 1 — Read the template catalog

Read the library's `CLAUDE.md` for its full guide table. The table lists every guide, its file path, and a one-line description.

> Path: `/home/mpb/Documents/GitHub/doc_template_lib/CLAUDE.md`

Treat **meta-docs** (not reusable templates) as out of scope — skip these:
`docs/API.md`, `docs/ARCHITECTURE.md`, `docs/CONTRIBUTING.md`,
`docs/GETTING_STARTED.md`, `CHANGELOG.md`.

### Step 2 — Read the existing import index

Read the current `docs/guides/README.md` in the target repo. It records:
- which guides are already imported (with their rationale),
- which were explicitly skipped (with the reason).

Use this as the baseline: do not re-import what is already present, and do
not override a deliberate skip decision without a clear new reason.

If `docs/guides/README.md` does not exist yet, treat all guides as candidates.

### Step 3 — Understand the current codebase

Read the following to build a concrete picture before making any assessment:

- `CLAUDE.md` — architecture, modules, entry points, conventions
- `CONTEXT.md` — domain terminology and bounded contexts
- `DESIGN.md` — visual language, component patterns
- `src/` directory listing — React components, hooks, data, utils, types
- `server.ts` and `fifa-sync-core.ts` — Express backend and FIFA API integration
- `tests/` directory listing — what test suites exist (unit vs E2E)
- `tests/e2e/` listing — Playwright specs

### Step 4 — Assess each unimported template

For every guide in the library that is **not yet imported**, decide:

**Import** if at least two of the following are true for this repo:
1. The repo already has the kind of code the guide governs.
2. The guide addresses a real risk or recurring pressure visible in the codebase.
3. It would be directly cited when reviewing a PR or debugging a design choice.

**Skip** if any of the following are true:
1. The repo has no code in that domain (e.g., no ADRs → skip ADR-focused guides).
2. An already-imported guide covers the same concern adequately.
3. The guide is scoped to a pattern that conflicts with the repo's stated design approach.
4. The guide was previously skipped with a reason that still holds.

When a previously-skipped guide's condition has changed (e.g., "import once
integration tests exist" and now they do), treat it as a candidate.

Record your decision for every guide — both import and skip — so the README
can be updated fully.

#### Common re-assessment triggers for this repo

| Event | May unlock |
|-------|-----------|
| Node.js backend routes added | `NODE_MODULE_GUIDE.md` |
| Error boundaries or FIFA API fallbacks added | `ERROR_HANDLING_GUIDE.md` |
| Input validation added at API routes | `DEFENSIVE_CODING_GUIDE.md` |
| Structured logging or metrics added to server | `OBSERVABILITY_GUIDE.md` |
| Integration tests added (API + real data) | `INTEGRATION_TEST_GUIDE.md` |
| Claude Code used for AI-assisted development | `LLM_CONTEXT_GUIDE.md`, `CLAUDE_CODE_WORKFLOW_GUIDE.md` |
| Shared domain vocabulary expanded (CONTEXT.md) | `NAMING_GUIDE.md` |
| More complex React component tree | `SOLID_GUIDE.md`, `INTERFACE_FIRST_GUIDE.md` |

### Step 5 — Read the full source of each guide to import

For each guide selected for import, read the full source file from the library
before writing the adapted version. Do not adapt from memory or from the
one-line description alone.

### Step 6 — Adapt each guide

Copy the guide to `docs/guides/<GUIDE_NAME>.md` and adapt it for this repo
using the rules below. **Adapt one guide at a time.**

#### Adaptation rules

**Replace generic project language with repo-specific terminology.**

> Generic: "the business rules in your domain model"
> Adapted: "the match-state decisions in `fifa-sync-core.ts` and broadcaster normalization in `server.ts`"

**Map abstract layers, components, and boundaries to concrete files.**

Each guide typically defines layers or component categories. Map each one to a
real file or directory in this repo. Add a reference table if the guide doesn't
already have one.

| Concept | Concrete location |
|---------|------------------|
| Domain types / contracts | `src/types.ts` |
| Domain logic / pure functions | `fifa-sync-core.ts`, `src/standings.ts` |
| HTTP API boundary | `server.ts` (routes) |
| Data assembly / orchestration | `src/appMatches.ts` |
| React components | `src/components/` |
| Shared UI state | `src/App.tsx` (theme, match selection) |
| Unit tests | `tests/fifa-sync-core.test.ts`, `tests/standings.test.ts` |
| E2E tests | `tests/e2e/` (Playwright specs) |
| Static fixtures / source of truth | `src/matches.json` |

**Replace generic examples with real commands, paths, and test patterns.**

> Generic: "run your test suite against a real database"
> Adapted: "`npm run test:unit` for pure logic; `npm run test:e2e` for full-stack browser flows"

**Trim sections that do not apply.** Remove or condense sections whose
technology or pattern has no presence in this repo (e.g., sections on
message queues, blue/green deploys, or database ORM patterns). Do not
remove the core principle — only the inapplicable examples.

**Add a "Current repo reality" section when the guide principle is partially
met or evolving.** Be honest: if the codebase doesn't yet implement the full
recommendation, say so and give the current baseline.

**Preserve the guide's structural skeleton.** Keep the heading hierarchy
(Goal → What it means → Why it matters → Rules / Signals / Checklist). This
makes guides predictable and skimmable.

**Cross-reference sibling guides** that are already in `docs/guides/`. Do not
link to templates in the library; link to the adapted copies.

#### Adaptation depth guide

| Guide type | Expected depth of adaptation |
|------------|------------------------------|
| Architecture (Clean, Coupling, Cohesion) | High — map every layer to repo paths |
| Testing (Unit, Integration, E2E) | High — give real test commands, fixture patterns, seam descriptions |
| API design (REST) | High — map to actual routes in `server.ts` and resilience shape |
| Language/framework (React, Node module) | Medium — scope to `src/components/` or `server.ts`/`fifa-sync-core.ts` |
| Cross-cutting principles (DRY, Naming, Error handling) | Medium — add repo-specific examples but keep the general rules |
| AI-assisted development (LLM Context, Incremental Change) | Low-medium — add project-specific file and token budget notes |

### Step 7 — Update the README index

Write or rewrite `docs/guides/README.md` to reflect the full current state:

1. **Imported guides table** — add each newly imported guide with a one-sentence
   rationale specific to this repo (not a generic description).
2. **Not imported table** — update skip reasons for any guide whose status
   changed. For guides that remain skipped, confirm the reason is still accurate.
3. **How to use these guides** — keep this section current. Reference the
   `CLAUDE.md` guide table so newcomers know where to start.
4. **Links** — ensure all links in the README resolve correctly.

### Step 8 — Verify

After writing all adapted guides:

1. Confirm every new file is in `docs/guides/`.
2. Confirm `docs/guides/README.md` lists each new guide in the "Imported" table
   and cross-references any old "Not imported" entry if one existed.
3. Check that all intra-guide links (`[REST API Guide](./REST_API_GUIDE.md)`)
   resolve to files that actually exist in `docs/guides/`.
4. Check that no generic placeholder text (e.g., "your project", "your stack",
   "your domain") survived into the adapted guides.

---

## Quality bar for adapted guides

A well-adapted guide should pass this checklist:

- [ ] A new team member working on this specific repo can follow it without
      knowing the template library.
- [ ] Every file or directory path mentioned exists in the current repo.
- [ ] Every command shown (`npm run test:unit`, `npm run test:e2e`, etc.) is
      a real, runnable command for this repo.
- [ ] The core principle is preserved — only the generic scaffolding was replaced.
- [ ] It is shorter than the source template (adaptation removes, not adds prose).
- [ ] The "Current repo reality" section is honest about gaps.

---

## What NOT to do

- Do not import guides wholesale without adapting (a guide that still says "your
  database" or "your domain model" has not been adapted).
- Do not invent code examples that don't exist in the repo.
- Do not add guides for concerns the repo genuinely does not have (e.g., full
  DDD strategic patterns for what is primarily a broadcast companion UI).
- Do not remove the "Not imported" section from README — explicit skips are as
  valuable as imports because they prevent re-relitigating decisions.
- Do not update `CLAUDE.md` to reference a guide that has not yet been written;
  only update `CLAUDE.md` after the guide file exists.

# DRY Guide

DRY (Don't Repeat Yourself) is a core design rule for Agora na Copa 26.

## Goal

Every piece of knowledge — code logic, configuration, documentation, or
business rule — should have a single, unambiguous, authoritative representation
in the system. When that knowledge changes, the change should happen in one
place and propagate everywhere it is needed, without requiring coordinated edits
across multiple copies.

## In this project

Key single sources of truth — do not duplicate these:

| Knowledge | Canonical location |
|---|---|
| TypeScript types and shapes | `src/types.ts` — extend here first, before touching data or components |
| Match fixtures and player lineups | `src/matches.json` |
| Full assembled match dataset | `src/appMatches.ts` (`APP_MATCHES`) |
| Tournament standings, teams, stadiums | `src/data/tournament.ts` |
| Navigation tabs | `src/navigation.ts` (`NAV_ITEMS`) |
| Domain terminology (pt-BR) | `CONTEXT.md` — check before adding new UI labels |
| Visual language and design tokens | `DESIGN.md` + `src/index.css` |
| FIFA API reference | `FIFA_API_DOCUMENTATION.md` |

When a new type appears, register it in `src/types.ts` first. When a new term
appears in the UI, add it to `CONTEXT.md`. When a visual convention is
established, document it in `DESIGN.md`.

## What DRY Means

DRY means the system has one canonical source for each fact or behavior.
Duplication is replaced by a reference or an abstraction that names the shared
knowledge explicitly.

A DRY system can locate each rule in exactly one place:

- "The discount formula lives in `pricing.calculate_discount`, not in three
  controllers."
- "The API base URL is read from `config.API_BASE`, not hardcoded in each
  client file."
- "The retry policy is documented once in `RESILIENCE_GUIDE.md` and linked
  from wherever retry behavior is discussed."

If changing a fact requires searching for all the places it was copied, the
system is not DRY.

## Why It Matters

1. It reduces the cost of change — one edit is enough.
2. It eliminates drift between copies that were once identical.
3. It makes rules and facts easier to locate and verify.
4. It reduces the surface area for bugs introduced during partial updates.
5. It improves the signal-to-noise ratio of reviews and diffs.

## DRY and Code LLMs

DRY also improves the quality of LLM-assisted coding.

Code-focused models benefit when each rule or fact has a clear home. When logic
is duplicated across files, an LLM may update one copy, miss another, or
generate inconsistent behavior without any visible error. A single authoritative
source makes the correct location easy to find and the safe edit obvious.

This does not replace normal engineering discipline. It means DRY is useful
twice: it helps humans maintain consistency, and it helps code models locate and
update knowledge without creating silent divergence.

### Why LLMs Benefit

- A single source of truth gives the model a clear edit target.
- Abstractions named after the rule they encode make intent explicit.
- Centralized configuration reduces the chance of partial updates.
- Fewer copies mean smaller diffs and lower risk of accidental regression.
- Cross-linked documents reduce the need to replicate guidance in full.

### Where Duplication Hurts LLMs

- Copied logic may be updated in one file and missed in others.
- Hardcoded values scattered across files create silent inconsistency.
- Repeated documentation blocks diverge and contradict each other over time.
- The model cannot tell which copy is canonical and may reason from a stale one.

## Required Rules

1. Extract any logic that appears more than once into a named abstraction.
2. Keep configuration in one place and reference it everywhere it is needed.
3. Do not copy business rules into multiple layers — own them in one place and
   delegate.
4. Do not copy documentation sections — write them once and cross-link.
5. Treat schema definitions, validation rules, and error messages as knowledge
   that belongs in a single authoritative location.
6. Prefer parameterization over branched copies of similar logic.
7. When the same behavior is needed in two contexts, introduce an abstraction
   rather than inlining the logic in both places.

## Positive Signals

- A change to a rule, value, or policy requires editing one file.
- Shared logic has a name that explains what it encodes.
- Configuration is read from a single source throughout the codebase.
- Related documents reference a shared guide rather than restating it.
- Diffs for a knowledge change are small and localized.
- Abstractions are named after the concept they represent, not where they
  happen to be used.

## Warning Signs

- The same calculation, condition, or validation appears in multiple files.
- A constant is hardcoded with the same value in several places.
- Two documents explain the same rule differently.
- Changing one fact requires a grep-and-replace across the codebase.
- Comments like "keep in sync with X" appear near copied code.
- A test fixture, schema definition, or message string is duplicated with
  minor variations.
- Copied code has already drifted and the copies no longer agree.

## Applying DRY by Component Type

| Component type | DRY approach |
| --- | --- |
| Domain module | Own each business rule once; expose it through a stable API |
| Service | Delegate shared logic to domain modules; do not reimplement it |
| Persistence adapter | Define schema and query logic in one layer |
| Transport adapter | Share serialization, validation, and error-mapping logic |
| UI/view module | Reference shared constants, labels, and formatters from one source |
| Configuration | Read values from a single config entry point |
| Documentation file | Write each rule once and cross-link from related guides |

Keep the single source of truth as close to the domain as practical, and let
other layers reference or delegate to it.

## Best Practices

### When Creating a New File

1. Before writing logic, check whether it already exists elsewhere.
2. Extract shared logic into a named module if it is needed in two or more
   places.
3. Read constants and configuration from a central source instead of defining
   them locally.
4. Name abstractions after the concept they represent so they are easy to find.

### When Creating Functions or Classes

1. Accept shared behavior by reference — call the existing function rather than
   restating its logic.
2. Parameterize variants instead of maintaining separate copies.
3. Avoid duplicating validation or transformation logic that lives in the domain
   layer.
4. Write helpers that have one clear job and can be shared without coupling
   callers to each other.
5. Prefer boundaries that let both humans and tools locate the canonical source
   from nearby context.

### When Writing Documentation

1. Write each rule, definition, or policy in exactly one document.
2. Link to that document from every other guide that references the same
   concept.
3. Do not copy sections from one guide into another — cross-link instead.
4. When guidance diverges between copies, pick one authoritative version and
   remove the rest.

## Refactoring for DRY

When duplication has accumulated, reduce it systematically rather than
treating all copies as equivalent.

1. Identify the copies and decide which is the authoritative version.
2. Extract the shared logic or content into a single named location.
3. Replace all copies with a reference or call to the authoritative source.
4. Remove the now-redundant copies.
5. Rename the extracted abstraction if needed so its purpose is clear.
6. Verify that the single source covers all the cases that the copies handled.
7. Update documentation to link rather than restate where applicable.

## Review Heuristics

### Single-Source Test

If a fact, rule, or behavior changes, how many files need to be updated? If
the answer is more than one, the knowledge is probably duplicated.

### Name Test

Does the duplicated logic have a name? Unnamed repetition is a signal that the
abstraction has not been created yet.

### Drift Test

Are the copies still identical? If they have diverged, one is already wrong and
the duplication has become a defect.

This matters even more in LLM-assisted work: a model that reasons from a stale
copy may confidently produce incorrect behavior without any visible warning.

### Search Test

Can the canonical location of a value, rule, or policy be found in one lookup
without ambiguity? If not, there is likely no single source of truth.

### Sync Comment Test

Does a comment say "keep in sync with" or "same as"? That is a marker of
unresolved duplication waiting to drift.

## Preferred Fixes

1. Extract duplicated logic into a named function, module, or document.
2. Replace inline copies with a reference to the extracted abstraction.
3. Move repeated constants and configuration values to a single shared source.
4. Remove documentation copies and add cross-links to the authoritative guide.
5. Parameterize diverged variants instead of maintaining separate copies.
6. Delete "keep in sync" comments by eliminating the duplication they guard.

## Summary Checklist

- [ ] Each business rule, formula, or policy lives in one place.
- [ ] Constants and configuration values are defined once and referenced
  everywhere.
- [ ] No logic is duplicated with a "keep in sync" comment as a substitute for
  a real abstraction.
- [ ] Shared behavior has a name that explains what it encodes.
- [ ] Documentation sections are not copied — they are cross-linked.
- [ ] A change to any fact requires editing exactly one file.
- [ ] Copies that have already drifted are identified and consolidated.
- [ ] A reviewer or code-focused LLM could find the canonical source for any
  rule from its local context.

# Referential Transparency Guide

Referential transparency is a core design rule for Agora na Copa 26.

## Goal

Keep calculations, transformations, and decision logic deterministic and free of
observable side effects whenever practical. A referentially transparent
expression should be replaceable with its result without changing program
behavior.

## In this project

`fifa-sync-core.ts` is the canonical example: it was extracted from `server.ts`
specifically to hold pure, side-effect-free FIFA API logic (match-finding,
broadcaster normalization, lineup building, match-state building). It accepts
explicit inputs — fetched FIFA API data, config values — and returns
deterministic results with no live HTTP calls. Effects happen in `server.ts`,
which passes the fetched data in. This is the pattern to follow when pulling new
logic out of `server.ts`.

New domain logic (`src/standings.ts`, score calculations, formatter helpers)
should also be deterministic. Pass time, fetch results, and external data as
explicit parameters rather than reading from ambient globals or module-level
state.

## What Referential Transparency Means

Referential transparency means the same input always produces the same output,
and evaluating the logic does not mutate external state or depend on hidden
runtime context.

A referentially transparent component behaves like a math function:

- "Given these inputs, it always returns this result."
- "It does not read hidden globals, current time, random values, or ambient
  process state unless those are passed in explicitly."
- "It does not write to storage, network, logs, UI state, or shared mutable
  objects as part of the calculation."

This is closely related to pure functions. In practice, referential
transparency is the standard to aim for in domain logic, validation,
transformation, formatting, and policy decisions. Effects may still exist, but
they should be isolated at explicit boundaries.

## Why It Matters

1. It makes behavior easier to reason about.
2. It makes tests smaller and more reliable.
3. It reduces bugs caused by hidden state and unexpected mutation.
4. It improves reuse because logic depends on explicit inputs.
5. It makes refactoring safer because behavior is easier to preserve.

## Referential Transparency and Code LLMs

Referential transparency also improves the quality of LLM-assisted coding.

Code-focused models are safer when behavior is determined by visible inputs
instead of hidden state, ambient configuration, or temporal effects. When a
function reads only its parameters and returns a value without side effects, an
LLM can usually understand the contract faster, infer impact more accurately,
and edit the code with less risk of breaking unrelated behavior.

This does not replace normal engineering discipline. It means referential
transparency is useful twice: it helps humans reason about correctness, and it
helps code models avoid accidental side effects during automated or
semi-automated changes.

### Why LLMs Benefit

- Explicit inputs make behavior easier to infer from local context.
- Pure transformations are easier to test, compare, and refactor.
- Hidden state and timing dependencies are less likely to be missed.
- Local reasoning becomes more reliable because fewer effects are implicit.
- Generated changes are safer when core logic is deterministic.

### Where Non-Transparent Logic Hurts LLMs

- Globals and shared mutable state hide real dependencies.
- Calls to time, randomness, environment, or I/O blur what the function
  actually depends on.
- Mutation makes before-and-after state harder to track.
- One edit can accidentally change behavior in distant callers.

## Required Rules

1. Prefer deterministic functions for business rules, validation, formatting,
   parsing, and transformations.
2. Pass time, randomness, configuration, and external data in as explicit
   inputs when practical.
3. Keep I/O, persistence, logging, network calls, UI updates, and other side
   effects at clear boundary layers.
4. Do not mutate input arguments unless mutation is the explicit purpose of the
   API and is clearly documented.
5. Prefer returning new values over modifying shared objects, arrays, or
   process-wide state.
6. Separate decision-making logic from effectful orchestration.
7. Tests for core logic should not require live clocks, global setup, or
   external services when deterministic inputs would suffice.
8. When full referential transparency is not practical, keep the impure surface
   narrow and make the source of non-determinism obvious.

## Positive Signals

- A function's output can be predicted from its arguments alone.
- Helpers return new values instead of mutating inputs.
- Domain logic can be tested with plain data and direct assertions.
- Time and random sources are injected or passed as parameters.
- Effectful code is concentrated in entry points, adapters, handlers, or
  boundary services.
- Re-running the same calculation with the same inputs gives the same result.

## Warning Signs

- A function reads globals, environment variables, or singleton state without
  making that dependency explicit.
- Logic calls `Date.now()`, random generators, or current process state deep
  inside reusable code.
- Helpers mutate arrays, objects, caches, or shared registries in place.
- One method both decides policy and performs several side effects.
- Tests require broad setup because the unit depends on hidden runtime context.
- Behavior changes depending on call order or prior invocations.

## Applying Referential Transparency by Component Type

| Component type | Referentially transparent approach |
| --- | --- |
| Validator | Accept input data and return pass/fail or structured errors |
| Formatter | Convert one value shape into another without side effects |
| Parser | Transform input text or bytes into structured data deterministically |
| Domain rule | Compute decisions from explicit inputs only |
| Selector/query helper | Derive values from provided state without mutation |
| Effect wrapper | Call pure helpers, then perform logging, I/O, or persistence at the boundary |
| Documentation file | Describe how to isolate effects instead of mixing process guidance with theory |

Keep calculations and decisions pure by default, and keep orchestration code
thin around them.

## Best Practices

### When Creating a New File

1. Put deterministic business logic in focused modules close to the data it
   operates on.
2. Keep I/O adapters, transport layers, and storage concerns separate from pure
   calculations.
3. Name boundary modules clearly when they own effects.
4. Prefer files whose purpose makes the pure-versus-impure split obvious.

### When Creating Functions or Classes

1. Accept all required data as parameters instead of reading hidden context.
2. Return derived values instead of mutating caller-owned inputs.
3. Split calculation from orchestration when one function starts doing both.
4. Inject clocks, random sources, and external clients when they are needed.
5. Prefer APIs that let both humans and tools understand what drives behavior
   from nearby context.

### When Writing Documentation

1. Show how to separate calculations from effects.
2. Prefer generic examples over project-specific runtime details.
3. Cross-reference related design guides instead of repeating shared
   architectural advice.
4. Be explicit about where impurity is acceptable and how to contain it.

## Refactoring for Better Referential Transparency

When logic is hard to test or reason about, first look for hidden inputs and
hidden outputs.

1. Identify every source of non-determinism: time, random values, globals,
   caches, environment, I/O, and mutation.
2. Separate pure calculations from effectful steps.
3. Pass hidden inputs in as explicit parameters or injected collaborators.
4. Return new values instead of mutating shared state where practical.
5. Move persistence, logging, network, and UI updates to boundary code.
6. Re-check whether the core behavior can now be tested with direct input/output
   assertions.

## Review Heuristics

### Substitution Test

Could the function call be replaced with its return value without changing
observable behavior?

If not, either the logic is not referentially transparent or the effectful part
needs to be separated more clearly.

### Hidden Input Test

Does the behavior depend on anything other than visible parameters?

If yes, make that dependency explicit or confine it to a boundary layer.

### Mutation Test

Does evaluating the logic change caller-owned data, shared objects, or global
state?

If yes, the function is not referentially transparent and should usually be
split or renamed to make mutation explicit.

### Repetition Test

If the same inputs are evaluated several times, is the result always identical?

If not, inspect time, randomness, external state, or order-dependent behavior.

### Boundary Test

Are side effects grouped near entry points, adapters, controllers, or handlers,
or are they scattered across reusable logic?

Scattered effects make both human review and LLM-assisted changes less safe.

## Preferred Fixes

1. Extract pure helper functions from effectful workflows.
2. Pass clocks, configuration, and external results in explicitly.
3. Replace in-place mutation with returned copies or derived values.
4. Move logging, persistence, transport, and UI updates to boundary code.
5. Rename intentionally effectful functions so callers can see the contract.
6. Keep related architectural guidance in [HIGH_COHESION_GUIDE.md](./HIGH_COHESION_GUIDE.md)
   and [LOW_COUPLING_GUIDE.md](./LOW_COUPLING_GUIDE.md) rather than duplicating
   it here.

## Summary Checklist

- [ ] The core logic is deterministic for the same inputs.
- [ ] Hidden dependencies have been turned into explicit inputs where practical.
- [ ] Inputs are not mutated unless mutation is the documented contract.
- [ ] Side effects are isolated to clear boundary code.
- [ ] Time, randomness, and environment access are visible in the API design.
- [ ] Tests can validate the main behavior with direct input/output assertions.
- [ ] A reviewer or code-focused LLM can infer the function's behavior from local
  context.

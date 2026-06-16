# Lightweight DDD Guide

Lightweight Domain-Driven Design (DDD) is a useful design rule for Agora na Copa 26.

## Goal

Use DDD to make a project's core concepts, boundaries, and policies clearer
without forcing heavy modeling or architecture ceremony where it adds little
value.

## In this project

**Ubiquitous language**: defined in `CONTEXT.md`. Check it before adding new UI
labels in pt-BR. When a new domain concept emerges, add it there with the
canonical term, an "Avoid" list, and a reference to the relevant component or
data shape.

**Bounded contexts**:

| Context | Location | Responsibility |
|---|---|---|
| Domain core | `src/types.ts`, `src/matches.json`, `src/standings.ts` | Match fixtures, player shapes, standings computation |
| FIFA integration | `fifa-sync-core.ts` | Adapts FIFA API responses into internal types |
| Data assembly | `src/appMatches.ts`, `src/data/tournament.ts` | Merges and assembles the full match and tournament dataset |
| Presentation | `src/components/` | Renders views; consumes prepared data, contains no domain rules |
| Infrastructure | `server.ts` | Routing, caching, Vite proxy, FIFA API calls |

**Anti-corruption layer**: `fifa-sync-core.ts` is the boundary between the FIFA
API's vocabulary and the internal model. FIFA-specific field names, ID formats,
and response shapes should not leak past this file — translate into `src/types.ts`
shapes at this boundary.

## What Lightweight DDD Means

Lightweight DDD means using the parts of DDD that improve language, boundaries,
and invariants while skipping patterns that do not match the actual problem.

In practice, it usually means:

1. Use a clear ubiquitous language for the concepts the system actually owns.
2. Keep bounded contexts explicit so unrelated concerns do not blur together.
3. Model important values and invariants precisely.
4. Separate policy logic from transport, storage, UI, and framework wiring.
5. Use adapter boundaries so external APIs and SDKs do not define the whole
   internal design.

It usually does **not** mean introducing DDD vocabulary everywhere by default.

## Why It Matters

1. It keeps the project's real domain visible.
2. It prevents external implementation details from leaking across the system.
3. It improves maintainability by giving concepts stable names and boundaries.
4. It helps teams add features in the right layer.
5. It reduces accidental over-engineering when DDD is used selectively instead
   of ceremonially.

## Lightweight DDD and Code LLMs

Lightweight DDD also improves the quality of LLM-assisted coding.

Code-focused models work better when the system has explicit terminology,
bounded contexts, and stable value types. When local context makes it obvious
which concepts a file owns and which boundaries it should respect, an LLM is
less likely to confuse layers, leak third-party assumptions, or create vague
new abstractions.

This does not replace engineering judgment. It means lightweight DDD helps
twice: it sharpens human design decisions, and it gives code models clearer
signals for safer edits.

### Why LLMs Benefit

- Stable terms reduce ambiguous edits.
- Clear contexts reduce cross-layer confusion.
- Named values make invariants easier to preserve.
- Adapter boundaries reduce accidental third-party leakage.
- Focused policies are easier to extract, review, and reuse.

### Where Heavy or Missing DDD Hurts LLMs

- Generic names hide the real domain.
- Mixed contexts make files harder to classify from nearby code.
- External API shapes leak into internal logic and public interfaces.
- Ceremony-heavy abstractions make it hard to tell what is essential.
- Policy and side effects become tangled in large orchestration methods.

## Required Rules

1. Name the core concepts of the project and use those names consistently.
2. Keep bounded contexts explicit when concepts, policies, or dependencies
   differ meaningfully.
3. Model important values and invariants with precise types, schemas, or
   validation rules.
4. Keep policy logic separate from infrastructure details when practical.
5. Introduce anti-corruption boundaries when external platforms have different
   vocabularies from the project's own model.
6. Do not introduce aggregates, repositories, entities, or domain events unless
   they solve a real complexity problem.
7. Prefer value-oriented modeling unless the system truly owns long-lived,
   mutable identity.
8. Keep DDD guidance proportional to the actual richness of the domain.

## Ubiquitous Language

Every project that uses lightweight DDD should be able to answer:

1. What are the core concepts the system actually owns?
2. Which names should appear consistently in code, tests, and docs?
3. Which names belong only to external providers, frameworks, or transports?

Good ubiquitous language is:

- specific instead of generic
- stable across modules and documents
- close to the real business or product concepts
- distinct from infrastructure or vendor terminology

Avoid vague names such as `manager`, `helper`, `engine`, `processor`, or
`handler` when a more precise domain term exists.

## Bounded Contexts

Bounded contexts matter whenever the same word would mean different things in
different parts of the system, or when one area should not inherit another
area's rules.

Common context boundaries include:

| Context type | Typical responsibility |
| --- | --- |
| Domain core | Concepts, invariants, and decision rules the system owns |
| Application/workflow | Orchestration of use cases and cross-step flows |
| Integration | Adapters to external services, SDKs, APIs, or protocols |
| Persistence | Storage-specific access and translation |
| UI/presentation | Rendering, interaction, and view-specific behavior |

Treat these as semantic boundaries, not only directory names.

## Tactical Patterns That Usually Fit

### Value Objects

Value-object thinking fits many projects well.

Good candidates include:

- requests and commands with important invariants
- responses or result types with clear states
- configuration values
- identifiers with validation or normalization rules
- policy inputs and outputs

In practice:

1. Prefer precise types over loose bags of fields.
2. Encode invariants close to construction or validation.
3. Keep values immutable in spirit when practical.
4. Promote repeated implicit concepts into named values.

### Domain Services

Domain services fit when the project owns a real decision or rule that is not
just data transport.

Examples:

- pricing or eligibility rules
- workflow policy selection
- normalization or validation rules
- reconciliation or matching logic
- permissions or priority resolution

These services should express policy, not framework wiring.

### Anti-Corruption Layers

Use anti-corruption layers when external systems speak a different language from
the domain the project wants to preserve.

These boundaries should:

1. translate external types into internal concepts
2. isolate provider-specific quirks
3. keep public contracts stable when dependencies change
4. stop vendor terminology from taking over the codebase

## Tactical Patterns That Usually Do Not Fit

Avoid introducing these by default:

1. **Aggregates** when there is little internally owned mutable state.
2. **Repositories** when the project mostly talks to APIs, files, or frameworks
   rather than a rich domain-owned persistence model.
3. **Domain events** when direct flows are simpler and clearer.
4. **Entities with identity** when most important concepts behave like values.

If these patterns appear, they should solve concrete complexity, not satisfy
terminology.

## Lightweight Layering

If DDD ideas are mapped onto a project, keep the layering lightweight:

| Layer idea | What it should contain |
| --- | --- |
| Domain | Concepts, invariants, and policy-rich pure logic |
| Application | Use-case orchestration and coordination of domain logic |
| Infrastructure | I/O, SDKs, frameworks, persistence, transport, environment access |

Do not force every file into a formal DDD layer if doing so makes the design
harder to understand than the problem warrants.

## Decision Rules for New Code

### Is this a domain concept or just wiring?

- If it expresses a reusable rule or invariant, model it explicitly.
- If it only forwards data to a framework, keep it near the boundary.

### Does it belong to one bounded context?

- If yes, keep it there.
- If no, extract a shared concept only when the shared language is real and
  stable.

### Are we modeling values or identities?

- Prefer values unless the software truly owns mutable identity over time.

### Are external terms leaking inward?

- If yes, strengthen the adapter boundary.

### Is the design becoming ceremonial?

- If yes, remove abstractions that do not protect a real rule or boundary.

## Positive Signals

- Core concepts have stable names across code, tests, and docs.
- External APIs are translated at the edges instead of mirrored everywhere.
- Policy logic is easy to find without reading transport code.
- Value types encode important invariants clearly.
- New features naturally fit into an existing context and language.

## Warning Signs of Over-Applying DDD

1. Interfaces exist only to mirror a single implementation with no meaningful
   boundary.
2. Files are split into layers even though the behavior is still very small and
   direct.
3. Simple data shapes are renamed as entities or aggregates without gaining real
   invariants.
4. Reviewers need to understand architecture ceremony before they can
   understand the feature.
5. More code is dedicated to indirection than to actual business or product
   logic.

## Warning Signs of Under-Applying DDD

1. External vendor or framework terminology dominates internal naming.
2. Similar concepts are named differently across modules, tests, and docs.
3. Policy logic and infrastructure side effects are mixed in the same large
   units.
4. Public contracts expose raw dependency shapes where the project should define
   its own abstractions.
5. Provider-specific conditionals spread across unrelated files.

## Preferred Fixes

1. Rename types and modules to match the actual ubiquitous language.
2. Extract policy-rich logic from adapters and orchestrators into focused
   helpers or services.
3. Introduce translation layers where third-party concepts leak too far inward.
4. Split modules by bounded context rather than by vague technical buckets.
5. Promote repeated implicit concepts into named value types.
6. Delete abstractions that add ceremony without protecting a real boundary.

## Related Guides

- [HIGH_COHESION_GUIDE.md](./HIGH_COHESION_GUIDE.md) for keeping each module or
  document focused on one clear responsibility.
- [LOW_COUPLING_GUIDE.md](./LOW_COUPLING_GUIDE.md) for keeping context
  boundaries explicit and dependency direction clean.
- [REFERENTIAL_TRANSPARENCY.md](./REFERENTIAL_TRANSPARENCY.md) for separating
  policy-rich pure logic from side-effecting boundaries.

## Summary Checklist

- [ ] The project has a clear ubiquitous language for its core concepts.
- [ ] Important bounded contexts are explicit.
- [ ] Value-like concepts are modeled precisely.
- [ ] Policy logic is not tangled with infrastructure by default.
- [ ] External systems are adapted at the edges instead of defining the whole
      internal model.
- [ ] Heavy tactical DDD patterns are used only when they solve real
      complexity.
- [ ] New abstractions protect a real rule, invariant, or boundary.
- [ ] A reviewer or code-focused LLM could infer the domain language and major
      boundaries from local context.

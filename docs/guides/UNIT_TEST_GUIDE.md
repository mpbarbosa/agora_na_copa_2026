# Unit Test Guide

This guide defines unit-testing expectations for Agora na Copa 26. Use it to
shape fast, deterministic tests for individual units.

## Source of truth

Use this guide together with:

- [Code Quality Control Guide](./CODE_QUALITY_CONTROL_GUIDE.md)
- [Referential Transparency Guide](./REFERENTIAL_TRANSPARENCY.md)
- [High Cohesion Guide](./HIGH_COHESION_GUIDE.md)
- [Low Coupling Guide](./LOW_COUPLING_GUIDE.md)

Test command: `npm run test:unit` (Node.js built-in test runner — no Jest or
Vitest)

## Goal

Create tests that verify one unit of behavior at a time, run quickly, fail
predictably, and make refactoring safer.

## In this project

Current test files:

| File | Units under test |
|---|---|
| `tests/fifa-sync-core.test.ts` | Pure functions in `fifa-sync-core.ts` |
| `tests/standings.test.ts` | Standings computation in `src/standings.ts` |

`fifa-sync-core.ts` was extracted from `server.ts` specifically to be
unit-testable — it accepts explicit inputs (fetched FIFA API data, config) and
returns deterministic results with no live HTTP calls. New logic extracted from
`server.ts` should follow the same pattern: no network, no filesystem, no
module-level side effects.

Use Node's built-in test primitives:

```ts
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
```

## What Unit Testing Means

Unit testing verifies the smallest behaviorally meaningful piece of a system in
isolation.

A unit is usually one of these:

1. a pure function
2. a value object or parser
3. a class or module with a narrow responsibility
4. a boundary adapter with its external collaborator mocked or stubbed

The exact file layout varies by language and framework. What matters is the
testing boundary:

- the test owns all required setup
- the unit under test has explicit inputs
- external effects are replaced or isolated
- assertions describe observable behavior, not implementation trivia

## Unit Tests vs Other Test Types

| Test type | Scope | Speed | External dependencies | Main question |
| --- | --- | --- | --- | --- |
| Unit | One focused behavior | Fast | Replaced or isolated | "Does this unit behave correctly?" |
| Integration | Several collaborating components | Moderate | Some real boundaries | "Do these parts work together?" |
| End-to-end | Whole system or workflow | Slowest | Real runtime stack | "Does the user-visible flow work?" |

Good test suites use all three where appropriate. Unit tests are the fastest
feedback loop, not the only kind of validation.

## Why It Matters

1. It catches defects close to the source of the behavior.
2. It makes refactors safer by locking down intended outcomes.
3. It encourages smaller, clearer units with explicit dependencies.
4. It documents edge cases and contracts in executable form.
5. It shortens debugging time because failures point at a narrow surface.

## Unit Testing and Code LLMs

Unit testing also improves the quality of LLM-assisted coding.

When a project has small, focused tests around isolated behavior, code-focused
models get faster feedback on whether a proposed edit preserved the contract.
Likewise, code that is easy to unit test usually has explicit inputs, narrow
responsibilities, and clearer boundaries, which also makes it easier for an LLM
to reason about safely.

### Why LLMs Benefit

- Narrow tests reveal the intended contract of a unit quickly.
- Isolated test setup makes hidden dependencies easier to spot.
- Deterministic assertions reduce false confidence from flaky behavior.
- Clear test names help both humans and tools infer what must not break.
- Smaller units reduce the chance of broad, accidental edits.

### Where Weak Unit Tests Hurt LLMs

- Broad tests hide which behavior actually regressed.
- Heavy fixture setup can obscure what the unit depends on.
- Tests that assert implementation details can block safe refactors.
- Flaky tests make automated feedback unreliable.
- Missing edge-case coverage leaves ambiguous behavior for both reviewers and
  tools.

## Quality Gates

Every substantive code change that affects unit-testable behavior should satisfy
these gates.

### 1. Isolation gate

- A unit test should exercise one focused behavior at a time.
- Network, filesystem, database, clock, random, process, and browser effects
  should not be live unless the test is intentionally not a unit test.
- Shared mutable state from other tests must not influence the result.

### 2. Determinism gate

- The same test with the same inputs should produce the same result every run.
- Time, randomness, and generated identifiers should be controlled or injected.
- Order dependence between tests is a failure, not an optimization.

### 3. Behavior gate

- Assert what the unit does, not how it is implemented internally.
- Prefer checking return values, emitted domain events, raised errors, or public
  state changes over private fields or call sequences that are not part of the
  contract.
- Only verify collaborator calls when that interaction is itself the public
  responsibility of the unit.

### 4. Naming gate

- Test names should describe the scenario and the expected outcome.
- Group tests by the unit's public behavior, not by arbitrary internal methods.
- If a test name needs several clauses joined by "and", the test probably covers
  too much.

### 5. Boundary gate

- Units with external collaborators should accept those collaborators through
  parameters, constructors, or composition roots.
- Mocks and stubs should live at the boundary, not inside core logic.
- Prefer lightweight fakes or explicit test doubles over broad environment
  bootstrap when possible.

### 6. Error-path gate

- Test invalid input, boundary values, and failure conditions, not only the
  happy path.
- Error assertions should verify the contract that callers rely on.
- Silent fallback behavior should be deliberate and documented, not accidental.

### 7. Immutability gate

- Units that are meant to derive values should not mutate caller-owned inputs.
- When mutation is intentional, tests should make that contract explicit.
- Collection and object transformations should verify both the result and the
  preservation of the original input when immutability is expected.

### 8. Execution gate

- Unit tests should stay fast enough for frequent local execution.
- The project's actual tooling should expose a narrow command to run targeted
  tests quickly.
- Coverage targets may be useful, but behavior quality matters more than a
  single coverage percentage.

## Positive Signals

- Pure helpers can be tested with direct input/output assertions.
- Test setup is short enough that the behavior under test is obvious.
- External dependencies are injected rather than constructed inside the unit.
- One failing test points at one small responsibility.
- Refactors can change internals without rewriting behavior-focused assertions.
- Async code is tested with explicit control over timing and outcomes.

## Warning Signs

- A "unit" test starts a server, opens a real database, or performs live I/O.
- Tests pass only when run in a specific order.
- Several unrelated assertions are bundled into one vague test.
- Assertions inspect private fields or internal collection choices with no
  contract reason.
- Large global fixtures hide what the unit actually needs.
- A test suite becomes slow because boundaries were not isolated cleanly.

## Test Structure Guidance

Adapt the exact layout to the project's language and framework, but keep the
structure readable and close to the unit boundary.

### Preferred conventions

1. Keep the test file discoverable from the unit it exercises.
2. Mirror source structure closely enough that related tests are easy to find.
3. Keep shared test helpers small and explicit; avoid giant fixture factories.
4. Separate unit, integration, and end-to-end tests clearly.

### Typical examples

```text
src/
  billing/
    calculate-total.ts
tests/
  billing/
    calculate-total.test.ts
```

```text
app/
  pricing.py
tests/
  test_pricing.py
```

```text
internal/
  parser/
    normalize.go
internal/
  parser/
    normalize_test.go
```

The pattern can change. The requirement does not: a reader should be able to
find the unit and its focused tests quickly.

## Common Patterns

### Pattern 1: Testing a pure function

```javascript
function normalizeName(value) {
  return value.trim().replace(/\s+/g, ' ');
}

test('normalizes repeated whitespace', () => {
  expect(normalizeName('  Ada   Lovelace  ')).toBe('Ada Lovelace');
});
```

### Pattern 2: Injecting time or randomness

```javascript
function buildToken(now, randomId) {
  return `${now.toISOString()}-${randomId()}`;
}

test('builds token from explicit collaborators', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const randomId = () => 'abc123';

  expect(buildToken(now, randomId)).toBe('2026-01-01T00:00:00.000Z-abc123');
});
```

### Pattern 3: Isolating effectful boundaries

```javascript
async function loadProfile(userId, fetchJson) {
  const response = await fetchJson(`/profiles/${userId}`);
  return { id: response.id, displayName: response.name };
}

test('maps external profile data into application shape', async () => {
  const fetchJson = async () => ({ id: 'u1', name: 'Ada' });

  await expect(loadProfile('u1', fetchJson)).resolves.toEqual({
    id: 'u1',
    displayName: 'Ada'
  });
});
```

### Pattern 4: Parameterized edge cases

```javascript
describe('isValidPort', () => {
  test.each([80, 443, 3000])('accepts valid port %s', (value) => {
    expect(isValidPort(value)).toBe(true);
  });

  test.each([0, -1, 65536, null])('rejects invalid port %s', (value) => {
    expect(isValidPort(value)).toBe(false);
  });
});
```

## Review Heuristics

### Isolation test

Could this test still pass if the network were unavailable, the clock changed,
or the tests ran in a different order? If not, the boundary is probably too
wide for a unit test.

### Hidden dependency test

Can a reader identify every dependency of the unit from the test setup alone?
If globals, singletons, or ambient runtime state matter silently, the test is
not describing the real contract clearly enough.

### Implementation-detail test

Would the test fail after a safe refactor that preserved public behavior? If
yes, the assertions are probably too coupled to internals.

### Readability test

Can a reviewer see the Arrange, Act, and Assert steps quickly? If the purpose
of the test is buried in large fixtures or helpers, shrink the setup.

### Boundary-choice test

Should this really be a unit test, or is it trying to prove integration between
multiple real systems? If the latter, move it to the appropriate integration or
end-to-end suite instead of weakening the definition of unit testing.

## Related Guides

- [CODE_QUALITY_CONTROL_GUIDE.md](./CODE_QUALITY_CONTROL_GUIDE.md) for the
  broader quality gates that unit tests should support.
- [REFERENTIAL_TRANSPARENCY.md](./REFERENTIAL_TRANSPARENCY.md) for keeping core
  logic deterministic and easy to test.
- [HIGH_COHESION_GUIDE.md](./HIGH_COHESION_GUIDE.md) for keeping units small and
  responsibility-focused.
- [LOW_COUPLING_GUIDE.md](./LOW_COUPLING_GUIDE.md) for making collaborators
  explicit and mockable.

## Summary Checklist

- [ ] Each unit test verifies one focused behavior.
- [ ] External effects are isolated, mocked, stubbed, or injected.
- [ ] Test outcomes are deterministic across runs.
- [ ] Names describe scenario and expected outcome clearly.
- [ ] Error paths and edge cases are covered where behavior matters.
- [ ] Assertions target public behavior more than internals.
- [ ] Tests stay fast enough for frequent local execution.
- [ ] Integration concerns are not mislabeled as unit tests.

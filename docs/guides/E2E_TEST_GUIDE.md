# End-to-End Test Guide

This guide defines end-to-end testing expectations for Agora na Copa 26. Use it
to shape tests that verify complete user-visible flows against the real, fully
assembled stack.

## Source of truth

Use this guide together with:

- [Unit Test Guide](./UNIT_TEST_GUIDE.md)
- [Code Quality Control Guide](./CODE_QUALITY_CONTROL_GUIDE.md)

Test commands:
- `npm run test:e2e` — run the full Playwright suite (boots dev server on port 3100)
- `npx playwright test tests/e2e/<spec>.ts` — run a single spec
- Config: `playwright.config.ts` / `playwright.prod.config.ts`

## Goal

Create tests that verify complete user-visible flows from entry point to
observable outcome against the real, assembled system — running in a
reproducible environment, failing with clear, scenario-level signals.

## In this project

**Tooling**: Playwright with TypeScript. Test files live in `tests/e2e/`.

Critical flows to cover:

- **Match selector**: selecting a match chip updates the scoreboard and broadcast
  guide
- **Tab navigation**: switching tabs renders the correct view (Partidas,
  Seleções, Líderes, Grupos, etc.)
- **Leaders view**: tournament leaders table renders with real data
- **Standings**: group standings render for at least one group

Test data comes from `src/matches.json` (static fixtures) — tests should not
depend on live FIFA API responses. Assert against what the static fallback data
guarantees, not against live scores or broadcaster names that can change.

## What End-to-End Testing Means

End-to-end testing verifies the behavior of the whole assembled system from the
user's perspective, driving it through its actual interfaces.

An end-to-end test is usually one of these:

1. a browser driving a UI flow from login to task completion
2. an HTTP client executing a multi-step API workflow across real services
3. a CLI harness running a command sequence and asserting on output and
   side effects
4. a mobile or desktop automation tool walking through a user journey
5. a consumer contract exercising the full request/response cycle between
   two deployed services

The exact tooling varies by platform. What matters is the testing boundary:

- the full assembled stack participates — not mocks, not partial stubs
- the test drives the system through the same interface a real user or client
  would use
- the environment is controlled and reproducible
- assertions describe outcomes the user or caller can observe, not internal
  state or implementation details

## End-to-End Tests vs Other Test Types

| Test type | Scope | Speed | External dependencies | Main question |
| --- | --- | --- | --- | --- |
| Unit | One focused behavior | Fast | Replaced or isolated | "Does this unit behave correctly?" |
| Integration | Several collaborating components | Moderate | Some real boundaries | "Do these parts work together?" |
| End-to-end | Whole system or workflow | Slowest | Real runtime stack | "Does the user-visible flow work?" |

Good test suites use all three where appropriate. End-to-end tests are the
highest-confidence validation, not the only kind — they are expensive to write,
run, and maintain relative to unit and integration tests.

## Why It Matters

1. It catches defects that only appear when the full system is assembled, such
   as misconfigured routing, broken authentication flows, or environment-specific
   failures invisible to unit and integration suites.
2. It validates acceptance criteria directly — the test drives the system the
   way a real user would, so a passing test is direct evidence the use case
   works.
3. It reveals integration gaps between frontend, backend, and external services
   that no lower-level test can expose.
4. It provides a regression net for critical user flows when the system is
   changed or upgraded.
5. It can surface non-functional problems such as broken page loads, missing
   assets, or misconfigured redirects.

## End-to-End Testing and Code LLMs

End-to-end testing also improves the quality of LLM-assisted coding.

A clear end-to-end suite tells a code-focused model which user-visible
scenarios are load-bearing. When a model edits code that affects a critical
flow, running the end-to-end suite gives it the highest-confidence signal
that the system still works for the user. Equally, because end-to-end tests
are expensive to run, a well-structured suite helps a model know when to run
them versus when unit or integration feedback is sufficient.

### Why LLMs Benefit

- Passing end-to-end tests confirm that the system works for the user after a
  change, not just that isolated pieces are correct.
- Named user-journey scenarios make it easier to trace a failing test back to
  the acceptance criterion it represents.
- A stable, deterministic suite gives reliable feedback rather than noise from
  flaky tests that pass and fail arbitrarily.
- A small, focused suite that covers critical paths is faster to run and
  easier to reason about than a large, redundant one.
- Separate run commands let a model choose when to run the expensive suite
  versus the fast unit suite.

### Where Weak End-to-End Tests Hurt LLMs

- Flaky tests that fail intermittently make it impossible to trust the signal,
  causing models to ignore failures or retry endlessly.
- Tests that cover the same scenarios as integration tests add cost without
  increasing confidence.
- Slow suites that are never run locally cause regressions to be caught only in
  CI, too late in the feedback cycle.
- Missing coverage of critical user flows means a model can break the most
  important behavior without any test failing.
- Overly brittle selectors or assertions tied to UI implementation details
  cause tests to break on cosmetic changes.

## Quality Gates

Every change to a critical user-visible flow should satisfy these gates.

### 1. Scope gate

- An end-to-end test must exercise a complete user-visible flow from real entry
  point to real observable outcome.
- Tests that verify only a component boundary or a seam between two services
  belong in the integration suite, not here.
- Tests must drive the system through its real interface — browser, HTTP
  client, CLI, or API — not through internal APIs or direct function calls.
- Name tests after the user journey or acceptance criterion they represent.

### 2. Real-stack gate

- The full assembled system must participate: frontend, backend, databases,
  queues, and any service dependencies required by the flow.
- Substitute only components that are genuinely outside the system boundary —
  for example, third-party payment providers replaced by a sandbox or
  simulator, not your own services.
- Do not mock your own services inside an end-to-end test.

### 3. Determinism gate

- The same test with the same starting state must produce the same result on
  every run.
- Seed test data explicitly before each scenario and clean it up after.
- Do not share mutable state between end-to-end test scenarios.
- Control time, generated identifiers, and external randomness where they
  affect observable outcomes.

### 4. Environment gate

- End-to-end tests must run against a locally reproducible or CI-provisioned
  environment, not against shared staging or production.
- Define environment setup — containers, service configuration, seed scripts —
  explicitly so any developer or CI runner can bring up an equivalent stack.
- The environment must be deterministic enough that tests pass consistently
  across machines and runs.

### 5. Stability gate

- A test that fails intermittently for reasons unrelated to a regression is not
  a useful test — it is noise.
- Treat flakiness as a defect. Investigate and fix root causes rather than
  adding retries as a permanent workaround.
- Prefer explicit wait conditions over fixed sleeps. Wait for observable state
  — an element present, a response received, a record persisted — rather than
  an arbitrary delay.
- Acceptable retry strategies must be intentional and bounded, not a catch-all
  for timing issues.

### 6. Assertion gate

- Assert the outcome the user can observe: page content, response body, emitted
  email, changed record, or success indicator.
- Do not assert internal state, DOM implementation details, or database
  internals unless they represent the acceptance criterion directly.
- Verify the full observable result — status, content, and side effects the
  user depends on — not only that no error was raised.

### 7. Ownership gate

- Every end-to-end scenario must trace back to an explicit acceptance criterion,
  user story, or critical path.
- If a scenario cannot be linked to a user-observable outcome, it is probably a
  misplaced integration test.
- Keep the end-to-end suite small and focused on the flows that matter most.
  Coverage inflation is a cost, not a benefit.

### 8. Execution gate

- End-to-end tests are expected to be slower than integration tests, but must
  not be arbitrarily slow.
- Share environment bootstrap (container start, database migration, auth setup)
  at the suite level, not per scenario.
- Provide a single command to run the end-to-end suite in isolation.
- Run the end-to-end suite in CI on every change to the main branch; selectively
  in local development based on which flows are affected.

## Positive Signals

- Each test is named after the user journey or acceptance criterion it covers.
- Setup is explicit: the starting state of data and environment is defined per
  scenario.
- A failing test points clearly at the broken user flow, not at a random
  internal assertion.
- The suite can be run in isolation with a single command.
- Flakiness is tracked and actively reduced; retry logic is intentional and
  bounded.
- Critical flows are covered; non-critical edge cases are deferred to unit or
  integration tests.
- Environment setup is documented and reproducible.

## Warning Signs

- End-to-end tests mock the system's own services or databases.
- Tests share mutable seed data and fail non-deterministically depending on
  execution order.
- The suite is treated as the primary regression net, replacing unit and
  integration coverage rather than complementing it.
- Fixed sleeps are used in place of explicit wait conditions.
- Tests are too brittle: they break on UI changes that do not affect the user
  journey.
- The suite grows without constraint, becoming too slow to run regularly.
- Tests pass in CI but fail locally, or vice versa, because of environment
  differences that are not documented.

## Test Structure Guidance

Adapt layout to the project's platform and tooling, but keep end-to-end tests
clearly separated from unit and integration tests and organized by user journey.

### Preferred conventions

1. Keep end-to-end tests in a directory that is clearly distinct from unit and
   integration tests.
2. Name test files and describe blocks after the user journey or feature, not
   the internal component.
3. Share environment bootstrap at the suite level; scope data setup to the
   scenario.
4. Provide a single command to run the end-to-end suite in isolation.
5. Document required environment setup — services, containers, env vars, seed
   scripts — at the suite level.

### Typical layouts

```text
tests/
  unit/
    billing/
      calculate-total.test.ts
  integration/
    billing/
      order-repository.integration.test.ts
  e2e/
    checkout-flow.e2e.test.ts
    account-registration.e2e.test.ts
```

```text
tests/
  test_pricing.py           # unit
  integration/
    test_pricing_repository.py
  e2e/
    test_checkout_flow.py
```

```text
internal/
  repository/
    order_repo_test.go      # unit
integration/
  order_repo_integration_test.go
e2e/
  checkout_flow_test.go
```

The exact layout can change. The requirement does not: end-to-end tests must be
clearly separated from unit and integration tests and independently runnable.

## Common Patterns

### Pattern 1: Browser UI flow (Playwright)

```javascript
test('user completes checkout and sees confirmation', async ({ page }) => {
  await seedOrder({ userId: 'u1', sku: 'BOOK-01', quantity: 1 });

  await page.goto('/login');
  await page.fill('[name=email]', 'user@example.com');
  await page.fill('[name=password]', 'secret');
  await page.click('[type=submit]');

  await page.click('[data-testid=cart]');
  await page.click('[data-testid=checkout]');
  await page.waitForURL('/confirmation');

  await expect(page.locator('[data-testid=confirmation-message]'))
    .toContainText('Your order has been placed');
});
```

### Pattern 2: Multi-step API workflow

```javascript
test('user creates an order and receives a confirmation email', async () => {
  const client = createAuthenticatedClient({ userId: 'u1' });

  const { orderId } = await client.post('/orders', {
    sku: 'BOOK-01',
    quantity: 1
  }).expect(201).body();

  const order = await client.get(`/orders/${orderId}`).expect(200).body();
  expect(order.status).toBe('confirmed');

  const emails = await testMailbox.messagesFor('user@example.com');
  expect(emails).toHaveLength(1);
  expect(emails[0].subject).toContain('Order confirmed');
});
```

### Pattern 3: CLI workflow

```javascript
test('init command scaffolds project and reports success', async () => {
  const dir = await tmpDir();

  const result = await run(['init', '--name', 'my-project'], { cwd: dir });

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('Project created successfully');
  expect(await fileExists(path.join(dir, 'my-project/README.md'))).toBe(true);
});
```

### Pattern 4: Cross-service workflow

```javascript
test('payment service triggers fulfillment after successful charge', async () => {
  await seedCart({ userId: 'u1', items: [{ sku: 'BOOK-01', quantity: 1 }] });

  await paymentClient.post('/charges', {
    userId: 'u1',
    amount: 1500
  }).expect(201);

  await waitFor(() => fulfillmentClient
    .get('/shipments')
    .expect(200)
    .body()
    .then(body => expect(body.items).toContainEqual(
      expect.objectContaining({ sku: 'BOOK-01' })
    ))
  );
});
```

## Review Heuristics

### Scope test

Is the test verifying a complete user-visible flow driven through a real
interface, or is it verifying a seam between two components? If no real entry
point (browser, HTTP client, CLI) is involved, move it to the integration suite.

### Real-stack test

Does the test use the fully assembled system? If your own services are mocked
or replaced with stubs, the test is not end-to-end regardless of its name.

### Stability test

Would this test pass reliably across ten consecutive CI runs with no code
changes? If not, the flakiness is a defect that must be fixed before the test
is trusted as a regression signal.

### Assertion test

Are assertions tied to what the user observes — rendered content, response
payload, confirmation email, changed record — or to internal implementation
details? Assertions on internals break on safe refactors and miss real failures.

### Ownership test

Does this test trace back to an acceptance criterion or a critical user path?
If not, it may be a misplaced integration test or unnecessary duplication of
lower-level coverage.

### Environment-portability test

Would this test run unchanged on a colleague's machine and in CI given only the
documented setup? If it depends on local configuration that is not provisioned
by the test infrastructure, it will break silently outside your environment.

## Related Guides

- [UNIT_TEST_GUIDE.md](./UNIT_TEST_GUIDE.md) for fast, isolated tests of
  individual units — the fastest feedback loop.
- [CODE_QUALITY_CONTROL_GUIDE.md](./CODE_QUALITY_CONTROL_GUIDE.md) for the
  broader quality gates that all test types support.

## Summary Checklist

- [ ] Each end-to-end test is named after a user journey or acceptance
      criterion.
- [ ] The full assembled stack participates — no own services mocked away.
- [ ] Test data is seeded explicitly and cleaned up unconditionally.
- [ ] Scenarios are isolated: no shared mutable state between tests.
- [ ] Assertions target user-observable outcomes, not internal state.
- [ ] Flakiness is treated as a defect; explicit wait conditions replace
      fixed sleeps.
- [ ] The end-to-end suite is runnable in isolation with a single command.
- [ ] The environment is reproducible locally and in CI.
- [ ] The suite covers critical flows and is not inflated with integration-level
      detail.
- [ ] End-to-end tests are clearly separated from unit and integration tests
      in layout and run commands.

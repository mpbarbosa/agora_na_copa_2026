---
name: docker-test
description: >
  Run all test suites (type-check, unit tests, end-to-end tests) inside the
  Docker test image and report results. Use this skill when the user asks to
  run tests in Docker, verify the test image, or debug a Docker test failure.
---

## Overview

This skill builds the Docker test image (if needed) and runs all three test
suites in isolation:

1. **Type check** — `npm run lint` (TypeScript `tsc --noEmit`)
2. **Unit tests** — `npm run test:unit` (Node built-in test runner, `tests/fifa-sync-core.test.ts` + `tests/standings.test.ts`)
3. **End-to-end tests** — `npm run test:e2e` (Playwright + Chromium, all specs in `tests/e2e/`)

The entry point is `scripts/docker-test.sh`. All test infrastructure lives in
`Dockerfile.test` and `.dockerignore` at the project root.

---

## Files

| File | Purpose |
|------|---------|
| `scripts/docker-test.sh` | Orchestration script — builds image, runs suites, reports summary |
| `Dockerfile.test` | `node:22-bookworm` image with `npm ci` + `playwright install --with-deps chromium` |
| `.dockerignore` | Excludes `node_modules/`, `dist/`, `.git/`, test artifacts, `.env` files |

---

## Execution flow

### Step 1 — Verify Docker is running

```bash
docker info --format '{{.ServerVersion}}'
```

If this fails, Docker is not running. Inform the user and stop.

### Step 2 — Run the test script

**Full run (build + all suites):**

```bash
bash scripts/docker-test.sh
```

**Skip image rebuild (reuse cached image):**

```bash
bash scripts/docker-test.sh --no-build
```

Use `--no-build` when only source files changed and `package*.json` is
unchanged — Docker's layer cache already has the correct `npm ci` and
Playwright installation.

### Step 3 — Interpret results

The script prints a per-suite summary and exits non-zero if any suite fails.
Read the per-suite output to identify the failing test before attempting a fix.

---

## Failure analysis

### Type-check failure

```
npm run lint  →  tsc --noEmit errors
```

- Read the TypeScript error message to identify the file and line.
- Fix the type error in the source, re-run with `--no-build`.
- Verify locally with `npx tsc --noEmit` before rebuilding the image.

### Unit test failure

```
npm run test:unit  →  TAP output with failing subtests
```

- Read the failing subtest name and assertion error.
- The unit tests in `tests/fifa-sync-core.test.ts` rely on real data from
  `src/data/squads.json`. If a test asserts on player metadata (socials,
  fullName, club, dateOfBirth), verify the field actually exists in
  `squads.json` for that player before adjusting the assertion.
- Fix in source or test, run `npm run test:unit` locally, then re-run
  `scripts/docker-test.sh --no-build`.

### End-to-end test failure

```
npm run test:e2e  →  Playwright test failure
```

- Read the failing spec name and the assertion error.
- Consult `tests/e2e/CLAUDE.md` for the spec-to-feature map.
- Run the specific spec locally: `npx playwright test tests/e2e/<spec>.ts`.
- Common cause: a test asserts synchronously on a value that requires an async
  browser event (network request, React state update). Use `page.waitForRequest`
  or `await expect(locator).toHaveText(...)` instead of synchronous assertions.
- Fix in source or test, re-run `scripts/docker-test.sh --no-build`.

### Image build failure

```
docker build  →  error
```

- Check that `package*.json` is valid and `npm ci` succeeds locally.
- If `playwright install --with-deps chromium` fails, the base image may lack
  a required system package. Update `Dockerfile.test` to add the package via
  `apt-get install` before the `RUN npx playwright install` step.
- After fixing `Dockerfile.test`, a full rebuild is required (do not use
  `--no-build`).

---

## Chromium path resolution

`playwright.config.ts` reads `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` and falls
back to `/usr/bin/chromium-browser`. Inside the Docker container, Chromium is
installed at the Playwright-managed cache location (not the system path). The
script resolves the path at runtime using:

```bash
node -e "const {chromium}=require('playwright-core');process.stdout.write(chromium.executablePath())"
```

This `node -e` expression uses CJS (`require`) regardless of the project's
`"type": "module"` setting, matching the same technique used in `.github/workflows/ci.yml`.

---

## When to rebuild vs. reuse the image

`--no-build` skips `docker build` entirely — the image retains the source
snapshot from the last build. Any source change (including test files) is
invisible to the running container unless the image is rebuilt.

Docker's layer cache makes rebuilds after source-only changes fast: only the
`COPY . .` layer re-runs; `npm ci` and `playwright install` layers are cached.

| Change | `--no-build` safe? |
|--------|--------------------|
| No changes at all — re-running the same code | Yes |
| Any source file changed (`src/`, `server.ts`, `tests/`, etc.) | **No** — `COPY . .` layer must re-run |
| `package.json` or `package-lock.json` changed | No — `npm ci` layer is stale |
| `playwright install` version changed (via `@playwright/test` version bump) | No |
| `Dockerfile.test` changed | No |

---

## Safety rules

- Do **not** run `scripts/docker-test.sh` as a deploy gate — use
  `npm run deploy:preflight` for that. Docker tests are for isolated
  verification, not production smoke-testing.
- Do **not** modify `Dockerfile.test` to skip `npx playwright install
  --with-deps chromium` — the `--with-deps` flag installs required OS
  libraries. Removing it produces a container where Chromium cannot launch.
- Do **not** run the Docker test script inside a container that is already
  running Docker (Docker-in-Docker) without explicitly configuring it.

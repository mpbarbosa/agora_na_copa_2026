---
name: test-commit-sync
description: >
  Run all test suites (type-check, unit, e2e), and if the changes are clean,
  commit them with a generated message and sync the dev branch into main — no
  version bump, no deploy. Distinguishes failures caused by the working diff
  from pre-existing/environmental reds before deciding to commit. Use when the
  user asks to "run the tests, then commit and sync with main", or wants the
  test → commit → sync flow in one pass without releasing.
---

## Overview

A three-stage flow, each stage gating the next:

1. **Test** — run the full suite (lint + unit + e2e), preferring the Docker
   canonical runner (`scripts/docker-test.sh`).
2. **Triage + commit** — if green, commit. If e2e is red, **prove whether the
   failures are yours or pre-existing** before deciding; only commit changes
   whose relevant suites are green, with explicit user sign-off when the full
   suite is not green for pre-existing reasons.
3. **Sync** — fast-forward `main` to the new commit (no bump, no deploy).

This is **not** `test-bump-deploy` (no version bump, no production deploy) and
**not** `bump-version-stage-commit-push` (no bump). It stops once `main` mirrors
the dev branch.

### Worktree roles (this project)

| Worktree | Branch | Role |
|----------|--------|------|
| `agora-dev` | `agora-dev` | development — edit, test, commit here |
| `agora_na_copa_2026` | `main` | release runner — receives the FF sync |
| `agora-data` | `data-work` | data edits |

You normally run this skill from `agora-dev`. The sync step fast-forwards the
`main` worktree; never check out `main` here (it is checked out elsewhere).

---

## Stage 1 — Run all test suites

### 1a. Prefer the Docker canonical runner

```bash
docker info --format '{{.ServerVersion}}'   # confirm Docker is up
bash scripts/docker-test.sh                 # lint + unit + e2e, isolated
```

Docker is the authoritative runner: the local host may run an OS Playwright
does not officially support and may lack reliable network. If Docker is down,
fall back to host runs (`npx tsc --noEmit`, `npm run test:unit`,
`npm run test:e2e`) but treat their e2e results with extra suspicion.

> **RTK proxy caveat:** `npm run lint` is intercepted by the RTK proxy and can
> print `ESLint output (JSON parse failed…)` while still exiting 0. Always
> confirm the type-check with `npx tsc --noEmit` directly.

> **First run in a fresh worktree:** if tests error with
> `Cannot find package 'tsx'`, dependencies are missing — run `npm install`
> first. Playwright browsers may already be cached at `~/.cache/ms-playwright`.

### 1b. Read the result

- **All green** → go to Stage 2, commit directly.
- **lint or unit red** → a real defect in the changes. Stop, report the failing
  assertion, offer to fix. Do not commit.
- **e2e red** → do **not** assume it's your diff. Go to **1c** and triage.

### 1c. Triage e2e failures — yours vs pre-existing (the key step)

e2e suites in this repo couple to volatile production data (served from
`copa2026.mpbarbosa.com` via `FIFA_FALLBACK_API_BASE`) and to a first-visit
guided tour. Many failures are environmental, not regressions. Prove it before
blaming or excusing the diff:

1. **Capture the failing set** from the current run.
2. **Stash the working diff and re-run the same suite on clean `HEAD`:**

   ```bash
   git stash push -u -m wip <changed files>
   bash scripts/docker-test.sh        # same suite, clean tree
   git stash pop
   ```

3. **Compare.** If the same specs fail without your diff → the failures are
   **pre-existing**, and your change is innocent (lint+unit green + identical
   e2e set is strong proof). If new specs fail only *with* your diff → that's a
   real regression you introduced; fix it.

Then categorize each pre-existing e2e failure:

| Mode | Tell-tale | Fix |
|------|-----------|-----|
| **Feature-tour race** | A `driver-popover` / `driver-overlay` "intercepts pointer events" in the error log; or 320px overflow from the 1280px tour SVG | Add `await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));` in a `beforeEach` of the affected `describe`. Verify the spec flips green **in isolation** before keeping the edit. |
| **Prod-data coupling** | Asserts on specific live fixtures (a named finished match, a recap's text, a team analysis) and still fails *with the tour suppressed* | Not fixable offline — needs network or mocked fixtures. Leave it; report as out-of-scope unless the user asks to decouple. |

Only keep a tour-suppression edit on a spec where it **actually changes the
outcome** (proven in isolation). Adding it to a spec that still fails for
data reasons is noise — revert it.

### 1d. Decide whether to commit on a not-fully-green suite

If the only residual e2e reds are pre-existing **and** prod-data-coupled (not
your diff, not tour-race), the suite cannot go green locally. Surface this
plainly and get explicit user sign-off before committing — do not silently
treat red as green. Per project guidance: a failed check means *not verified*;
never rationalize failures into success.

---

## Stage 2 — Commit (no bump)

### 2a. Confirm the committable changes are green

```bash
npx tsc --noEmit                              # type-check (bypass RTK)
npm run test:unit                             # unit
npx playwright test tests/e2e/<fixed-spec>.ts # any spec you de-flaked
```

Do **not** bump the version here — that is the release skills' job. This flow
ships the change for the next code release to version.

### 2b. Generate the message and commit

```bash
git add -A
git diff --cached --stat
```

Write a conventional-style subject from the staged diff (`feat:` / `fix:` /
`chore:` / `data:`). Body: explain the *why*. Commit on `agora-dev`:

```bash
git commit -F - <<'EOF'
<generated subject>

<generated body>

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Stage 3 — Sync `main`

`agora-dev` should now be exactly one (or more) commits ahead of `main` — a
clean fast-forward. `main` is checked out in the sibling `agora_na_copa_2026`
worktree, so sync it there with `git -C` (avoid `cd`, which can trip the
permission classifier):

```bash
mainwt=~/Documents/GitHub/agora_na_copa_2026
git -C "$mainwt" status --short          # must be clean
git -C "$mainwt" merge --ff-only agora-dev
git -C "$mainwt" log --oneline -1        # confirm main == agora-dev HEAD
```

If the FF is rejected because `main` diverged, stop and report — do not force.
If the `main` worktree is dirty, stop and ask before touching it.

**Pushing to origin is a separate, explicit action.** "Sync with main" means
the local FF merge above — never a remote push. Per the project push rule, only
the `main` worktree (`agora_na_copa_2026`) pushes to `origin`; this skill runs in
`agora-dev` and must **not** `git push`. If the user asks to publish, the push
happens from the `main` worktree, not here.

---

## What to report when done

```
✓ Tests: lint + unit green; e2e <N> green / <M> pre-existing data-coupled reds (not the diff)
✓ Committed on agora-dev (SHA: <short>) — no version bump
✓ Synced main → <short> (fast-forward)
↪ Not pushed to origin (say the word) · ships with the next code release
```

State the e2e caveat honestly — how many reds remain and that they are
pre-existing/environmental, proven by the clean-HEAD re-run.

---

## Safety rules

- Stop at the first lint/unit failure; those are real defects.
- Never call a red suite green. Prove pre-existing-ness with a clean-`HEAD`
  re-run; get sign-off before committing on a not-fully-green suite.
- Keep a tour-suppression edit only where it demonstrably flips a spec green in
  isolation; otherwise revert it.
- No version bump, no deploy, no force-push, no commit `--amend` of pushed work.
- Sync `main` only via `--ff-only` from a clean `main` worktree.

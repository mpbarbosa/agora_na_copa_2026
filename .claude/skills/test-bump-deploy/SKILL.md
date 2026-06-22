---
name: test-bump-deploy
description: >
  Run the full Docker test suite, bump the patch version, commit and push to
  the source repo, then deploy to production via scripts/deploy.sh. Use when
  the user asks to "test, bump, and deploy", "release", or wants the complete
  quality-gate → version → ship pipeline in one pass.
---

## Overview

Three-stage pipeline, each stage gates the next:

1. **Test** — Docker isolated run of lint + unit + e2e (`scripts/docker-test.sh`)
2. **Bump + commit + push** — patch version bump, stage all, typecheck, commit, push source repo
3. **Deploy** — preflight build, rsync to sibling `mpbarbosa.com` repo, commit + push deploy repo

Abort immediately if any stage fails; do not proceed to the next.

---

## Stage 1 — Docker tests

### 1a. Verify Docker is running

```bash
docker info --format '{{.ServerVersion}}'
```

If this fails, stop and tell the user Docker is not running.

### 1b. Run tests

```bash
bash scripts/docker-test.sh
```

The script builds the image, runs lint → unit → e2e, and prints a per-suite
summary. It exits non-zero if any suite fails.

**On failure:** read the per-suite output, report which suite failed and the
first failing assertion. Do not proceed to Stage 2. Offer to fix the failure
before retrying.

**On success:** report "All suites passed" and proceed to Stage 2.

> `npm run lint` is intercepted by the RTK proxy in this environment and may
> exit non-zero even when `tsc --noEmit` is clean. If lint appears to fail,
> verify with `npx tsc --noEmit` before treating it as a real failure.

---

## Stage 2 — Bump, commit, push

### 2a. Inspect repo state and detect repo role

```bash
git status --short
git branch --show-current
git worktree list
```

This project is worked through two worktrees with different publish rules.
Detect which one you are in from the checked-out branch:

| Branch | Role | Publish action (2g) |
|--------|------|---------------------|
| `data-work` | **DATA repo** (`agora-data` worktree) | merge the release commit into `main` |
| anything else (e.g. `main`) | **CODE repo** (`agora_na_copa_2026` worktree) | push the current branch to its remote |

The data worktree has **no upstream of its own** — its commits are published by
fast-forwarding `main`, not by pushing a `data-work` branch. So do **not** stop
on a "missing upstream"; that is expected and correct for the data repo. Only
the code repo needs an upstream, and `main` already has one.

### 2b. Bump version

```bash
npm version patch --no-git-tag-version
```

### 2c. Stage all changes

```bash
git add -A
```

### 2d. Validate

```bash
npx tsc --noEmit
```

Use `npx tsc --noEmit` directly, not `npm run lint`, to avoid the RTK proxy
mangling the exit code. Stop if type errors are found.

### 2e. Review scope and generate commit message

```bash
git diff --cached --stat --summary
```

Use a conventional-style subject from the staged diff:

- `chore: bump version to X.Y.Z` — version bump only
- `chore: bump version to X.Y.Z and update dev guides` — bump + docs
- `chore: bump version to X.Y.Z; <short summary of other changes>` — bump + other

### 2f. Commit

```bash
git commit -m "GENERATED_SUBJECT" -m "Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

### 2g. Publish the source commit (role-based)

Use the role detected in 2a.

**DATA repo (branch `data-work`) → merge to `main`.** `main` is checked out in
the sibling `agora_na_copa_2026` worktree, so this worktree publishes by
fast-forwarding `main` to the new commit:

```bash
git push origin HEAD:main
```

Then keep the local `main` worktree in sync (best-effort; skip silently if it is
dirty or absent):

```bash
mainwt="$(git worktree list --porcelain | awk '/^worktree /{wt=$2} $0=="branch refs/heads/main"{print wt}')"
[ -n "$mainwt" ] && git -C "$mainwt" merge --ff-only data-work
```

**CODE repo (branch `main` or any non-`data-work` branch) → push to remote.**

```bash
git push origin "$(git branch --show-current)"
```

Pushing to `main` updates the default branch directly. If the harness permission
classifier blocks the push, **stop and ask the user to authorize it** (or to run
`! git push origin HEAD:main` themselves) — do not attempt to work around the
denial.

**If the push is REJECTED as non-fast-forward** (`Updates were rejected because a
pushed branch tip is behind its remote counterpart` / `[rejected] ... (fetch
first)`), the other worktree shipped while you were working — and it likely bumped
to the **same version**, the exact collision in [[project_concurrent_code_data_worktree]].
Do **not** force-push. Rebase onto the new tip, re-bump to the next free patch, and
retry (this is the one safe-to-amend case — the commit is local and was never
accepted by the remote):

```bash
git fetch origin
git rebase origin/main                       # 3-way-merges the identical version bumps; integrates their files
# After rebase your commit carries a version that now duplicates theirs — take the next free patch:
npm version patch --no-git-tag-version       # e.g. 0.0.294 (dup) -> 0.0.295
git add -A
npx tsc --noEmit
git commit --amend -m "chore: bump version to <NEW> ; <same summary>" -m "Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin HEAD:main                     # now a fast-forward
```

If `git rebase` reports a **real conflict** (same content edited on both sides,
not just the version line), stop, resolve or report it, and do not retry blindly.

**On any other failure:** stop and report the push error. Do not proceed to Stage 3.

**On success:** report the new version and the published SHA (and, for the data
repo, that it was merged into `main`), then proceed to Stage 3.

---

## Stage 3 — Deploy

```bash
bash scripts/deploy.sh
```

What this script does (for context — do not replicate manually):

1. Verifies both worktrees are clean
2. Syncs match results from the FIFA calendar API (auto-commits if changed; skips if API unreachable)
3. Fast-forwards the sibling `mpbarbosa.com` repo
4. Runs `scripts/deploy-preflight.sh` (build + smoke tests)
5. Rsyncs `dist/`, `package.json`, `package-lock.json`, `.env.example` to `mpbarbosa.com/agora_na_copa_2026/`
6. Commits and pushes only the deployment subtree in `mpbarbosa.com`
7. On production hosts: calls `shell_scripts/06_redeploy.sh` to sync `/var/www/agora_na_copa_2026`

**On failure:** read the step marker (`==> [N/8]`) to identify where the script
stopped, diagnose the issue, and report it. Do not retry silently.

**On success:** the script prints `✓ Deployment complete.`

---

## What to report when the pipeline finishes

```
✓ Tests passed (lint + unit + e2e)
✓ Version bumped to X.Y.Z, pushed to origin/main (SHA: <short>)
✓ Deployed 0.0.X (SHA) → mpbarbosa.com/agora_na_copa_2026
```

If Stage 3 skips the live redeploy (no production install on this host), that
is normal — note it rather than treating it as a failure.

---

## Safety rules

- Stop at the first failure; never skip stages.
- Do not amend commits or use destructive git operations.
- Do not retry a failing deploy step silently — always report what failed.
- `scripts/deploy.sh` requires both repos to have clean worktrees. If Stage 2's
  commit leaves the source repo dirty (e.g. a hook wrote files), clean up before
  calling the deploy script.

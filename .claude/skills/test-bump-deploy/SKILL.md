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
2. **Bump + commit + push** — patch version bump (CODE repo only), stage all, typecheck, commit, push source repo
3. **Deploy** — preflight build, rsync to sibling `mpbarbosa.com` repo, commit + push deploy repo

Abort immediately if any stage fails; do not proceed to the next.

**Repo role matters (see 2a).** Only the **CODE repo** (`main`) bumps the version
and deploys. The **DATA repo** (`data-work`) runs Stage 1, then in Stage 2
commits (no bump) and merges to `main` — and **stops there**. Data changes ride
the next CODE-side release, which ships them with a version bump. So for the DATA
repo, **skip Stage 3 entirely**.

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

This project is worked through several worktrees with different publish rules.
**PUSH RULE (2026-06-26): only the `main` worktree (`agora_na_copa_2026`) pushes
to `origin`.** Every other worktree publishes by merging into **local** `main`
and stops. Detect which one you are in from the checked-out branch:

| Branch | Role | Publish action (2g) |
|--------|------|---------------------|
| `main` | **CODE/release runner** (`agora_na_copa_2026` worktree) | bump, then **push** `main` to `origin` |
| `data-work` | **DATA repo** (`agora-data` worktree) | merge the content commit into **local** `main` — no bump, **no push** |
| `agora-dev` / `agora-dev2` / agent worktree | **DEV repo** | merge the feature commit into **local** `main` — no bump, **no push** |

Only the `main` worktree pushes to `origin`; `data-work` and the dev worktrees
have **no upstream of their own** and publish by fast-forwarding **local** `main`,
not by pushing. So do **not** stop on a "missing upstream"; that is expected.
Their work reaches `origin` on the next `main`-side push (this skill run from
`main`, or an explicit user-authorized push from the `main` worktree).

### 2b. Bump version (CODE repo only)

**Only the CODE repo (`main`) may bump the app version.** If 2a detected the
**DATA repo** (branch `data-work`), **skip this step** — data commits must not
touch the `package.json`/`package-lock.json` version. The version represents
code/app releases; data edits ride the next CODE-side release. Go to 2c.

For the **CODE repo**:

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

**DATA repo** (no bump) — the subject describes the content change instead, e.g.
`data: refresh Group I analysis post FRA×IRQ`. Do not mention a version.

### 2f. Commit

```bash
git commit -m "GENERATED_SUBJECT" -m "Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

### 2g. Publish the source commit (role-based)

Use the role detected in 2a.

**DATA repo (`data-work`) or DEV repo (`agora-dev`/`agora-dev2`/agent) → merge
into LOCAL `main`, do NOT push.** `main` is checked out in the sibling
`agora_na_copa_2026` worktree; publish by fast-forwarding **local** `main` and
stop. The harness permission classifier also blocks pushes to the default branch,
which is by design here — these worktrees must never push.

```bash
mainwt="$(git worktree list --porcelain | awk '/^worktree /{wt=$2} $0=="branch refs/heads/main"{print wt}')"
[ -n "$mainwt" ] && git -C "$mainwt" merge --ff-only "$(git branch --show-current)"
```

The commit now sits on local `main`, ahead of `origin/main`, and reaches `origin`
on the next `main`-side push.

**CODE/release runner (the `main` worktree only) → push to remote.**

```bash
git push origin "$(git branch --show-current)"
```

Only run this when checked out as `main` in `agora_na_copa_2026`. Pushing to
`main` updates the default branch directly. If the harness permission classifier
blocks the push, **stop and ask the user to authorize it** (or to run
`! git push origin main` themselves) — do not attempt to work around the denial.

**If the push is REJECTED as non-fast-forward** (`Updates were rejected because a
pushed branch tip is behind its remote counterpart` / `[rejected] ... (fetch
first)`), the other worktree shipped while you were working. Do **not** force-push —
rebase onto the new tip and retry. Recovery depends on role:

**DATA / DEV repos don't push**, so they can't hit a non-fast-forward rejection.
If the **local** `git -C "$mainwt" merge --ff-only` is rejected because local
`main` advanced, just re-run it after the merge settles (or use a normal merge if
local `main` legitimately diverged). The remote is untouched — nothing to recover.

**CODE/release runner (the `main` worktree)** — since only `main` bumps, a same-version collision only
arises if two code releases race (rare with one code session). Rebase, re-bump to
the next free patch, and retry (the one safe-to-amend case — the commit is local
and was never accepted by the remote):

```bash
git fetch origin
git rebase origin/main                       # 3-way-merges the version bumps; integrates their files
npm version patch --no-git-tag-version       # e.g. 0.0.294 (dup) -> 0.0.295
git add -A
npx tsc --noEmit
git commit --amend -m "chore: bump version to <NEW> ; <same summary>" -m "Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin main                          # from the main worktree only; now a fast-forward
```

If `git rebase` reports a **real conflict** (same content edited on both sides,
not just the version line), stop, resolve or report it, and do not retry blindly.

**On any other failure:** stop and report the push error. Do not proceed to Stage 3.

**On success:** report the new version and the published SHA (and, for the data
repo, that it was merged into `main`), then proceed to Stage 3.

---

## Stage 3 — Deploy (CODE repo only)

**DATA repo (branch `data-work`): STOP after Stage 2.** Do not deploy. The data
is now on `main` and ships with the next CODE-side release. Report that the data
was merged to `main` and is queued for the next code release, then end.

**CODE repo:**

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

**CODE repo:**

```
✓ Tests passed (lint + unit + e2e)
✓ Version bumped to X.Y.Z, pushed to origin/main (SHA: <short>)
✓ Deployed 0.0.X (SHA) → mpbarbosa.com/agora_na_copa_2026
```

**DATA repo** (no bump, no deploy):

```
✓ Tests passed (lint + unit + e2e)
✓ Data committed and merged into LOCAL main (SHA: <short>) — no version bump, not pushed
↪ Reaches origin on the next main-side push; ships with the next code release (rides its bump + deploy)
```

If Stage 3 skips the live redeploy (no production install on this host), that
is normal — note it rather than treating it as a failure.

---

## Safety rules

- Stop at the first failure; never skip a stage's gate on the way to deploy.
  (The DATA repo legitimately ends after Stage 2 — that is its role, not a skip.)
- Do not amend commits or use destructive git operations.
- Do not retry a failing deploy step silently — always report what failed.
- `scripts/deploy.sh` requires both repos to have clean worktrees. If Stage 2's
  commit leaves the source repo dirty (e.g. a hook wrote files), clean up before
  calling the deploy script.

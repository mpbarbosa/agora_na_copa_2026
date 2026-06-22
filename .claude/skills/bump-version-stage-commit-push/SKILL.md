---
name: bump-version-stage-commit-push
description: >
  Bump the project version, track and stage all intended files, generate an
  appropriate commit message from the staged diff, commit, and push the current
  branch. Use this skill when the user asks for a version bump plus full git
  release flow in one pass.
---

## Overview

This skill performs a lightweight release-style git workflow for this
repository:

1. Bump the version
2. Stage the intended files
3. Validate the repo state
4. Generate a commit message from the staged changes
5. Commit
6. Push the current branch

For this project, `package.json` is the canonical version source and
`package-lock.json` must stay in sync with it. The footer version in the UI is
derived from `package.json`, so do **not** maintain a separate hardcoded page
version.

---

## Canonical version files

Update these files through npm versioning instead of manual editing:

| File | Rule |
|------|------|
| `package.json` | Canonical project version |
| `package-lock.json` | Must match `package.json` after version bump |

Preferred command:

```bash
npm version patch --no-git-tag-version
```

If the user explicitly asks for a different bump level, use one of:

```bash
npm version minor --no-git-tag-version
npm version major --no-git-tag-version
```

---

## Preconditions

Before committing:

1. Confirm the repo exists and the current branch is known.
2. Inspect `git status --short`.
3. Decide whether there are already pending user changes that should be included.
4. Never discard unrelated user changes.

If the user asked for "track the files," stage with:

```bash
git add -A
```

---

## Execution flow

### Step 1 — Inspect repo state and detect repo role

Run:

```bash
git status --short
git branch --show-current
git worktree list
```

This project is worked through two worktrees with different publish rules.
Detect which one you are in from the checked-out branch:

| Branch | Role | Publish action (Step 8) |
|--------|------|-------------------------|
| `data-work` | **DATA repo** (`agora-data` worktree) | merge the commit into `main` |
| anything else (e.g. `main`) | **CODE repo** (`agora_na_copa_2026` worktree) | push the current branch to its remote |

The data worktree has **no upstream of its own** — its commits are published by
fast-forwarding `main`, not by pushing a `data-work` branch. So a "missing
upstream" is expected and correct for the data repo; do **not** stop on it. For
the **code repo**, the branch must have an upstream — if it is missing, stop and
report that push cannot proceed.

### Step 2 — Bump the version (CODE repo only)

**Only the CODE repo (`main`) may bump the app version.** If Step 1 detected the
**DATA repo** (branch `data-work`), **skip this step entirely** — data commits
must not touch the `package.json`/`package-lock.json` version. Data changes ride
the next CODE-side release; the version represents code/app releases, not
content edits. Go straight to Step 3.

For the **CODE repo**, default to a patch bump unless the user specifies
otherwise:

```bash
npm version patch --no-git-tag-version
```

### Step 3 — Stage changes

Stage the full intended set:

```bash
git add -A
```

### Step 4 — Validate

Run the repository typecheck before committing:

```bash
npm run lint
```

If validation fails, fix the issue before committing.

### Step 5 — Review staged scope

Use:

```bash
git diff --cached --stat --summary
```

Generate the commit message from the staged diff, not from guesswork.

### Step 6 — Generate commit message

Use a short conventional-style subject that reflects the staged scope.

Examples:

- `chore: bump site version`
- `chore: bump version and update deployment URLs`
- `feat: launch FIFA broadcast companion app`
- `docs: add development environment memory`

Heuristics:

- Use `chore:` for version bumps, scripts, deployment helpers, and repo ops.
- Use `feat:` for user-facing behavior or new shipped functionality.
- Use `fix:` for bug fixes.
- Use `docs:` for documentation-only changes.
- **DATA repo** commits do not bump the version, so their subject must describe
  the content change (e.g. `data: refresh Group I analysis post FRA×IRQ`), **not**
  "bump version".

### Step 7 — Commit

Commit with the generated message and include the required trailer unless the
user explicitly says not to:

```bash
git commit -m "GENERATED_SUBJECT" -m "Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

### Step 8 — Publish (role-based)

Use the role detected in Step 1.

**DATA repo (branch `data-work`) → merge to `main`.** `main` is checked out in
the sibling `agora_na_copa_2026` worktree, so this worktree publishes by
fast-forwarding `main` to the new commit, then syncing the local `main`
worktree (best-effort):

```bash
git push origin HEAD:main
mainwt="$(git worktree list --porcelain | awk '/^worktree /{wt=$2} $0=="branch refs/heads/main"{print wt}')"
[ -n "$mainwt" ] && git -C "$mainwt" merge --ff-only data-work
```

**CODE repo (branch `main` or any non-`data-work` branch) → push the current
branch to its remote:**

```bash
git push origin "$(git branch --show-current)"
```

Pushing to `main` updates the default branch directly. If the harness permission
classifier blocks it, stop and ask the user to authorize the push (or to run
`! git push origin HEAD:main` themselves) — do not work around the denial.

**If the push is REJECTED as non-fast-forward** (`Updates were rejected because a
pushed branch tip is behind its remote counterpart` / `[rejected] ... (fetch
first)`), the other worktree shipped while you were working. Do **not** force-push —
rebase onto the new tip and retry. Recovery depends on role:

**DATA repo** (no bump, so no version collision) — just rebase and re-push:

```bash
git fetch origin
git rebase origin/main                        # data commit doesn't touch the version line — integrates cleanly
git push origin HEAD:main                     # now a fast-forward
```

**CODE repo** — since only the CODE repo bumps, a true same-version collision
only arises if two code releases race (rare with a single code session). Rebase,
re-bump to the next free patch, and retry (the one safe-to-amend case — the
commit is local and was never accepted by the remote):

```bash
git fetch origin
git rebase origin/main                        # 3-way-merges the version bumps; integrates their files
npm version patch --no-git-tag-version        # bump past the now-duplicate version, e.g. 0.0.294 -> 0.0.295
git add -A
npx tsc --noEmit
git commit --amend -m "chore: bump version to <NEW> ; <same summary>" -m "Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin HEAD:main                     # now a fast-forward
```

If `git rebase` reports a **real conflict** (same content edited on both sides),
stop, resolve or report it, and do not retry blindly.

---

## Safety rules

- Do **not** amend previous commits unless the user explicitly asks — **except**
  the rejected-push recovery in Step 8, where amending the local, never-accepted
  commit to take the next free version is expected.
- Do **not** force-push or use destructive git commands like `reset --hard`.
- Do **not** use destructive git commands like `reset --hard`.
- Do **not** invent a version string manually when npm can update it safely.
- Do **not** claim success before push completes.
- If staged content is much broader than the user likely intended, inspect it
  and choose a message that honestly reflects the full scope.
- Pushing to the remote is a shared, hard-to-reverse action — confirm with the
  user before Step 8 unless they have already authorized pushing in this
  conversation.

---

## Recommended one-pass command sequence

```bash
git status --short
git branch --show-current            # detect role: data-work → DATA repo, else → CODE repo
npm version patch --no-git-tag-version   # CODE repo ONLY — skip entirely in the DATA repo (data-work)
git add -A
npm run lint
git diff --cached --stat --summary
git commit -m "GENERATED_SUBJECT" -m "Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

# Publish (role-based — see Step 8):
#   DATA repo (data-work): git push origin HEAD:main   # merge/fast-forward main (no bump)
#   CODE repo (main/etc.): git push origin "$(git branch --show-current)"
```

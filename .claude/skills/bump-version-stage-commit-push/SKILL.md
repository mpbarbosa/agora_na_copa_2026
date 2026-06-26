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

This project is worked through several worktrees with different publish rules.
**PUSH RULE (2026-06-26): only the `main` worktree (`agora_na_copa_2026`) pushes
to `origin`.** Every other worktree publishes by merging into **local** `main`
and stops. Detect which one you are in from the checked-out branch:

| Branch | Role | Publish action (Step 8) |
|--------|------|-------------------------|
| `main` | **CODE/release runner** (`agora_na_copa_2026` worktree) | bump, then **push** `main` to `origin` |
| `data-work` | **DATA repo** (`agora-data` worktree) | merge the commit into **local** `main` — no bump, **no push** |
| `agora-dev` / `agora-dev2` / agent worktree | **DEV repo** | merge the commit into **local** `main` — no bump, **no push** |

Only the `main` worktree pushes to `origin`. `data-work` and the dev worktrees
have **no upstream of their own** and publish by fast-forwarding **local** `main`,
not by pushing — so a "missing upstream" is expected; do **not** stop on it.
Their work reaches `origin` on the next `main`-side push.

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

**DATA repo (`data-work`) or DEV repo (`agora-dev`/`agora-dev2`/agent) → merge
into LOCAL `main`, do NOT push.** `main` is checked out in the sibling
`agora_na_copa_2026` worktree; publish by fast-forwarding **local** `main` and
stop:

```bash
mainwt="$(git worktree list --porcelain | awk '/^worktree /{wt=$2} $0=="branch refs/heads/main"{print wt}')"
[ -n "$mainwt" ] && git -C "$mainwt" merge --ff-only "$(git branch --show-current)"
```

The commit now sits on local `main`, ahead of `origin/main`, and reaches `origin`
on the next `main`-side push. The harness also blocks pushes to the default
branch from these worktrees, which is by design.

**CODE/release runner (the `main` worktree only) → push the current branch:**

```bash
git push origin "$(git branch --show-current)"
```

Only when checked out as `main` in `agora_na_copa_2026`. Pushing to `main`
updates the default branch directly. If the harness permission classifier blocks
it, stop and ask the user to authorize the push (or to run
`! git push origin main` themselves) — do not work around the denial.

**If the push is REJECTED as non-fast-forward** (`Updates were rejected because a
pushed branch tip is behind its remote counterpart` / `[rejected] ... (fetch
first)`), the other worktree shipped while you were working. Do **not** force-push —
rebase onto the new tip and retry. Recovery depends on role:

**DATA / DEV repos don't push**, so they can't hit a non-fast-forward rejection.
If the **local** `git -C "$mainwt" merge --ff-only` is rejected because local
`main` advanced, re-run it once local `main` settles (or use a normal merge if
local `main` legitimately diverged). The remote is untouched — nothing to recover.

**CODE/release runner (the `main` worktree)** — since only `main` bumps, a true same-version collision
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
git push origin main                          # from the main worktree only; now a fast-forward
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
git branch --show-current            # detect role: main → CODE/release runner; data-work/agora-dev* → no bump, no push
npm version patch --no-git-tag-version   # main worktree ONLY — skip in data-work AND agora-dev/agora-dev2
git add -A
npm run lint
git diff --cached --stat --summary
git commit -m "GENERATED_SUBJECT" -m "Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

# Publish (role-based — see Step 8). ONLY the main worktree pushes to origin:
#   DATA (data-work) / DEV (agora-dev*): no push — git -C "$mainwt" merge --ff-only "$(git branch --show-current)"
#   CODE/release runner (main worktree): git push origin "$(git branch --show-current)"
```

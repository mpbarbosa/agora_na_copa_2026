---
name: go-live-prod
description: >
  Actually make the current main-branch release LIVE on the production host:
  bump the version if needed, publish the prebuilt payload to the mpbarbosa.com
  repo, then run the version-guarded, build-free go-live on the prod box over SSH
  and verify /api/health. Use when the user asks to "deploy to prod", "go live",
  "ship it live", "make it live", or "release to production" — the step BEYOND
  test-bump-deploy / test-commit-sync, which only publish/stage and never update
  the running site.
---

## Overview

`test-bump-deploy` and `scripts/deploy.sh` run from a dev box only **publish** the
prebuilt payload into the `mpbarbosa.com` repo — they do **not** update the live
site (this host isn't the prod host, so their `06_redeploy.sh` step is skipped).
The site changes **only** when `go-live` runs **on the prod host**. This skill is
that missing final mile.

Four stages, each gating the next:

1. **Preconditions** — read the live version, confirm the release is bumped ahead
   of it, confirm both worktrees are clean.
2. **Bump + push** (from the `main` worktree only) — so the go-live version guard
   will actually roll out.
3. **Publish** — `npm run deploy` from the `main` worktree (preflight build →
   payload pushed to `mpbarbosa.com`).
4. **Go-live + verify** — on the prod host over SSH: `git pull` + `npm run go-live`,
   then confirm `/api/health` reports the new version.

> **Authorization gate.** Stages 3–4 are outward-facing production actions. The
> auto-mode permission classifier will block `npm run deploy` and the prod SSH
> command unless the user has **explicitly** authorized a production deploy in
> this session. Get that explicit "yes, go live" first. If the classifier still
> blocks a command, **stop and ask the user to authorize it** (or run it
> themselves) — never work around the denial.

Relevant memories: `reference_deploy_propagation_gotcha` (dev publish ≠ live),
`reference_prod_build_oom` (never build on the prod host), `reference_prod_ssh_access_plink`
(how to drive prod), `feedback_deploy_worktree_only_for_deploy` (only `main` bumps + pushes).

---

## Facts about this deployment

- **Prod host:** `ubuntu@18.229.20.196`, driven non-interactively with
  `plink -batch -i ~/Downloads/web_server.ppk` (and `pscp` for files). Host key is
  cached; sudo is NOPASSWD.
- **Live health endpoint:** `https://copa2026.mpbarbosa.com/api/health` → `{ version, status, uptime }`.
- **go-live is version-guarded** (`shell_scripts/10_go_live.sh`): it rolls out
  **only when the payload version is strictly greater than the live version**, and
  skips otherwise (no needless restart/cache reset). So a **version bump is
  mandatory** for a rollout to happen. Force a same-version redeploy (e.g. after an
  `.env` change) with `AGORA_FORCE_GO_LIVE=1`.
- **Never build on the prod host** (~1.9 GiB, no swap → OOM). go-live is
  build-free: it consumes the prebuilt `dist/` published to `mpbarbosa.com`.
- **The `main` worktree** (`~/Documents/GitHub/agora_na_copa_2026`) is the only one
  that bumps the version and pushes to `origin`, and `scripts/deploy.sh` must run
  from it. Both it **and** the sibling `mpbarbosa.com` checkout must be clean.

---

## Stage 1 — Preconditions

```bash
mainwt=~/Documents/GitHub/agora_na_copa_2026
# Live version right now:
curl -fsS --max-time 8 https://copa2026.mpbarbosa.com/api/health \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print('live:',d.get('version'),d.get('status'))"
# main version + cleanliness + unpushed commits:
python3 -c "import json;print('main pkg:',json.load(open('$mainwt/package.json'))['version'])"
git -C "$mainwt" status -sb | head -1
git -C "$mainwt" status --porcelain            # must be empty (clean)
# Sibling deploy repo present, clean, has upstream:
for d in /var/www/mpbarbosa.com ~/Documents/GitHub/mpbarbosa.com; do
  [ -d "$d/.git" ] && { echo "mpbarbosa.com: $d"; git -C "$d" status --porcelain | head; }
done
```

Read the two versions:

- **live == main version** → the release rode in without a bump; go to Stage 2 to
  bump (otherwise the go-live guard will skip and nothing ships).
- **main version already > live** (a bump commit already sits on `main`) → the
  payload is ahead; you may skip the bump in Stage 2 and go straight to Stage 3 to
  publish it. Still confirm that bump commit is pushed to `origin/main`.

If either worktree is dirty, stop and resolve before deploying (`deploy.sh`
refuses a dirty tree).

---

## Stage 2 — Bump + push (from the `main` worktree only)

Only the CODE repo (`main`) bumps and pushes. Bump patch, commit, push `origin/main`
(this carries any data commits that rode without a bump too):

```bash
mainwt=~/Documents/GitHub/agora_na_copa_2026
node -e '
const fs=require("fs");const root=process.argv[1];
const cur=require(root+"/package.json").version;
const [a,b,c]=cur.split(".").map(Number);const to=`${a}.${b}.${c+1}`;
for(const f of ["package.json","package-lock.json"]){
  const p=root+"/"+f,j=JSON.parse(fs.readFileSync(p,"utf8"));
  if(j.version===cur)j.version=to;
  if(j.packages&&j.packages[""]&&j.packages[""].version===cur)j.packages[""].version=to;
  fs.writeFileSync(p,JSON.stringify(j,null,2)+"\n");
}
console.log(cur,"->",to);
' "$mainwt"
git -C "$mainwt" add package.json package-lock.json
git -C "$mainwt" commit -m "chore: bump version to <NEW>

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
git -C "$mainwt" push origin main
```

Confirm `git -C "$mainwt" rev-list --left-right --count origin/main...main` is `0 0`
(nothing unpushed) before Stage 3.

---

## Stage 3 — Publish the payload (from the `main` worktree)

**Requires explicit user authorization** (see the gate above). Run `deploy.sh`
scoped to the `main` worktree so it builds + stages + pushes the prebuilt payload:

```bash
npm --prefix ~/Documents/GitHub/agora_na_copa_2026 run deploy
```

What it does: verifies clean worktrees → syncs match results (may auto-commit
`matches.json` on `main`) → fast-forwards `mpbarbosa.com` → `deploy-preflight.sh`
(build + smoke test) → rsyncs `dist/`+manifests into `mpbarbosa.com/agora_na_copa_2026/`
→ commits + pushes that subtree. It ends with `✓ Deployment complete.` and, on a
dev box, `No live production install detected on this host. Skipping app-directory
sync.` — that skip is **expected and correct** (the real rollout is Stage 4).

After it runs, if `sync_match_results` auto-committed `matches.json` on `main`,
re-check `origin/main...main` and push again so `origin` and the payload agree.

---

## Stage 4 — Go-live on the prod host + verify

**Requires explicit user authorization.** Pull the source (for the latest scripts)
and run the build-free, version-guarded go-live on the prod box:

```bash
plink -batch -i ~/Downloads/web_server.ppk ubuntu@18.229.20.196 \
  "bash -lc 'cd ~/Documents/GitHub/agora_na_copa_2026 && git pull --ff-only && npm run go-live'"
```

Expect: it pulls the payload into `mpbarbosa.com`, the guard logs
`Live is behind (live <old> < payload <new>) — rolling out`, then `06_redeploy.sh`
rsyncs to `/var/www`, runs `npm ci --omit=dev`, and restarts the
`agora-na-copa-2026` systemd unit, ending `✓ Build-free go-live complete`.

- If it logs `Production already current` and exits 0, the payload wasn't ahead of
  live — you skipped/forgot the bump (Stage 2), or the bump wasn't pushed. Fix and
  re-run (or, only for a deliberate same-version redeploy, prefix
  `AGORA_FORCE_GO_LIVE=1`).
- **If the prod `git pull` aborts with `untracked working tree files would be
  overwritten` under `traffic-reports/`:** you committed a traffic snapshot that
  also exists as an untracked file in the prod checkout (it was generated there by
  `traffic-report.sh`). The committed and untracked copies are byte-identical (the
  commit came from that same prod-generated file), so it's safe to `rm` the named
  untracked files on prod, then re-run `git pull --ff-only && npm run go-live`:
  ```bash
  plink -batch -i ~/Downloads/web_server.ppk ubuntu@18.229.20.196 \
    "bash -lc 'cd ~/Documents/GitHub/agora_na_copa_2026 && rm -f traffic-reports/summary-<STAMP>.txt && git pull --ff-only && npm run go-live'"
  ```

**Verify** (wait a few seconds for the restart):

```bash
sleep 3
curl -fsS --max-time 10 https://copa2026.mpbarbosa.com/api/health \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print('LIVE:',d.get('version'),d.get('status'),'uptime',d.get('uptime'))"
```

The version must equal the payload version and `status` be `ok`. Then confirm the
**data** actually shipped — grep a distinctive string from this release in a live
payload (not just the version), e.g.:

```bash
curl -fsS "https://copa2026.mpbarbosa.com/api/team-view/ARG" | grep -oE "<a phrase you just added>" | sort -u
```

> A team's editorial note only surfaces through its `team-view` if that team has a
> curated lineup — pick a team that does (e.g. ARG) for the grep, not a late
> bootstrap like COL.

---

## What to report when done

```
✓ Bumped X.Y.(Z) → X.Y.(Z+1), pushed origin/main (SHA <short>)
✓ Published payload → mpbarbosa.com/agora_na_copa_2026 (deploy SHA <short>)
✓ Go-live on prod: service restarted, build-free
✓ Verified LIVE /api/health = X.Y.(Z+1), data string confirmed serving
```

---

## Safety rules

- **Explicit authorization first.** Never run Stage 3–4 without the user's clear
  go-ahead for a production deploy. If the auto-mode classifier blocks a command,
  stop and ask the user to authorize or run it — do not work around the denial.
- **A bump is mandatory to roll out.** Without a payload version strictly greater
  than live, go-live skips. Don't reach for `AGORA_FORCE_GO_LIVE=1` to paper over a
  missing bump — only use it for a deliberate same-version redeploy.
- **Never build on the prod host** — always the dev-publish → prod-go-live split.
- **Only `main` bumps and pushes to `origin`.** Run `deploy.sh` from the `main`
  worktree; keep its tree clean.
- **Verify the live version AND a data string** before declaring success — a green
  restart with an unchanged version means the guard skipped.
- Don't force-push; don't retry a failed prod step silently — report the failing
  step marker (`==> [N/8]` for deploy.sh, or the go-live guard line).

# Runtime loading of editorial content JSON

**Status:** Proposed (sketch — not yet implemented) · 2026-06-22

## Context

All curated data is currently **bundled at build time**: the frontend `import`s the
JSON/TS data and Vite bundles it; `server.ts` `import`s `APP_MATCHES` and esbuild
bundles it into `dist/server.cjs`. Consequences:

- **Every data edit requires a full rebuild** (`vite build` + `esbuild` + `tsc`) and a
  redeploy. During the World Cup the editorial content changes *constantly* (post-match
  analyses, group updates, highlight videos), so this is the most frequent kind of change.
- The rebuild is heavy enough to **OOM-thrash the 1.9 GiB production host** (see
  [EC2_CAPACITY_DEPLOY_SAFETY_ROADMAP](../../../devops/copa_2026/EC2_CAPACITY_DEPLOY_SAFETY_ROADMAP.md));
  swap mitigates it, but a data typo still costs a multi-minute build + restart.
- The git-worktree workflow (ADR-adjacent; see project memory) lets code and data be
  *edited* concurrently, but does nothing about the *deploy* cost — a data merge still
  triggers a rebuild.

We considered splitting the repo into code/data repos and **rejected it**: data is
build-time-coupled, 7 of 13 data files are TypeScript-with-logic importing `src/types.ts`,
and a split adds release coupling without removing the rebuild. The real lever is *how*
data reaches the running app, not which repo it lives in.

## Decision (proposed)

Serve the **frequently-edited, leaf editorial JSON at runtime** through the existing
Express API, so a content update can go live by syncing JSON to the server — **no
frontend/server rebuild**. Keep the bundled copy as a graceful fallback (matches the
project's resilience ethos).

### Scope — do this incrementally, frequent-first

**Phase 1 (high value, low risk)** — leaf content consumed directly by views, not woven
into assembly logic:

| File | Consumer | Edited by |
|---|---|---|
| `matchAnalysis.json` | `MatchDetailView` | `analyze-match` |
| `groupAnalysis.json` | `StandingsView` | `update-group-analysis` |
| `matchVideos.json` | `MatchDetailView`, `TeamLineupView` | `find-missing-*-videos` |
| `teamAnalysis.json` | team view | manual |

**Phase 2 (later, only if needed)** — `matches.json` / `squads.json`. These feed
`appMatches.ts` assembly + `src/types.ts` and are used app-wide; decoupling them means
moving assembly server-side and having the frontend fetch assembled matches. Higher risk,
lower edit frequency — defer.

**Out of scope** — the 7 TS data files (`tournament.ts`, `fifaScheduledMatches.ts`,
`playerRegistry.ts`, etc.). They contain logic + types; they stay bundled.

## Design

1. **Runtime data dir.** Move (or copy) the Phase-1 JSONs to a deployed `data/` directory
   the production server can read (e.g. `/var/www/agora_na_copa_2026/data/`), rsynced
   alongside `dist/`. (Build no longer needs to re-bundle them, though it may keep a
   snapshot — see fallback.)
2. **Server reads with an mtime cache.** A small helper:
   `readJsonCached(path)` → `fs.stat` the file, re-read only when mtime changes; otherwise
   serve the cached parse. Cheap, always-fresh, no restart needed.
3. **Endpoints follow the resilience shape** (`source`, `note`, `updatedAt`) like every
   other FIFA-sourced route: e.g. `GET /api/match-analysis`, `/api/group-analysis`,
   `/api/match-videos`. Return `source: "file" | "fallback"` and fall back to the bundled
   snapshot if the file is missing/unparseable.
4. **Frontend hooks fetch + fall back to the bundled snapshot.** Replace
   `import MATCH_ANALYSIS from "../data/matchAnalysis.json"` usage with a
   `useMatchAnalysis()` hook that fetches the endpoint and, on failure/first paint, uses
   the (possibly stale) bundled copy. Keeps first render instant and offline-safe; the live
   fetch supplies freshness without a rebuild.

> **Resilience trade-off:** keeping the bundled snapshot as fallback means the bundle still
> contains a JSON copy (slightly larger, snapshot may be stale). The alternative —
> fetch-only with a loading/empty state — yields a lighter bundle but no offline fallback.
> Recommend snapshot-fallback initially (matches the codebase's graceful-degradation style).

## Deploy impact (the payoff)

- Add `data/` to the rsync payload in `scripts/deploy.sh` / `shell_scripts/06_redeploy.sh`.
- Introduce a **data-only deploy**: rsync just `data/*.json` to the host. The mtime cache
  picks it up on the next request — **no `npm ci`, no build, no (or trivial) restart.**
  This removes the OOM-prone build from the most common change, and makes a data fix a
  sub-second operation instead of a multi-minute one.
- Code changes still go through the normal build+deploy.

## Trade-offs

**Pros:** data updates skip the heavy build (no OOM risk, near-instant); decouples content
cadence from code releases; data worktree edits ship without touching the bundle; aligns
with the existing API/resilience conventions.

**Cons:** more endpoints + frontend fetch/loading states to maintain; two sources of truth
during the fallback window (bundle snapshot vs live file); a small per-request read/stat
(negligible at this traffic); the deploy scripts grow a data-only path.

## Migration (incremental, low-risk)

Per file, behind the fallback so each step is independently shippable:

1. Add `readJsonCached` + one endpoint (e.g. `/api/match-analysis`) returning the resilience
   shape; unit-test the read/cache + fallback-on-missing.
2. Add the frontend hook; switch one view to fetch-with-bundled-fallback; e2e that it renders
   live data and still renders when the endpoint 404s.
3. Repeat for the other Phase-1 files.
4. Add `data/` to the deploy payload + a `data-only` deploy command; document it.
5. (Optional) once confident, drop the bundled snapshots to slim the bundle.

## Effort

Roughly half a day for Phase 1 (≈4 files × {endpoint + hook + tests}, sharing one
`readJsonCached` helper and one fetch-hook pattern), plus the deploy-script changes.
Phase 2 (`matches.json`) is a separate, larger effort and explicitly deferred.

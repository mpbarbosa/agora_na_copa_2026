# Roadmap: Expanding "Agora na Copa 26"

This roadmap analyzes the `DESIGN.md`/`SPECIFICATION.md` from a separate AI Studio
export of a "FIFA World Cup 2026 — Agora na Copa" concept and maps its feature set
onto this repo's actual current state. It supersedes the high-level version of this
document with concrete file-level changes, sequencing, effort estimates, and —
critically — a **deployment safety pass per phase** so each phase can ship to
production independently without breaking the live site.

---

## 1. Baseline snapshot (grounded in current code)

- **`src/App.tsx` (1104 lines)** is a single-page monolith. The header renders
  match-selector chips grouped by status via `HEADER_MATCH_STATUS_GROUPS`
  (CONCLUÍDOS / EM ANDAMENTO / PRÓXIMOS), and the body shows two tabs —
  `"broadcast"` and `"lineup"` — both scoped to whichever match is selected
  (`currentMatch`). There is **no top-level navigation** for tournament-wide views.
- **`src/matches.json`** holds **13 curated "featured" matches** spanning groups
  A, B, C, D, E, F, I, J (not all 12 groups, not full round-robin). Per
  `CONTEXT.md`, this is explicitly the "Próximos Jogos" demo pool — lineup-rich
  (23 players/team) and broadcaster-rich, not a full tournament schedule.
- **`src/types.ts`** is single-match-detail-centric (`Match`, `Player`,
  `Broadcaster`, `CommentaryEvent`, `MatchStateEntry`, `BroadcastGuideEntry`,
  `MatchOverlayEntry`). No `Team` standings, `Stadium`, `NewsArticle`, or
  `BracketNode` types exist yet.
- **`server.ts` + `fifa-sync-core.ts`** implement a production-grade FIFA sync
  layer: per-endpoint caching, circuit breakers, stale-serve fallback, and
  diagnostics (`/api/broadcast-guide`, `/api/match-states`, `/api/match-overlays`,
  `/api/fifa-sync-status`), covered by `tests/fifa-sync-core.test.ts`.
- **Dual theme already exists.** `theme: "classic-light" | "stadium-dark"` is
  threaded through every component via `theme === "classic-light" ? ... : ...`
  ternaries, with `"classic-light"` as the default. New views just follow this
  existing ternary convention for both palettes — no redesign needed.
- **28 of 48 team flags** are implemented in `src/components/flags/` (see
  `flags/index.ts`). 20 teams still need flag SVG components for a full
  group-stage dataset.

---

## 2. Architectural principles to preserve

- **Resilience/fallback pattern**: every FIFA-sourced field carries
  `source: "fifa" | "fallback"`, a human-readable `note`, and `updatedAt`. Any new
  server endpoint (standings deltas, bracket auto-seeding, AI predictions) should
  follow this same shape and diagnostics convention (`fifaSyncDiagnostics`-style).
- **Dual-theme ternary convention** — no `dark:` Tailwind variants; branch
  explicitly on the `theme` prop as existing components do.
- **CONTEXT.md glossary discipline** — every new domain concept (e.g., "Tabela de
  Grupos", "Chaveamento", "Sede") gets an entry with usage/avoid guidance, as
  `"Próximos Jogos"` and `"Detalhes da Partida"` already do.
- **Type-first changes** — extend `src/types.ts` before touching data or
  components, per `CLAUDE.md`.
- **esbuild bundling constraint** — `npm run build` bundles `server.ts` via
  esbuild with `--packages=external`. Any new server dependency (e.g.,
  `@google/genai`) must be added to `package.json` `dependencies` (not just
  `devDependencies`) so `npm ci --omit=dev` installs it on the production host.

---

## 3. Production deployment model (grounded facts)

This section is the basis for every "deployment safety" note below. Confirmed
from `docs/production-environment-memory.md`, `scripts/deploy*.sh`, and
`shell_scripts/`:

- **Single production instance**, run as a `systemd` service
  (`agora-na-copa-2026`) behind nginx, on a dedicated AWS host. There is **no
  blue/green or rolling deploy** — `06_redeploy.sh` rsyncs the new payload and
  **restarts the single service**, causing a brief full-process restart
  (in-memory FIFA sync caches reset to cold, then re-warm via
  `warmDefaultFifaCaches`).
- **Deploy payload is narrow**: `dist/`, `package.json`, `package-lock.json`,
  `.env.example` only. The production `.env` file is **preserved across
  redeploys** (`rsync` excludes it) — meaning **new env vars introduced by a
  phase will NOT exist in prod `.env` until someone manually adds them**. Any
  code that reads a new env var must work correctly when that var is absent.
- **`npm ci --omit=dev` runs on the production host** after sync. New runtime
  dependencies must be (a) in `dependencies`, and (b) reflected in
  `package-lock.json` committed to the repo, or `npm ci` will fail or install
  stale versions.
- **`scripts/deploy-preflight.sh`** is the only automated gate before a deploy:
  it builds, checks `dist/index.html`, `dist/server.cjs`, `dist/assets/*.{js,css}`
  exist, then boots the production bundle on port 9011 and curls `GET /` and the
  first JS asset for HTTP 200. **It does not run Playwright e2e, and does not
  exercise any `/api/*` route.**
- **`tests/e2e/` does not exist yet** — `playwright.config.ts` is configured
  (port 3100, `npm run dev` as web server) but there are zero specs. `npm run
  test:e2e` currently has nothing to run.
- **Rollback mechanism**: the sibling `mpbarbosa.com` staging repo keeps dated
  snapshots under `.backups/` and the deploy subtree is a tracked git path —
  reverting means re-syncing a previous `dist/` payload and restarting the
  service. This is **manual and coarse** (whole-app, not per-feature), so the
  practical safety net is **keeping each deploy small and independently
  revertible**, not relying on fine-grained rollback.

### Implication for this roadmap

> **One phase = one deploy = one version bump.** Never bundle two phases into
> one deploy. Each phase must leave the app in a fully working, demo-able state
> on its own — including any nav entries it introduces.

---

## 4. Cross-cutting deployment safety rules (apply to every phase below)

These are new, derived directly from §3, and apply to **every** phase:

1. **No dead nav entries.** If a phase's nav refactor exposes a tab whose view
   isn't built yet, that tab must render a clearly-labeled "Em breve" (coming
   soon) placeholder — never a blank page, console error, or crash. Concretely:
   a `NAV_ITEMS` config (added in Phase 0a) carries a `status: "live" |
   "comingSoon"` flag per entry; `comingSoon` entries render a shared
   `ComingSoonView` until their phase ships.
2. **New env vars must be optional with safe in-code defaults.** Because prod
   `.env` won't be updated automatically (§3), any `process.env.X` read added in
   a phase must have a fallback branch that produces correct (if degraded)
   behavior when `X` is `undefined`. This is already the pattern for
   `GEMINI_API_KEY` in Phase 5 — make it explicit and tested.
3. **New runtime deps → update `package-lock.json` and verify with `npm ci
   --omit=dev` locally** before merging (simulates what the prod host does).
4. **Baseline e2e suite is created in Phase 0a**, not "extended" later (there is
   none today). Every subsequent phase that adds a nav tab adds **at least one**
   Playwright spec asserting that tab renders without error in both themes.
5. **Extend `deploy-preflight.sh` incrementally.** Each phase that adds a new
   `/api/*` route or a new top-level nav tab should add one `curl` smoke check
   (API) or one Playwright spec run (UI) to the preflight, so a broken phase
   fails preflight instead of failing in prod.
6. **Additive type changes only within a phase's deploy.** New fields on shared
   types (`Match`, API response shapes) must be optional (`?`) or have safe
   defaults — frontend and backend ship together so this is lower-risk than a
   true rolling deploy, but optional fields keep `tsc --noEmit` (the lint gate)
   forgiving of partially-wired data during a phase's internal sequencing.
7. **Version bump per phase** via the existing `bump-version-stage-commit-push`
   skill — gives each production deploy a distinct, revertible version marker in
   the footer and git history.

---

## 5. Critical structural insight: two data domains must stay separate

The reference `worldCupData.ts` models *all 48 teams across 12 groups* with full
standings. This repo's `matches.json` models a **curated subset** of matches with
*full lineups* (23 players each). Merging these into one file would either bloat
the featured pool with 48×23 player records, or strip lineups from the featured
matches. **Recommendation**: keep them separate.

- **`src/matches.json`** (existing) — stays as the "Detalhes da Partida" pool:
  curated matches with lineups, broadcasters, commentary. Used by the
  match-detail view (current `App.tsx` body).
- **`src/data/tournament.ts`** (new) — lightweight tournament-wide dataset:
  48 `Team` records (with standings stats), 12 group rosters, 16 `Stadium`
  records, and the R32→Final `BracketNode` skeleton. No lineups, no
  broadcasters. Used by StandingsView, BracketView, VenueMapView.

Group-stage results needed to compute standings can come from two sources:
finished matches already in `matches.json` (5 of the 13 are `FINISHED`) plus a
static seed for the remaining fixtures in `tournament.ts`. The FIFA sync layer
(`fifa-sync-core.ts`) can later be extended to reconcile `tournament.ts`
standings the same way it reconciles `matches.json` match states (Phase 6).

---

## 6. Phase 0a — Navigation refactor (prerequisite for everything else)

Without a top-level nav, new tournament-wide views have nowhere to live. This
phase restructures `App.tsx` *before* any new view is built. **This is now the
highest-value phase to get right defensively, since every later phase's
deployment safety depends on the scaffolding it creates.**

- Extract the current header match-selector + broadcast/lineup tabs + their
  supporting state/handlers (`currentMatch`, `activeTab`, `matchOverlays`,
  countdown logic, commentary feed, `PitchLineup`) into a new
  `src/components/MatchDetailView.tsx`. This becomes the "Partidas" view.
- Add a top-level nav driven by a `NAV_ITEMS` config (`Partidas | Grupos |
  Chaveamento | Estádios | Notícias | Fan Zone`) as a thin bar under the header
  (not a full sidebar — keep mobile 320px width and 44px tap targets per
  `DESIGN.md`'s "Negatividade Espacial" and responsiveness rules).
- Add a shared `src/components/ComingSoonView.tsx` (themed per §2) and wire every
  `NAV_ITEMS` entry except `"Partidas"` to `status: "comingSoon"` → renders it.
  This lets Phase 0a deploy with a **complete, non-broken 6-item nav** even
  though only one view exists yet — later phases just flip one entry's `status`
  to `"live"`, a minimal, low-risk diff.
- `App.tsx` becomes a shell: header (theme toggle stays global) + nav + routed
  view. Theme state (`theme`) and the global config drawer remain in `App.tsx`
  and get passed down as props.
- **New**: create `tests/e2e/` with a baseline Playwright spec covering:
  - App loads, default "Partidas" view renders, match selector + broadcast/lineup
    tabs work (regression coverage for the extracted `MatchDetailView`).
  - Each `comingSoon` nav entry renders `ComingSoonView` without console errors,
    in both themes.
- **New**: add one preflight check to `scripts/deploy-preflight.sh` — run
  `npm run test:e2e` (or a `--grep` smoke subset) against the production preview
  server before declaring the payload ready.
- Update any DOM ids (`#applet-main-body`, `#main-layout-container`,
  `#app-header`, `#match-selector-groups`) referenced by the new e2e specs —
  since the specs are written *as part of this phase*, there's no pre-existing
  selector contract to break.

**Effort**: M (4–6 days — refactor + nav shell + `ComingSoonView` + baseline e2e
suite + preflight wiring). **Risk**: highest-touch change in the roadmap, but the
"comingSoon" placeholder strategy means it ships as a *complete* increment —
nothing downstream is half-built in production.

---

## 7. Phase 0b — Tournament data foundations

- Add to `src/types.ts`:
  - `Team` (id, name, code, flagSvg, group, points, played, won, drawn, lost,
    goalsFor, goalsAgainst, goalDifference)
  - `Stadium` (id, name, city, country, capacity, yearBuilt, coordinates `{x,y}`,
    facts, image)
  - `BracketNode` (id, stage `'R32'|'R16'|'QF'|'SF'|'F'`, nextMatchId, teamA/teamB
    refs, winner, scores, placeholders)
  - `NewsArticle` (id, title, summary, content, category, date, imageUrl)
  - `StandingsRow` — extends `Team` stats with a `dataSource: "result" |
    "seed"` flag (see Phase 1 deployment safety note).
- Create `src/data/tournament.ts`:
  - 12 groups × 4 teams = 48 `Team` entries with seed standings (compute initial
    values from the 5 `FINISHED` matches already in `matches.json`; remaining
    teams start at 0 with `dataSource: "seed"`).
  - 16 `Stadium` entries (USA/MEX/CAN venues, coordinates relative to an SVG
    viewBox for `VenueMapView`).
  - R32 `BracketNode` skeleton with `placeholderA`/`placeholderB` (e.g.,
    "1º Grupo A", "2º Grupo B") since groups aren't finished.
- **Flag gap**: add the 20 missing team flag SVGs to `src/components/flags/` and
  register them in `FlagIcon.tsx`'s `FLAGS` map. Mechanical but non-trivial (20
  hand-drawn SVGs matching the existing style).
- **Deployment safety**: this phase ships **data and types only — no new nav
  entry, no UI change**. It is purely additive (new files, new exported types/
  consts not yet imported by `App.tsx`), so `npm run build` output is byte-for-
  byte equivalent in the shipped UI. Lowest-risk phase in the roadmap; good
  candidate to deploy immediately after Phase 0a to validate the "small, frequent
  deploys" cadence before riskier UI phases.
  - Add a quick bundle-size sanity check to `deploy-preflight.sh` (e.g., assert
    `dist/assets/*.js` total size stays under a generous threshold) now that 20
    SVG components + ~50 data records are entering the bundle — catches an
    accidental embedded base64 image or similar bloat early.

**Effort**: M (3–5 days, mostly data entry + 20 flag SVGs). **Depends on**:
Phase 0a (for the `NAV_ITEMS`/`ComingSoonView` scaffolding to exist, even though
this phase doesn't use it yet — keeps phase ordering linear and each deploy
buildable on the previous).

---

## 8. Phase 1 — StandingsView ("Grupos")

- New `src/components/StandingsView.tsx`: 12 group tables, each sorted by
  Pts → SG → GF, columns J/V/E/D/GF/GA/SG/Pts (JetBrains Mono per `DESIGN.md`
  §2.2/§3).
- Standings computed client-side from `tournament.ts` seed + any `FINISHED`
  matches in `matches.json` (reconciled by team code).
- Flip the `"Grupos"` entry in `NAV_ITEMS` from `comingSoon` to `live` (the only
  `App.tsx`-level diff this phase needs, per the Phase 0a scaffolding).
- Responsive: 12 tables in a bento-grid on desktop, stacked/scrollable on mobile.
- **Deployment safety**: because 7 of 12 groups start from `dataSource: "seed"`
  (all-zero) data (§7), render a small inline note — following the existing
  `note`/`source` resilience convention — when a group table is showing seed-only
  data (e.g., "Resultados da fase de grupos ainda não disputados"). This prevents
  an all-zero table from reading as a bug in production.
- Add one Playwright spec: navigate to "Grupos", assert all 12 group tables
  render with headers and at least one row, in both themes.

**Effort**: S–M (2–4 days). **Depends on**: Phase 0a, 0b.

---

## 9. Phase 2 — VenueMapView ("Estádios")

- New `src/components/VenueMapView.tsx`: interactive SVG map of USA/MEX/CAN using
  `Stadium.coordinates`, clickable pins.
- Side panel shows capacity, year built, facts, and (optionally) which
  `matches.json` fixtures are hosted there (cross-reference `stadiumName`/`city`).
- Mobile: map collapses to a scrollable list of stadium cards (44px tap targets).
- Flip `"Estádios"` to `live` in `NAV_ITEMS`.
- Add one Playwright spec: navigate to "Estádios", click a pin, assert the detail
  panel populates, in both themes.

**Effort**: M (3–5 days, SVG map work is the bulk). **Depends on**: Phase 0a, 0b.
**Independent of** Phase 1 — can be built in parallel by a different
contributor/session and deployed in either order.

---

## 10. Phase 3 — NewsView ("Notícias")

- New `src/components/NewsView.tsx`: categorized card feed (Sedes / Ingressos /
  Equipes / Geral) from a static `src/data/news.ts` seed (`NewsArticle[]`).
- Flip `"Notícias"` to `live` in `NAV_ITEMS`.
- Add one Playwright spec: navigate to "Notícias", assert category filters work
  and at least one card renders per category.
- Lowest-risk, highest-parallelizable phase — no dependency on tournament data
  beyond the `NewsArticle` type from Phase 0b.

**Effort**: S (1–2 days). **Depends on**: Phase 0a + `NewsArticle` type only.

---

## 11. Phase 4 — BracketView ("Chaveamento")

- New `src/components/BracketView.tsx`: R32 → R16 → QF → SF → F tree ending at
  MetLife Stadium (East Rutherford), per `DESIGN.md` §3.1.
- Interactions: click a team in a node to advance it to `nextMatchId`; "Reset"
  restores the R32 skeleton from `tournament.ts`; champion triggers an animated
  callout (use existing `motion` dependency).
- Flip `"Chaveamento"` to `live` in `NAV_ITEMS`.
- **Deployment safety**: bracket interaction state is client-local (component
  state, not persisted) — confirm this explicitly, since persisting it would
  require either `localStorage` (fine, no server impact) or a server endpoint
  (out of scope for this phase). Document the "resets on page reload" behavior
  in the UI (e.g., a small "Reiniciar chaveamento" affordance) so it doesn't read
  as a bug.
- **Stretch**: auto-fill R32 placeholders from `StandingsView` once all group
  matches are `FINISHED` (real cross-phase wiring — flag as optional for v1; if
  deferred, ship the manual-pick bracket as the complete v1 deliverable for this
  phase rather than leaving it half-wired).
- Add one Playwright spec: navigate to "Chaveamento", click through one full
  bracket path to a champion, assert the champion callout renders, then reset.

**Effort**: M–L (5–8 days; bracket state management + responsive tree layout is
the complex part). **Depends on**: Phase 0a, 0b (bracket skeleton). **Soft
dependency** on Phase 1 for the auto-seed stretch goal only.

### Follow-up (2026-06-24): rebuild BracketView from `knockoutBracket.json`

`BracketView` shipped, but its knockout pairings/dates/venues came from the
hand-seeded `tournament.ts` skeleton and proved **wrong** vs. the official FIFA
schedule (e.g. Brazil's R32 slot was mis-paired). The corrected source of truth
now exists: **`src/data/knockoutBracket.json`** — `{ "matches": [...] }` with 32
entries, each `{ matchNumber, stage, dateUtc, stadium, city, slotA, slotB, teamA,
teamB }`. Slots are official FIFA placeholder labels (`"2A"`, `"1C"`, `"2F"`,
`W74`, `3CEFHI`, …); `teamA`/`teamB` are `{ code, name }` once known, else `null`.
It is generated reproducibly by **`scripts/build-knockout-bracket.py`** from the
FIFA calendar API (idCompetition=17, idSeason=285023).

**Task**: rewrite `BracketView` to render directly from `knockoutBracket.json`
instead of the `tournament.ts` `BracketNode` skeleton:
- Drive the R32 → R16 → QF → SF → 3rd-place → Final tree off `matchNumber`
  ranges (R32 73–88, R16 89–96, QF 97–100, SF 101–102, 3rd 103, Final 104) and
  the official slot labels, so progression matches the real FIFA bracket.
- Show each match's real `dateUtc` (localized) and `stadium`/`city`.
- Render official placeholder labels (`2A`, `1C/2F`, `W74`, `3CEFHI`) for slots
  whose team is not yet decided, rather than inventing pairings.
- Add the 3rd-place match (#103), currently absent.
- Keep the existing manual click-to-advance interaction layered on top of the
  real seeding (or gate it behind real results — TBD).
- Update `tests/e2e/bracket.spec.ts` to assert real slot labels/dates render.

**Why it matters**: data accuracy is a hard requirement — wrong knockout data is
a real failure, not cosmetic. Do **not** re-derive pairings by hand; the JSON is
the only trusted source.

**Effort**: M (2–3 days). **Depends on**: nothing new — data + generator already
landed. Belongs in `agora-dev`.

---

## 12. Phase 5 — Fan Zone + Gemini AI (gated on scope confirmation)

This phase introduces a genuinely new dependency (`@google/genai`) and an
external API cost surface. **Confirm product scope before starting.** It also
carries the highest production-risk profile in the roadmap because it's the only
phase touching `server.ts` startup/runtime behavior — treat the items below as
hard requirements, not nice-to-haves.

- `package.json`: add `@google/genai` to `dependencies`. Run `npm install` then
  **commit the updated `package-lock.json`** and verify `npm ci --omit=dev`
  succeeds from a clean checkout (simulates the prod host) before merging (rule
  #3 in §4).
- `.env.example`: add `GEMINI_API_KEY=` with a comment explaining the fallback.
  **Remember prod `.env` will not gain this key automatically** (§3) — the
  fallback path is therefore the *default production behavior* until someone
  manually provisions the key, not just an edge case.
- `server.ts`:
  - Read `GEMINI_API_KEY` **lazily inside the request handler**, not at module
    load — never throw or exit at startup if it's missing, so a redeploy without
    the key doesn't crash the systemd service.
  - `POST /api/predict` — body `{ homeTeam, awayTeam, userNotes }`, returns
    `{ text: string (markdown), simulated: boolean }`. On missing/invalid key,
    fall back to a deterministic generator based on `tournament.ts` team stats
    (mirrors the existing fallback philosophy in `fifa-sync-core.ts`).
  - `GET /api/questions` — static trivia question set (seed JSON, no AI needed,
    no env dependency, no failure mode).
- `src/components/FanZoneView.tsx`:
  - AI predictor form (two team selectors + notes textarea → rendered markdown
    response, with a "simulado" badge when `simulated: true`).
  - Trivia quiz consuming `/api/questions`.
  - Penalty mini-game (client-only, pseudo-random keeper dive).
- Flip `"Fan Zone"` to `live` in `NAV_ITEMS`.
- **New preflight checks** in `deploy-preflight.sh`:
  - `curl -fsS -X POST .../api/predict` with a sample payload, asserting HTTP 200
    **and** `simulated: true` when `GEMINI_API_KEY` is unset (the expected prod
    state until the key is provisioned) — this is the single most important new
    check, since it directly validates rule #2 of §4 for this phase.
  - `curl -fsS .../api/questions` returns a non-empty array.
- Add Playwright specs: Fan Zone tab renders all three sub-features; predictor
  shows the "simulado" badge in the (env-less) CI/preflight environment; trivia
  and penalty mini-game are interactable.

**Effort**: L (1–2 weeks: server endpoint + fallback simulator + 3 distinct UI
sub-features + the extra preflight/lockfile verification work above). **Depends
on**: Phase 0a (nav), Phase 0b (`Team` stats feed the fallback simulator). **Hard
gate**: explicit go/no-go on AI scope and budget, *and* a deliberate decision on
when (if ever) `GEMINI_API_KEY` gets provisioned in prod `.env` — until then this
phase ships in "always simulated" mode, which must be an acceptable v1 state.

---

## 13. Phase 6 — Live simulator → standings integration (RF-01)

- Extend `MatchDetailView` (post Phase-0a extraction) so manually-triggered goal/
  card events update the corresponding `Team` records in `tournament.ts` state,
  which `StandingsView` re-renders from.
- Requires lifting `tournament.ts` standings state up to `App.tsx` (or a small
  context) so both `MatchDetailView` and `StandingsView` read/write the same
  store.
- **Deployment safety**: `App.tsx` already has a hardcoded interactive demo for
  match `"bra-mar-2026"` (`customKickoffTime`/`customCountdownSeconds`,
  `getMatchCountdownSeconds` special-case). Lifting standings state up must not
  regress this existing demo path — add it explicitly to the Phase 0a baseline
  e2e suite *before* starting Phase 6 (rule #4 in §4 — regression coverage must
  predate the risky change), then re-run it as part of this phase's acceptance.
- All state remains client-side (no server/API change) — this phase has no
  `server.ts` or env-var surface, keeping its production risk limited to the
  frontend bundle.

**Effort**: M (3–5 days). **Depends on**: Phase 0a, Phase 1 (StandingsView must
exist to observe the effect), and a pre-existing e2e spec for the
`"bra-mar-2026"` custom-countdown demo (added as part of this phase if missing).

---

## 14. Phase 7 — Polish & QA

With the per-phase e2e specs and preflight checks added incrementally (§4 rule 4
and 5), this phase is now a **final cross-cutting pass**, not the first time
automated checks are introduced.

- Contrast audit (≥4.5:1) for both themes across all new views (`DESIGN.md`
  §1.2 / SPECIFICATION.md §5 non-functional requirement).
- Responsive bento-grid pass for Standings/Venues/Bracket on ultra-wide and
  320px viewports.
- `npm run lint` (tsc `--noEmit`) clean across all new files.
- Run the full accumulated Playwright suite (one spec per nav tab by this point)
  plus the full `deploy-preflight.sh` (now including the `/api/predict` and
  `/api/questions` checks from Phase 5) as a final gate.
- Remove the `ComingSoonView` import/usages and `comingSoon` branch from
  `NAV_ITEMS` handling if every entry is now `live` (dead-code cleanup).

**Effort**: M (3–5 days). **Depends on**: all prior phases.

---

## 15. Sequencing & dependency graph

```
Phase 0a (Nav refactor + ComingSoonView + baseline e2e + preflight hook)
  │
  ├──> Phase 0b (Tournament data, additive-only, no nav change)
  │      │
  │      ├──> Phase 1 (Standings) ──┬──> Phase 6 (Live sim → standings)
  │      ├──> Phase 2 (Venues)       │
  │      ├──> Phase 3 (News)         │
  │      ├──> Phase 4 (Bracket) ─────┘ (soft dep for auto-seed)
  │      └──> Phase 5 (Fan Zone/AI) [gated]
  │
  └──> All phases ──> Phase 7 (Polish & QA)
```

Each arrow is also a **deploy boundary**: land and deploy Phase 0a alone, verify
prod, then 0b alone, verify prod, etc. Phases 1–5 are mutually independent after
0a/0b land and can be worked in parallel across branches — but **merge/deploy
them one at a time** to keep each production rollout small and revertible (§3
implication). Phase 5 remains the only phase with an external go/no-go gate and
can be deferred indefinitely without blocking the rest, since its `NAV_ITEMS`
entry simply stays `comingSoon` until it ships.

## 16. Effort summary

| Phase | Description | Effort | Hard dependencies | New prod surface added |
|---|---|---|---|---|
| 0a | Nav refactor + `ComingSoonView` + baseline e2e + preflight hook | M (4–6d) | — | New nav UI (all comingSoon except Partidas) |
| 0b | Tournament data + 20 missing flags | M | 0a | None (data/types only) |
| 1 | StandingsView | S–M | 0a, 0b | "Grupos" tab live |
| 2 | VenueMapView | M | 0a, 0b | "Estádios" tab live |
| 3 | NewsView | S | 0a | "Notícias" tab live |
| 4 | BracketView | M–L | 0a, 0b | "Chaveamento" tab live |
| 5 | Fan Zone + Gemini AI | L | 0a, 0b, **scope gate** | "Fan Zone" tab + `/api/predict`, `/api/questions` |
| 6 | Live simulator → standings | M | 0a, 1 | None (client-only) |
| 7 | Polish & QA | M | all | None (cleanup) |

## 17. Open questions for product owner

1. **AI scope (Phase 5)**: confirm whether Gemini integration (and its cost/ops
   overhead) is in scope for this app, or whether Fan Zone ships as trivia +
   penalty game only (no `/api/predict`).
2. **Standings data source**: is a static seed for the 7 unmodeled groups
   acceptable for launch, or does `matches.json` need to grow to cover all 12
   groups' fixtures first?
3. **Bracket auto-seed**: nice-to-have for v1, or can it ship as a fully manual
   "pick your bracket" tool initially?
4. **`GEMINI_API_KEY` provisioning**: who owns adding this to the production
   `.env` (it won't appear via redeploy automatically, per §3), and is "always
   simulated" an acceptable permanent state if it's never provisioned?
5. **Preflight runtime budget**: adding Playwright runs to `deploy-preflight.sh`
   (§4 rule 5) increases deploy time — confirm this is acceptable for the
   single-instance redeploy window, or whether e2e should instead run as a
   pre-merge CI step (would require introducing CI, currently absent).

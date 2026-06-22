# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Agora na Copa 26" — a FIFA World Cup 2026 broadcast companion: live countdowns, broadcaster schedules (Globo, SportTV, CazéTV, FIFA+), tactical lineups, standings, and bracket. Built with React 19 + Vite + TypeScript + Tailwind v4, served via an Express backend that also proxies Vite in dev.

## Commands

- `npm run dev` — start the Express server (`server.ts` via `tsx`), which runs Vite in middleware mode. Single command for full-stack dev (port 3000; auto-walks to next free port unless `STRICT_PORT=true`).
- `npm run build` — builds the frontend with Vite and bundles `server.ts` into `dist/server.cjs` with esbuild.
- `npm start` — run the production build (`node dist/server.cjs`).
- `npm run lint` — type-checks the whole project with `tsc --noEmit`.
- `npm run test:unit` — runs unit tests via Node's built-in test runner (`tests/fifa-sync-core.test.ts`, `tests/standings.test.ts`).
- `npm run test:e2e` — runs the Playwright e2e suite in `tests/e2e/` (boots dev server on port 3100).
- `npx playwright test tests/e2e/<spec>.ts` — run a single Playwright spec.
- `npm run clean` — removes `dist`.
- `npm run deploy:preflight` — builds + boots the production bundle locally and smoke-tests it before deploying.
- `npm run deploy` — rsync to the production host and restart the systemd service.

## Architecture

### Data flow

- **`src/matches.json`** is the source of truth for all curated match fixtures and full player lineups (23 players per team, with `x`/`y` pitch coordinates). `src/data.ts` only contains commentary strings now — not match data.
- **`src/appMatches.ts`** assembles the full `APP_MATCHES` array by merging `matches.json` + supplemental FIFA fixtures + `data/fifaScheduledMatches.ts` schedule seeds + `data/fifaMatchVenues.ts` official venue overrides.
- **`src/data/tournament.ts`** holds the tournament-wide lightweight dataset: 48 `Team` seed standings, 16 `Stadium` records, `BracketNode` skeleton, and `NewsArticle` entries. No lineups, no broadcasters. Used by `StandingsView`, `BracketView`, `VenueMapView`.
- **`src/standings.ts`** computes `StandingsRow[]` by reconciling `tournament.ts` seed stats with `FINISHED` match results from `APP_MATCHES`.

### Server

- **`server.ts`** — single Express server. Owns the API routes, loads `APP_MATCHES`, proxies Vite in dev, serves `dist/` statically in production.
- **`fifa-sync-core.ts`** — pure FIFA API integration logic (match-finding, broadcaster normalization, lineup building, match-state building). Extracted from `server.ts` so it can be unit-tested independently. Imported by both `server.ts` and `tests/fifa-sync-core.test.ts`.
- **`trends-core.ts`** — pure parser for the Google Trends RSS feed (XML → topics). Extracted from `server.ts` for independent unit testing. Imported by `server.ts` and `tests/trends-core.test.ts`.
- **`weather-core.ts`** — pure Open-Meteo integration (request-URL building, response parsing, WMO weather-code → pt-BR description/emoji mapping). Extracted from `server.ts` for independent unit testing. Imported by `server.ts` and `tests/weather-core.test.ts`.
- API endpoints: `/api/broadcast-guide`, `/api/match-states`, `/api/match-overlays`, `/api/team-lineups`, `/api/tournament-leaders`, `/api/player-stats/:teamCode/:playerName`, `/api/player-incidents/:teamCode/:playerName`, `/api/team-view/:teamCode`, `/api/country-info/:code`, `/api/google-trends`, `/api/match-weather`, `/api/questions`, `/api/fifa-sync-status`, `/api/health`.
- **`/api/google-trends`** proxies the public Google Trends "Daily Search Trends" RSS feed (geo=BR), parsed by `trends-core.ts`. Not FIFA-sourced, but follows the resilience shape (`source: "google-trends" | "fallback"`, `note`, `updatedAt`, `topics`) with a 20-min cache and graceful fallback. Consumed by the Social Medias view (`SocialMediasView`, "Redes Sociais" tab).
- **`/api/match-weather?lat&lng`** returns the current weather at a match venue (free, key-less Open-Meteo), parsed by `weather-core.ts`. Not FIFA-sourced, but follows the resilience shape (`source: "open-meteo" | "fallback"`, `note`, `updatedAt`, `weather`) with a 15-min per-coordinate cache and graceful fallback. Consumed by `MatchWeatherChip` in the "Ao Vivo" scoreboard, shown only while a match is `LIVE`.
- **`/api/health`** returns `{ status, version, uptime, load, memory, system }` — real-time server vitals for external uptime monitors (no cache). Not a FIFA-sourced endpoint; does not carry the resilience shape.
- Every FIFA-sourced response carries `source: "fifa" | "fallback"`, a human-readable `note`, and `updatedAt`. Any new endpoint must follow this resilience shape and fall back gracefully when the FIFA API is unreachable.

### Frontend

- **`src/App.tsx`** — shell: global header (theme toggle) + top-level nav + routed view. Theme state (`"classic-light"` | `"stadium-dark"`) and match-selection state live here.
- **`src/navigation.ts`** — `NAV_ITEMS` array (11 tabs: Ao Vivo, Partidas, Grupos, Seleções, Jogadores, Líderes, Chaveamento, Estádios, Notícias, Fan Zone, Redes Sociais). Each entry has `id`, `label`, `description`. Tabs without a shipped view render `ComingSoonView`.
- **`src/types.ts`** — single source of truth for all TypeScript shapes (`Match`, `Player`, `Broadcaster`, `BroadcastGuideEntry`, `MatchStateEntry`, `Team`, `StandingsRow`, `Stadium`, `BracketNode`, `NewsArticle`, etc.). Extend here first before touching data or components.

### Components

- **`src/components/MatchDetailView.tsx`** — the "Partidas" view: match selector, scoreboard, broadcast guide, live commentary, and pitch lineup.
- **`src/components/PitchLineup.tsx`** — visual pitch rendering player positions from `x`/`y` coords.
- **`src/components/FlagIcon.tsx`** + **`src/components/flags/`** — each country's hand-drawn SVG flag. A `flagSvg` string (e.g. `"brazil"`) must match a key in `FlagIcon`'s `FLAGS` map. New teams need both a flag component and a registration.
- Path alias `@/*` maps to the repo root (configured in both `tsconfig.json` and `vite.config.ts`).

## Key conventions

- **Theming**: the theme prop (`"classic-light"` / `"stadium-dark"`) is passed explicitly through components and branched with `theme === "classic-light" ? ... : ...` ternaries. Do not rely on Tailwind `dark:` utilities alone.
- **Brazilian Portuguese copy**: all user-facing text must be in pt-BR in the football-broadcast voice. Domain terms are defined in `CONTEXT.md` — check it before adding new labels.
- **Visual language**: Anton for display text, Archivo Narrow for dense UI, JetBrains Mono for clocks and stats. Glassmorphism conventions from `src/index.css` and `DESIGN.md`. Consult `DESIGN.md` before adding new UI surfaces.
- **New server dependencies**: add to `package.json` `dependencies` (not `devDependencies`) so `npm ci --omit=dev` works on the production host. Commit the updated `package-lock.json`.
- **New env vars**: must work correctly when unset (the production `.env` is not updated automatically on deploy — new vars must have safe in-code defaults).
- **esbuild constraint**: `npm run build` bundles `server.ts` with `--packages=external`. Runtime deps must be in `dependencies` and present after `npm ci --omit=dev`.

## Deployment

Single production instance running as a `systemd` service (`agora-na-copa-2026`) behind nginx on an AWS host. `npm run deploy` rsyncs `dist/`, `package.json`, `package-lock.json` to the host and restarts the service (no blue/green — brief downtime, in-memory caches reset). The production `.env` is preserved across deploys (not overwritten by rsync).

### Going live on the prod host

Do **not** run `npm run deploy` on the prod box — building there OOM-thrashes the ~1.9 GiB host. Instead use the build-free path: `git pull` then `npm run go-live` (`shell_scripts/10_go_live.sh`). Go-live is **version-guarded**: after pulling the prebuilt payload it compares the payload's version against the running service's `/api/health` version and **rolls out only when the live site is behind the payload** — otherwise it skips (no needless restart/cache reset). Fail-open if either version can't be read; force a same-version redeploy with `AGORA_FORCE_GO_LIVE=1`. Note: publishing from dev (`npm run deploy`) only stages the payload into the `mpbarbosa.com` repo — the live site updates only when a deploy/go-live runs on the prod host.

## Design and quality guides

Reference guides live in `docs/guides/`. Consult the relevant guide before making changes in that area:

| Task | Guide |
|---|---|
| Writing or reviewing Playwright tests | `E2E_TEST_GUIDE.md` |
| Writing or reviewing Node unit tests | `UNIT_TEST_GUIDE.md` |
| Adding or modifying API endpoints in `server.ts` | `REST_API_GUIDE.md` |
| Adding or modifying React UI components | `MOBILE_FIRST_GUIDE.md`, `REACT_GUIDE.md` |
| Extracting pure logic (calculations, transformations) | `REFERENTIAL_TRANSPARENCY.md` |
| Spotting or removing duplication | `DRY_GUIDE.md` |
| Splitting or scoping a module's responsibilities | `HIGH_COHESION_GUIDE.md` |
| Managing imports and inter-module dependencies | `LOW_COUPLING_GUIDE.md` |
| Naming domain concepts or adapting FIFA API shapes | `LIGHTWEIGHT_DDD_GUIDE.md`, `NAMING_GUIDE.md` |
| Reviewing implementation quality of adapters and boundaries | `CODE_QUALITY_CONTROL_GUIDE.md` |
| Deciding which layer a file or function belongs to | `CLEAN_ARCHITECTURE_GUIDE.md` |
| Structuring `fifa-sync-core.ts` or extracting backend modules | `NODE_MODULE_GUIDE.md` |
| Declaring a new API response type or function signature | `INTERFACE_FIRST_GUIDE.md` |
| Reviewing domain-design quality of a PR | `DOMAIN_DESIGN_CONTROL_GUIDE.md` |
| Handling FIFA API errors, fallbacks, and the resilience shape | `ERROR_HANDLING_GUIDE.md` |
| Validating route params or FIFA API responses at the boundary | `DEFENSIVE_CODING_GUIDE.md` |
| Structuring Claude Code sessions for this codebase | `CLAUDE_CODE_WORKFLOW_GUIDE.md`, `INCREMENTAL_CHANGE_GUIDE.md` |
| Reducing context cost for Claude Code sessions | `LLM_CONTEXT_GUIDE.md` |

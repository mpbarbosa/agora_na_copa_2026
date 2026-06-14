# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Agora na Copa 26" — a FIFA World Cup 2026 broadcast companion: live countdowns, broadcaster schedules (Globo, SportTV, CazéTV, FIFA+), tactical lineups, and an AI pundit (Gemini) for match predictions/chat. Built with React 19 + Vite + TypeScript + Tailwind v4, served via an Express backend that also proxies Vite in dev.

## Commands

- `npm run dev` — start the Express server (`server.ts` via `tsx`), which runs Vite in middleware mode for the frontend. Single command for full-stack dev (port 3000).
- `npm run build` — builds the frontend with Vite and bundles `server.ts` into `dist/server.cjs` with esbuild.
- `npm start` — run the production build (`node dist/server.cjs`).
- `npm run lint` — type-checks the whole project with `tsc --noEmit` (no separate test runner/linter is configured).
- `npm run clean` — removes `dist`.

There is no test suite configured.

## Environment

Gemini API access requires `GEMINI_API_KEY` (see `.env.example`, loaded via `dotenv`). If unset, both `/api/predict` and `/api/chat` fall back to hardcoded Portuguese "offline simulator" responses instead of erroring — this is intentional, not a bug to fix.

## Architecture

- **`server.ts`** — single Express server with two AI endpoints:
  - `POST /api/predict` — sends a structured prompt to `gemini-3.5-flash` with a `responseSchema` (JSON mode) returning `PredictionResult` (prediction text, suggested formations, key players, tactical notes).
  - `POST /api/chat` — conversational endpoint with a Portuguese system instruction ("Tático Agora na Copa 26" persona), forwards chat history to Gemini.
  - In dev (`NODE_ENV !== "production"`), Vite runs in middleware mode inside this same server. In production it serves `dist/` statically with an SPA fallback.

- **`src/data.ts`** — all match/team/lineup/broadcaster data is hardcoded mock data (`mockMatches`, `mockCommentaries`). There is no database; adding a match means adding an entry to `mockMatches` with full `teamA`/`teamB` lineups (`Player[]` with `x`/`y` pitch coordinates 0–100), broadcasters, and historical stats.

- **`src/types.ts`** — central type definitions (`Match`, `Player`, `Position`, `Broadcaster`, `PredictionResult`, `ChatMessage`, `CommentaryEvent`). Update here first when changing data shapes shared between `data.ts`, components, and the API responses in `server.ts`.

- **`src/App.tsx`** — single top-level component holding most UI state (selected match, active tab, theme, live countdown timer, simulated commentary feed). Three tabs render the main views:
  - `"broadcast"` — broadcaster links + live commentary feed (inline in `App.tsx`)
  - `"lineup"` — `src/components/PitchLineup.tsx` (visual pitch with player positions from `x`/`y` coords)
  - `"ai-coach"` — `src/components/AIPunditPanel.tsx` (calls `/api/predict` and `/api/chat`)

- **`src/components/FlagIcon.tsx`** + **`src/components/flags/`** — each country has a hand-drawn SVG flag component; `FlagIcon` maps a `flagSvg` string id (e.g. `"brazil"`) to the corresponding component. New teams need both a `data.ts` entry and a flag component registered in `FlagIcon.tsx`'s `FLAGS` map.

- Theming: light/dark toggle (`"classic-light"` / `"stadium-dark"`) is handled via Tailwind conditional classes throughout `App.tsx`, not via Tailwind's `dark:` media strategy alone — most components branch on the `theme` prop/state directly.

- Visual language (colors, fonts: Anton/Archivo Narrow/JetBrains Mono, glassmorphism conventions) is specified in `DESIGN.md` — consult it before adding new UI surfaces to stay consistent with the "stadium broadcast" aesthetic.

- Path alias `@/*` maps to the repo root (configured in both `tsconfig.json` and `vite.config.ts`).

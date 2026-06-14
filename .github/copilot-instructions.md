# Copilot instructions for `agora_na_copa_2026`

## Build, test, and lint commands

- `npm install` — install dependencies before running local commands.
- `npm run dev` — starts the single Express server from `server.ts`; in development it also mounts Vite in middleware mode for the frontend. Default port is `3000`, but it automatically walks to the next free port unless `STRICT_PORT=true`.
- `npm run build` — builds the Vite frontend and bundles `server.ts` into `dist/server.cjs` with esbuild.
- `npm start` — runs the production bundle from `dist/server.cjs`.
- `npm run lint` — the repository lint step is TypeScript type-checking via `tsc --noEmit`.
- `npm run test:e2e` — runs the Playwright end-to-end suite configured in `playwright.config.ts`.
- `npx playwright test tests/e2e/<spec>.ts` — run a single Playwright spec when `tests/e2e` contains specs. Playwright is configured to boot the app on port `3100` with `STRICT_PORT=true`.

## High-level architecture

- `server.ts` is the application entrypoint for both development and production. It owns the Express server, serves the frontend, exposes `/api/broadcast-guide`, and probes for an open port before listening.
- The frontend is a single React SPA rooted in `src/App.tsx`. `App.tsx` owns the main UI state: selected match, theme, active tab, live countdown clock, and fetched broadcast-guide overrides. The larger feature panel is delegated to `src/components/PitchLineup.tsx`.
- Match content is shared between client and server from `src/matches.json`, with `src/types.ts` defining the canonical TypeScript shapes used on both sides. The server imports the same match dataset to merge FIFA broadcast data with local fallback broadcasters.
- `/api/broadcast-guide` is not a passthrough. It fetches FIFA calendar and watch data, matches FIFA fixtures back to local `src/matches.json` entries, normalizes broadcaster records, caches the merged result for 5 minutes, and falls back to the local broadcaster list stored in each match entry when FIFA data is unavailable.
## Key conventions

- Treat `src/matches.json` as the source of truth for fixtures and lineups. Older guidance may mention `src/data.ts` for match data, but the current app imports matches from JSON; `src/data.ts` only contains commentary strings.
- Update `src/types.ts` first when changing match, broadcaster, or broadcast-guide shapes. Both the server and the frontend depend on those shared types.
- Each match entry is expected to be complete: teams, `flagSvg`, lineup arrays, `kickoffTimestamp`, `status`, `countdownTargetSeconds`, broadcaster fallbacks, and optional `score`/`officialMatchUrl`. Player `x`/`y` coordinates are percentages on a 0–100 pitch and are consumed directly by `PitchLineup`.
- When adding a new team or changing a `flagSvg` value, add the SVG component under `src/components/flags/` and register it in `src/components/FlagIcon.tsx`. A `flagSvg` string in `src/matches.json` must match a key in `FlagIcon`'s `FLAGS` map.
- The theme is explicit application state (`"classic-light"` or `"stadium-dark"`) and most styling branches on that state inside React components. Do not assume Tailwind `dark:` utilities alone control theming.
- Keep user-facing copy in Brazilian Portuguese and in the existing football-broadcast voice.
- `Próximos Jogos` in the header is a static dataset label from `CONTEXT.md`, not a live date filter. `App.tsx` chooses the initial match by preferring a `LIVE` match, otherwise the earliest `PRE_GAME` match.
- The visual system is deliberate: Anton for display text, Archivo Narrow for dense UI copy, JetBrains Mono for clocks and technical labels, and glassmorphism overlays from `src/index.css` and `DESIGN.md`. Reuse those patterns instead of introducing a different visual language.

# src/components/

React components for "Agora na Copa 26". All components receive an explicit `theme: "classic-light" | "stadium-dark"` prop and branch with ternaries — do not use Tailwind `dark:` utilities.

## Component inventory

### View components (top-level tab content)
Each maps to one `NAV_ITEMS` entry in `src/navigation.ts` and is mounted by `src/App.tsx`.

| Component | Tab id | Lines |
|-----------|--------|-------|
| `MatchDetailView.tsx` | `ao-vivo` | 2094 |
| `PartidasView.tsx` | `partidas` | 365 |
| `StandingsView.tsx` | `grupos` | 182 |
| `TeamsView.tsx` | `selecoes` | 86 |
| `JogadoresView.tsx` | `jogadores` | 572 |
| `TournamentLeadersView.tsx` | `lideres` | 491 |
| `BracketView.tsx` | `chaveamento` | 374 |
| `VenueMapView.tsx` | `estadios` | 408 |
| `NewsView.tsx` | `noticias` | 147 |
| `FanZoneView.tsx` | `fanzone` | 403 |

### Sub-components (used inside views)

| Component | Purpose |
|-----------|---------|
| `PitchLineup.tsx` | Visual pitch with player `x`/`y` positions from `matches.json` |
| `TeamPitchBoard.tsx` | Team-focused pitch board used by `TeamLineupView` |
| `TeamLineupView.tsx` | Full team lineup panel (690 lines — standalone modal/panel) |
| `PlayerOverlayCard.tsx` | Overlay card for individual player detail (443 lines) |
| `PlayerVideoRail.tsx` | Horizontal YouTube video carousel in the player card, keyed by FIFA id from `src/data/playerVideos.json` |
| `PlayerNoteFreshness.tsx` | Atualizada/Desatualizada badge + "Atualizado em …" line for a player's `worldCupNote`, vs the team's last finished match (live `/api/match-states` overlay) |
| `AnalysisFreshnessBadge.tsx` | Shared Atualizada/Desatualizada pill used by the group (StandingsView), team (TeamLineupView) and player analyses |
| `FlagIcon.tsx` | Renders hand-drawn SVG flags from `src/components/flags/` |
| `InstagramBrandIcon.tsx` | Instagram brand icon SVG |

## Size cautions

`MatchDetailView.tsx` (2094 lines) covers match selection, scoreboard, broadcast guide, live commentary, and pitch lineup in one file. Before adding to it, consider whether the addition belongs in a sub-component. Do not read the full file for changes scoped to one section — use line-range reads.

`TeamLineupView.tsx` (690 lines) and `JogadoresView.tsx` (572 lines) are also large. Same caution applies.

## Conventions

- **Theme**: `theme === "classic-light" ? "..." : "..."` ternaries throughout. No `dark:` Tailwind utilities.
- **Copy**: All user-facing strings in pt-BR football-broadcast voice. Check `CONTEXT.md` for domain vocabulary.
- **Fonts**: Anton for display text, Archivo Narrow for dense UI, JetBrains Mono for clocks/stats.
- **Flags**: A new team needs both a flag component in `src/components/flags/` and registration in `FlagIcon.tsx`'s `FLAGS` map.
- **New view component**: also add a `NAV_ITEMS` entry in `src/navigation.ts` and wire into `src/App.tsx`.

## Verification

```
npm run lint                         # TypeScript check
npm run dev                          # browser verification (port 3000)
npx playwright test tests/e2e/<spec> # relevant Playwright spec
```

## Relevant guides

- `docs/guides/REACT_GUIDE.md` — component design, state, props
- `docs/guides/MOBILE_FIRST_GUIDE.md` — responsive layout conventions
- `DESIGN.md` — glassmorphism, spacing, colour tokens

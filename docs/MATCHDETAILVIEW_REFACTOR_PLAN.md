# MatchDetailView.tsx refactor plan

`src/components/MatchDetailView.tsx` is the "Ao Vivo" view. As of this plan it is
**2974 lines** — a single ~2360-line component (`MatchDetailView`, lines 614→end)
plus ~500 lines of module-level helpers. It carries a dozen user-visible
responsibilities (match selector, scoreboard, broadcast guide, editorial tabs,
Instagram tab, pitch lineup, live chat, speech narration, clock-config drawer,
simultaneous-live alert). This violates the single-responsibility and React gates
in `docs/guides/CODE_QUALITY_CONTROL_GUIDE.md`.

This document captures the two-option refactor. **Option 1 has been executed**
(see status below); Option 2 remains staged for a later, phased pass.

---

## Option 1 — Helper extraction (mechanical, low-risk) — ✅ DONE

Lift the pure module-level helpers + the `IncidentText` sub-component out of the
view into cohesive, unit-tested `src/utils/` modules. Zero behavior change: pure
move + `export` + import rewire. Satisfies the purity and test gates and shrinks
the view by ~500 lines.

### Modules created

- **`src/utils/matchIncidents.ts`** — the incident domain: `normalizePlayerLookupText`,
  `getNormalizedNameParts`, `isIncidentPlayerNameMatch`, `getIncidentPlayerTokens`,
  `buildIncidentPlayerSelections`, `buildIncidentSpeech`, `getIncidentLabel`,
  `getIncidentAccentClass`, `getIncidentCardClass`, `getIncidentTextClass`, plus the
  `IncidentPlayerSelection` / `IncidentRenderablePlayer` / `StoredIncidentPlayer` /
  `StoredIncidentPlayerKey` types.
- **`src/utils/matchClock.ts`** — time/countdown formatting: `DEMO_MATCH_ID`,
  `getMatchCountdownSeconds`, `parseMinuteLabel`, `formatMinuteLabel`,
  `formatBrasiliaTime`, `formatTimeInZone`, `formatOverlayUpdatedAt`, `formatCountdown`.
  Imports `localeToIntlTag`/`getActiveLocale` from the React-free `../i18n/locale`.
- **`src/utils/matchSelection.ts`** — selection + simulated-state + labels:
  `getInitialMatchId`, `applySimulatedState` (+ `SimulatedMatchState`),
  `getMatchGroupLabel`, `getMatchStageLabel`, `getBroadcasterBadgeLabel`,
  `formatCountryNameForTooltip`.
- **`src/components/IncidentText.tsx`** — the small incident-rendering sub-component.

### Tests added

- `tests/match-incidents.test.ts` — `isIncidentPlayerNameMatch` (surname/accent/false
  positives), `buildIncidentPlayerSelections`, `getIncidentPlayerTokens`,
  `normalizePlayerLookupText`.
- `tests/match-clock.test.ts` — `formatCountdown`, `getMatchCountdownSeconds`,
  `parseMinuteLabel`/`formatMinuteLabel`, `formatOverlayUpdatedAt`.
- `tests/match-selection.test.ts` — `getInitialMatchId`, `applySimulatedState`,
  `getMatchGroupLabel`/`getMatchStageLabel`, `getBroadcasterBadgeLabel`,
  `formatCountryNameForTooltip`.

All three are wired into the `test:unit` script in `package.json`.

### Housekeeping folded in

- Fixed the stale line count in `src/components/CLAUDE.md`.
- Deduped the `BROADCAST_COUNTRY_STORAGE_KEY` localStorage read into a single
  `readStoredBroadcastCountry()` helper.

---

## Option 2 — Component decomposition (structural) — STAGED, not yet done

Turn `MatchDetailView` into a thin shell composing 5–6 focused components.
Satisfies the responsibility and React gates. Higher risk (touches render + prop
threading), so it is phased: each step ships independently and is e2e-verified.

### Target seams (JSX source ranges, pre-Option-1 line numbers)

| New component | JSX range | ~Lines | Responsibility |
|---|---|---|---|
| `MatchSelectorBar` | 1441–1605 | ~164 | live/upcoming match-selector rail |
| `MatchClockConfigDrawer` | 1606–1849 | ~243 | the "Mudar Relógio" simulation drawer |
| `MatchScoreboard` | 1873–2329 | ~456 | hero scoreboard (teams, clock, venue, chips) |
| `BroadcastGuideTab` | 2330–2794 | ~464 | Tab 1: Onde Assistir + affiliate strip |
| `MatchEditorialTab` | 2795–2838 | ~43 | Tab: pré/pós-jogo analysis |
| `MatchInstagramTab` | 2839–2880 | ~41 | Tab: match Instagram posts |
| `MatchLineupTab` | 2881–2915 | ~34 | Tab 2: pitch lineup wrapper |

After extraction, `MatchDetailView` keeps: state ownership, the two data effects
(geo + overlay polling), the simultaneous-live alert, the overview/focus switch,
and composition of the above.

### Phasing (each phase = one PR, independently shippable + e2e-verified)

- **Phase 0 (prerequisite):** Option 1 (done) — the new components import helpers
  from `utils/` instead of receiving closures as props.
- **Phase 1 — leaf tabs (lowest risk): ✅ DONE.** Extracted `MatchEditorialTab`,
  `MatchInstagramTab`, `MatchLineupTab` into their own files (presentational, data
  down; parent keeps the active-tab/locale visibility gates). Removed the five
  now-orphaned imports from the view (2503 → 2404 lines). Verified: `tsc` clean,
  240 unit tests, and the `match-instagram` / `player-mention` / `navigation` /
  `affiliate-products` e2e specs (16 tests) all green.
- **Phase 2 — `MatchSelectorBar`: ✅ DONE.** Extracted the live/upcoming selector
  bar (props: `groups`, `groupPositionMap`, `selectedMatchId`, `onSelectMatch`,
  `theme`). The rail-scroll + scroll-selected-into-view behavior was pulled into a
  shared `src/hooks/useMatchSelectorRail.ts` (the in-file "finished matches" rail
  shared the same helpers, so extracting a hook kept it DRY rather than
  duplicating). Removed the parent's rail refs/effect and two dead derivations.
  Verified: `tsc` clean, 240 unit tests, and the `navigation` (incl. "match
  selector switches the active match") / `match-instagram` / `match-speech` /
  `player-metadata` e2e specs green.
- **Phase 3 — `MatchClockConfigDrawer`: ✅ DONE.** Extracted the "Mudar Relógio"
  drawer (narration diagnostics, demo kickoff/countdown editor, simulation
  controls). Note vs the original plan: `customCountdownSeconds` is *also* read by
  the scoreboard countdown, so it could not be fully pushed down — it stays in the
  parent (passed as value + setter). Only the transient `speechTestStatus` was
  pushed into the drawer. The 5 simulation handlers + `matchSpeech` + team codes
  are passed in (simulation handlers grouped into one `simulation` prop object;
  `onApply`/`onClose` for the rest). Removed 4 now-orphaned lucide icons + the
  `runDirectSpeechTest` import. View 2208 → 1991 lines. Verified: `tsc` clean, 240
  unit tests, and the `match-speech` (drawer status / test-voice / simulated goal)
  / `navigation` (bra-mar countdown demo) / `standings` (manual simulator events)
  e2e specs (27 tests) green.
- **Phase 4 — `MatchScoreboard` (biggest): ✅ DONE.** Extracted the hero
  scoreboard `<section id="core-live-scoreboard">` (the two teams, clock/score,
  penalty tally, group/stage badge, venue block with the Brasília + stadium-local
  clocks and pré-jogo countdown, and the weather/referee/suspension/advisory
  chips) plus the two `renderMatchStatusLine`/`renderOverlaySourceLine` helpers.
  Props: the resolved `match` + `teamA`/`teamB` (`resolveTeamDisplay`), `theme`,
  `currentTime` + `secondsRemaining` (the countdown reads the parent's
  `customCountdownSeconds`, so the seconds are computed in the shell and passed
  down — not moved), `matchSpeech`, `simultaneousUpcomingMatches` +
  `groupPositionMap`, the derived overlay fields (`officialFifaStatus`,
  `overlaySourceLabel`, `overlayUpdatedAt`, `referee`, `matchAdvisory`), and the
  event callbacks (`onSelectMatch`, `onSelectTeamLineup`, `onOpenStandingsGroup`,
  `onOpenReferee` → opens the parent-owned `RefereeCard`). Score/penalty/maps-url/
  group-stage-label/stadium-timezone derivations moved into the component. Removed
  the now-orphaned imports (`FlagIcon`, `MatchWeatherChip`, `RefereeChip`,
  `WeatherSuspensionNotice`, `MatchAdvisoryNotice`, `MatchSpeechToggle`,
  `localizeOfficialFifaStatus`, `localizedStageName`, `resolveVenueTimeZone`,
  `MapPin`/`Clock` icons, and the `formatBrasiliaTime`/`formatTimeInZone`/
  `formatCountdown`/`getMatchGroupLabel`/`getMatchStageLabel` helpers) from the
  view. View 1991 → 1544 lines. Verified: `tsc` clean, 240 unit tests, and the
  `weather-suspension` / `referee-card` / `match-speech` / `match-weather` /
  `navigation` e2e specs (21 tests) green.
- **Phase 5 — `BroadcastGuideTab`:** props `match.broadcasters`, `broadcastCountry`,
  `onCountryChange`, `theme`. Verify with `affiliate-products.spec.ts`.

### Prop-design rules (React gate)

- Pass only the fields each component uses, not the whole `Match` / `setMatches`.
- Keep `setMatches` + polling in the shell; children stay presentational
  (data down, events up).
- Place state at the narrowest correct scope (drawer state lives in the drawer).

### Effort / risk

~1–2 days across 5 PRs, medium risk (prop threading + theme-ternary preservation).
Safety net: `simultaneous-live`, `weather-suspension`, `referee-card`,
`match-speech`, `affiliate-products` e2e specs. Run `npm run test:e2e` after each
phase. Reassess after Phases 1–2 before committing to the scoreboard extract.

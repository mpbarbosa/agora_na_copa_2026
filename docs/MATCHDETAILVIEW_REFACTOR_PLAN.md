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
- **Phase 1 — leaf tabs (lowest risk):** `MatchEditorialTab`, `MatchInstagramTab`,
  `MatchLineupTab` (~120 lines, few props). Verify against existing specs.
- **Phase 2 — `MatchSelectorBar`:** props `matches`, `selectedMatchId`, `onSelect`,
  `matchSelectorRailRefs`, `theme`. Covered by `simultaneous-live.spec.ts`.
- **Phase 3 — `MatchClockConfigDrawer`:** push `customKickoffTime`/
  `customCountdownSeconds` state down into the drawer; emit `onApply(state)` up.
- **Phase 4 — `MatchScoreboard` (biggest):** props = resolved `match`, `theme`,
  weather/referee/advisory data, tab-switch callbacks. Verify with
  `weather-suspension`, `referee-card`, `match-speech` specs.
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

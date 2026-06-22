# Feature-discovery guided tour

**Status:** Accepted — Phase 1 prototyped · 2026-06-22

## Context

Talking to users surfaced that many app features go undiscovered — the app has 11
nav tabs plus non-obvious in-view interactions (tap a player for a profile, the
Escalação/Pré-jogo sub-tabs, the broadcast guide, etc.), and users stop at the first
two or three tabs. We need a lightweight way to teach **how to access and use** features.

## Decision

Add an **interactive guided tour (coachmarks)** — tooltips that point at the real UI,
step by step — rather than a passive screencast/GIF/Lottie animation.

Rationale (from the viability assessment):
- A tour teaches access **in the user's own session** (points at the actual buttons);
  a recorded animation only *shows* a feature, leaving the user to find it again.
- The UI is **already richly and stably targetable** — every nav tab renders
  `#btn-nav-<id>` and there are feature anchors (`#btn-tab-broadcast/lineup/pregame`,
  `#match-detail-view`, `#btn-toggle-theme`). These are the same IDs the e2e suite
  targets, so a tour needs ~zero new instrumentation.
- A screencast is **passive, heavy on mobile, and goes stale** every time the UI
  changes — untenable for an app evolving weekly during the Cup.
- Reuses existing patterns: `localStorage` show-once (from `consent.ts`), the `theme`
  prop, pt-BR copy, and **GA4** (just shipped) to measure tour engagement.

Library: **Driver.js** (~5KB, no deps, MIT) — purpose-built for spotlight + positioned
tooltips + step flow + mobile. (`motion`/Framer Motion is already a dependency and is
available for custom animated highlights later, but doesn't provide tour mechanics.)

## Design

- **Steps** (`src/featureTour.ts`): pt-BR, targeting stable nav IDs — a welcome popover
  then the under-discovered tabs (Ao Vivo, Jogadores, Líderes, Chaveamento, Redes
  Sociais) and the theme toggle. 5–7 steps max (longer tours get skipped).
- **Trigger:**
  - A persistent **"?" button** in the header → replay any time (manual).
  - **Auto-start on first visit**, gated on `consent !== null` (so it runs *after* the
    cookie banner is dismissed, never on top of it) and `!localStorage["feature-tour-seen"]`.
    Marks seen on finish/skip.
- **Theme-aware** popover styling (light/dark) via a `popoverClass`.
- **GA4 events:** `tour_start`, `tour_complete`, `tour_skip` (no-op until a real GA4 id
  is set — see ADR-adjacent analytics work).

## Data-first targeting

The "which features are undiscovered" assumption should be **validated with GA4** once the
`G-…` id is live (low `page_view` on certain tabs = the under-used ones). The prototype's
step list is a reasonable first guess and is trivially editable in `src/featureTour.ts`
once data arrives. Then measure impact: did tab usage rise after the tour shipped?

## Scope / phasing

- **Phase 1 (prototyped now):** Driver.js tour, "?" replay button, first-visit auto-start
  (gated after consent), GA4 events, e2e coverage.
- **Later:** tune the step list from GA4 data; optionally add in-view coachmarks for
  hidden interactions (tap-a-player); optional "Como usar" static supplement.

## Trade-offs

**Pros:** teaches access directly; ~5KB; reuses IDs/localStorage/theme/GA4; pt-BR &
accessible (real text); measurable; cheap to maintain (edit text/selectors).
**Cons:** one new frontend dependency; step selectors need updating if those IDs change
(mitigated — they're e2e-tested); must be kept short to avoid annoyance.

## Testing

e2e: the "?" button starts the tour and the first step renders; advancing/finishing works
and sets the seen flag. Existing specs are unaffected because auto-start is gated on
consent (which they never grant); the consent spec marks the tour seen to stay isolated.

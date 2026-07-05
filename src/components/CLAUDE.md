# src/components/

React components for "Agora na Copa 26". All components receive an explicit `theme: "classic-light" | "stadium-dark"` prop and branch with ternaries — do not use Tailwind `dark:` utilities.

## Component inventory

### View components (top-level tab content)
Each maps to one `NAV_ITEMS` entry in `src/navigation.ts` and is mounted by `src/App.tsx`.

| Component | Tab id | Lines |
|-----------|--------|-------|
| `MatchDetailView.tsx` | `ao-vivo` | 2503 |
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
| `BracketPredictorPanel.tsx` | "Palpite do confronto" panel at the bottom of `BracketView`: pick a knockout tie whose both sides are resolved (confirmed or provisional) and auto-forecast it via `/api/predict` — the same deterministic Dixon-Coles Poisson "palpite simulado" the Fan Zone uses. Fixtures are built by `buildPredictableFixtures()` in `BracketView` |
| `FullBracketView.tsx` | The "Chave completa" symmetric flag bracket — an alternative to `BracketView`'s per-stage columns, toggled via `#bracket-view-toggle` inside Chaveamento. Both halves of the draw (the two SF subtrees feeding the final) fan inward to a central trophy; each slot is a `FlagIcon` resolved from the same maps `BracketView` builds (`teamMeta` / `feederTeamBySlot` / `groupPositions` / `winnerSlotByNumber`), with elbow connectors drawn via border pseudo-elements and losers dimmed. Too wide for a phone, so on mobile-portrait it hides the bracket and shows a rotate-to-landscape hint (`#bracket-full-rotate-hint`). Tree walking + slot helpers live in `src/utils/knockoutFeeders.ts`. |
| `PitchLineup.tsx` | Visual pitch with player `x`/`y` positions from `matches.json` |
| `TeamPitchBoard.tsx` | Team-focused pitch board used by `TeamLineupView` |
| `TeamLineupView.tsx` | Full team lineup panel (690 lines — standalone modal/panel) |
| `PlayerOverlayCard.tsx` | Overlay card for individual player detail (443 lines) |
| `CoachCard.tsx` | Coach analogue of `PlayerOverlayCard` — opened from the `Técnico` line in `TeamLineupView`'s header. Same visual shell (accent bar, header, editorial-block record tiles, swipeable note) but driven only by data we have/derive: the coach name (`TEAM_COACHES`), the team, the team's tournament record (`src/utils/coachRecord.ts`, computed from real results), the same tournament-status pill the team header shows, and an optional authored note (`src/data/coachNotes.json`). No photo — coaches have none in our data — so the avatar is the coach's initials. |
| `RefereeCard.tsx` | Referee overlay card — the match-official analogue of `CoachCard`. Referees carry far less data (FIFA publishes only name + nationality; no win/loss record), so it's lean: header (name, nationality flag from `standings`, initials avatar) + an optional collapsible "Destaque(s) no Instagram" embed. Opened from the now-clickable `RefereeChip` (pass it an `onClick`) in the Ao Vivo scoreboard; Instagram highlights are resolved by tolerant name-match via `src/utils/refereeIdentity.ts` (`resolveRefereeInstagram`) against `src/data/refereeInstagram.json` |
| `PlayerVideoRail.tsx` | Horizontal YouTube video carousel in the player card, keyed by FIFA id from `src/data/playerVideos.json` |
| `PlayerNoteFreshness.tsx` | Atualizada/Desatualizada badge + "Atualizado em …" line for a player's `worldCupNote`, vs the team's last finished match (live `/api/match-states` overlay) |
| `AnalysisFreshnessBadge.tsx` | Shared Atualizada/Desatualizada pill used by the group (StandingsView), team (TeamLineupView) and player analyses |
| `GroupMatchHistory.tsx` | Collapsible `<details>` with a group's compact match list — finished + live results (scores) then remaining scheduled fixtures (kickoff time), chronological — rendered in each group card directly below "Análise do grupo" in StandingsView |
| `WeatherSuspensionNotice.tsx` | Advisory link shown when a match is `SUSPENDED` ("Paralisado"), pointing to the FIFA WC 2026 regulations PDF (which govern suspended/abandoned matches, incl. adverse weather). Rendered in the Ao Vivo scoreboard (`MatchDetailView`) and in each suspended `SimultaneousLiveMatches` card |
| `DonationPix.tsx` | "Doe via Pix" donation block. `variant="full"` (Fan Zone card: QR via `qrcode.react` + key + "Pix Copia e Cola", copy buttons) and `variant="compact"` (footer line: key + copy). Pix details from `PIX_DONATION` in `src/config.ts`; BR Code (EMV) payload built by the pure `src/utils/pixBrCode.ts`. Renders nothing when `isPixDonationConfigured()` is false |
| `MatchSpeechToggle.tsx` | "Narração" mute/unmute control (top of the scoreboard card) for live-match speech; driven by the `useMatchSpeech` hook (`src/hooks/`). Cues come from `src/utils/matchSpeech.ts`; the TTS engine is the guia_js **SpeechSynthesisManager**, vendored locally under `src/utils/speech/engine/` and constructed **synchronously** via `src/utils/speech/catasSpeech.ts` (`createSpeechManager`) — bundled, **no CDN** (the prior jsDelivr `@vite-ignore` dynamic import was removed so the engine is ready in the first tap gesture, which mobile needs to unlock audio). The local `engine/core/ObserverSubject.ts` replaces the upstream CDN `DualObserverSubject`. |
| `FlagIcon.tsx` | Renders hand-drawn SVG flags from `src/components/flags/` |
| `InstagramBrandIcon.tsx` | Instagram brand icon SVG |
| `InstagramEmbed.tsx` | Shared Instagram post/reel embed (official `<blockquote class="instagram-media">` + `embed.js`, see `docs/adr/0001`). Owns the `window.instgrm` type + one-time script injection; safety check in `src/utils/instagram.ts`. Mounting loads embed.js, so callers render it only when the embed should appear (lazily). Used by `PlayerOverlayCard`, the FIFA reel in `SocialMediasView`, and `InstagramHighlightsFeed` |
| `RedditPostsFeed.tsx` | "Repercussão no Reddit" feed on the Redes Sociais tab. Fetches `/api/reddit` (curated posts enriched with live Reddit data, or the curated seed when Reddit is unreachable) and renders each as an **outbound link card** — subreddit + optional team flag + title + optional score/comments + "Abrir no Reddit" (`target=_blank`, `rel=noopener`). No third-party embed/script, so it stays blocker- and offline-resilient. Renders nothing until ≥1 post loads |
| `RedditBrandIcon.tsx` | Reddit Snoo brand icon SVG on the brand-orange square, sized/shaped to match `InstagramBrandIcon` so the two social feeds read as a set |
| `InstagramPostFrame.tsx` | Script-free Instagram post embed via a direct `<iframe>` to Instagram's `/embed/` endpoint (`toInstagramEmbedUrl` in `src/utils/instagram.ts`) — the blocker-resilient alternative to `InstagramEmbed` (embed.js is a common content-blocker target; see the `docs/adr/0001` addendum). Auto-sizes to the post via Instagram's `MEASURE` postMessage. Used by the per-match "Instagram" tab in `MatchDetailView` (fed by `src/data/matchInstagram.json`) |
| `InstagramHighlightsFeed.tsx` | "Destaques no Instagram" feed on the Redes Sociais tab — real player highlights from `src/data/instagramHighlights.ts` (`getInstagramHighlights`). One card per player (flag + name + team + position); only the first is expanded by default, the rest mount their `InstagramEmbed` on tap. Renders nothing when no player has a highlight |

## Size cautions

`MatchDetailView.tsx` (2503 lines) covers match selection, scoreboard, broadcast guide, live commentary, and pitch lineup in one file. Its pure helpers were extracted to `src/utils/matchIncidents.ts`, `src/utils/matchClock.ts`, and `src/utils/matchSelection.ts` (each unit-tested); the incident-text renderer lives in `IncidentText.tsx`. Before adding to it, consider whether the addition belongs in a sub-component. Do not read the full file for changes scoped to one section — use line-range reads.

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

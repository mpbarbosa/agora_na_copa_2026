# tests/e2e/

Playwright end-to-end specs for "Agora na Copa 26". The suite boots the dev server on port 3100 and runs against it (`npm run test:e2e`). Run a single spec with `npx playwright test tests/e2e/<spec>.ts`.

## Spec map

| Spec | What it covers | Size |
|------|---------------|------|
| `navigation.spec.ts` | Tab routing, all 10 nav tabs render, theme toggle, URL hash navigation | 18.8 KB |
| `team-view.spec.ts` | Team panel (standings position, matches, lineup, leaders, broadcast guide) | 18.0 KB |
| `standings.spec.ts` | Group standings table, live score updates, group filtering | 6.7 KB |
| `leaders.spec.ts` | Tournament leaders (top scorers, yellow/red cards, team stats) | 9.1 KB |
| `jogadores.spec.ts` | Player list, search filter, player overlay card | 4.0 KB |
| `player-videos.spec.ts` | Player-card video carousel (`PlayerVideoRail`): renders a YouTube rail for a player with curated videos (Messi), hidden when none | 1.6 KB |
| `match-speech.spec.ts` | Live-match speech narration ("Narração"): stubs `window.speechSynthesis`, enables the toggle in the clock drawer, drives a simulated goal, asserts a "Gol" utterance; silent when off | 2.6 KB |
| `teams.spec.ts` | Seleções tab, team cards, flag rendering | 2.6 KB |
| `player-metadata.spec.ts` | Player dateOfBirth, height display in overlay | 3.1 KB |
| `venues.spec.ts` | Venue map, stadium cards | 2.5 KB |
| `bracket.spec.ts` | Knockout bracket rendering; hovering/focusing an Oitavas card spotlights its 16-avos feeders (`data-feeder-highlight`) and hides the rest (grouping the feeders beside the card); on touch a two-stage tap previews feeders then opens the match; on the mobile layout selecting a tie collapses (display:none) its unselected siblings and the unrelated feeders so only the tie + its two feeders remain | 1.1 KB |
| `bracket-predictor.spec.ts` | "Palpite do confronto" panel on Chaveamento: renders with the Simulado badge, auto-forecasts the selected resolved tie via `/api/predict` (or shows the empty state), re-forecasts on switching ties, dark-theme without console errors | 3.0 KB |
| `news.spec.ts` | News feed, article cards | 1.6 KB |
| `fanzone.spec.ts` | Fan Zone quiz, answer interaction | 1.5 KB |
| `social-medias.spec.ts` | Social Medias feed ("Redes Sociais" tab): Google Trends card, category/hashtag filters, likes, nested comments | 4.0 KB |
| `instagram-highlights.spec.ts` | "Destaques no Instagram" feed on Redes Sociais: section renders with ≥1 player card, only the first card's embed is mounted by default (others mount on tap), an expanded card carries the `blockquote.instagram-media` permalink + "Abrir no Instagram" link, dark-theme without console errors. Stubs `embed.js` to a no-op (offline-safe) | 3.4 KB |
| `polish.spec.ts` | Visual/UX polish checks (no broken images, no empty text nodes, etc.) | 2.0 KB |
| `affiliate-products.spec.ts` | Amazon affiliate gear strip on Ao Vivo (broadcast tab): renders, link compliance (tag/rel/target), tab gating | 1.2 KB |
| `consent-privacy.spec.ts` | LGPD cookie-consent banner (show/accept/persist), dormant AdSlot + GA4, footer privacy link, privacidade.html + ads.txt served | 2.1 KB |
| `feature-tour.spec.ts` | Feature-discovery guided tour (Driver.js): "?" button starts it, advances, and closes | 1.0 KB |
| `share-button.spec.ts` | Header share button: Web Share API with copy-link fallback + "Link copiado!" confirmation | 0.9 KB |
| `messi-tour.spec.ts` | Messi card walkthrough (Driver.js): dormant on session 1, runs on session 2+ when the rotation is pinned to it (`tip-tour-rotation=0`) and walks Jogadores → Messi → open card | 1.3 KB |
| `tip-tour.spec.ts` | Tip-tour rotation (`useTipTour`): one guided walkthrough per session, rotating through `TIP_TOURS` from a random start. Pins `tip-tour-rotation` to assert the team-lineup tip plays, the best-thirds tip walks Grupos → scroll → the "Melhores 3º colocados" table, the group-history tip opens a group card's "Histórico de jogos", the per-session guard + pointer advance, and first-session dormancy | 3.0 KB |
| `player-mention.spec.ts` | "Messi" in a match analysis links to a hover/tap compact player-card preview (portaled card shows club + ★ Craque) | 0.9 KB |
| `match-weather.spec.ts` | `/api/match-weather` endpoint contract: resilience shape for valid coords, 400 + fallback for invalid (offline-safe) | 0.9 KB |
| `qualification-odds.spec.ts` | `/api/qualification-odds/:teamCode` contract: simulated resilience shape + odds invariants, name/code resolution, iterations clamp (phase-aware), 404 unknown (offline-safe) | 1.9 KB |
| `weather-suspension.spec.ts` | Suspension advisory: forces a match to `SUSPENDED` via an overlay stub and asserts the Ao Vivo scoreboard shows the FIFA-regulations link (`#weather-suspension-notice`, `target=_blank`, FWC2026 PDF href) | 1.6 KB |
| `match-chat.spec.ts` | Live-match chat ("Resenha ao vivo") on Ao Vivo: route-mocks `/api/chat/:matchId` to assert the closed-state panel (compose hidden, "opens at kickoff" note) and the live happy path (seeded message renders, posting an anonymous apelido appends + clears input + sends id/nickname/text); plus a real-server 404 for an unknown match id | 1.6 KB |
| `donation-pix.spec.ts` | "Doe via Pix" block: Fan Zone full card (QR + "Pix Copia e Cola" copies a valid EMV payload) and the footer compact line (copies the Pix key); grants clipboard permission | 1.6 KB |
| `version-timer.spec.ts` | Discreet version-update-check countdown beside the header title (`#version-check-timer`): renders m:ss or "nova versão" | 0.7 KB |
| `partidas.spec.ts` | Partidas "Agendadas" list phase separators: a phase header (`partidas-phase-header`, e.g. `#partidas-phase-pre_game-16-avos-de-final`) splits group-stage from knockout fixtures | 0.9 KB |

## Fixtures

`fixtures/` contains shared Playwright fixtures (page setup helpers). Import from here rather than repeating setup in specs.

## Which spec to run after a change

| Changed area | Spec to run |
|-------------|------------|
| Navigation / routing | `navigation.spec.ts` |
| Any API route (`server.ts`) | `navigation.spec.ts` (smoke) + the relevant feature spec |
| Standings / groups | `standings.spec.ts` |
| Players / Jogadores view | `jogadores.spec.ts`, `player-metadata.spec.ts` |
| Team panel / TeamLineupView | `team-view.spec.ts` |
| Leaders view | `leaders.spec.ts` |
| Venue map | `venues.spec.ts` |
| Bracket | `bracket.spec.ts` |
| News | `news.spec.ts` |
| Fan Zone | `fanzone.spec.ts` |
| Social Medias ("Redes Sociais" tab) | `social-medias.spec.ts` |
| Full regression | `npm run test:e2e` |

## Adding a new spec

1. Create `tests/e2e/<feature>.spec.ts`.
2. Add a row to the spec map above.
3. Import shared fixtures from `fixtures/` if needed.
4. Verify with `npx playwright test tests/e2e/<feature>.spec.ts` before committing.

Do not put test helpers or fixtures directly in spec files — extract to `fixtures/`.

## Relevant guide

`docs/guides/E2E_TEST_GUIDE.md` — full conventions for selectors, assertions, server interaction, and fixture patterns.

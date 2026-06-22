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
| `teams.spec.ts` | Seleções tab, team cards, flag rendering | 2.6 KB |
| `player-metadata.spec.ts` | Player dateOfBirth, height display in overlay | 3.1 KB |
| `venues.spec.ts` | Venue map, stadium cards | 2.5 KB |
| `bracket.spec.ts` | Knockout bracket rendering | 1.1 KB |
| `news.spec.ts` | News feed, article cards | 1.6 KB |
| `fanzone.spec.ts` | Fan Zone quiz, answer interaction | 1.5 KB |
| `social-medias.spec.ts` | Social Medias feed ("Redes Sociais" tab): Google Trends card, category/hashtag filters, likes, nested comments | 4.0 KB |
| `polish.spec.ts` | Visual/UX polish checks (no broken images, no empty text nodes, etc.) | 2.0 KB |
| `affiliate-products.spec.ts` | Amazon affiliate gear strip on Ao Vivo (broadcast tab): renders, link compliance (tag/rel/target), tab gating | 1.2 KB |
| `consent-privacy.spec.ts` | LGPD cookie-consent banner (show/accept/persist), dormant AdSlot + GA4, footer privacy link, privacidade.html + ads.txt served | 2.1 KB |
| `feature-tour.spec.ts` | Feature-discovery guided tour (Driver.js): "?" button starts it, advances, and closes | 1.0 KB |
| `share-button.spec.ts` | Header share button: Web Share API with copy-link fallback + "Link copiado!" confirmation | 0.9 KB |
| `messi-tour.spec.ts` | Messi card walkthrough (Driver.js): dormant on session 1, auto-runs on session 2+ and walks Jogadores → Messi → open card | 1.3 KB |

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

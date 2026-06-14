# Agora na Copa 26

Glossary of domain terms for the World Cup 2026 broadcast companion app.

## Language

**Próximos Jogos**:
The lightweight list of match identities (which two teams, which match id) shown as selectable chips in the header. Selecting one determines which match's Detalhes da Partida is displayed on the rest of the page. It is a static label for the app's demo dataset, not a live/chronological filter — some entries may have kickoff dates in the past relative to the real current date.
_Avoid_: "upcoming matches" (implies a live date filter), "match list" (too generic)

**Detalhes da Partida**:
The full dataset for a single match — team lineups, broadcasters, kickoff schedule, and historical stats — used to render the scoreboard, lineup, and broadcast views for the currently selected match.
_Avoid_: "match data" (too generic), "mock data" (implementation detail)

**Partidas**:
The default top-level nav tab (`NAV_ITEMS`, id `"partidas"`). Renders `MatchDetailView`, which contains the match selector, scoreboard, and broadcast guide — i.e. everything described under "Próximos Jogos" and "Detalhes da Partida" above.

**Em breve**:
The placeholder state shown by `ComingSoonView` for nav tabs (`Grupos`, `Chaveamento`, `Estádios`, `Notícias`, `Fan Zone`) whose views haven't shipped yet. Each `NAV_ITEMS` entry carries a `status` of `"live"` or `"comingSoon"`; flipping an entry to `"live"` in a later phase replaces this placeholder with the real view.
_Avoid_: "disabled tab" (the tab is clickable, it just shows a placeholder), "404" (it's an intentional, styled state)

# Agora na Copa 26

Glossary of domain terms for the World Cup 2026 broadcast companion app.

## Language

**Próximos Jogos**:
The lightweight list of match identities (which two teams, which match id) shown as selectable chips in the header. Selecting one determines which match's Detalhes da Partida is displayed on the rest of the page. It is a static label for the app's demo dataset, not a live/chronological filter — some entries may have kickoff dates in the past relative to the real current date.
_Avoid_: "upcoming matches" (implies a live date filter), "match list" (too generic)

**Detalhes da Partida**:
The full dataset for a single match — team lineups, broadcasters, kickoff schedule, and historical stats — used to render the scoreboard, lineup, and broadcast views for the currently selected match.
_Avoid_: "match data" (too generic), "mock data" (implementation detail)

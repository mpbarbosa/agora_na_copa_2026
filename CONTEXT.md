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

**Destaque no Instagram**:
The collapsible section inside `PlayerOverlayCard` that embeds a specific, editorially chosen Instagram post or reel for a player. Visible only when `instagramPostUrl` is populated for that player. When expanded, renders the official Instagram embed and an `"Abrir no Instagram"` redirect button. The embed script (`embed.js`) loads lazily on first expansion.
_Avoid_: "Instagram embed" (implementation detail), "reel" (the post may not be a reel), "social links" (that's the separate "Redes oficiais" section above it)

**instagramPostUrl**:
A curated, editorially chosen URL pointing to a specific Instagram post or reel for a player (e.g. `https://www.instagram.com/p/ABC123/`). Stored in `SquadPlayer` and `Player` as a sibling of `socials`, not inside `PlayerSocials`. Distinct from `socials.instagram`, which is the player's profile handle.
_Avoid_: "instagram post link" (too generic); never store inside `PlayerSocials` — that object holds profile identities, not editorial content picks.

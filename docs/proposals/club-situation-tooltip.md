# Proposal: club "situation" (two clubs + tooltip)

**Status:** Draft spec — to be implemented from the code/`main` checkout (touches
app code: types, server, components). Authored from the data worktree after a
club-data audit.

## Problem

`squads.json` carries a single generated `club: string` per player, enriched from
Wikidata by `scripts/enrich-squads-club-wikidata.py`. That field is unreliable for
players whose club is **uncertain or in transition**, and the script cannot self-heal:
it *never overwrites* an existing club (only fills empties), and its name-matched
Wikidata lookups produce stale/ambiguous values (e.g. an audit found Neuer→"Barcelona",
Undav→"Borussia Dortmund", David→"CF Montréal"; a dry-run proposed a raw QID for one
player and wrong clubs for two others).

A single string also can't express the genuinely two-club football realities:

| Case | Example | Today shows | Desired |
|------|---------|-------------|---------|
| **Loan** | on loan at X from parent Y | one club (often the wrong one) | both, "Emprestado ao X pelo Y" |
| **Free agent / contract expired** | Vozinha after Chaves (expired 1 Jun 2026) | "G.D. Chaves" (looks current) | "Sem clube — último: Chaves" |
| **Recent transfer** | J. David Lille→Juventus (2025) | sometimes the old club | "Juventus (ex-Lille, 2025)" |

## Goal

When a player is in one of these situations, show **two clubs and a tooltip
explaining the situation**, instead of a single possibly-wrong value. When there is
no situation, behave exactly as today (single `club` string).

## Data model

Keep `club: string` as-is (generated; do not change the enrichment contract). Add a
**new optional, hand-maintained editorial field** `clubSituation` — analogous to
`worldCupNote`, so it sidesteps the "don't hand-edit `club`" rule and is fully
backward-compatible (absent ⇒ current behaviour).

```jsonc
// src/data/squads.json — per player, optional
"clubSituation": {
  "kind": "loan" | "free-agent" | "transfer",
  "primary":   "Juventus",      // main label shown (loan club / last club / new club)
  "secondary": "Lille",         // the other club (parent / previous); omit for plain free-agent
  "since":     "2025",          // optional year/date for the tooltip
  "tooltip":   "Transferido do Lille para a Juventus em 2025."  // hand-written pt-BR
}
```

Display rules (pt-BR, broadcast voice):
- **loan** — label `{primary}`; tooltip `"Emprestado à {primary} pelo {secondary}."`
- **free-agent** — label `Sem clube` (or `{primary}` as last club); tooltip `"Atualmente sem clube — último: {primary}."`
- **transfer** — label `{primary}`; tooltip `"Transferido do {secondary} para a {primary}"` + (`since` ? ` em {since}.` : `.`)

## Code changes (anchors)

1. **Types** — `src/types.ts`: add `clubSituation?: ClubSituation` to `Player` (~L40)
   and `SquadPlayer` (~L60), and to the player-stats/team-view payload type (~L294).
   Define the `ClubSituation` interface once.
2. **Server** — `server.ts`: merge `clubSituation` through `resolvePlayerEntry` exactly
   like `worldCupNote` (~L1271), and include it in the player + `/api/team-view` payloads.
3. **Shared render helper** — add `src/utils/clubDisplay.ts` exporting
   `formatClubDisplay(player) => { label: string; tooltip: string | null }`. This is the
   single source of truth so every surface stays consistent.
4. **Surfaces** — route all club rendering through the helper and attach the tooltip:
   - `PlayerOverlayCard.tsx:384` (` • ${player.club}`)
   - `JogadoresView.tsx:159–161, 267–269`
   - `TeamLineupView.tsx:1133–1134` ("Clube atual")
   - `TournamentLeadersView.tsx:476–477`
   - `TeamPitchBoard.tsx:198, 364`
   - `MatchDetailView.tsx:2157`
5. **Tooltip UI** — MVP: native `title={tooltip}` (already the project's lightweight
   pattern — see `StandingsView.tsx:392`, `VenueMapView.tsx:201`). If a richer hover/tap
   tooltip is wanted (mobile-friendly), reuse the `role="tooltip"` approach at
   `StandingsView.tsx:505` and follow `MOBILE_FIRST_GUIDE.md` / `DESIGN.md`.

## Rollout (data)

Ship the code first (no `clubSituation` present ⇒ no visible change), then hand-populate
`clubSituation` only for players who need it. Starter set from the audit:

- **free-agent:** Vozinha (CPV `364752`) — last club Chaves, contract expired 1 Jun 2026.
- **transfer (2025):** Jonathan David (CAN `441257`) Lille→Juventus · Brobbey (NED `424051`)
  Ajax→Sunderland · Igor Jesus (BRA `1443021717`) Botafogo→Nottingham Forest · Eloy Room
  (CUW `390650`) Cercle Brugge→Miami FC.
- **loan:** identify per-player (Wikidata `multi-current` cases such as Tshibola, Nemati);
  verify each loan against a current source before writing — do not guess.

## Testing

- `tests/e2e`: a player with `clubSituation` renders both clubs + the tooltip text;
  a player without it renders the single `club` exactly as before (no regression).
- Unit: `formatClubDisplay` returns the right label/tooltip per `kind`, and falls back
  to `club` when `clubSituation` is absent.

## Out of scope / notes

- Does not change `club` enrichment. A separate cleanup could make
  `enrich-squads-club-wikidata.py` flag (not fill) `multi-current`/`no-current` players
  so they become `clubSituation` candidates.
- `clubSituation` is editorial/hand-maintained (like `worldCupNote`) — never written by
  the enrichment script.

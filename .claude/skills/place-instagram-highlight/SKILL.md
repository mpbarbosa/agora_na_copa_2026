---
name: place-instagram-highlight
description: >
  Analyze one Instagram post URL, VERIFY what it actually is against the live
  source (account + caption), and insert its permalink into the right curated
  data file — a player's squads.json note, a national team (teamInstagram.json),
  a coach (coachInstagram.json), a match referee (refereeInstagram.json), or a
  match (matchInstagram.json) — cross-listing across several when the post
  genuinely relates to more than one. Strips tracking params, respects each
  file's field/key conventions, validates JSON. Use when the user says "analyze
  this Instagram post and choose where to insert it", "where does this Instagram
  post go", "add this Instagram highlight", or pastes a "(TEAM) Player's Destaque
  do Instagram: <url>" line.
---

## Overview

"Destaque(s) no Instagram" highlights are curated permalinks scattered across
five data files, each rendered in a different surface:

| Destination file | Keyed by | Value | Renders as |
|---|---|---|---|
| `src/data/squads.json` | **fifaId** | `instagramPostUrl` (single) **or** `instagramPostUrls` (`string[]`) | player overlay card embed + the "Destaques no Instagram" rail (`instagramHighlights.ts` → `InstagramHighlightsFeed`) |
| `src/data/teamInstagram.json` | **3-letter team code** | `string[]` | team page (`TeamInstagramHighlights.tsx`) |
| `src/data/coachInstagram.json` | **team code** | `string[]` | `CoachCard` collapsible embed |
| `src/data/refereeInstagram.json` | **normalized name** (lowercase, no accents) | `string[]` | `RefereeCard` collapsible embed (`src/utils/refereeIdentity.ts` tolerant match) |
| `src/data/matchInstagram.json` | **match id** | `string[]` | match "Instagram" tab (`MatchDetailView.tsx`) |

The job: figure out which one(s) a given post belongs to **from its real content**,
not from the label the user typed — then insert it correctly.

This is a **data-edit skill** → ship **data-side-only** by default (test → commit →
sync to main, no bump/deploy) per [[feedback_data_side_only_default]]. Batch several
posts and ship once.

---

## Stage 1 — Verify the post (never skip)

The URL's claimed owner is a hint, **not** proof. Fetch the post and read the truth:

```
WebFetch(url, "Who is the author/account of this post and what is it about?
  Report the exact account username, any player names, team names, the match
  (which two teams played), and the full caption if visible.")
```

Then **strip tracking params** to the canonical permalink — keep only
`https://www.instagram.com/p/<id>/` or `.../reel/<id>/` (drop everything from `?`).

Ground rules (see [[feedback_never_invent_data]], [[feedback_stay_critical_verify_data]]):

- **Content decides placement**, not the user's label. A post captioned about
  "Brazil 3×0 Haiti" is a BRA highlight (and can also be the `bra-hai-2026` match
  highlight) even if the user only said "Brazil".
- **Same URL, several different single-owner labels in a row = a stuck-clipboard
  signature.** If the user sends one permalink attributed to four owners, do NOT
  fan it into four places blindly — flag it, then let the verified content decide.
- If WebFetch is inconclusive about who/what the post is, **stop and ask** rather
  than guess.

---

## Stage 2 — Route by verified content

| The post is about… | Goes in | Find the key |
|---|---|---|
| a **single player** (his own account, or a photo/graphic of one player) | `squads.json` | `grep -ni "<name>" src/data/squads.json` → the entry's `fifaId` |
| a **national team** generally (federation account, squad/training, team feature) | `teamInstagram.json` | the 3-letter code (`BRA`, `GER`, …) |
| a **coach** | `coachInstagram.json` | the team code |
| a **match referee** | `refereeInstagram.json` | normalized name (lowercase, no accents) |
| a **specific match** (a fixture between two named teams) | `matchInstagram.json` | the match id (below) |

**Cross-listing is legitimate and expected** when the post genuinely features more
than one entity — decide from the content, then place it in every fit:
- A two-captains photo ("Luka x Cristiano") → **both** players + **both** teams.
- A match-action post ("Portugal 2×1 Croatia") → the **match** (`ko-83-2026`) +
  **both** teams.
- A single-player match shot → that **player** (and optionally the match).

Resolve a **match id** (needed for `matchInstagram.json`):
- Group stage: `<teamA>-<teamB>-2026`, lowercase codes, in the fixture's team order
  (e.g. `bra-hai-2026`). Confirm it is real: `grep -rn "<id>" src/data/*.json`.
- Knockout: `ko-<matchNumber>-2026` (e.g. `ko-83-2026`). Resolve teams/number with:
  ```bash
  npx tsx -e 'import { APP_MATCHES } from "./src/appMatches";
    for (const m of APP_MATCHES) if (/BRA|CRO/.test(m.teamA.code+m.teamB.code))
      console.log(m.id, m.teamA.code, "x", m.teamB.code);'
  ```

---

## Stage 3 — Insert, respecting each file's conventions

- **squads.json (player):** the highlight field is the **last** field of the entry.
  - No highlight yet → add single `"instagramPostUrl": "<permalink>"`.
  - Already has a single `instagramPostUrl` and you're adding a 2nd → **convert to
    the array** `"instagramPostUrls": [ <old>, <new> ]` (the array takes precedence
    over the single field in `resolveInstagramPostUrls`).
  - Already has `instagramPostUrls` → append.
  - Never touch factual fields (they are script-generated).
- **teamInstagram.json / coachInstagram.json / refereeInstagram.json /
  matchInstagram.json:** value is always `string[]`.
  - Existing key → append the permalink.
  - Missing key → create it. In `teamInstagram.json` keys are kept **alphabetical**
    by code — insert in order (e.g. `GER` between `FRA` and `JPN`).

Only add **real** posts you verified. Keep tracking params out.

---

## Stage 4 — Validate

After every file you touch:

```bash
node -e "JSON.parse(require('fs').readFileSync('src/data/<file>.json','utf8')); console.log('valid JSON')"
```

---

## Stage 5 — Ship (data-side-only)

Batch as many posts as the user feeds you, then run the [[test-commit-sync]] skill
(no bump, no deploy). Split into logical commits when the batch mixes concerns
(e.g. player-note IG additions vs team/match IG additions). Do NOT deploy or bump
from the data worktree — see [[feedback_deploy_worktree_only_for_deploy]].

Commit message convention:
```
data: add <who/what> Instagram highlight(s)
```

---

## Notes

- pt-BR context and domain terms live in `CONTEXT.md`; file ownership/edit rules in
  `src/data/CLAUDE.md`.
- One post can be both a team highlight and a match highlight (precedent:
  `DaLrAW0oNHb` lives in both `BRA` and `ko-76-2026`). That is intentional, not a
  duplicate to dedupe.
- A player highlight surfaces in two places at once (the overlay card **and** the
  global highlights rail), so player placement has the widest reach — prefer it
  when a post is clearly about one player rather than the whole team.
- If the user later re-sends the same URL for a *different* single owner, treat it
  as a correction/clarification (move it) unless the content supports both, in
  which case cross-list. When in doubt, verify the post again and ask.

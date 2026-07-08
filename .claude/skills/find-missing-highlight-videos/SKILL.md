---
name: find-missing-highlight-videos
description: >
  Find all finished World Cup 2026 matches that are missing a highlights
  ("Melhores Momentos") video in src/data/matchVideos.json, search YouTube for
  each one using the FIFA "MELHORES MOMENTOS: <team A> X <team B> | COPA DO MUNDO
  FIFA™ 2026" pattern, and append confirmed highlights to each match's video
  list. Use when the user asks to "find missing highlight videos", "add
  Melhores Momentos / summarized / highlights videos", or wants to top up
  highlight coverage after new matches have finished.
---

## Overview

Companion to [[find-missing-match-videos]] (which adds the *full game*). This
skill adds the *highlights* video. Each match in `src/data/matchVideos.json`
holds an array of videos, ordered **full game first, highlights after**. Videos
are distinguished only by their title:

- Full game: `"<Team A> x <Team B> — Copa do Mundo 2026"`
- Highlights (primary, usually CazéTV pt-BR): `"Melhores Momentos: <Team A> x <Team B> — Copa do Mundo 2026"`
- Highlights (FIFA, English cut): `"Melhores Momentos: <Team A> x <Team B> (FIFA) — Copa do Mundo 2026"`

**A match may carry more than one highlights.** The site serves **pt-BR, es and
en** audiences, so an official **FIFA** highlights (English) is complementary
language coverage — *not* a duplicate of the CazéTV one. Add both, distinguishing
the FIFA cut with the `(FIFA)` suffix (which keeps the `^Melhores Momentos:`
prefix intact so detection and UI ordering still work). This mirrors the routing
memory [[reference_place_youtube_source_gate]] (FIFA match-highlights live in the
match strip, seen by all locales — never on thin per-scorer player rails). The
single-URL companion is [[place-youtube-video]].

Three stages:

1. **Identify** — find FINISHED matches missing a highlights: either **no**
   `Melhores Momentos` entry at all, or one but **no FIFA** (`(FIFA)`) entry
2. **Search + verify** — search YouTube, then **oEmbed-verify the real uploader**
   is FIFA / CazéTV (the search title alone is NOT proof)
3. **Append + deploy** — append confirmed highlights to each match's array and run [[test-bump-deploy]]

---

## Stage 1 — Identify matches missing highlights

A finished match needs work when **either**:
- it has **no** `Melhores Momentos:` entry at all (no video, or full game only), **or**
- it has a primary highlights but **no FIFA** (`(FIFA)`) one — the multi-language
  top-up. Because the site serves pt/es/en, an official FIFA English highlights is
  wanted on every finished match, alongside the CazéTV pt-BR one. This gap is large
  (most matches) — fill it incrementally; a match with both is fully covered.

**Production is the authoritative source of finished-match truth.** The local dev
server's FIFA sync and `src/matches.json` both lag (the FIFA API is often
unreachable from the dev environment, and `matches.json` only curates a subset —
many fixtures live in the runtime merge layer of `src/appMatches.ts`). So
reconcile against `https://copa2026.mpbarbosa.com/api/match-states`, which runs on
AWS and reaches FIFA reliably, and name matches from `APP_MATCHES` (the merged
set).

```bash
# Fetch production live match-states (authoritative).
curl -sk --max-time 30 https://copa2026.mpbarbosa.com/api/match-states -o /tmp/prod-match-states.json

# List FINISHED matches missing a highlights, tagging the gap type.
npx tsx -e "
import { APP_MATCHES } from './src/appMatches';
import * as fs from 'fs';
const prod = JSON.parse(fs.readFileSync('/tmp/prod-match-states.json','utf8')).states ?? {};
const videos = JSON.parse(fs.readFileSync('src/data/matchVideos.json','utf8'));
const byId = Object.fromEntries(APP_MATCHES.map(m => [m.id, m]));
const hasHi     = (arr: any) => Array.isArray(arr) && arr.some((v: any) => /^melhores momentos:/i.test(v.title || ''));
const hasFifaHi = (arr: any) => Array.isArray(arr) && arr.some((v: any) => /^melhores momentos:.*\(fifa\)/i.test(v.title || ''));
const rows = Object.entries(prod)
  .filter(([id, s]: any) => s.status === 'FINISHED')
  .map(([id]) => ({ id, hi: hasHi(videos[id]), fifa: hasFifaHi(videos[id]), has: !!videos[id] }))
  .filter(r => !r.hi || !r.fifa);
if (!rows.length) { console.log('All finished matches have both a primary and a FIFA highlights.'); process.exit(0); }
for (const r of rows) {
  const m = byId[r.id];
  const gap = !r.hi ? (r.has ? 'NO HIGHLIGHTS (has full game)' : 'NO VIDEO AT ALL') : 'needs FIFA highlights';
  console.log(r.id + '\t' + (m ? m.teamA.name + ' x ' + m.teamB.name : '(unknown)') + '\t' + gap);
}
"
```

> If the `curl` fails (sandboxed network), retry it with the sandbox disabled —
> the production host is read-only and safe to query. As a last-resort fallback,
> use a local `node -e "..."` check against `src/matches.json`, but treat its
> result as a lower bound (it under-reports).

If output is "All finished matches have both a primary and a FIFA highlights." —
stop here, nothing to do. Otherwise each row is tagged with its gap: `NO VIDEO AT
ALL` / `NO HIGHLIGHTS (has full game)` (add the primary highlights) or `needs FIFA
highlights` (add the FIFA English cut as a `(FIFA)` entry).

---

## Stage 2 — Search YouTube for each missing match

For each match identified in Stage 1, search YouTube using the pattern:

> `MELHORES MOMENTOS: <team A> X <team B> | COPA DO MUNDO FIFA™ 2026`

Use Portuguese team names where applicable (e.g., "Brasil", "França",
"Alemanha", "Espanha", "Portugal", "Holanda", "Marrocos", "Argélia", "Costa do
Marfim", "Coreia do Sul", "Arábia Saudita", "Nova Zelândia", "Uruguai",
"Estados Unidos", "Irã", "Iraque").

For each match, look for:
- **Primary target**: an official highlights upload titled like `MELHORES MOMENTOS: <Team A> X <Team B> | COPA DO MUNDO FIFA™ 2026` (FIFA / CazéTV / broadcaster, usually published within 24 h of the match)
- **Fallback**: any clearly-labelled "Melhores Momentos" / "Gols e Melhores Momentos" upload for the same fixture

### VERIFY the uploader via oEmbed (never skip — this is the gate)

**The search result title is a hint, NOT proof.** A fan re-upload can carry the
exact `MELHORES MOMENTOS: …` title, and YouTube's index mislabels matches. The
authoritative check is YouTube's own oEmbed, which returns the real uploader:

```bash
ID=<VIDEO_ID>
curl -s --max-time 20 "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=$ID&format=json" \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);console.log("["+j.author_name+"] "+j.title)})'
```

Accept **only** `author_name` = **FIFA** or **CazéTV** (or another official
broadcaster). **Reject** any fan / re-upload / reaction / foreign-outlet channel
(e.g. "TMC Esporte", "Coluna do Fla", ITV/NBC/Sky) — a real-but-unofficial video
is still a fail (see [[reference_place_youtube_source_gate]], [[reference_cazetv_video_gotchas]]).
Confirm the verified title's teams/score match the fixture. If oEmbed is 404 /
inconclusive, skip.

Then construct the embed URL from the bare 11-char id (strip `?si=`, `&t=`):
```
https://www.youtube.com/embed/<VIDEO_ID>
```

Build a result table (note the source — it drives the title suffix in Stage 3a):

| Match ID | Teams | YouTube ID | Uploader (oEmbed) |
|---|---|---|---|
| `xxx-yyy-2026` | X x Y | `xxxxxxxxxxx` | CazéTV / FIFA |

**If no official highlights exists for a match yet** (recently played, nothing
uploaded), note it and skip. Do not add placeholder or fan entries.

---

## Stage 3 — Append the highlights and deploy

### 3a. Generate the Portuguese title — suffix by source

The title is always pt-BR, but a **FIFA** cut gets a `(FIFA)` suffix so it doesn't
collide with the primary (CazéTV) tile on the same match:

- **Primary (CazéTV / broadcaster):** `"Melhores Momentos: <Team A> x <Team B> — Copa do Mundo 2026"`
- **FIFA (English cut):** `"Melhores Momentos: <Team A> x <Team B> (FIFA) — Copa do Mundo 2026"`

Examples:
- CazéTV México x África do Sul → `"Melhores Momentos: México x África do Sul — Copa do Mundo 2026"`
- FIFA Estados Unidos x Bélgica → `"Melhores Momentos: Estados Unidos x Bélgica (FIFA) — Copa do Mundo 2026"`

The `(FIFA)` suffix sits *after* the team names (still inside the `Melhores
Momentos:`-prefixed string), so the `^melhores momentos:` detection keeps working.

### 3b. Append (do not overwrite) the entry

Edit `src/data/matchVideos.json` directly — it is a hand-maintained small JSON
file. **Append** each highlights object to the match's existing array (full game
first, then highlights). Never delete or replace an existing entry, and never
duplicate a video id. A match may legitimately hold **both** a primary (CazéTV)
and a FIFA highlights:

```jsonc
"<match-id>": [
  {
    "embedUrl": "https://www.youtube.com/embed/<FULL_GAME_ID>",
    "title": "<Team A> x <Team B> — Copa do Mundo 2026"
  },
  {
    "embedUrl": "https://www.youtube.com/embed/<CAZETV_HL_ID>",
    "title": "Melhores Momentos: <Team A> x <Team B> — Copa do Mundo 2026"
  },
  {
    "embedUrl": "https://www.youtube.com/embed/<FIFA_HL_ID>",
    "title": "Melhores Momentos: <Team A> x <Team B> (FIFA) — Copa do Mundo 2026"
  }
]
```

If the match has no array yet (no full game either), create the array with just
the highlights entry — but prefer running [[find-missing-match-videos]] first so
the full game leads the list.

Preserve the existing key order (do not reorder matches).

### 3c. Verify the JSON is valid and highlights landed

```bash
node -e "
const v = JSON.parse(require('fs').readFileSync('src/data/matchVideos.json','utf8'));
console.log('valid');
const m = require('fs').readFileSync('src/matches.json','utf8');
const matches = JSON.parse(m);
const hasHighlights = (arr) =>
  Array.isArray(arr) && arr.some((x) => /^melhores momentos:/i.test(x.title || ''));
const still = matches.filter((x) => x.status === 'FINISHED' && !hasHighlights(v[x.id]));
console.log('finished matches still missing highlights:', still.length);
"
```

### 3d. Deploy

Use the [[test-bump-deploy]] skill to test, bump the version, commit, push, and
deploy to production.

---

## Commit message convention

```
chore: bump version to X.Y.Z; add highlight videos for <match list>
```

Example: `chore: bump version to 0.0.206; add highlight videos for MEX×RSA, BRA×HAI`

---

## Notes

- Match IDs follow the pattern `<teamA_code_lower>-<teamB_code_lower>-2026` (e.g., `bra-mar-2026`).
- The `teamA` in the match ID is always the home/first team as listed in `src/matches.json`.
- A highlights entry is identified purely by its `"Melhores Momentos: "` title prefix — there is no separate type field. Keep the prefix exact so detection and the UI ordering stay correct. The FIFA cut adds a `(FIFA)` suffix *after* the team names (the prefix stays intact).
- A match may hold **multiple** highlights (CazéTV pt-BR + FIFA en) — this is intentional multi-language coverage, not a duplicate to dedupe. Only reject a literal same-title, same-source tile.
- **Never trust a title without oEmbed.** Only FIFA / CazéTV / official-broadcaster uploads qualify; fan re-uploads are rejected even when they carry the exact `MELHORES MOMENTOS:` title.
- If a highlights video is removed or becomes unavailable, update the URL but keep the entry (don't delete).
- This skill only appends highlights. To add the *full game*, use [[find-missing-match-videos]]; to place a single known URL, use [[place-youtube-video]].

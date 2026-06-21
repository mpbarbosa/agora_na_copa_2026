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
holds an array of videos, by convention ordered **full game first, highlights
second**. The two are distinguished only by the title prefix:

- Full game: `"<Team A> x <Team B> — Copa do Mundo 2026"`
- Highlights: `"Melhores Momentos: <Team A> x <Team B> — Copa do Mundo 2026"`

Three stages:

1. **Identify** — find FINISHED matches whose video array has no `Melhores Momentos` entry
2. **Search** — for each, search YouTube: `MELHORES MOMENTOS: <team A> X <team B> | COPA DO MUNDO FIFA™ 2026`
3. **Append + deploy** — append confirmed highlights to each match's array and run [[test-bump-deploy]]

---

## Stage 1 — Identify matches missing highlights

A finished match needs highlights when its array contains no entry whose title
starts with `Melhores Momentos:` (this includes matches with a full game but no
highlights, and matches with no video at all).

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

# List FINISHED matches whose video array has no "Melhores Momentos" entry.
npx tsx -e "
import { APP_MATCHES } from './src/appMatches';
import * as fs from 'fs';
const prod = JSON.parse(fs.readFileSync('/tmp/prod-match-states.json','utf8')).states ?? {};
const videos = JSON.parse(fs.readFileSync('src/data/matchVideos.json','utf8'));
const byId = Object.fromEntries(APP_MATCHES.map(m => [m.id, m]));
const hasHi = (arr: any) => Array.isArray(arr) && arr.some((v: any) => /^melhores momentos:/i.test(v.title || ''));
const missing = Object.entries(prod)
  .filter(([id, s]: any) => s.status === 'FINISHED' && !hasHi(videos[id]));
if (!missing.length) { console.log('All finished matches have highlights.'); process.exit(0); }
for (const [id] of missing) {
  const m = byId[id];
  console.log(id + '\t' + (m ? m.teamA.name + ' x ' + m.teamB.name : '(unknown)') +
    (videos[id] ? '\t(has full game)' : '\t(no video at all)'));
}
"
```

> If the `curl` fails (sandboxed network), retry it with the sandbox disabled —
> the production host is read-only and safe to query. As a last-resort fallback,
> use a local `node -e "..."` check against `src/matches.json`, but treat its
> result as a lower bound (it under-reports).

If output is "All finished matches have highlights." — stop here, nothing to do.

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

Extract the YouTube video ID (the 11-character code after `?v=` or in the
`/embed/` URL) and construct the embed URL:
```
https://www.youtube.com/embed/<VIDEO_ID>
```

Build a result table like:

| Match ID | Teams | YouTube ID | Source |
|---|---|---|---|
| `xxx-yyy-2026` | X x Y | `xxxxxxxxxxx` | MELHORES MOMENTOS |

**If no highlights exist for a match yet** (e.g., recently played and nothing
uploaded), note it and skip. Do not add placeholder entries.

---

## Stage 3 — Append the highlights and deploy

### 3a. Generate the Portuguese title

Use the pattern: `"Melhores Momentos: <Team A in pt-BR> x <Team B in pt-BR> — Copa do Mundo 2026"`

Examples:
- México x África do Sul → `"Melhores Momentos: México x África do Sul — Copa do Mundo 2026"`
- Estados Unidos x Paraguai → `"Melhores Momentos: Estados Unidos x Paraguai — Copa do Mundo 2026"`

### 3b. Append (do not overwrite) the entry

Edit `src/data/matchVideos.json` directly — it is a hand-maintained small JSON
file. **Append** the highlights object to the match's existing array, keeping the
full game first and the highlights second. Never delete or replace the existing
full-game entry.

```jsonc
"<match-id>": [
  {
    "embedUrl": "https://www.youtube.com/embed/<FULL_GAME_ID>",
    "title": "<Team A> x <Team B> — Copa do Mundo 2026"
  },
  {
    "embedUrl": "https://www.youtube.com/embed/<HIGHLIGHTS_ID>",
    "title": "Melhores Momentos: <Team A> x <Team B> — Copa do Mundo 2026"
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
- The highlights entry is identified purely by its `"Melhores Momentos: "` title prefix — there is no separate type field. Keep the prefix exact so detection and the UI ordering stay correct.
- If a highlights video is removed or becomes unavailable, update the URL but keep the entry (don't delete).
- This skill only appends highlights. To add the *full game*, use [[find-missing-match-videos]].

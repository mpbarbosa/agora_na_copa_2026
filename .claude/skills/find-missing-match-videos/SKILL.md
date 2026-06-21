---
name: find-missing-match-videos
description: >
  Find all finished World Cup 2026 matches that are missing a full-game video
  in src/data/matchVideos.json, search YouTube for each one using the Cazé TV
  "Jogo Completo" pattern, and add confirmed videos. Use when the user asks
  to "find missing match videos", "add full game videos", or wants to update
  video coverage after new matches have finished.
---

## Overview

Three stages:

1. **Identify** — reconcile `src/data/matchVideos.json` against the **production** live match-states to find FINISHED matches with no video entry
2. **Search** — for each missing match, search YouTube: `Jogo Completo <team A> vs <team B> Copa do Mundo 2026 Cazé TV`
3. **Update + deploy** — add confirmed entries to `matchVideos.json` and run test-bump-deploy

---

## Stage 1 — Identify missing matches

**Production is the authoritative source of finished-match truth.** The local dev
server's FIFA sync and `src/matches.json` both lag (the FIFA API is often
unreachable from the dev environment, and `matches.json` only curates a subset —
many fixtures live in the runtime merge layer of `src/appMatches.ts`). So
reconcile against `https://copa2026.mpbarbosa.com/api/match-states`, which runs on
AWS and reaches FIFA reliably. Match the missing ids against `APP_MATCHES` (the
merged set) for team names — not `matches.json`, which would miss supplemental
fixtures.

```bash
# Fetch production live match-states (authoritative).
curl -sk --max-time 30 https://copa2026.mpbarbosa.com/api/match-states -o /tmp/prod-match-states.json

# List FINISHED matches with no full-game video, naming them from APP_MATCHES.
npx tsx -e "
import { APP_MATCHES } from './src/appMatches';
import * as fs from 'fs';
const prod = JSON.parse(fs.readFileSync('/tmp/prod-match-states.json','utf8')).states ?? {};
const videos = JSON.parse(fs.readFileSync('src/data/matchVideos.json','utf8'));
const byId = Object.fromEntries(APP_MATCHES.map(m => [m.id, m]));
const missing = Object.entries(prod)
  .filter(([id, s]: any) => s.status === 'FINISHED' && !videos[id]);
if (!missing.length) { console.log('All finished matches have full-game videos.'); process.exit(0); }
for (const [id, s] of missing) {
  const m = byId[id]; const sc: any = (s as any).score;
  console.log(id + '\t' + (m ? m.teamA.name + ' x ' + m.teamB.name : '(unknown)') + '\t' + (sc ? sc.teamA + '-' + sc.teamB : ''));
}
"
```

> If the `curl` fails (sandboxed network), retry it with the sandbox disabled —
> the production host is read-only and safe to query. As a last-resort fallback,
> use the local check `node -e "..."` against `src/matches.json`, but treat its
> result as a lower bound (it under-reports).

If output is "All finished matches have full-game videos." — stop here, nothing to do.

---

## Stage 2 — Search YouTube for each missing match

For each match identified in Stage 1, search YouTube using the pattern:

> `Jogo Completo <team A> vs <team B> Copa do Mundo 2026 Cazé TV`

Use Portuguese team names where applicable (e.g., "Brasil", "França", "Alemanha", "Espanha", "Portugal", "Holanda", "Marrocos", "Argélia", "Costa do Marfim", "Coreia do Sul", "Arábia Saudita", "Nova Zelândia", "Uruguai", "Estados Unidos", "Irã", "Iraque").

For each match, search and look for:
- **Primary target**: A Cazé TV upload titled exactly "JOGO COMPLETO | \<Team A\> x \<Team B\> | Copa do Mundo 2026" (usually published within 24 h of the match)
- **Fallback**: An "AO VIVO" archived livestream on Cazé TV's channel if no JOGO COMPLETO exists yet

Extract the YouTube video ID (the 11-character code after `?v=` or in the `/embed/` URL) and construct the embed URL:
```
https://www.youtube.com/embed/<VIDEO_ID>
```

Build a result table like:

| Match ID | Teams | YouTube ID | Type |
|---|---|---|---|
| `xxx-yyy-2026` | X vs Y | `xxxxxxxxxxx` | JOGO COMPLETO |
| `aaa-bbb-2026` | A vs B | `xxxxxxxxxxx` | AO VIVO |

**If no video exists for a match at all** (e.g., match was recently played and Cazé TV hasn't uploaded yet), note it and skip. Do not add placeholder entries.

---

## Stage 3 — Update matchVideos.json and deploy

### 3a. Generate the Portuguese title

Use the pattern: `"<Team A in pt-BR> x <Team B in pt-BR> — Copa do Mundo 2026"`

Examples:
- Brasil x Marrocos → `"Brasil x Marrocos — Copa do Mundo 2026"`
- Estados Unidos x Paraguai → `"Estados Unidos x Paraguai — Copa do Mundo 2026"`

### 3b. Update the file

Edit `src/data/matchVideos.json` directly — it is a hand-maintained small JSON file. Add each new entry:

```json
"<match-id>": [
  {
    "embedUrl": "https://www.youtube.com/embed/<VIDEO_ID>",
    "title": "<pt-BR title>"
  }
]
```

Preserve the existing alphabetical/chronological order of keys.

### 3c. Verify the JSON is valid

```bash
node -e "JSON.parse(require('fs').readFileSync('src/data/matchVideos.json','utf8')); console.log('valid')"
```

### 3d. Deploy

Use the [[test-bump-deploy]] skill to test, bump the version, commit, push, and deploy to production.

---

## Commit message convention

```
chore: bump version to X.Y.Z; add full-game videos for <match list>
```

Example: `chore: bump version to 0.0.185; add full-game videos for ARG×ALG, MEX×RSA`

---

## Notes

- Match IDs follow the pattern `<teamA_code_lower>-<teamB_code_lower>-2026` (e.g., `bra-mar-2026`).
- The `teamA` in the match ID is always the home/first team as listed in `src/matches.json`.
- If Cazé TV removes a video or it becomes unavailable, update the URL but keep the entry (don't delete).
- `matchVideos.json` stores an array per match to allow multiple videos in future (e.g., highlights + full game), but the current convention is one entry per match.

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
- **Stable fallback**: A Cazé TV **COMPACTO** (condensed full match) if no JOGO COMPLETO exists yet — preferred over an AO VIVO livestream VOD, which Cazé TV recycles/retitles (see [[reference_cazetv_video_gotchas]])
- **Last-resort fallback**: An "AO VIVO" archived livestream on Cazé TV's channel

### VERIFY the uploader via oEmbed (never skip — this is the gate)

**The search result title is a hint, NOT proof.** A fan re-upload can carry the
exact "JOGO COMPLETO: …" title (this session, a "JOGO COMPLETO: ARGENTINA 3x2
EGITO" hit was actually a **TMC Esporte** re-upload — rejected). YouTube's index
also mislabels matches. Verify the real uploader with YouTube's own oEmbed:

```bash
ID=<VIDEO_ID>
curl -s --max-time 20 "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=$ID&format=json" \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);console.log("["+j.author_name+"] "+j.title)})'
```

Accept **only** `author_name` = **CazéTV** (or FIFA / another official
broadcaster). **Reject** any fan / re-upload / reaction / foreign-outlet channel
(e.g. "TMC Esporte", "Coluna do Fla") — a real-but-unofficial video is still a
fail (see [[reference_place_youtube_source_gate]]). Confirm the verified title's
teams/score match the fixture. The search index frequently mislabels an AO VIVO
livestream as another match — oEmbed catches it. If oEmbed is 404 / inconclusive,
skip.

Then construct the embed URL from the bare 11-char id (strip `?si=`, `&t=`):
```
https://www.youtube.com/embed/<VIDEO_ID>
```

Build a result table (record the verified uploader, not the search label):

| Match ID | Teams | YouTube ID | Type | Uploader (oEmbed) |
|---|---|---|---|---|
| `xxx-yyy-2026` | X vs Y | `xxxxxxxxxxx` | JOGO COMPLETO / COMPACTO | CazéTV |

**If no official full game exists for a match at all** (recently played, Cazé TV
hasn't uploaded yet), note it and skip. Do not add placeholder or fan entries.

---

## Stage 3 — Update matchVideos.json and deploy

### 3a. Generate the Portuguese title

- **JOGO COMPLETO / AO VIVO full game:** `"<Team A in pt-BR> x <Team B in pt-BR> — Copa do Mundo 2026"`
- **COMPACTO fallback:** prefix with `Compacto:` → `"Compacto: <Team A> x <Team B> — Copa do Mundo 2026"`

Examples:
- Brasil x Marrocos (full game) → `"Brasil x Marrocos — Copa do Mundo 2026"`
- Argentina x Egito (compacto) → `"Compacto: Argentina x Egito — Copa do Mundo 2026"`

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
- `matchVideos.json` stores an array per match and a match routinely holds **several** videos — full game, a CazéTV "Melhores Momentos", and a FIFA "(FIFA)" highlights (multi-language pt/es/en coverage). This skill adds only the **full game**; use [[find-missing-highlight-videos]] for highlights and [[place-youtube-video]] to place a single known URL. Never duplicate a video id.
- **Never trust a title without oEmbed.** Only CazéTV / FIFA / official-broadcaster uploads qualify; a fan re-upload can carry the exact "JOGO COMPLETO:" title and must be rejected.

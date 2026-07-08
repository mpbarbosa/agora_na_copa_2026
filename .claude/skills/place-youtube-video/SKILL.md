---
name: place-youtube-video
description: >
  Analyze one YouTube video URL, VERIFY what it actually is against the live
  source via oEmbed (real uploader + title — never the search label), and insert
  its /embed/ URL into the right curated data file — an official match video
  (src/data/matchVideos.json: full game, "Melhores Momentos" highlights, or a
  "Coletiva:" coach presser), a per-player rail (src/data/playerVideos.json, keyed
  by FIFA id), a team-page rail (src/data/teamVideos.json, keyed by team code), or a
  coach carousel (src/data/coachVideos.json, keyed by team code). Rejects
  fan/re-upload channels, strips tracking params, respects each file's
  array/title/key conventions, validates JSON. Use when the user says "analyze
  this YouTube video and choose where to insert it", "where does this YouTube
  video go", "add this YouTube video/highlight", or pastes a bare youtu.be /
  youtube.com watch link for a match or a player.
---

## Overview

YouTube videos live in **four** curated data files. Each is a `{ embedUrl, title }[]`
array; the `embedUrl` is always the `/embed/<id>` form.

| Destination file | Keyed by | Renders as | Holds |
|---|---|---|---|
| `src/data/matchVideos.json` | **match id** (`bra-hai-2026`, `ko-91-2026`) | the finished-match videos strip (`BroadcastGuideTab`) + the team page's "Vídeos das partidas" list | official **match** video(s): full game, "Melhores Momentos" highlights, and coach-presser entries (title `Coletiva: …`) |
| `src/data/playerVideos.json` | **fifaId** (Messi = `229397`) | the player card carousel (`PlayerVideoRail`) | YouTube videos **for one player**: official match highlights he featured in, or his official-channel content |
| `src/data/teamVideos.json` | **3-letter team code** (`USA`) | the "Vídeos da seleção" rail on the national team page (`TeamVideoRail`) | official **team-level** content **not tied to one match**: team features, "road to…" docs, squad reveals, federation content |
| `src/data/coachVideos.json` | **3-letter team code** (`USA`) | the "Vídeos" carousel in the `CoachCard` | official **coach** content: post-match press conferences, coach interviews |

There is no **referee** YouTube file — that surface is Instagram-only (see
[[place-instagram-highlight]] for the IG analogs). If a video fits none of the
four homes, flag it and stop.

**Routing team/coach content (added 2026-07-08):**
- A **coach press conference / interview** (FIFA/CazéTV/federation, about the coach) →
  `coachVideos.json` under the team code. If it's about a **specific match**, ALSO add
  it to that match in `matchVideos.json` with a `Coletiva: …` title (it shows on the
  match broadcast tab; presser titles are auto-excluded from the team "Vídeos das
  partidas" list so they aren't mislabeled as a full game).
- **Team-level content not tied to one match** (a feature, a doc, a squad reveal) →
  `teamVideos.json` under the team code. A **match-tied** team video is better placed
  on the match (`matchVideos.json`), which already surfaces on the team page's "Vídeos
  das partidas" — don't duplicate it into `teamVideos.json`.
- Same source gate as always: **FIFA / CazéTV / the federation's own channel** only;
  reject fan / foreign-outlet uploads (see [[reference_place_youtube_source_gate]]).

The job: from the **verified** content (not the URL's label or a search snippet),
decide which file(s) it belongs to, then insert it correctly. This is a
**data-edit skill** → ship **data-side-only** by default (test → commit → sync to
main, no bump/deploy) per [[feedback_data_side_only_default]]. Batch several
videos and ship once.

---

## Stage 1 — Verify the video via oEmbed (never skip)

**The search result / thumbnail / the user's label is a hint, NOT proof.** YouTube
search indexes routinely mislabel matches, and CazéTV recycles/retitles its AO
VIVO livestreams (see [[reference_cazetv_video_gotchas]]). The **authoritative**
check is YouTube's own oEmbed, which returns the real uploader and title:

```bash
# Extract the 11-char video id from ANY YouTube URL form and oEmbed it.
#   youtu.be/<id>?si=…   youtube.com/watch?v=<id>&t=…   /embed/<id>   /shorts/<id>
ID=<VIDEO_ID>
curl -s --max-time 20 "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=$ID&format=json" \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);console.log("["+j.author_name+"] "+j.title)})'
```

Read the `author_name` and `title`, then judge the **source quality** — this is
the gate that the previous Instagram skill does not need:

- **Official broadcaster** (`author_name` = **CazéTV**, or FIFA) → trustworthy for
  a **match** video. Confirm the title's teams/score match the fixture you intend.
- **Official player/club channel** (e.g. `Erling Haaland`, a federation channel) →
  trustworthy for a **player** video.
- **Fan / re-upload / reaction channel** (e.g. "MODO CARREIRA SOTO", "TMC Esporte",
  "Coluna do Fla", any watch-along) → **REJECT.** Do not add it. These are
  unverified, unofficial, and often taken down. Grounding rule per
  [[feedback_never_invent_data]] and [[feedback_stay_critical_verify_data]]:
  a real-but-unofficial video is still a fail — say so and skip.

If oEmbed returns `UNAVAILABLE` / 404, or the uploader/title is inconclusive about
who or what the video is, **stop and ask** rather than guess.

Then **strip tracking params** — keep only the bare 11-char id. The stored value is
always `https://www.youtube.com/embed/<id>` (never `youtu.be`, `watch?v=`, `?si=`,
`&t=`).

---

## Stage 2 — Route by verified content

| The video is… | Goes in | Find the key |
|---|---|---|
| an official **full-game** broadcast (CazéTV "JOGO COMPLETO" / "AO VIVO" archive) | `matchVideos.json` | the match id |
| an official **highlights** clip ("MELHORES MOMENTOS" / "COMPACTO") | `matchVideos.json` | the match id |
| a highlight/clip **for one player** (official highlight he featured in, or his official-channel video) | `playerVideos.json` | the player's fifaId |

A single official match-highlights clip can legitimately live in **both** files —
in `matchVideos.json` under the match, **and** in `playerVideos.json` under a star
who scored in it (precedent: the same CazéTV "Melhores Momentos" is both the
match's highlight and a scorer's rail entry). Decide from the content; cross-list
when it genuinely fits both.

Resolve the keys:

- **Match id** — group stage `<teamA>-<teamB>-2026` (lowercase codes, fixture
  order); knockout `ko-<matchNumber>-2026`. Confirm it is real:
  ```bash
  grep -rn "<id>" src/data/*.json
  # or resolve a knockout tie's teams/number:
  npx tsx -e 'import { APP_MATCHES } from "./src/appMatches";
    for (const m of APP_MATCHES) if (/NOR|BRA/.test(m.teamA.code+m.teamB.code))
      console.log(m.id, m.teamA.code, "x", m.teamB.code);'
  ```
- **Player fifaId** — `grep -ni "<name>" src/data/squads.json` → the entry's fifaId
  (e.g. Haaland = `419652`). The same id keys `playerVideos.json`.

---

## Stage 3 — Insert, respecting each file's conventions

Value is `{ embedUrl, title }[]` in both files. `embedUrl` = `https://www.youtube.com/embed/<id>`.

### `matchVideos.json` — keyed by match id (string keys → JS round-trip is SAFE)

Order **full game first, highlights second**; the two are distinguished only by the
title prefix. Append, never replace an existing entry; do not duplicate an id.

- Full game: `"<Team A> x <Team B> — Copa do Mundo 2026"`
- Highlights: `"Melhores Momentos: <Team A> x <Team B> — Copa do Mundo 2026"`

```bash
node -e '
const fs=require("fs"); const p="src/data/matchVideos.json"; const v=JSON.parse(fs.readFileSync(p,"utf8"));
const url="https://www.youtube.com/embed/<ID>";
v["<match-id>"] = v["<match-id>"] || [];
if (!v["<match-id>"].some(x=>x.embedUrl===url)) v["<match-id>"].push({ embedUrl:url, title:"<pt-BR title>" });
fs.writeFileSync(p, JSON.stringify(v,null,2)+"\n"); JSON.parse(fs.readFileSync(p,"utf8")); console.log("ok");'
```

### `playerVideos.json` — keyed by fifaId (⚠ INTEGER-LIKE keys — reorder trap)

fifaId keys are integer-like, so `JSON.parse → JSON.stringify` **re-sorts them
ascending** — the same scramble as `squads.json` (see
[[reference_squads_json_stringify_reorders]]). **Check first** whether the file is
already sorted ascending:

```bash
grep -oE '^  "[0-9]+":' src/data/playerVideos.json | tr -d ' ":' | sort -c -n \
  && echo "ALREADY SORTED → JS round-trip is safe (new key slots in order)" \
  || echo "NOT sorted → edit as TEXT, do NOT JSON.stringify the whole file"
```

- **Already sorted** → a JS round-trip is safe; a new fifaId key lands in its sorted
  position automatically. Use the same node pattern as above on `playerVideos.json`.
- **Not sorted** → insert as text (Edit tool / regex on the raw string), never a
  whole-file `JSON.stringify`.

Player-rail titles (pt-BR):
- a match highlight he featured in: `"<Team A> <score> <Team B> — Melhores momentos | Copa do Mundo 2026"`
- his official-channel content: a descriptive pt-BR title (translate the source
  title into the football-broadcast voice).

Never delete an existing entry; if a video goes private/unavailable, update the id
but keep the entry.

---

## Stage 4 — Validate

After every file you touch:

```bash
node -e "JSON.parse(require('fs').readFileSync('src/data/<file>.json','utf8')); console.log('valid JSON')"
```

For `playerVideos.json`, also re-run the sorted check above and `git diff --stat`
to confirm the diff is **only your insertion** (a few lines), not a full-file
reorder.

---

## Stage 5 — Ship (data-side-only)

Batch as many videos as the user feeds you, then run [[test-commit-sync]] (no bump,
no deploy). Split into logical commits when the batch mixes concerns (match videos
vs player-rail videos). Do NOT deploy or bump from the data worktree — see
[[feedback_deploy_worktree_only_for_deploy]].

Commit message convention:
```
data: add <who/what> YouTube video(s)
```

---

## Notes

- **oEmbed is the one source of truth for identity.** A title that "looks right" in
  search is not enough — a fan re-upload can carry the exact "JOGO COMPLETO: …"
  title. Only `author_name` proves the uploader. This is the single most important
  rule this skill exists to enforce.
- **Four homes.** Match video → `matchVideos.json`; single-player → `playerVideos.json`;
  team-level (non-match) → `teamVideos.json`; coach → `coachVideos.json`. Anything that
  fits none (a referee clip — IG-only; a generic tournament montage) has no curated
  home — flag and skip.
- For **bulk** discovery of missing match footage, prefer the batch skills
  [[find-missing-match-videos]] (full games) and [[find-missing-highlight-videos]]
  (highlights) — this skill is the single-URL, place-one-video companion.
- File ownership/edit rules live in `src/data/CLAUDE.md`; pt-BR domain terms in
  `CONTEXT.md`.

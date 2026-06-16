# FIFA API Documentation

This document summarizes the FIFA endpoints currently used or discovered for the **Agora na Copa 2026** transmission guide integration.

## Status

- These endpoints are publicly reachable from the FIFA website experience.
- They do **not** appear to be formally documented as a stable public developer API.
- Response formats and availability may change without notice.

## Base URLs

| Purpose | Base URL |
| --- | --- |
| FIFA site content APIs | `https://cxm-api.fifa.com/fifaplusweb/api` |
| FIFA match and watch data APIs | `https://api.fifa.com/api/v3` |

## Known tournament identifiers

| Field | Value | Meaning |
| --- | --- | --- |
| `competitionId` | `17` | FIFA World Cup (all editions) |
| `seasonId` | `285023` | 2026 tournament season |
| `seasonId` | `255711` | 2022 tournament season (Qatar) |
| `seasonId` | `254645` | 2018 tournament season (Russia) |
| `stageId` | `289273` | Group stage in 2026 examples |
| `country` | `BR` | Country-specific watch guide for Brazil |
| `language` | `pt` | Portuguese responses |

## Known team identifiers (2026)

| Team | `IdTeam` | Notes |
| --- | --- | --- |
| Brasil | `43924` | |
| Marrocos | `43872` | |
| França | `43946` | |

## Known player identifiers

| Player | `IdPlayer` | Notes |
| --- | --- | --- |
| Kylian Mbappé | `389867` | FRA |
| N'Golo Kanté | `398681` | FRA |
| Mike Maignan | `448332` | FRA |
| Bradley Barcola | `484860` | FRA |
| Ousmane Dembélé | `398680` | FRA |
| William Saliba | `419177` | FRA |
| Dayot Upamecano | `389876` | FRA |
| Jules Koundé | `430707` | FRA |
| Aurelien Tchouaméni | `405893` | FRA |
| Theo Hernandez | `408042` | FRA |
| Elijah Just | `405454` | NZL |

## Key endpoints

### 1. Tournament page content

Returns the page model used by the FIFA site for the tournament landing page.

```text
GET https://cxm-api.fifa.com/fifaplusweb/api/pages/pt/tournaments/mens/worldcup/canadamexicousa2026
```

**Use case:** site content, sections, layout metadata.

---

### 2. Match centre page content

Returns the page model for a specific match centre page.

```text
GET https://cxm-api.fifa.com/fifaplusweb/api/pages/pt/match-centre/match/17/285023/289273/400021456
```

**Path structure**

```text
/pages/{locale}/match-centre/match/{competitionId}/{seasonId}/{stageId}/{matchId}
```

**Use case:** page composition for a match.

---

### 3. Match list for a season

Returns tournament matches with team, score, date, stadium, stage, and other metadata.

```text
GET https://api.fifa.com/api/v3/calendar/matches?language=pt&idCompetition=17&idSeason=285023&count=400
```

**Important query parameters**

| Parameter | Example | Notes |
| --- | --- | --- |
| `language` | `pt` | Response localization |
| `idCompetition` | `17` | Tournament id |
| `idSeason` | `285023` | Season id |
| `idStage` | `289273` | Optional stage filter |
| `idMatch` | `400021456` | Optional match filter |
| `count` | `400` | Max items to return |

**Useful response fields**

```json
{
  "Results": [
    {
      "IdMatch": "400021456",
      "Date": "2026-06-13T22:00:00Z",
      "StageName": [{ "Locale": "pt-BR", "Description": "Primeira fase" }],
      "Home": {
        "IdTeam": "43924",
        "Abbreviation": "BRA",
        "TeamName": [{ "Locale": "pt-BR", "Description": "Brasil" }]
      },
      "Away": {
        "IdTeam": "43872",
        "Abbreviation": "MAR",
        "TeamName": [{ "Locale": "pt-BR", "Description": "Marrocos" }]
      },
      "Stadium": {
        "Name": [{ "Locale": "pt-BR", "Description": "MetLife Stadium" }],
        "CityName": [{ "Locale": "pt-BR", "Description": "Nova York" }]
      }
    }
  ]
}
```

**Use case:** match discovery and local-to-FIFA match id mapping.

---

### 4. Watch guide for a season

Returns the **Onde Assistir** sources for all matches in the season for a given country.

```text
GET https://api.fifa.com/api/v3/watch/season/285023/BR?language=pt
```

**Path structure**

```text
/watch/season/{seasonId}/{country}
```

**Useful response fields**

```json
{
  "IdSeason": "285023",
  "IdCountryIso3166Alpha2": "BR",
  "Matches": [
    {
      "IdMatch": "400021456",
      "Date": "2026-06-13T22:00:00Z",
      "Sources": [
        {
          "IdChannel": "451",
          "Name": "Cazé TV",
          "Logo": "https://extranets.fifa.com/TvStationPhotos/451.png",
          "TvChannelUrl": "https://youtube.com/c/cazetv",
          "Url": "https://www.youtube.com/@CazeTV",
          "Language": "Portuguese Brazil"
        }
      ]
    }
  ]
}
```

**Use case:** bulk guide loading and caching.

---

### 5. Watch guide for a single match

Returns the **Onde Assistir** sources for one match and one country.

```text
GET https://api.fifa.com/api/v3/watch/match/285023/400021456/BR?language=pt
```

**Path structure**

```text
/watch/match/{seasonId}/{matchId}/{country}
```

**Observed response example**

```json
{
  "IdMatch": "400021456",
  "IdSeason": "285023",
  "IdCompetition": "17",
  "IdCountryIso3166Alpha2": "BR",
  "Date": "2026-06-13T22:00:00Z",
  "Sources": [
    {
      "IdChannel": "914",
      "Name": "GETV",
      "Logo": "https://extranets.fifa.com/TvStationPhotos/914.png",
      "Url": "https://globoplay.globo.com/categorias/ge-tv/"
    },
    {
      "IdChannel": "30",
      "Name": "Globoplay",
      "Logo": "https://extranets.fifa.com/TvStationPhotos/30.png",
      "Url": "https://globoplay.globo.com/tv-globo/ao-vivo/6120663/"
    },
    {
      "IdChannel": "451",
      "Name": "Cazé TV",
      "Logo": "https://extranets.fifa.com/TvStationPhotos/451.png",
      "Url": "https://www.youtube.com/@CazeTV"
    },
    {
      "IdChannel": "26",
      "Name": "sportv",
      "Logo": "https://extranets.fifa.com/TvStationPhotos/26.png",
      "Url": "https://canaisglobo.globo.com/c/sportv/"
    }
  ]
}
```

**Use case:** debugging or refreshing a single match guide.

---

### 6. Single-match calendar details

Returns calendar metadata for one match.

```text
GET https://api.fifa.com/api/v3/calendar/400021456?language=pt
```

**Use case:** precise match metadata lookup.

---

### 7. Live match data

Returns live match state and event data including lineups, goals, bookings, and substitutions.

```text
GET https://api.fifa.com/api/v3/live/football/400021456?language=pt
```

**Important: `Players[]` is only populated after the official lineup is released** (typically ~1h before kickoff). Before that the array is empty. Coaches (`Coaches[]`) do have `PictureUrl` pre-kickoff.

**Useful response fields**

```json
{
  "HomeTeam": {
    "IdTeam": "43946",
    "Abbreviation": "FRA",
    "Players": [
      {
        "IdPlayer": "389867",
        "ShirtNumber": 10,
        "Position": 4,
        "PlayerName": [{ "Locale": "pt-BR", "Description": "Kylian MBAPPE" }],
        "ShortName": [{ "Locale": "pt-BR", "Description": "MBAPPÉ" }],
        "PlayerPicture": {
          "PictureUrl": "https://digitalhub.fifa.com/transform/66f6087d-9563-4644-8f10-5614ef6e1e51/MBAPPE-Kylian_389867"
        }
      }
    ],
    "Coaches": [
      {
        "IdCoach": "48455",
        "PictureUrl": "https://digitalhub.fifa.com/transform/38ce0161-6896-4b2a-ac42-700d51e5acac/DESCHAMPS-Didier_48455"
      }
    ],
    "Goals": [],
    "Bookings": [],
    "Substitutions": []
  }
}
```

**Use case:** live scoreboard, lineup, and match events.

---

### 8. Team squad

Returns the full registered squad for a team in a given competition, including player pictures. **Available before the match lineup is released** — this is the best source for player photos pre-kickoff.

```text
GET https://api.fifa.com/api/v3/teams/43946/squad?language=pt&idCompetition=17&idSeason=285023
```

**Path/query structure**

```text
/teams/{teamId}/squad?language={language}&idCompetition={competitionId}&idSeason={seasonId}
```

**Useful response fields**

```json
{
  "IdTeam": "43946",
  "Players": [
    {
      "IdPlayer": "389867",
      "ShirtNumber": 10,
      "PlayerName": [{ "Locale": "pt-BR", "Description": "Kylian MBAPPE" }],
      "ShortName": [{ "Locale": "pt-BR", "Description": "MBAPPÉ" }],
      "PlayerPicture": {
        "PictureUrl": "https://digitalhub.fifa.com/transform/66f6087d-9563-4644-8f10-5614ef6e1e51/MBAPPE-Kylian_389867"
      }
    }
  ]
}
```

**Use case:** bulk player photo pre-population in `matches.json` before any match is played.

---

### 9. Team metadata

Returns team details (name, abbreviation, logo URL, city, stadium) for a given season.

```text
GET https://api.fifa.com/api/v3/teams/43946?language=pt&idSeason=285023
```

**Use case:** team logo URL, metadata lookup.

---

### 10. Match timeline

Returns the event timeline for a match.

```text
GET https://api.fifa.com/api/v3/timelines/400021456?language=pt
```

**Use case:** minute-by-minute events.

---

### 11. Match-centre support sections

These power parts of the FIFA match page.

```text
GET https://cxm-api.fifa.com/fifaplusweb/api/sections/matchdetails/header?locale=pt&competitionId=17&seasonId=285023&stageId=289273&matchId=400021456

GET https://cxm-api.fifa.com/fifaplusweb/api/sections/matchdetails/tabs?locale=pt&competitionId=17&seasonId=285023&stageId=289273&matchId=400021456

GET https://cxm-api.fifa.com/fifaplusweb/api/sections/matchdetails/videos?locale=pt&competitionId=17&seasonId=285023&stageId=289273&matchId=400021456
```

**Use case:** FIFA site UI composition, not currently needed by the app’s guide sync.

## App integration in this repository

The app uses a local server route:

```text
GET /api/broadcast-guide
```

### What `/api/broadcast-guide` does

1. Loads FIFA season match data from `calendar/matches`.
2. Loads FIFA watch-guide data from `watch/season`.
3. Matches local app fixtures to FIFA fixtures by:
   - kickoff timestamp,
   - team abbreviations,
   - localized team names as fallback.
4. Normalizes FIFA `Sources[]` into the app `Broadcaster[]` format.
5. Falls back to local `matches.json` broadcaster data if FIFA has no channels for that match.

### Local response shape

```json
{
  "country": "BR",
  "language": "pt",
  "guides": {
    "bra-mar-2026": {
      "broadcasters": [
        {
          "id": "451",
          "name": "Cazé TV",
          "type": "YOUTUBE",
          "logoUrl": "https://extranets.fifa.com/TvStationPhotos/451.png",
          "iconColor": "#ed2939",
          "link": "https://www.youtube.com/@CazeTV"
        }
      ],
      "source": "fifa",
      "note": "Dados oficiais do Onde Assistir da FIFA para o Brasil.",
      "fifaMatchId": "400021456",
      "updatedAt": "2026-06-13T22:00:39.404Z"
    }
  }
}
```

## Broadcaster normalization rules in this project

Current classification logic:

| Match rule | Local type |
| --- | --- |
| URL/name contains `youtube` or `caze` | `YOUTUBE` |
| URL/name contains `globoplay`, `getv`, `ge-tv`, `nsports`, `fifa+` | `STREAM` |
| URL/name contains `sportv` | `TV PAGA` |
| URL/name contains `globo` or `sbt` | `TV ABERTA` |
| anything else | `STREAM` |

## Player picture URLs

All player and coach photos are served from the FIFA Digital Hub:

```text
https://digitalhub.fifa.com/transform/{uuid}/{LASTNAME}-{Firstname}_{fifaPlayerId}
```

- `{uuid}` is a unique asset UUID per player photo — it cannot be guessed; it must be read from the API.
- `{LASTNAME}` and `{Firstname}` use ASCII with no diacritics (e.g. `MBAPPE-Kylian`, `KANTE-Ngolo`).
- The numeric suffix is the FIFA player id (`IdPlayer`).
- The same player may have different UUIDs across tournaments (new photo sessions), so always prefer the 2026 squad endpoint URL over historical WC data.
- URLs return HTTP 200 and serve JPEG/PNG images directly — no auth required.

### When player pictures are available

| Source | Available when |
| --- | --- |
| `/teams/{id}/squad` | As soon as the team is registered for the competition — weeks before matches |
| `/live/football/{matchId}` `Players[]` | Only after the official lineup is released (~1h pre-kickoff) |
| `/live/football/{matchId}` `Coaches[]` | Always available once the match exists |
| Historical WC live endpoints | Always (but may show older photos from that tournament) |

### Bulk photo pre-population strategy

To populate `src/matches.json` with player pictures before any match is played:

```bash
# Fetch the squad for each team (replace {teamId} with the FIFA IdTeam)
curl 'https://api.fifa.com/api/v3/teams/{teamId}/squad?language=pt&idCompetition=17&idSeason=285023'
```

The `IdTeam` for each team can be found from the `calendar/matches` response (`Home.IdTeam` / `Away.IdTeam`).

---

## Notes and caveats

- Watch-guide results are **country-specific**. Brazil (`BR`) and another country can return different channels.
- Some matches return fewer channels than others.
- FIFA may expose only digital partners for some fixtures.
- Team names are localized; matching should prefer ids or abbreviations when possible.
- The app caches `/api/broadcast-guide` results in memory for **5 minutes**.
- `Players[]` in the live match endpoint is **empty pre-lineup**. Use the squad endpoint for photos before the match.
- The player endpoint `GET /players/{id}` exists but returns `null` for most players in practice — not reliable.
- The `squadplayers`, `teamplayers`, and `team/squad` (without competition filter) endpoints return empty results for the 2026 WC — always include `idCompetition` and `idSeason`.

## Useful curl examples

```bash
# All 2026 WC matches
curl 'https://api.fifa.com/api/v3/calendar/matches?language=pt&idCompetition=17&idSeason=285023&count=400'
```

```bash
# Watch guide for Brazil (all matches)
curl 'https://api.fifa.com/api/v3/watch/season/285023/BR?language=pt'
```

```bash
# Watch guide for a single match
curl 'https://api.fifa.com/api/v3/watch/match/285023/400021456/BR?language=pt'
```

```bash
# Full registered squad with photos (France example — works pre-tournament)
curl 'https://api.fifa.com/api/v3/teams/43946/squad?language=pt&idCompetition=17&idSeason=285023'
```

```bash
# Live match data (lineup appears ~1h pre-kickoff)
curl 'https://api.fifa.com/api/v3/live/football/400021490?language=pt'
```

```bash
# Historical match — 2022 WC France vs Australia (players always populated)
curl 'https://api.fifa.com/api/v3/live/football/400235470?language=pt'
```

```bash
# Local broadcast guide
curl 'http://localhost:3000/api/broadcast-guide'
```

## File references

- `server.ts` — FIFA integration and all `/api/*` endpoints
- `fifa-sync-core.ts` — pure FIFA API logic: match-finding, lineup building, picture enrichment
- `src/types.ts` — `Broadcaster`, `BroadcastGuideEntry`, `Player`, `LineupEntry` types
- `src/matches.json` — local fallback match data; `pictureUrl` on players is pre-populated from the squad endpoint
- `src/utils/playerMetadata.ts` — social media supplements merged with FIFA player data

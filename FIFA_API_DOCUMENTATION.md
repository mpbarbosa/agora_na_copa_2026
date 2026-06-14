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
| `competitionId` | `17` | FIFA World Cup 2026 |
| `seasonId` | `285023` | 2026 tournament season |
| `stageId` | `289273` | Group stage in current examples |
| `country` | `BR` | Country-specific watch guide for Brazil |
| `language` | `pt` | Portuguese responses |

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

Returns live match state and event data.

```text
GET https://api.fifa.com/api/v3/live/football/400021456?language=pt
```

**Use case:** live scoreboard or match state.

---

### 8. Match timeline

Returns the event timeline for a match.

```text
GET https://api.fifa.com/api/v3/timelines/400021456?language=pt
```

**Use case:** minute-by-minute events.

---

### 9. Match-centre support sections

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

## Notes and caveats

- Watch-guide results are **country-specific**. Brazil (`BR`) and another country can return different channels.
- Some matches return fewer channels than others.
- FIFA may expose only digital partners for some fixtures.
- Team names are localized; matching should prefer ids or abbreviations when possible.
- The app caches `/api/broadcast-guide` results in memory for **5 minutes**.

## Useful curl examples

```bash
curl 'https://api.fifa.com/api/v3/calendar/matches?language=pt&idCompetition=17&idSeason=285023&count=400'
```

```bash
curl 'https://api.fifa.com/api/v3/watch/season/285023/BR?language=pt'
```

```bash
curl 'https://api.fifa.com/api/v3/watch/match/285023/400021456/BR?language=pt'
```

```bash
curl 'http://localhost:3000/api/broadcast-guide'
```

## File references

- `server.ts` — FIFA integration and `/api/broadcast-guide`
- `src/App.tsx` — guide loading and rendering
- `src/types.ts` — `Broadcaster` and `BroadcastGuideEntry` types
- `src/matches.json` — local fallback match data

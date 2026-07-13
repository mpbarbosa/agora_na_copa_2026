export enum Position {
  GK = "GK",
  DF = "DF",
  MF = "MF",
  FW = "FW"
}

export interface PlayerSocials {
  instagram?: string;
  /**
   * Approximate Instagram follower count (rounded), shown next to the Instagram icon in the
   * player card (e.g. 1_000_000 → "1 mi seguidores"). Hand-curated and verified from a real
   * source — there is no live Instagram API — so it is intentionally a rounded estimate, not a
   * live figure. Only meaningful alongside `instagram`.
   */
  instagramFollowers?: number;
  x?: string;
  tiktok?: string;
  youtube?: string;
  facebook?: string;
  site?: string;
  /** Full Wikipedia article URL for the player. */
  wikipedia?: string;
}

/** A curated Amazon Associates product shown in the "Equipe para assistir" strip. */
export interface AffiliateProduct {
  /** Stable id; also used as the GA4 click-tracking label (Step 4). */
  id: string;
  /** Product/category name, pt-BR. */
  title: string;
  /** Short pt-BR blurb in broadcast voice. */
  blurb: string;
  /** lucide-react icon key (resolved via the ICONS map in AffiliateProducts). Used as the fallback when no imageUrl is set or the image fails to load. */
  icon: string;
  /**
   * Optional self-hosted, licensed GENERIC category photo (e.g. /affiliate/smart-tv.jpg).
   * NOT an Amazon product image — Amazon's images are licensed only via the
   * (sales-gated) product-advertising API and may not be stored. When unset or
   * the image fails to load, the lucide `icon` renders instead.
   */
  imageUrl?: string;
  /** Alt text for imageUrl (pt-BR); falls back to `title` when absent. */
  imageAlt?: string;
  /** Amazon Brasil URL WITHOUT the affiliate tag (the tag is appended at render). */
  searchUrl: string;
}

export interface Player {
  id: string;
  name: string;
  number: number;
  position: Position;
  x: number; // 0 to 100 on visual pitch
  y: number; // 0 to 100 on visual pitch
  club?: string;
  pictureUrl?: string;
  socials?: PlayerSocials;
  /** Single Instagram highlight permalink. Fallback when instagramPostUrls is absent/empty. */
  instagramPostUrl?: string;
  /** Multiple Instagram highlight permalinks. Takes precedence over instagramPostUrl. */
  instagramPostUrls?: string[];
  /** Editorial World Cup performance note ("Leitura") shown on the player card. */
  worldCupNote?: string;
  fifaId?: string;
  fullName?: string;
  dateOfBirth?: string; // ISO 8601, e.g. "2000-07-21"
  height?: number; // cm
  captain?: boolean;
}

export interface SquadPlayer {
  fifaId: string;
  teamCode: string;
  name: string;
  fullName?: string;
  number: number;
  position: Position;
  club?: string;
  pictureUrl?: string;
  socials?: PlayerSocials;
  /** Single Instagram highlight permalink. Fallback when instagramPostUrls is absent/empty. */
  instagramPostUrl?: string;
  /** Multiple Instagram highlight permalinks. Takes precedence over instagramPostUrl. */
  instagramPostUrls?: string[];
  /** Editorial World Cup performance note ("Leitura") shown on the player card. */
  worldCupNote?: string;
  /** ISO-8601 timestamp the worldCupNote was last authored/refreshed (the match it covers). Null/absent when none. */
  worldCupNoteUpdatedAt?: string | null;
  dateOfBirth?: string; // ISO 8601
  height?: number; // cm
}

export interface Broadcaster {
  id: string;
  type: "TV ABERTA" | "TV PAGA" | "STREAM" | "STREAM PAGO" | "YOUTUBE";
  name: string;
  logoUrl?: string;
  iconColor: string;
  link: string;
}

export interface BroadcastGuideEntry {
  broadcasters: Broadcaster[];
  source: "fifa" | "fallback";
  note: string;
  fifaMatchId?: string;
  updatedAt: string;
}

/** The match referee, as published by FIFA in the match `Officials` list. */
export interface MatchReferee {
  /** Referee full name (e.g. "Drew Fischer"). */
  name: string;
  /** FIFA 3-letter country code of the referee's nationality (e.g. "CAN"). */
  country?: string;
  /** FIFA official id, stable across matches for the same referee. */
  fifaOfficialId?: string;
}

export interface MatchStateEntry {
  status: MatchStatus;
  score?: {
    teamA: number;
    teamB: number;
  };
  /**
   * Penalty-shootout score, present only when a knockout tie was decided on
   * penalties (FIFA `HomeTeamPenaltyScore`/`AwayTeamPenaltyScore`). When set,
   * `score` holds the level result after extra time and the team with the
   * higher `penaltyScore` advanced.
   */
  penaltyScore?: {
    teamA: number;
    teamB: number;
  };
  matchTime?: string;
  /**
   * FIFA's authoritative kickoff instant (ISO 8601, typically UTC) surfaced only
   * when it differs from the local seed's scheduled kickoff — e.g. a rescheduled
   * match (FIFA status 13, "Reagendado"). Absent when FIFA's kickoff matches the
   * seed. The client reformats it into the displayed time/date (Brasília,
   * locale-aware), preferring it over the now-stale seed kickoff.
   */
  kickoffOverride?: string;
  /** Official FIFA status/period label in pt-BR (e.g. "2º tempo", "Intervalo", "Encerrado"). */
  officialStatus?: string;
  /** Main referee, when FIFA has assigned and published one for the match. */
  referee?: MatchReferee;
  incidents?: CommentaryEvent[];
  source: "fifa" | "fallback";
  note: string;
  fifaMatchId?: string;
  updatedAt: string;
}

export interface LineupEntry {
  players: Player[];
  source: "fifa" | "fallback";
  note: string;
  fifaMatchId?: string;
  updatedAt: string;
}

export interface MatchOverlayEntry {
  broadcastGuide: BroadcastGuideEntry;
  matchState: MatchStateEntry;
}

// SUSPENDED = match interrupted and not proceeding normally (FIFA suspended,
// abandoned, postponed, or cancelled). Distinct from LIVE so the UI doesn't
// show a stopped game as still in progress.
export type MatchStatus = "PRE_GAME" | "LIVE" | "SUSPENDED" | "FINISHED";

export interface Match {
  id: string;
  teamA: {
    name: string;
    code: string;
    flagSvg: string;
    primaryColor: string;
    secondaryColor: string;
    group: string;
    lineup: Player[];
  };
  teamB: {
    name: string;
    code: string;
    flagSvg: string;
    primaryColor: string;
    secondaryColor: string;
    group: string;
    lineup: Player[];
  };
  stadiumName: string;
  city: string;
  stageName: string;
  kickoffTime: string; // e.g., "16:00"
  kickoffDate: string; // e.g., "15 Junho 2026 (segunda-feira)"
  kickoffTimestamp: string; // ISO 8601 with offset, e.g., "2026-06-15T16:00:00-03:00"
  officialMatchUrl?: string;
  status: MatchStatus;
  score?: {
    teamA: number;
    teamB: number;
  };
  /**
   * Penalty-shootout score, present only when a knockout tie was decided on
   * penalties. `score` then holds the level result and the team with the
   * higher `penaltyScore` advanced.
   */
  penaltyScore?: {
    teamA: number;
    teamB: number;
  };
  matchTime?: string; // live match clock label from FIFA, e.g. "44'"
  countdownTargetSeconds: number; // calculated relative to simulated start or exact countdown
  broadcasters: Broadcaster[];
}

// Minimal reference to a national team, used to open the standalone
// Team Lineup page from any flag click across the app.
export interface TeamRef {
  name: string;
  code: string;
  flagSvg: string;
  primaryColor: string;
  secondaryColor: string;
  group?: string;
}

export interface CommentaryEvent {
  id: string;
  time: string; // e.g. "12'"
  type: "GOAL" | "YELLOW_CARD" | "RED_CARD" | "SUBSTITUTION" | "WHISTLE" | "COMMENT";
  text: string;
  team?: "A" | "B";
  playerMentions?: Array<{
    id?: string;
    name: string;
    number?: number;
    position?: Position;
    pictureUrl?: string;
  }>;
}

export interface PlayerIncidentEntry {
  matchId: string;
  matchLabel: string;
  kickoffTimestamp: string;
  minute: string;
  type: CommentaryEvent["type"];
  role?: "off" | "on"; // only for SUBSTITUTION: player going off vs. coming on
}

export interface PlayerIncidentsPayload {
  player: {
    name: string;
    teamCode: string;
    teamName: string;
    teamFlagSvg: string;
    shirtNumber?: number;
    position?: Position;
    pictureUrl?: string;
  };
  incidents: PlayerIncidentEntry[];
  summary: {
    goals: number;
    yellowCards: number;
    redCards: number;
    substitutionsOff: number;
    substitutionsOn: number;
  };
  source: "fifa" | "fallback" | "mixed";
  note: string;
  updatedAt: string;
}

// --- Tournament-wide data (groups, stadiums, bracket, news) ---
// Added in Phase 0b. These types are additive and not yet wired into
// App.tsx; see src/data/tournament.ts for the seed dataset.

export interface Team {
  id: string;
  name: string;
  code: string;
  flagSvg: string;
  primaryColor: string;
  secondaryColor: string;
  group: string; // e.g. "A".."L"
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

// A group-table row. `dataSource` discloses whether the stats reflect a real
// `FINISHED` match result from matches.json ("result") or are still at their
// pre-tournament seed values ("seed") because the team hasn't played yet.
export interface StandingsRow extends Team {
  dataSource: "result" | "seed";
  // FIFA Art. 13.2f fair-play points: 0 or negative (−1 yellow, −3 second yellow,
  // −4 direct red, −5 yellow + direct red), summed over the team's counted group
  // matches. Less negative = better discipline. A group-stage tiebreaker after GD/GF.
  fairPlayPoints: number;
}

export interface Stadium {
  id: string;
  name: string;
  city: string;
  country: "USA" | "MEX" | "CAN";
  capacity: number;
  yearBuilt: number;
  coordinates: { lat: number; lng: number }; // Real map coordinates for venue exploration
  facts: string[];
  image: string;
}

export interface BracketNode {
  id: string; // e.g. "R32-1", "QF-1"
  stage: "R32" | "R16" | "QF" | "SF" | "F";
  nextMatchId?: string; // id of the BracketNode this winner advances to
  teamA?: { name: string; code: string; flagSvg: string };
  teamB?: { name: string; code: string; flagSvg: string };
  winner?: "A" | "B";
  scoreA?: number;
  scoreB?: number;
  placeholderA?: string;
  placeholderB?: string;
}

/** One side of a knockout fixture once the team is known (else the slot is a label). */
export interface KnockoutTeamRef {
  code: string;
  name: string;
}

/**
 * One official FIFA knockout fixture, as generated into `src/data/knockoutBracket.json`
 * by `scripts/build-knockout-bracket.py` from the FIFA calendar API. `slotA`/`slotB`
 * are official placeholder labels — group positions for R32 (`"2A"`, `"1L"`,
 * `"3EHIJK"`) and winner/loser refs for later rounds (`"W74"`, `"RU101"`). `teamA`/
 * `teamB` are filled once a team is confirmed (e.g. hosts), otherwise `null`. The
 * `stage` set spans R32 → R16 → QF → SF → TP (3rd-place play-off) → F.
 */
export interface KnockoutMatch {
  matchNumber: number; // 73 (first R32) … 104 (final)
  stage: "R32" | "R16" | "QF" | "SF" | "TP" | "F";
  dateUtc: string; // ISO 8601, e.g. "2026-06-28T19:00:00Z"
  stadium: string;
  city: string;
  slotA: string;
  slotB: string;
  teamA: KnockoutTeamRef | null;
  teamB: KnockoutTeamRef | null;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: "Geral" | "Sedes" | "Equipes" | "Ingressos";
  date: string;
  imageUrl?: string;
}

export interface TriviaQuestion {
  id: string;
  category: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

/**
 * Response of `POST /api/predict` — the Fan Zone match predictor. `text` is pt-BR
 * markdown (`## Section` blocks). `simulated` is true whenever the forecast came from
 * the deterministic heuristic rather than a real AI model (always true in this build,
 * which ships no AI dependency).
 */
export interface PredictionResponse {
  text: string;
  simulated: boolean;
}

/**
 * A single match's outcome distribution from the Dixon–Coles-corrected bivariate
 * Poisson model (built in `qualification-sim-core.ts`). `homeWin`/`draw`/`awayWin`
 * sum to ~1; `mostLikelyScore` is the grid's modal scoreline (teamA = home goals).
 * Consumed by `predict-core.ts` to narrate the Fan Zone / bracket "palpite simulado".
 */
export interface MatchOutcome {
  homeWin: number;
  draw: number;
  awayWin: number;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  mostLikelyScore: { teamA: number; teamB: number };
}

export interface TournamentPlayerLeader {
  id: string;
  name: string;
  teamCode: string;
  teamName: string;
  teamFlagSvg: string;
  teamPrimaryColor?: string;
  teamSecondaryColor?: string;
  shirtNumber?: number;
  position?: Position;
  club?: string;
  socials?: PlayerSocials;
  pictureUrl?: string;
  instagramPostUrl?: string;
  instagramPostUrls?: string[];
  goals: number;
  yellowCards: number;
  redCards: number;
}

export interface TournamentTeamLeader {
  id: string;
  teamCode: string;
  teamName: string;
  teamFlagSvg: string;
  matchesPlayed: number;
  wins: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
}

export interface TournamentLeadersResponse {
  updatedAt: string;
  source: "fifa" | "fallback" | "mixed";
  note: string;
  playerLeaders: {
    topScorers: TournamentPlayerLeader[];
    yellowCards: TournamentPlayerLeader[];
    redCards: TournamentPlayerLeader[];
  };
  teamLeaders: {
    bestAttack: TournamentTeamLeader[];
    bestDefense: TournamentTeamLeader[];
    cleanSheets: TournamentTeamLeader[];
  };
}

export interface TeamViewStandingsEntry {
  rank: number;
  groupSize: number;
  row: StandingsRow;
}

export interface TeamViewMatchSummary {
  matchId: string;
  team: TeamRef;
  opponent: TeamRef;
  stageName: string;
  stadiumName: string;
  city: string;
  kickoffTime: string;
  kickoffDate: string;
  kickoffTimestamp: string;
  officialMatchUrl?: string;
  status: MatchStatus;
  matchTime?: string;
  score?: {
    team: number;
    opponent: number;
  };
  /**
   * Penalty-shootout score (team/opponent oriented), present only when a
   * knockout tie was decided on penalties. `score` then holds the level result
   * and the side with the higher `penaltyScore` advanced.
   */
  penaltyScore?: {
    team: number;
    opponent: number;
  };
  broadcasters: Broadcaster[];
  source: "fifa" | "fallback";
  note: string;
  fifaMatchId?: string;
  updatedAt: string;
}

export interface PlayerStatsResponse {
  goals: number;
  yellowCards: number;
  redCards: number;
  source: "fifa" | "fallback" | "mixed";
  note: string;
  updatedAt: string;
}

export interface CountryInfoResponse {
  code: string;
  /** Short one-line description in pt-BR */
  description: string;
  /** Intro paragraph extracted from the Wikipedia article */
  extract: string;
  /** Wikipedia thumbnail URL (resized PNG, usually the flag) */
  thumbnailUrl: string | null;
  /** Direct Wikimedia Commons SVG URL for the flag (derived from thumbnailUrl) */
  flagSvgUrl: string | null;
  /** Full Wikipedia article URL in Portuguese */
  wikipediaUrl: string;
  /** Population (latest Wikidata figure) */
  population: number | null;
  /** Area in km² (Wikidata) */
  areaSqKm: number | null;
  /** Capital city name in Portuguese (Wikidata P36) */
  capital: string | null;
  /** Official language(s) in Portuguese (Wikidata P37) */
  language: string | null;
  /** Form of government in Portuguese (Wikidata P122) */
  government: string | null;
  /** Currency name in Portuguese (Wikidata P38) */
  currency: string | null;
  source: "wikipedia" | "fallback";
  note: string;
  updatedAt: string;
}

export interface TeamViewResponse {
  updatedAt: string;
  refreshAfterMs: number;
  source: "fifa" | "fallback" | "mixed";
  note: string;
  team: TeamRef;
  standings: TeamViewStandingsEntry | null;
  currentMatch: TeamViewMatchSummary | null;
  nextMatch: TeamViewMatchSummary | null;
  lastMatch: TeamViewMatchSummary | null;
  /** Every World Cup 2026 fixture for this team, chronological (finished, live and scheduled). */
  matchHistory: TeamViewMatchSummary[];
  /** True when every group-stage match in the tournament is finished — the bracket (incl. best thirds) is then fully drawn, so a team with no knockout fixture is eliminated. */
  groupStageComplete: boolean;
  /** Editorial team-level analysis ("Análise da seleção"), `## Section` format. Null when none authored. */
  teamAnalysis: string | null;
  /** ISO-8601 timestamp the analysis was last authored/refreshed. Null when none. */
  teamAnalysisUpdatedAt: string | null;
  /** True when the analysis is current with the team's last finished match, false when behind it. Null when no analysis is authored. */
  teamAnalysisUpToDate: boolean | null;
  lineup: LineupEntry | null;
  leaders: {
    topScorers: TournamentPlayerLeader[];
    yellowCards: TournamentPlayerLeader[];
    redCards: TournamentPlayerLeader[];
    teamSummary: TournamentTeamLeader | null;
  };
  broadcastGuide: BroadcastGuideEntry | null;
}

export interface GoogleTrendNewsItem {
  title: string;
  url: string;
  source: string | null;
}

export interface GoogleTrendTopic {
  title: string;
  traffic: string | null;
  pictureUrl: string | null;
  news: GoogleTrendNewsItem | null;
  /** Google Trends category codes for this topic (e.g. 17 = Esportes). Empty when uncategorized. */
  categories: number[];
}

export interface GoogleTrendsResponse {
  source: "google-trends" | "fallback";
  note: string;
  updatedAt: string;
  topics: GoogleTrendTopic[];
}

/**
 * A curated real Reddit post surfaced in the "Repercussão no Reddit" feed on the
 * Redes Sociais tab (hand-maintained in src/data/redditPosts.json). We only store
 * the canonical permalink plus the display metadata we can attribute — never
 * invented engagement numbers. Rendered as an outbound link card (no embed).
 */
export interface RedditPost {
  /** Reddit base-36 post id (the code in /comments/<id>/), used as the React key. */
  id: string;
  /** Canonical post permalink (tracking params stripped). */
  url: string;
  /** Subreddit in "r/Name" form. */
  subreddit: string;
  /** Post title, pt-BR. Live from the Reddit API; the curated seed carries a fallback. */
  title: string;
  /** Optional team code (e.g. "BRA") when the post is about a specific selection. */
  teamCode?: string;
  /** Author handle without the "u/" prefix. Present only on live (API) posts. */
  author?: string;
  /** Net upvotes. Present only on live (API) posts. */
  score?: number;
  /** Comment count. Present only on live (API) posts. */
  numComments?: number;
}

/**
 * `/api/reddit` payload — the "Repercussão no Reddit" feed. Follows the FIFA
 * resilience shape: `source: "reddit"` when the live OAuth fetch enriched the
 * curated posts, `"fallback"` when Reddit was unreachable or credentials are
 * unset (posts then carry only the curated seed metadata).
 */
export interface RedditResponse {
  source: "reddit" | "fallback";
  note: string;
  updatedAt: string;
  posts: RedditPost[];
}

/** Current weather reading at a match venue (from Open-Meteo). */
export interface WeatherSnapshot {
  /** Air temperature, °C (rounded). */
  temperatureC: number;
  /** "Feels like" apparent temperature, °C (rounded). */
  apparentC: number;
  /** WMO weather interpretation code (Open-Meteo `weather_code`). */
  weatherCode: number;
  /** pt-BR description of the conditions, e.g. "Parcialmente nublado". */
  description: string;
  /** Emoji glyph for the conditions (day/night aware). */
  emoji: string;
  /** Wind speed, km/h (rounded). */
  windKmh: number;
  /** Relative humidity, % (rounded). */
  humidity: number;
  /** Whether it is daytime at the venue. */
  isDay: boolean;
}

export interface WeatherResponse {
  source: "open-meteo" | "fallback";
  note: string;
  updatedAt: string;
  weather: WeatherSnapshot | null;
}

/**
 * One posted message in a live match chat ("resenha"). Anonymous: the nickname is
 * self-declared and not authenticated. Held only in memory while the match is live.
 */
export interface ChatMessage {
  /** Monotonic per-match id, used as the client's incremental-poll cursor. */
  id: number;
  /** Self-declared display name (validated/clamped server-side). */
  nickname: string;
  /** Message body (validated/clamped server-side). */
  text: string;
  /** Epoch-ms the server accepted the message. */
  at: number;
}

/**
 * Response for the live match chat endpoints. Not FIFA-sourced, so — like
 * `/api/presence` and `/api/health` — it carries `open`/`updatedAt` but not the
 * `source`/`note` resilience shape. `open` is true only while the match is LIVE.
 */
export interface ChatResponse {
  /** Whether the chat is currently accepting messages (match is LIVE). */
  open: boolean;
  /** Messages after the requested cursor, oldest first. */
  messages: ChatMessage[];
  updatedAt: string;
}

/** A "<count> <label>" row from a traffic snapshot (top paths, countries, status codes…). */
export interface TrafficCountRow {
  label: string;
  count: number;
}

/** One point on the cross-snapshot time series (cumulative requests / unique IPs). */
export interface TrafficTimelinePoint {
  /** Epoch-ms the snapshot was generated. */
  t: number;
  /** Cumulative request count in the log window at that snapshot. */
  requests: number;
  /** Cumulative unique-IP count at that snapshot. */
  uniqueIps: number;
  /** Requests/min between this snapshot and the previous one (null on the first). */
  ratePerMin: number | null;
  /**
   * Cumulative request count per country label ("Brazil", "United States", …) at this
   * snapshot — the "Top countries · by request volume" list (top ~20 per snapshot, so a
   * small-volume country may be absent from some snapshots). Lets the client derive a
   * per-country requests/min series by delta-ing consecutive snapshots.
   */
  countries: Record<string, number>;
}

/**
 * The latest traffic snapshot, projected for public display. Deliberately omits
 * the per-source visitor-IP breakdown (`suspectSources`) present in the raw
 * report — only aggregate counts are exposed.
 */
export interface TrafficSnapshotLatest {
  /** Snapshot filename (e.g. "summary-20260703-230702.txt"). */
  file: string;
  /** ISO timestamp the snapshot was generated on the prod host. */
  generated: string | null;
  /** Total requests in the log window (cumulative). */
  requests: number | null;
  /** Unique IPs in the log window. */
  uniqueIps: number | null;
  /** Raw nginx log-line count the snapshot summarised. */
  logLines: number | null;
  /** Human date range of the log window. */
  dateRange: string | null;
  /** GeoIP db label backing the country/city tallies, when present. */
  geoSource: string | null;
  /** Bot/crawler hit count. */
  bots: number | null;
  /** Synthetic (e2e-fixture) hit count. */
  suspect: number | null;
  /** App's own server-side client (agora-na-copa-2026/x.y) hits filtered out before aggregation. */
  selfClientExcluded: number | null;
  /** Top requested paths (e2e-synthetic + uptime-monitor paths filtered out for display). */
  topPaths: TrafficCountRow[];
  /** HTTP status codes with their hit counts. */
  statusCodes: TrafficCountRow[];
  /** Referrers, "-" and non-URL noise filtered out. */
  referrers: TrafficCountRow[];
  /** Top countries by unique visitor. */
  countriesByVisitor: TrafficCountRow[];
  /** Top countries by request volume. */
  countriesByVolume: TrafficCountRow[];
  /** Top cities by unique visitor (empty on a country-only report). */
  citiesByVisitor: TrafficCountRow[];
  /** Top cities by request volume (empty on a country-only report). */
  citiesByVolume: TrafficCountRow[];
  /** Requests bucketed by hour of day (UTC), keyed "00".."23". */
  byHour: Record<string, number>;
  /** Requests bucketed by calendar day (label "DD/Mon/YYYY"). */
  byDay: TrafficCountRow[];
  /**
   * Distinct visitor IPs per calendar day (label "DD/Mon/YYYY") over the log
   * window — the "unique visitors per day" series. Empty for snapshots taken
   * before the report emitted the "Unique IPs by day" section, so the client
   * hides the chart rather than showing nothing.
   */
  uniqueIpsByDay: TrafficCountRow[];
}

/**
 * `/api/traffic-dashboard` payload — the "Tráfego" tab of the Dashboard page,
 * parsed from the committed `traffic-reports/summary-*.txt` snapshots. Not
 * FIFA-sourced, but follows the resilience shape: `source: "traffic-log"` when
 * at least one snapshot parsed, `"fallback"` when the report dir is absent or
 * unreadable (then `latest` is null and `timeline` is empty).
 */
export interface TrafficDashboardResponse {
  source: "traffic-log" | "fallback";
  note: string;
  updatedAt: string;
  /** How many snapshots were parsed. */
  snapshotCount: number;
  /** Average requests/min across the whole snapshot window (null with <2 snapshots). */
  windowRatePerMin: number | null;
  /** Cross-snapshot time series, oldest first. */
  timeline: TrafficTimelinePoint[];
  /** The most recent snapshot, or null in the fallback case. */
  latest: TrafficSnapshotLatest | null;
}

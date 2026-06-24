export enum Position {
  GK = "GK",
  DF = "DF",
  MF = "MF",
  FW = "FW"
}

export interface PlayerSocials {
  instagram?: string;
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
  /** lucide-react icon key (resolved via the ICONS map in AffiliateProducts). */
  icon: string;
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
  instagramPostUrl?: string;
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
  instagramPostUrl?: string;
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
  matchTime?: string;
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
  kickoffDate: string; // e.g., "15 Junho, 2026"
  kickoffTimestamp: string; // ISO 8601 with offset, e.g., "2026-06-15T16:00:00-03:00"
  officialMatchUrl?: string;
  status: MatchStatus;
  score?: {
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

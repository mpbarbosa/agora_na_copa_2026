export enum Position {
  GK = "GK",
  DF = "DF",
  MF = "MF",
  FW = "FW"
}

export interface Player {
  id: string;
  name: string;
  number: number;
  position: Position;
  x: number; // 0 to 100 on visual pitch
  y: number; // 0 to 100 on visual pitch
  club?: string;
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

export interface MatchStateEntry {
  status: MatchStatus;
  score?: {
    teamA: number;
    teamB: number;
  };
  matchTime?: string;
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

export type MatchStatus = "PRE_GAME" | "LIVE" | "FINISHED";

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

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
  countdownTargetSeconds: number; // calculated relative to simulated start or exact countdown
  broadcasters: Broadcaster[];
}

export interface PredictionResult {
  prediction: string;
  suggestedFormationA: string;
  suggestedFormationB: string;
  keyPlayers: string[];
  tacticalNotes: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  username?: string;
  timestamp: string;
  avatarColor?: string;
}

export interface CommentaryEvent {
  id: string;
  time: string; // e.g. "12'"
  type: "GOAL" | "YELLOW_CARD" | "RED_CARD" | "SUBSTITUTION" | "WHISTLE" | "COMMENT";
  text: string;
  team?: "A" | "B";
}

import express from "express";
import os from "node:os";
import { createServer as createHttpServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import { readFileSync } from "node:fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import {
  buildMatchStateEntry,
  buildTeamLineupEntry,
  findCalendarMatch,
  normalizeBroadcasters,
  normalizeText,
} from "./fifa-sync-core";
import type {
  FifaCalendarMatch,
  FifaLiveMatch,
  FifaWatchSource,
} from "./fifa-sync-core";
import { GOOGLE_TRENDS_BATCH_URL, buildGoogleTrendsRequestBody, parseGoogleTrendsBatch } from "./trends-core";
import { buildOpenMeteoUrl, parseOpenMeteoCurrent } from "./weather-core";
import { type PresenceStore, recordHeartbeat, countOnline } from "./presence-core";
import {
  type ChatStore,
  type ChatRateMap,
  validateNickname,
  validateText,
  passesRateLimit,
  appendMessage,
  getMessages,
  pruneIdleMatches,
} from "./chat-core";
import { APP_MATCHES } from "./src/appMatches";
import { resolvePlayerEntry } from "./src/data/playerRegistry";
import { triviaQuestions } from "./src/data/questions";
import WIKIPEDIA_COUNTRIES from "./src/data/wikipediaCountries";
import TEAM_ANALYSIS from "./src/data/teamAnalysis.json";
import { isAnalysisUpToDate } from "./src/utils/analysisFreshness";

const TEAM_ANALYSIS_BY_CODE = TEAM_ANALYSIS as Record<
  string,
  { text: string; updatedAt: string | null }
>;
import { computeStandings, groupStandings } from "./src/standings";
import { buildPrediction, type PredictionTeam } from "./predict-core";
import {
  estimateQualificationOdds,
  predictMatchOutcome,
  type QualificationOdds,
} from "./qualification-sim-core";
import {
  Position,
  type BroadcastGuideEntry,
  type CommentaryEvent,
  type LineupEntry,
  type Match,
  type MatchOverlayEntry,
  type MatchStateEntry,
  type PlayerIncidentEntry,
  type PlayerIncidentsPayload,
  type PlayerSocials,
  type TournamentLeadersResponse,
  type TournamentPlayerLeader,
  type TournamentTeamLeader,
  type TeamRef,
  type TeamViewMatchSummary,
  type TeamViewResponse,
  type TriviaQuestion,
  type StandingsRow,
  type CountryInfoResponse,
  type PlayerStatsResponse,
  type GoogleTrendsResponse,
  type WeatherResponse,
  type ChatResponse,
} from "./src/types";

dotenv.config();

// Read version from package.json at startup. process.env.npm_package_version is
// only set when running via npm; the production systemd service runs node directly.
const APP_VERSION: string = (() => {
  try {
    return JSON.parse(readFileSync("package.json", "utf8")).version as string;
  } catch {
    return process.env.npm_package_version ?? "unknown";
  }
})();

const app = express();
const DEFAULT_PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";
const STRICT_PORT = process.env.STRICT_PORT === "true";
const FIFA_API_BASE_URL = "https://api.fifa.com/api/v3";
const FIFA_COMPETITION_ID = "17";
const FIFA_SEASON_ID = "285023";
const DEFAULT_BROADCAST_COUNTRY = "BR";
const DEFAULT_BROADCAST_LANGUAGE = "pt";
const BROADCAST_GUIDE_CACHE_TTL_MS = 5 * 60 * 1000;
const TEAM_LINEUPS_CACHE_TTL_MS = 5 * 60 * 1000;
const LIVE_TEAM_LINEUPS_CACHE_TTL_MS = 10 * 1000;
const LIVE_MATCH_STATE_CACHE_TTL_MS = 10 * 1000;
const UPCOMING_SOON_MATCH_STATE_CACHE_TTL_MS = 30 * 1000;
const STABLE_MATCH_STATE_CACHE_TTL_MS = 5 * 60 * 1000;
const UPCOMING_SOON_WINDOW_MS = 6 * 60 * 60 * 1000;
const BACKGROUND_WARM_FAILURE_RETRY_MS = 30 * 1000;
const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 3;
const CIRCUIT_BREAKER_OPEN_MS = 60 * 1000;
const TOURNAMENT_LEADER_LIMIT = 5;
const WIKIPEDIA_API_BASE = "https://pt.wikipedia.org/api/rest_v1";
const WIKIDATA_API_BASE = "https://www.wikidata.org/w/api.php";
const COUNTRY_INFO_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // Wikipedia data changes rarely
const WIKIPEDIA_USER_AGENT = "agora-na-copa-2026 (https://github.com/mpbarbosa/agora_na_copa_2026)";
const GOOGLE_TRENDS_CACHE_TTL_MS = 20 * 60 * 1000; // Trends RSS refreshes a few times per hour
const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000; // Open-Meteo current weather updates ~every 15 min
const WEATHER_FETCH_TIMEOUT_MS = 6000;
const APP_MATCHES_BY_ID = new Map(APP_MATCHES.map((match) => [match.id, match]));
const GOAL_INCIDENT_SUFFIX = " marcou.";
const YELLOW_CARD_INCIDENT_SUFFIX = " recebeu amarelo.";
const RED_CARD_INCIDENT_SUFFIX = " foi expulso.";

// Trust the nginx reverse proxy so req.ip reflects the real client IP via X-Forwarded-For.
app.set("trust proxy", 1);

app.use(express.json());

// Test/dev fallback: serve the FIFA-derived endpoints from a remote API (e.g. the
// production server, http://copa2026.mpbarbosa.com) instead of computing them from a
// direct FIFA fetch. Lets the e2e suite use real, complete data without the local
// server hitting the volatile live FIFA API. Registered before the real handlers so
// it intercepts; on any remote error it falls through to local handling. Unset in
// production → no proxying at all.
const FIFA_FALLBACK_API_BASE = process.env.FIFA_FALLBACK_API_BASE?.replace(/\/+$/, "");
if (FIFA_FALLBACK_API_BASE) {
  const isFifaDerivedPath = (p: string): boolean =>
    p === "/api/match-overlays" ||
    p === "/api/match-states" ||
    p === "/api/broadcast-guide" ||
    p === "/api/team-lineups" ||
    p === "/api/tournament-leaders" ||
    p.startsWith("/api/team-view/") ||
    p.startsWith("/api/player-stats/") ||
    p.startsWith("/api/player-incidents/");

  app.get(/^\/api\//, async (req, res, next) => {
    if (!isFifaDerivedPath(req.path)) {
      next();
      return;
    }
    try {
      const upstream = await fetch(`${FIFA_FALLBACK_API_BASE}${req.originalUrl}`, {
        headers: { Accept: "application/json", "User-Agent": "agora-na-copa-2026/1.0" },
      });
      const body = await upstream.text();
      res
        .status(upstream.status)
        .set("Content-Type", upstream.headers.get("content-type") ?? "application/json")
        .set("Cache-Control", "no-store")
        .send(body);
    } catch {
      next(); // remote fallback unreachable → use local (static) handling
    }
  });
}

// Per-request access log → journald (journalctl -u agora-na-copa-2026)
// Skips /assets/ to avoid noise from static file serving in production.
app.use((req, res, next) => {
  if (req.path.startsWith("/assets/") || req.path === "/favicon.ico") return next();
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    const ip = req.ip ?? req.socket.remoteAddress ?? "-";
    const ref = req.get("referer") ?? "-";
    console.log(`[access] ${req.method} ${req.path} ${res.statusCode} ${ms}ms ip=${ip} ref=${ref}`);
  });
  next();
});

interface FifaCalendarResponse {
  Results?: FifaCalendarMatch[];
}

interface FifaWatchMatch {
  IdMatch: string;
  Date: string;
  Sources?: FifaWatchSource[];
}

interface FifaWatchSeasonResponse {
  Matches?: FifaWatchMatch[];
}

interface BroadcastGuideResponse {
  country: string;
  language: string;
  guides: Record<string, BroadcastGuideEntry>;
}

interface MatchStatesResponse {
  language: string;
  refreshAfterMs: number;
  states: Record<string, MatchStateEntry>;
}

interface MatchOverlaysResponse {
  country: string;
  language: string;
  refreshAfterMs: number;
  overlays: Record<string, MatchOverlayEntry>;
}

interface TeamLineupsResponse {
  language: string;
  refreshAfterMs: number;
  lineups: Record<string, { teamA: LineupEntry; teamB: LineupEntry }>;
}

const TRIVIA_QUESTIONS = triviaQuestions as TriviaQuestion[];

interface FifaSyncServiceDiagnostics {
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastServedStaleAt: string | null;
  staleServeCount: number;
  consecutiveFailureCount: number;
  circuitOpenUntil: string | null;
}

interface BackgroundWarmDiagnostics {
  lastStartedAt: string | null;
  lastSucceededAt: string | null;
  lastError: string | null;
  nextWarmAt: string | null;
  lastRefreshAfterMs: number | null;
  cycleCount: number;
  inFlight: boolean;
}

let broadcastGuideCache:
  | {
      key: string;
      createdAt: number;
      expiresAt: number;
      payload: BroadcastGuideResponse;
    }
  | null = null;

let matchStatesCache:
  | {
      key: string;
      createdAt: number;
      expiresAt: number;
      payload: MatchStatesResponse;
    }
  | null = null;

let teamLineupsCache:
  | {
      key: string;
      createdAt: number;
      expiresAt: number;
      payload: TeamLineupsResponse;
    }
  | null = null;

// Per-country cache — keyed by FIFA team code
const countryInfoCache = new Map<
  string,
  { expiresAt: number; payload: CountryInfoResponse }
>();

const fifaSyncDiagnostics: {
  broadcastGuide: FifaSyncServiceDiagnostics;
  matchStates: FifaSyncServiceDiagnostics & {
    activeLiveMatchIds: string[];
    lastRefreshAfterMs: number | null;
  };
  teamLineups: FifaSyncServiceDiagnostics;
  backgroundWarm: BackgroundWarmDiagnostics;
} = {
  broadcastGuide: {
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastError: null,
    lastServedStaleAt: null,
    staleServeCount: 0,
    consecutiveFailureCount: 0,
    circuitOpenUntil: null,
  },
  matchStates: {
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastError: null,
    lastServedStaleAt: null,
    staleServeCount: 0,
    consecutiveFailureCount: 0,
    circuitOpenUntil: null,
    activeLiveMatchIds: [],
    lastRefreshAfterMs: null,
  },
  teamLineups: {
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastError: null,
    lastServedStaleAt: null,
    staleServeCount: 0,
    consecutiveFailureCount: 0,
    circuitOpenUntil: null,
  },
  backgroundWarm: {
    lastStartedAt: null,
    lastSucceededAt: null,
    lastError: null,
    nextWarmAt: null,
    lastRefreshAfterMs: null,
    cycleCount: 0,
    inFlight: false,
  },
};

let backgroundWarmTimeout: NodeJS.Timeout | null = null;

interface PlayerLeaderMetadata {
  name: string;
  shirtNumber?: number;
  position?: Position;
  club?: string;
  socials?: PlayerSocials;
  pictureUrl?: string;
  instagramPostUrl?: string;
  instagramPostUrls?: string[];
}

const buildPlayerLeaderKey = (teamCode: string, playerName: string) =>
  `${teamCode}:${normalizeText(playerName)}`;

const isNumericFifaId = (id: string | undefined): id is string =>
  id !== undefined && /^\d+$/.test(id);

const parseIncidentPlayerName = (state: MatchStateEntry["incidents"][number]) => {
  if (state.type === "GOAL" && state.text.endsWith(GOAL_INCIDENT_SUFFIX)) {
    return state.text.slice(0, -GOAL_INCIDENT_SUFFIX.length).trim();
  }

  if (state.type === "YELLOW_CARD" && state.text.endsWith(YELLOW_CARD_INCIDENT_SUFFIX)) {
    return state.text.slice(0, -YELLOW_CARD_INCIDENT_SUFFIX.length).trim();
  }

  if (state.type === "RED_CARD" && state.text.endsWith(RED_CARD_INCIDENT_SUFFIX)) {
    return state.text.slice(0, -RED_CARD_INCIDENT_SUFFIX.length).trim();
  }

  return null;
};

const upsertPlayerLeaderMetadata = (
  metadataByPlayerKey: Map<string, PlayerLeaderMetadata>,
  teamCode: string,
  player: {
    name: string;
    number?: number;
    position?: Position;
    club?: string;
    socials?: PlayerSocials;
    pictureUrl?: string;
    instagramPostUrl?: string;
    instagramPostUrls?: string[];
  },
) => {
  const playerKey = buildPlayerLeaderKey(teamCode, player.name);
  const current = metadataByPlayerKey.get(playerKey);

  if (!current) {
    metadataByPlayerKey.set(playerKey, {
      name: player.name,
      shirtNumber: player.number,
      position: player.position,
      club: player.club,
      socials: player.socials,
      pictureUrl: player.pictureUrl,
      instagramPostUrl: player.instagramPostUrl,
      instagramPostUrls: player.instagramPostUrls,
    });
    return;
  }

  metadataByPlayerKey.set(playerKey, {
    name: current.name || player.name,
    shirtNumber: current.shirtNumber ?? player.number,
    position: current.position ?? player.position,
    club: current.club ?? player.club,
    socials: current.socials ?? player.socials,
    pictureUrl: current.pictureUrl ?? player.pictureUrl,
    instagramPostUrl: current.instagramPostUrl ?? player.instagramPostUrl,
    instagramPostUrls: current.instagramPostUrls ?? player.instagramPostUrls,
  });
};

const buildPlayerLeaderMetadataMap = (lineupsPayload: TeamLineupsResponse) => {
  const metadataByPlayerKey = new Map<string, PlayerLeaderMetadata>();
  const playerKeyByFifaId = new Map<string, string>(); // `${teamCode}:${fifaId}` → playerKey

  APP_MATCHES.forEach((match) => {
    const lineupEntry = lineupsPayload.lineups[match.id];
    const teamALineup = lineupEntry?.teamA.players ?? match.teamA.lineup;
    const teamBLineup = lineupEntry?.teamB.players ?? match.teamB.lineup;

    const enrich = (teamCode: string, player: (typeof teamALineup)[number]) => {
      const entry = resolvePlayerEntry(teamCode, player.name, player.number, player.fifaId);
      upsertPlayerLeaderMetadata(metadataByPlayerKey, teamCode, {
        ...player,
        club: player.club ?? entry?.club,
        socials: player.socials ?? entry?.socials,
        pictureUrl: player.pictureUrl ?? entry?.pictureUrl,
        instagramPostUrl: player.instagramPostUrl ?? entry?.instagramPostUrl,
        instagramPostUrls: player.instagramPostUrls ?? entry?.instagramPostUrls,
      });
      const fifaId = player.fifaId ?? (isNumericFifaId(player.id) ? player.id : undefined);
      if (fifaId) {
        playerKeyByFifaId.set(`${teamCode}:${fifaId}`, buildPlayerLeaderKey(teamCode, player.name));
      }
    };

    teamALineup.forEach((player) => enrich(match.teamA.code, player));
    teamBLineup.forEach((player) => enrich(match.teamB.code, player));
  });

  return { metadataByPlayerKey, playerKeyByFifaId };
};

const resolveTournamentLeadersSource = (
  states: Record<string, MatchStateEntry>,
): TournamentLeadersResponse["source"] => {
  const sources = new Set(Object.values(states).map((state) => state.source));
  if (sources.size === 1) {
    return sources.has("fifa") ? "fifa" : "fallback";
  }

  return "mixed";
};

const getTournamentLeadersNote = (source: TournamentLeadersResponse["source"]) => {
  if (source === "fifa") {
    return "Ranking calculado a partir de placares e lances oficiais da FIFA.";
  }

  if (source === "fallback") {
    return "Ranking calculado a partir do fallback local do aplicativo.";
  }

  return "Ranking calculado com mix de dados oficiais da FIFA e fallback local.";
};

interface AggregatedTournamentLeaders {
  updatedAt: string;
  source: TournamentLeadersResponse["source"];
  note: string;
  playerLeaders: TournamentPlayerLeader[];
  teamLeaders: TournamentTeamLeader[];
}

const TEAM_VIEW_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const toTeamRef = (team: {
  name: string;
  code: string;
  flagSvg: string;
  primaryColor: string;
  secondaryColor: string;
  group?: string;
}): TeamRef => ({
  name: team.name,
  code: team.code,
  flagSvg: team.flagSvg,
  primaryColor: team.primaryColor,
  secondaryColor: team.secondaryColor,
  group: team.group,
});

const sortPlayerLeaders = (
  leaders: TournamentPlayerLeader[],
  metric: keyof Pick<TournamentPlayerLeader, "goals" | "yellowCards" | "redCards">,
) =>
  [...leaders]
    .filter((leader) => leader[metric] > 0)
    .sort((a, b) => {
      const metricDiff = b[metric] - a[metric];
      if (metricDiff !== 0) return metricDiff;

      const nameDiff = a.name.localeCompare(b.name, "pt-BR");
      if (nameDiff !== 0) return nameDiff;

      return a.teamName.localeCompare(b.teamName, "pt-BR");
    });

const aggregateTournamentLeaders = async (
  language: string,
): Promise<AggregatedTournamentLeaders> => {
  const [matchStatesPayload, lineupsPayload] = await Promise.all([
    getMatchStatesPayload(language),
    getTeamLineupsPayload(language),
  ]);

  const { metadataByPlayerKey, playerKeyByFifaId } = buildPlayerLeaderMetadataMap(lineupsPayload);
  const playerLeaders = new Map<string, TournamentPlayerLeader>();
  const teamLeaders = new Map<string, TournamentTeamLeader>();

  APP_MATCHES.forEach((match) => {
    const state = matchStatesPayload.states[match.id];
    if (!state) return;

    const teams = [
      { team: match.teamA, score: state.score?.teamA ?? null, conceded: state.score?.teamB ?? null },
      { team: match.teamB, score: state.score?.teamB ?? null, conceded: state.score?.teamA ?? null },
    ];

    teams.forEach(({ team, score, conceded }) => {
      const current = teamLeaders.get(team.code) ?? {
        id: team.code.toLowerCase(),
        teamCode: team.code,
        teamName: team.name,
        teamFlagSvg: team.flagSvg,
        matchesPlayed: 0,
        wins: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        cleanSheets: 0,
      };

      if (state.status !== "PRE_GAME" && score !== null && conceded !== null) {
        current.matchesPlayed += 1;
        current.goalsFor += score;
        current.goalsAgainst += conceded;
        current.wins += score > conceded ? 1 : 0;
        current.cleanSheets += conceded === 0 ? 1 : 0;
      }

      teamLeaders.set(team.code, current);
    });

    (state.incidents || []).forEach((incident) => {
      if (
        !incident.team ||
        (incident.type !== "GOAL" &&
          incident.type !== "YELLOW_CARD" &&
          incident.type !== "RED_CARD")
      ) {
        return;
      }

      const playerName = parseIncidentPlayerName(incident);
      if (!playerName) return;

      const team = incident.team === "A" ? match.teamA : match.teamB;

      // Primary: FIFA player ID from the incident — exact, immune to name drift.
      const incidentFifaId = incident.playerMentions?.[0]?.id;
      let metadata = incidentFifaId
        ? metadataByPlayerKey.get(playerKeyByFifaId.get(`${team.code}:${incidentFifaId}`) ?? "")
        : undefined;

      // Fallback 1: normalized name match.
      if (!metadata) {
        metadata = metadataByPlayerKey.get(buildPlayerLeaderKey(team.code, playerName));
      }

      // Fallback 2: shirt number — handles FIFA name forms that differ from registry.
      if (!metadata) {
        const shirtNumber = incident.playerMentions?.[0]?.number;
        if (shirtNumber !== undefined) {
          const lineupPlayer = team.lineup.find((p) => p.number === shirtNumber);
          if (lineupPlayer) {
            metadata = metadataByPlayerKey.get(buildPlayerLeaderKey(team.code, lineupPlayer.name));
          }
        }
      }

      // Key by canonical registry name so /api/player-stats can find the entry.
      const canonicalKey = metadata
        ? buildPlayerLeaderKey(team.code, metadata.name)
        : buildPlayerLeaderKey(team.code, playerName);

      const current = playerLeaders.get(canonicalKey) ?? {
        id: `${team.code.toLowerCase()}-${normalizeText(metadata?.name ?? playerName).toLowerCase()}`,
        name: metadata?.name ?? playerName,
        teamCode: team.code,
        teamName: team.name,
        teamFlagSvg: team.flagSvg,
        teamPrimaryColor: team.primaryColor,
        teamSecondaryColor: team.secondaryColor,
        shirtNumber: metadata?.shirtNumber,
        position: metadata?.position,
        club: metadata?.club,
        socials: metadata?.socials,
        pictureUrl: metadata?.pictureUrl,
        instagramPostUrl: metadata?.instagramPostUrl,
        instagramPostUrls: metadata?.instagramPostUrls,
        goals: 0,
        yellowCards: 0,
        redCards: 0,
      };

      if (incident.type === "GOAL") current.goals += 1;
      if (incident.type === "YELLOW_CARD") current.yellowCards += 1;
      if (incident.type === "RED_CARD") current.redCards += 1;

      playerLeaders.set(canonicalKey, current);
    });
  });

  const teamLeaderRows = Array.from(teamLeaders.values()).filter(
    (leader) => leader.matchesPlayed > 0,
  );
  const updatedAt =
    Object.values(matchStatesPayload.states)
      .map((state) => state.updatedAt)
      .filter(Boolean)
      .sort()
      .at(-1) || new Date().toISOString();
  const source = resolveTournamentLeadersSource(matchStatesPayload.states);

  return {
    updatedAt,
    source,
    note: getTournamentLeadersNote(source),
    playerLeaders: Array.from(playerLeaders.values()),
    teamLeaders: teamLeaderRows,
  };
};

const sortBestAttackLeaders = (leaders: TournamentTeamLeader[]) =>
  [...leaders]
    .sort((a, b) => {
      const goalsDiff = b.goalsFor - a.goalsFor;
      if (goalsDiff !== 0) return goalsDiff;

      const matchesDiff = a.matchesPlayed - b.matchesPlayed;
      if (matchesDiff !== 0) return matchesDiff;

      return a.teamName.localeCompare(b.teamName, "pt-BR");
    })
    .slice(0, TOURNAMENT_LEADER_LIMIT);

const sortBestDefenseLeaders = (leaders: TournamentTeamLeader[]) =>
  [...leaders]
    .sort((a, b) => {
      const concededDiff = a.goalsAgainst - b.goalsAgainst;
      if (concededDiff !== 0) return concededDiff;

      const cleanSheetDiff = b.cleanSheets - a.cleanSheets;
      if (cleanSheetDiff !== 0) return cleanSheetDiff;

      return a.teamName.localeCompare(b.teamName, "pt-BR");
    })
    .slice(0, TOURNAMENT_LEADER_LIMIT);

const sortCleanSheetLeaders = (leaders: TournamentTeamLeader[]) =>
  [...leaders]
    .sort((a, b) => {
      const cleanSheetDiff = b.cleanSheets - a.cleanSheets;
      if (cleanSheetDiff !== 0) return cleanSheetDiff;

      const concededDiff = a.goalsAgainst - b.goalsAgainst;
      if (concededDiff !== 0) return concededDiff;

      return a.teamName.localeCompare(b.teamName, "pt-BR");
    })
    .slice(0, TOURNAMENT_LEADER_LIMIT);

const getTournamentLeadersPayload = async (
  language: string,
): Promise<TournamentLeadersResponse> => {
  const aggregated = await aggregateTournamentLeaders(language);

  return {
    updatedAt: aggregated.updatedAt,
    source: aggregated.source,
    note: aggregated.note,
    playerLeaders: {
      topScorers: sortPlayerLeaders(aggregated.playerLeaders, "goals").slice(
       0,
       TOURNAMENT_LEADER_LIMIT,
      ),
      yellowCards: sortPlayerLeaders(aggregated.playerLeaders, "yellowCards").slice(
       0,
       TOURNAMENT_LEADER_LIMIT,
      ),
      redCards: sortPlayerLeaders(aggregated.playerLeaders, "redCards").slice(
       0,
       TOURNAMENT_LEADER_LIMIT,
      ),
    },
    teamLeaders: {
      bestAttack: sortBestAttackLeaders(aggregated.teamLeaders),
      bestDefense: sortBestDefenseLeaders(aggregated.teamLeaders),
      cleanSheets: sortCleanSheetLeaders(aggregated.teamLeaders),
    },
  };
};

const resolveMentionToCanonicalKey = (
  mention: NonNullable<CommentaryEvent["playerMentions"]>[number],
  teamCode: string,
  teamLineup: Match["teamA"]["lineup"],
  metadataByPlayerKey: Map<string, PlayerLeaderMetadata>,
  playerKeyByFifaId: Map<string, string>,
): string => {
  if (isNumericFifaId(mention.id)) {
    const key = playerKeyByFifaId.get(`${teamCode}:${mention.id}`);
    if (key) return key;
  }

  if (mention.name) {
    const key = buildPlayerLeaderKey(teamCode, mention.name);
    if (metadataByPlayerKey.has(key)) return key;
  }

  if (mention.number !== undefined) {
    const lineupPlayer = teamLineup.find((p) => p.number === mention.number);
    if (lineupPlayer) {
      const key = buildPlayerLeaderKey(teamCode, lineupPlayer.name);
      if (metadataByPlayerKey.has(key)) return key;
    }
  }

  return mention.name ? buildPlayerLeaderKey(teamCode, mention.name) : "";
};

const aggregatePlayerIncidents = async (
  teamCode: string,
  rawPlayerName: string,
  language: string,
): Promise<PlayerIncidentsPayload | null> => {
  const [matchStatesPayload, lineupsPayload] = await Promise.all([
    getMatchStatesPayload(language),
    getTeamLineupsPayload(language),
  ]);

  const { metadataByPlayerKey, playerKeyByFifaId } = buildPlayerLeaderMetadataMap(lineupsPayload);

  const targetKey = buildPlayerLeaderKey(teamCode, rawPlayerName);
  const metadata = metadataByPlayerKey.get(targetKey);
  if (!metadata) return null;

  const teamMatch = APP_MATCHES.find(
    (m) => m.teamA.code === teamCode || m.teamB.code === teamCode,
  );
  const teamName = teamMatch
    ? teamMatch.teamA.code === teamCode
      ? teamMatch.teamA.name
      : teamMatch.teamB.name
    : teamCode;
  const teamFlagSvg = teamMatch
    ? teamMatch.teamA.code === teamCode
      ? teamMatch.teamA.flagSvg
      : teamMatch.teamB.flagSvg
    : "";

  const incidents: PlayerIncidentEntry[] = [];
  let latestUpdatedAt = "";

  APP_MATCHES.forEach((match) => {
    const state = matchStatesPayload.states[match.id];
    if (!state?.incidents?.length) return;

    const isTeamA = match.teamA.code === teamCode;
    const isTeamB = match.teamB.code === teamCode;
    if (!isTeamA && !isTeamB) return;

    const teamSide = isTeamA ? "A" : "B";
    const teamInMatch = isTeamA ? match.teamA : match.teamB;

    state.incidents.forEach((incident) => {
      if (incident.team !== teamSide) return;

      (incident.playerMentions ?? []).forEach((mention, mentionIndex) => {
        const resolvedKey = resolveMentionToCanonicalKey(
          mention,
          teamCode,
          teamInMatch.lineup,
          metadataByPlayerKey,
          playerKeyByFifaId,
        );
        if (resolvedKey !== targetKey) return;

        incidents.push({
          matchId: match.id,
          matchLabel: `${match.teamA.name} vs ${match.teamB.name}`,
          kickoffTimestamp: match.kickoffTimestamp,
          minute: incident.time,
          type: incident.type,
          ...(incident.type === "SUBSTITUTION" && {
            role: mentionIndex === 0 ? ("off" as const) : ("on" as const),
          }),
        });
      });

      if (state.updatedAt > latestUpdatedAt) latestUpdatedAt = state.updatedAt;
    });
  });

  const resolvedSource = resolveTournamentLeadersSource(matchStatesPayload.states);

  incidents.sort((a, b) => {
    const tsDiff = a.kickoffTimestamp.localeCompare(b.kickoffTimestamp);
    if (tsDiff !== 0) return tsDiff;
    return (parseInt(a.minute) || 0) - (parseInt(b.minute) || 0);
  });

  return {
    player: {
      name: metadata.name,
      teamCode,
      teamName,
      teamFlagSvg,
      shirtNumber: metadata.shirtNumber,
      position: metadata.position,
      pictureUrl: metadata.pictureUrl,
    },
    incidents,
    summary: {
      goals: incidents.filter((i) => i.type === "GOAL").length,
      yellowCards: incidents.filter((i) => i.type === "YELLOW_CARD").length,
      redCards: incidents.filter((i) => i.type === "RED_CARD").length,
      substitutionsOff: incidents.filter((i) => i.type === "SUBSTITUTION" && i.role === "off").length,
      substitutionsOn: incidents.filter((i) => i.type === "SUBSTITUTION" && i.role === "on").length,
    },
    source: resolvedSource,
    note:
      resolvedSource === "fallback"
        ? "Incidentes a partir de dados locais (FIFA indisponível)."
        : "Incidentes sincronizados com a FIFA.",
    updatedAt: latestUpdatedAt || new Date().toISOString(),
  };
};

const getMatchStateCacheTtlMs = (states: Record<string, MatchStateEntry>) => {
  const stateEntries = Object.entries(states);

  if (stateEntries.some(([, state]) => state.status === "LIVE")) {
    return LIVE_MATCH_STATE_CACHE_TTL_MS;
  }

  const now = Date.now();
  const hasUpcomingSoon = stateEntries.some(([matchId, state]) => {
    if (state.status !== "PRE_GAME") {
      return false;
    }

    const match = APP_MATCHES_BY_ID.get(matchId);
    if (!match) {
      return false;
    }

    const kickoffTime = new Date(match.kickoffTimestamp).getTime();
    return !Number.isNaN(kickoffTime) && kickoffTime - now <= UPCOMING_SOON_WINDOW_MS;
  });

  return hasUpcomingSoon
    ? UPCOMING_SOON_MATCH_STATE_CACHE_TTL_MS
    : STABLE_MATCH_STATE_CACHE_TTL_MS;
};

const getTeamLineupCacheTtlMs = (
  matchedFifa: Array<{ match: Match; fifaMatch: FifaCalendarMatch | undefined }>,
  liveByMatchId: Map<string, FifaLiveMatch>,
) =>
  matchedFifa.some(({ match, fifaMatch }) => {
    const liveMatch = fifaMatch ? liveByMatchId.get(fifaMatch.IdMatch) : undefined;
    return buildMatchStateEntry(match, fifaMatch, liveMatch).status === "LIVE";
  })
    ? LIVE_TEAM_LINEUPS_CACHE_TTL_MS
    : TEAM_LINEUPS_CACHE_TTL_MS;

const serializeErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const getCircuitOpenUntilMs = (diagnostics: FifaSyncServiceDiagnostics) => {
  if (!diagnostics.circuitOpenUntil) {
    return null;
  }

  const timestamp = new Date(diagnostics.circuitOpenUntil).getTime();
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return timestamp;
};

const isCircuitOpen = (diagnostics: FifaSyncServiceDiagnostics) => {
  const openUntilMs = getCircuitOpenUntilMs(diagnostics);
  return openUntilMs !== null && openUntilMs > Date.now();
};

const markStaleServe = (diagnostics: FifaSyncServiceDiagnostics) => {
  diagnostics.lastServedStaleAt = new Date().toISOString();
  diagnostics.staleServeCount += 1;
};

const resetFailureState = (diagnostics: FifaSyncServiceDiagnostics) => {
  diagnostics.lastError = null;
  diagnostics.consecutiveFailureCount = 0;
  diagnostics.circuitOpenUntil = null;
};

const recordFailureState = (
  diagnostics: FifaSyncServiceDiagnostics,
  error: unknown,
) => {
  diagnostics.lastError = serializeErrorMessage(error);
  diagnostics.consecutiveFailureCount += 1;

  if (diagnostics.consecutiveFailureCount >= CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
    diagnostics.circuitOpenUntil = new Date(
      Date.now() + CIRCUIT_BREAKER_OPEN_MS,
    ).toISOString();
  }
};

// When DISABLE_FIFA_SYNC=true, every FIFA fetch short-circuits to the normal
// failure/fallback path so the app serves only its static seed data. Used by the
// e2e suite (see playwright.config webServer) to make tests deterministic during
// live matches; unset in production, so real FIFA sync runs as usual.
const FIFA_SYNC_DISABLED = process.env.DISABLE_FIFA_SYNC === "true";

const fetchJson = async <T,>(url: string): Promise<T> => {
  if (FIFA_SYNC_DISABLED) {
    throw new Error("FIFA sync disabled (DISABLE_FIFA_SYNC) — serving fallback data");
  }
  const response = await fetch(url, {
    headers: {
      "User-Agent": "agora-na-copa-2026/1.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`FIFA API request failed (${response.status}) for ${url}`);
  }

  return (await response.json()) as T;
};

const fetchCalendarMatches = async (language: string) => {
  const calendarData = await fetchJson<FifaCalendarResponse>(
    `${FIFA_API_BASE_URL}/calendar/matches?language=${encodeURIComponent(language)}&idCompetition=${FIFA_COMPETITION_ID}&idSeason=${FIFA_SEASON_ID}&count=400`
  );

  return calendarData.Results || [];
};

const fetchLiveMatch = async (matchId: string, language: string) =>
  fetchJson<FifaLiveMatch>(
    `${FIFA_API_BASE_URL}/live/football/${encodeURIComponent(matchId)}?language=${encodeURIComponent(language)}`
  );

const getBroadcastGuidePayload = async (
  country: string,
  language: string,
): Promise<BroadcastGuideResponse> => {
  const cacheKey = `${country}:${language}`;
  fifaSyncDiagnostics.broadcastGuide.lastAttemptAt = new Date().toISOString();

  if (
    broadcastGuideCache &&
    broadcastGuideCache.key === cacheKey &&
    broadcastGuideCache.expiresAt > Date.now()
  ) {
    return broadcastGuideCache.payload;
  }

  if (isCircuitOpen(fifaSyncDiagnostics.broadcastGuide)) {
    if (broadcastGuideCache?.key === cacheKey) {
      markStaleServe(fifaSyncDiagnostics.broadcastGuide);
      console.warn(`Broadcast guide circuit open for ${cacheKey}; serving stale cache.`);
      return broadcastGuideCache.payload;
    }

    throw new Error("FIFA broadcast guide fetch temporarily paused after repeated failures.");
  }

  try {
    const [calendarMatches, watchData] = await Promise.all([
      fetchCalendarMatches(language),
      fetchJson<FifaWatchSeasonResponse>(
        `${FIFA_API_BASE_URL}/watch/season/${FIFA_SEASON_ID}/${encodeURIComponent(country)}?language=${encodeURIComponent(language)}`
      ),
    ]);

    const watchByMatchId = new Map(
      (watchData.Matches || []).map((match) => [match.IdMatch, match]),
    );

    const guides = Object.fromEntries(
      APP_MATCHES.map((match) => {
        const fifaMatch = findCalendarMatch(match, calendarMatches, language);
        const fifaWatchMatch = fifaMatch
          ? watchByMatchId.get(fifaMatch.IdMatch)
          : undefined;
        const fifaBroadcasters = normalizeBroadcasters(fifaWatchMatch?.Sources);
        const hasOfficialGuide = fifaBroadcasters.length > 0;

        return [
          match.id,
          {
            broadcasters: hasOfficialGuide ? fifaBroadcasters : match.broadcasters,
            source: hasOfficialGuide ? "fifa" : "fallback",
            note: hasOfficialGuide
              ? "Dados oficiais do Onde Assistir da FIFA para o Brasil."
              : "Dados oficiais da FIFA indisponíveis para esta partida no momento; exibindo a lista local.",
            fifaMatchId: fifaMatch?.IdMatch,
            updatedAt: new Date().toISOString(),
          } satisfies BroadcastGuideEntry,
        ];
      }),
    );

    const payload: BroadcastGuideResponse = {
      country,
      language,
      guides,
    };

    broadcastGuideCache = {
      key: cacheKey,
      createdAt: Date.now(),
      expiresAt: Date.now() + BROADCAST_GUIDE_CACHE_TTL_MS,
      payload,
    };
    fifaSyncDiagnostics.broadcastGuide.lastSuccessAt = new Date().toISOString();
    resetFailureState(fifaSyncDiagnostics.broadcastGuide);

    return payload;
  } catch (error) {
    recordFailureState(fifaSyncDiagnostics.broadcastGuide, error);

    if (broadcastGuideCache?.key === cacheKey) {
      markStaleServe(fifaSyncDiagnostics.broadcastGuide);
      console.warn(
        `Serving stale broadcast guide cache for ${cacheKey} after FIFA error:`,
        error,
      );
      return broadcastGuideCache.payload;
    }

    throw error;
  }
};

const getMatchStatesPayload = async (
  language: string,
): Promise<MatchStatesResponse> => {
  const cacheKey = language;
  fifaSyncDiagnostics.matchStates.lastAttemptAt = new Date().toISOString();

  if (
    matchStatesCache &&
    matchStatesCache.key === cacheKey &&
    matchStatesCache.expiresAt > Date.now()
  ) {
    return matchStatesCache.payload;
  }

  if (isCircuitOpen(fifaSyncDiagnostics.matchStates)) {
    if (matchStatesCache?.key === cacheKey) {
      markStaleServe(fifaSyncDiagnostics.matchStates);
      console.warn(`Match states circuit open for ${cacheKey}; serving stale cache.`);
      return matchStatesCache.payload;
    }

    throw new Error("FIFA match-state fetch temporarily paused after repeated failures.");
  }

  try {
    const calendarMatches = await fetchCalendarMatches(language);
    const matchedStates = APP_MATCHES.map((match) => {
      const fifaMatch = findCalendarMatch(match, calendarMatches, language);
      const calendarState = buildMatchStateEntry(match, fifaMatch);

      return {
        match,
        fifaMatch,
        calendarState,
      };
    });
    const detailedMatchIds = matchedStates
      .filter(
        ({ calendarState, fifaMatch }) =>
          calendarState.status !== "PRE_GAME" && fifaMatch?.IdMatch,
      )
      .map(({ fifaMatch }) => fifaMatch!.IdMatch);
    const liveResults = await Promise.all(
      detailedMatchIds.map(async (matchId) => {
        try {
          return await fetchLiveMatch(matchId, language);
        } catch (error) {
          console.error(`FIFA live endpoint error for match ${matchId}:`, error);
          return null;
        }
      }),
    );
    const liveMatchesById = new Map(
      liveResults
        .filter(
          (liveMatch): liveMatch is FifaLiveMatch =>
            Boolean(liveMatch?.IdMatch),
        )
        .map((liveMatch) => [liveMatch.IdMatch, liveMatch]),
    );
    const states = Object.fromEntries(
      matchedStates.map(({ match, fifaMatch }) => {
        return [
          match.id,
          buildMatchStateEntry(
            match,
            fifaMatch,
            fifaMatch ? liveMatchesById.get(fifaMatch.IdMatch) : undefined,
          ),
        ];
      }),
    );

    const payload: MatchStatesResponse = {
      language,
      refreshAfterMs: getMatchStateCacheTtlMs(states),
      states,
    };

    matchStatesCache = {
      key: cacheKey,
      createdAt: Date.now(),
      expiresAt: Date.now() + payload.refreshAfterMs,
      payload,
    };
    fifaSyncDiagnostics.matchStates.lastSuccessAt = new Date().toISOString();
    resetFailureState(fifaSyncDiagnostics.matchStates);
    fifaSyncDiagnostics.matchStates.activeLiveMatchIds = Object.entries(states)
      .filter(([, state]) => state.status === "LIVE")
      .map(([matchId]) => matchId);
    fifaSyncDiagnostics.matchStates.lastRefreshAfterMs = payload.refreshAfterMs;
    return payload;
  } catch (error) {
    recordFailureState(fifaSyncDiagnostics.matchStates, error);

    if (matchStatesCache?.key === cacheKey) {
      markStaleServe(fifaSyncDiagnostics.matchStates);
      console.warn(
        `Serving stale match states cache for ${cacheKey} after FIFA error:`,
        error,
      );
      return matchStatesCache.payload;
    }

    throw error;
  }
};

const getTeamLineupsPayload = async (
  language: string,
): Promise<TeamLineupsResponse> => {
  const cacheKey = language;
  fifaSyncDiagnostics.teamLineups.lastAttemptAt = new Date().toISOString();

  if (
    teamLineupsCache &&
    teamLineupsCache.key === cacheKey &&
    teamLineupsCache.expiresAt > Date.now()
  ) {
    return teamLineupsCache.payload;
  }

  if (isCircuitOpen(fifaSyncDiagnostics.teamLineups)) {
    if (teamLineupsCache?.key === cacheKey) {
      markStaleServe(fifaSyncDiagnostics.teamLineups);
      console.warn(`Team lineups circuit open for ${cacheKey}; serving stale cache.`);
      return teamLineupsCache.payload;
    }

    throw new Error("FIFA team-lineup fetch temporarily paused after repeated failures.");
  }

  try {
    const calendarMatches = await fetchCalendarMatches(language);
    const matchedFifa = APP_MATCHES.map((match) => ({
      match,
      fifaMatch: findCalendarMatch(match, calendarMatches, language),
    }));

    const liveResults = await Promise.all(
      matchedFifa.map(async ({ fifaMatch }) => {
        if (!fifaMatch?.IdMatch) return null;

        try {
          return await fetchLiveMatch(fifaMatch.IdMatch, language);
        } catch (error) {
          console.error(
            `FIFA live endpoint error for lineup of match ${fifaMatch.IdMatch}:`,
            error,
          );
          return null;
        }
      }),
    );

    const liveByMatchId = new Map(
      liveResults
        .filter((liveMatch): liveMatch is FifaLiveMatch => Boolean(liveMatch?.IdMatch))
        .map((liveMatch) => [liveMatch.IdMatch, liveMatch]),
    );

    const lineups = Object.fromEntries(
      matchedFifa.map(({ match, fifaMatch }) => {
        const liveMatch = fifaMatch ? liveByMatchId.get(fifaMatch.IdMatch) : undefined;

        return [
          match.id,
          {
            teamA: buildTeamLineupEntry(
              match.teamA.code,
              match.teamA.lineup,
              fifaMatch,
              liveMatch?.HomeTeam,
            ),
            teamB: buildTeamLineupEntry(
              match.teamB.code,
              match.teamB.lineup,
              fifaMatch,
              liveMatch?.AwayTeam,
            ),
          },
        ];
      }),
    );

    const payload: TeamLineupsResponse = {
      language,
      refreshAfterMs: getTeamLineupCacheTtlMs(matchedFifa, liveByMatchId),
      lineups,
    };

    teamLineupsCache = {
      key: cacheKey,
      createdAt: Date.now(),
      expiresAt: Date.now() + payload.refreshAfterMs,
      payload,
    };
    fifaSyncDiagnostics.teamLineups.lastSuccessAt = new Date().toISOString();
    resetFailureState(fifaSyncDiagnostics.teamLineups);

    return payload;
  } catch (error) {
    recordFailureState(fifaSyncDiagnostics.teamLineups, error);

    if (teamLineupsCache?.key === cacheKey) {
      markStaleServe(fifaSyncDiagnostics.teamLineups);
      console.warn(
        `Serving stale team lineups cache for ${cacheKey} after FIFA error:`,
        error,
      );
      return teamLineupsCache.payload;
    }

    throw error;
  }
};

const getMatchOverlaysPayload = async (
  country: string,
  language: string,
): Promise<MatchOverlaysResponse> => {
  const [broadcastGuidePayload, matchStatesPayload] = await Promise.all([
    getBroadcastGuidePayload(country, language),
    getMatchStatesPayload(language),
  ]);

  const overlays = Object.fromEntries(
    APP_MATCHES.map((match) => [
      match.id,
      {
        broadcastGuide: broadcastGuidePayload.guides[match.id],
        matchState: matchStatesPayload.states[match.id],
      } satisfies MatchOverlayEntry,
    ]),
  );

  return {
    country,
    language,
    refreshAfterMs: matchStatesPayload.refreshAfterMs,
    overlays,
  };
};

const TEAM_STANDINGS_BY_CODE = (() => {
  const entries = new Map<string, TeamViewResponse["standings"]>();
  groupStandings(computeStandings(APP_MATCHES)).forEach(({ rows }) => {
    rows.forEach((row, index) => {
      entries.set(row.code, {
        rank: index + 1,
        groupSize: rows.length,
        row,
      });
    });
  });
  return entries;
})();

interface TeamMatchReference {
  match: Match;
  team: Match["teamA"];
  opponent: Match["teamA"];
  isTeamA: boolean;
}

const getMatchKickoffMs = (match: Match) => {
  const kickoffMs = new Date(match.kickoffTimestamp).getTime();
  return Number.isNaN(kickoffMs) ? 0 : kickoffMs;
};

const getTeamViewNote = (source: TeamViewResponse["source"]) => {
  if (source === "fifa") {
    return "Painel da seleção abastecido por dados oficiais da FIFA sempre que disponíveis.";
  }

  if (source === "fallback") {
    return "Painel da seleção usando dados locais do aplicativo enquanto a FIFA não publica todos os detalhes.";
  }

  return "Painel da seleção combinando dados oficiais da FIFA com fallback local do aplicativo.";
};

const buildFallbackLineupEntry = (
  players: LineupEntry["players"],
  teamCode: string,
): LineupEntry => ({
  // Enrich the local lineup from the squad registry so editorial/profile fields
  // (worldCupNote, instagramPostUrl, socials, picture, metadata) reach the player
  // card even when no live FIFA lineup is available (finished/upcoming matches).
  players: players.map((player) => {
    const entry = resolvePlayerEntry(teamCode, player.name, player.number, player.fifaId);
    if (!entry) return player;
    return {
      ...player,
      club: player.club ?? entry.club,
      pictureUrl: player.pictureUrl ?? entry.pictureUrl,
      socials: player.socials ?? entry.socials,
      instagramPostUrl: player.instagramPostUrl ?? entry.instagramPostUrl,
      instagramPostUrls: player.instagramPostUrls ?? entry.instagramPostUrls,
      worldCupNote: player.worldCupNote ?? entry.worldCupNote,
      fullName: player.fullName ?? entry.fullName,
      dateOfBirth: player.dateOfBirth ?? entry.dateOfBirth,
      height: player.height ?? entry.height,
      fifaId: player.fifaId ?? entry.fifaId,
    };
  }),
  source: "fallback",
  note: "Escalação estimada a partir da base local do aplicativo.",
  updatedAt: new Date().toISOString(),
});

const resolveTeamViewSource = (
  sources: Array<BroadcastGuideEntry["source"] | MatchStateEntry["source"] | TeamViewResponse["source"] | undefined>,
): TeamViewResponse["source"] => {
  let hasMixed = false;
  const baseSources = new Set<"fifa" | "fallback">();

  sources.forEach((source) => {
    if (!source) return;
    if (source === "mixed") {
      hasMixed = true;
      return;
    }
    baseSources.add(source);
  });

  if (hasMixed || baseSources.size > 1) {
    return "mixed";
  }

  if (baseSources.size === 1) {
    return baseSources.has("fifa") ? "fifa" : "fallback";
  }

  return "fallback";
};

const findTeamRefByCode = (teamCode: string): TeamRef | null => {
  const standingsEntry = TEAM_STANDINGS_BY_CODE.get(teamCode)?.row;
  if (standingsEntry) {
    return toTeamRef(standingsEntry);
  }

  for (const match of APP_MATCHES) {
    if (match.teamA.code === teamCode) {
      return toTeamRef(match.teamA);
    }
    if (match.teamB.code === teamCode) {
      return toTeamRef(match.teamB);
    }
  }

  return null;
};

const getTeamMatchReferences = (teamCode: string): TeamMatchReference[] =>
  APP_MATCHES.filter((match) => match.teamA.code === teamCode || match.teamB.code === teamCode).map(
    (match) => {
      const isTeamA = match.teamA.code === teamCode;
      return {
        match,
        team: isTeamA ? match.teamA : match.teamB,
        opponent: isTeamA ? match.teamB : match.teamA,
        isTeamA,
      };
    },
  );

const buildTeamViewMatchSummary = (
  reference: TeamMatchReference,
  state: MatchStateEntry | undefined,
  guide: BroadcastGuideEntry | undefined,
): TeamViewMatchSummary => ({
  matchId: reference.match.id,
  team: toTeamRef(reference.team),
  opponent: toTeamRef(reference.opponent),
  stageName: reference.match.stageName,
  stadiumName: reference.match.stadiumName,
  city: reference.match.city,
  kickoffTime: reference.match.kickoffTime,
  kickoffDate: reference.match.kickoffDate,
  kickoffTimestamp: reference.match.kickoffTimestamp,
  officialMatchUrl: reference.match.officialMatchUrl,
  status: state?.status ?? reference.match.status,
  matchTime: state?.matchTime,
  score: state?.score
    ? {
        team: reference.isTeamA ? state.score.teamA : state.score.teamB,
        opponent: reference.isTeamA ? state.score.teamB : state.score.teamA,
      }
    : undefined,
  broadcasters: guide?.broadcasters ?? reference.match.broadcasters,
  source: state?.source ?? "fallback",
  note: state?.note ?? "Dados locais do aplicativo.",
  fifaMatchId: state?.fifaMatchId ?? guide?.fifaMatchId,
  updatedAt: state?.updatedAt ?? guide?.updatedAt ?? new Date().toISOString(),
});

const buildTeamViewPayload = async (
  teamCode: string,
  country: string,
  language: string,
): Promise<TeamViewResponse | null> => {
  const normalizedTeamCode = teamCode.trim().toUpperCase();
  const team = findTeamRefByCode(normalizedTeamCode);
  if (!team) {
    return null;
  }

  const [matchStatesPayload, teamLineupsPayload, broadcastGuidePayload, aggregatedLeaders] =
    await Promise.all([
      getMatchStatesPayload(language),
      getTeamLineupsPayload(language),
      getBroadcastGuidePayload(country, language),
      aggregateTournamentLeaders(language),
    ]);

  const standings = TEAM_STANDINGS_BY_CODE.get(normalizedTeamCode) ?? null;
  const teamMatches = getTeamMatchReferences(normalizedTeamCode).sort(
    (a, b) => getMatchKickoffMs(a.match) - getMatchKickoffMs(b.match),
  );

  const currentMatchReference =
    teamMatches.find(
      (reference) => matchStatesPayload.states[reference.match.id]?.status === "LIVE",
    ) ?? null;
  const nextMatchReference =
    teamMatches.find(
      (reference) => matchStatesPayload.states[reference.match.id]?.status === "PRE_GAME",
    ) ?? null;
  const lastMatchReference =
    [...teamMatches]
      .reverse()
      .find(
        (reference) => matchStatesPayload.states[reference.match.id]?.status === "FINISHED",
      ) ?? null;

  const currentMatch = currentMatchReference
    ? buildTeamViewMatchSummary(
        currentMatchReference,
        matchStatesPayload.states[currentMatchReference.match.id],
        broadcastGuidePayload.guides[currentMatchReference.match.id],
      )
    : null;
  const nextMatch = nextMatchReference
    ? buildTeamViewMatchSummary(
        nextMatchReference,
        matchStatesPayload.states[nextMatchReference.match.id],
        broadcastGuidePayload.guides[nextMatchReference.match.id],
      )
    : null;
  const lastMatch = lastMatchReference
    ? buildTeamViewMatchSummary(
        lastMatchReference,
        matchStatesPayload.states[lastMatchReference.match.id],
        broadcastGuidePayload.guides[lastMatchReference.match.id],
      )
    : null;

  const matchHistory = teamMatches.map((reference) =>
    buildTeamViewMatchSummary(
      reference,
      matchStatesPayload.states[reference.match.id],
      broadcastGuidePayload.guides[reference.match.id],
    ),
  );

  const lineupReference =
    currentMatchReference ?? nextMatchReference ?? lastMatchReference ?? teamMatches[0] ?? null;
  const lineup = lineupReference
    ? lineupReference.isTeamA
      ? teamLineupsPayload.lineups[lineupReference.match.id]?.teamA ??
        buildFallbackLineupEntry(lineupReference.team.lineup, lineupReference.team.code)
      : teamLineupsPayload.lineups[lineupReference.match.id]?.teamB ??
        buildFallbackLineupEntry(lineupReference.team.lineup, lineupReference.team.code)
    : null;
  const featuredGuideReference = currentMatchReference ?? nextMatchReference ?? null;
  const broadcastGuide = featuredGuideReference
    ? broadcastGuidePayload.guides[featuredGuideReference.match.id] ?? null
    : null;

  const topScorers = sortPlayerLeaders(
    aggregatedLeaders.playerLeaders.filter((leader) => leader.teamCode === normalizedTeamCode),
    "goals",
  ).slice(0, 3);
  const yellowCards = sortPlayerLeaders(
    aggregatedLeaders.playerLeaders.filter((leader) => leader.teamCode === normalizedTeamCode),
    "yellowCards",
  ).slice(0, 3);
  const redCards = sortPlayerLeaders(
    aggregatedLeaders.playerLeaders.filter((leader) => leader.teamCode === normalizedTeamCode),
    "redCards",
  ).slice(0, 3);
  const teamSummary =
    aggregatedLeaders.teamLeaders.find((leader) => leader.teamCode === normalizedTeamCode) ??
    null;

  // Editorial team analysis + its freshness relative to the team's last match.
  // "Up to date" means the analysis was authored at/after the kickoff of the
  // most recent FINISHED match this team played (see isAnalysisUpToDate).
  const teamAnalysisEntry = TEAM_ANALYSIS_BY_CODE[normalizedTeamCode] ?? null;
  const teamAnalysisUpdatedAt = teamAnalysisEntry?.updatedAt ?? null;
  const teamAnalysisUpToDate = teamAnalysisEntry
    ? isAnalysisUpToDate(teamAnalysisUpdatedAt, lastMatch?.kickoffTimestamp ?? null)
    : null;

  const updatedAtCandidates = [
    lineup?.updatedAt,
    currentMatch?.updatedAt,
    nextMatch?.updatedAt,
    lastMatch?.updatedAt,
    broadcastGuide?.updatedAt,
    aggregatedLeaders.updatedAt,
  ].filter(Boolean) as string[];
  const source = resolveTeamViewSource([
    lineup?.source,
    currentMatch?.source,
    nextMatch?.source,
    lastMatch?.source,
    broadcastGuide?.source,
    aggregatedLeaders.source,
  ]);

  return {
    updatedAt: updatedAtCandidates.sort().at(-1) ?? new Date().toISOString(),
    refreshAfterMs: Math.min(
      matchStatesPayload.refreshAfterMs,
      teamLineupsPayload.refreshAfterMs,
      TEAM_VIEW_REFRESH_INTERVAL_MS,
    ),
    source,
    note: getTeamViewNote(source),
    team,
    standings,
    currentMatch,
    nextMatch,
    lastMatch,
    matchHistory,
    teamAnalysis: teamAnalysisEntry?.text ?? null,
    teamAnalysisUpdatedAt,
    teamAnalysisUpToDate,
    lineup,
    leaders: {
      topScorers,
      yellowCards,
      redCards,
      teamSummary,
    },
    broadcastGuide,
  };
};

const scheduleBackgroundWarm = (delayMs: number) => {
  if (backgroundWarmTimeout) {
    clearTimeout(backgroundWarmTimeout);
  }

  fifaSyncDiagnostics.backgroundWarm.nextWarmAt = new Date(
    Date.now() + delayMs,
  ).toISOString();

  backgroundWarmTimeout = setTimeout(() => {
    void warmDefaultFifaCaches();
  }, delayMs);
  backgroundWarmTimeout.unref?.();
};

const warmDefaultFifaCaches = async () => {
  if (fifaSyncDiagnostics.backgroundWarm.inFlight) {
    return;
  }

  fifaSyncDiagnostics.backgroundWarm.inFlight = true;
  fifaSyncDiagnostics.backgroundWarm.lastStartedAt = new Date().toISOString();

  try {
    const [payload] = await Promise.all([
      getMatchOverlaysPayload(DEFAULT_BROADCAST_COUNTRY, DEFAULT_BROADCAST_LANGUAGE),
      getTeamLineupsPayload(DEFAULT_BROADCAST_LANGUAGE),
    ]);

    fifaSyncDiagnostics.backgroundWarm.lastSucceededAt =
      new Date().toISOString();
    fifaSyncDiagnostics.backgroundWarm.lastError = null;
    fifaSyncDiagnostics.backgroundWarm.lastRefreshAfterMs =
      payload.refreshAfterMs;
    fifaSyncDiagnostics.backgroundWarm.cycleCount += 1;

    // Free chat rooms for matches that just stopped being live (the warm cycle has
    // refreshed `activeLiveMatchIds`), keeping the in-memory buffers bounded.
    pruneIdleMatches(chatStore, fifaSyncDiagnostics.matchStates.activeLiveMatchIds);

    scheduleBackgroundWarm(payload.refreshAfterMs);
  } catch (error) {
    fifaSyncDiagnostics.backgroundWarm.lastError = serializeErrorMessage(error);
    scheduleBackgroundWarm(BACKGROUND_WARM_FAILURE_RETRY_MS);
    console.error("FIFA background warm error:", error);
  } finally {
    fifaSyncDiagnostics.backgroundWarm.inFlight = false;
  }
};

const isPortAvailable = async (port: number, host: string) =>
  new Promise<boolean>((resolve, reject) => {
    const probe = createNetServer();

    probe.once("error", (error: NodeJS.ErrnoException) => {
      probe.close();
      if (error.code === "EADDRINUSE") {
        resolve(false);
        return;
      }

      reject(error);
    });

    probe.once("listening", () => {
      probe.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve(true);
      });
    });

    probe.listen(port, host);
  });

const resolveAppPort = async () => {
  let candidatePort = DEFAULT_PORT;

  while (!(await isPortAvailable(candidatePort, HOST))) {
    if (STRICT_PORT) {
      throw new Error(`Port ${candidatePort} is already in use.`);
    }

    candidatePort += 1;
  }

  return candidatePort;
};

app.get("/api/broadcast-guide", async (req, res) => {
  try {
    const country =
      typeof req.query.country === "string" && req.query.country.trim()
        ? req.query.country.trim().toUpperCase()
        : DEFAULT_BROADCAST_COUNTRY;
    const language =
      typeof req.query.language === "string" && req.query.language.trim()
        ? req.query.language.trim()
        : DEFAULT_BROADCAST_LANGUAGE;

    res.set("Cache-Control", "no-store");
    res.json(await getBroadcastGuidePayload(country, language));
  } catch (error: any) {
    console.error("FIFA API Error in /api/broadcast-guide:", error);
    res
      .status(502)
      .json({
        error: error?.message || "Erro ao carregar guia de transmissão da FIFA",
      });
  }
});

app.get("/api/match-states", async (req, res) => {
  try {
    const language =
      typeof req.query.language === "string" && req.query.language.trim()
        ? req.query.language.trim()
        : DEFAULT_BROADCAST_LANGUAGE;

    res.set("Cache-Control", "no-store");
    res.json(await getMatchStatesPayload(language));
  } catch (error: any) {
    console.error("FIFA API Error in /api/match-states:", error);
    res
      .status(502)
      .json({ error: error?.message || "Erro ao carregar placares da FIFA" });
  }
});

app.get("/api/match-overlays", async (req, res) => {
  try {
    const country =
      typeof req.query.country === "string" && req.query.country.trim()
        ? req.query.country.trim().toUpperCase()
        : DEFAULT_BROADCAST_COUNTRY;
    const language =
      typeof req.query.language === "string" && req.query.language.trim()
        ? req.query.language.trim()
        : DEFAULT_BROADCAST_LANGUAGE;

    res.set("Cache-Control", "no-store");
    res.json(await getMatchOverlaysPayload(country, language));
  } catch (error: any) {
    console.error("FIFA API Error in /api/match-overlays:", error);
    res
      .status(502)
      .json({
        error:
          error?.message || "Erro ao carregar dados unificados da FIFA",
      });
  }
});

app.get("/api/team-lineups", async (req, res) => {
  try {
    const language =
      typeof req.query.language === "string" && req.query.language.trim()
        ? req.query.language.trim()
        : DEFAULT_BROADCAST_LANGUAGE;

    res.set("Cache-Control", "no-store");
    res.json(await getTeamLineupsPayload(language));
  } catch (error: any) {
    console.error("FIFA API Error in /api/team-lineups:", error);
    res
      .status(502)
      .json({ error: error?.message || "Erro ao carregar escalações da FIFA" });
  }
});

app.get("/api/tournament-leaders", async (req, res) => {
  try {
    const language =
      typeof req.query.language === "string" && req.query.language.trim()
        ? req.query.language.trim()
        : DEFAULT_BROADCAST_LANGUAGE;

    res.set("Cache-Control", "no-store");
    res.json(await getTournamentLeadersPayload(language));
  } catch (error: any) {
    console.error("FIFA API Error in /api/tournament-leaders:", error);
    res
      .status(502)
      .json({ error: error?.message || "Erro ao carregar líderes do torneio" });
  }
});

app.get("/api/player-stats/:teamCode/:playerName", async (req, res) => {
  try {
    const teamCode = req.params.teamCode.toUpperCase();
    const playerName = req.params.playerName;
    const language =
      typeof req.query.language === "string" && req.query.language.trim()
        ? req.query.language.trim()
        : DEFAULT_BROADCAST_LANGUAGE;

    const aggregated = await aggregateTournamentLeaders(language);
    const normalizedPlayerName = normalizeText(playerName);
    const leader = aggregated.playerLeaders.find(
      (p) => p.teamCode === teamCode && normalizeText(p.name) === normalizedPlayerName,
    );

    if (!leader) {
      res.status(404).json({ error: "Jogador não encontrado nos líderes do torneio" });
      return;
    }

    const payload: PlayerStatsResponse = {
      goals: leader.goals,
      yellowCards: leader.yellowCards,
      redCards: leader.redCards,
      source: aggregated.source,
      note: aggregated.note,
      updatedAt: aggregated.updatedAt,
    };
    res.set("Cache-Control", "no-store");
    res.json(payload);
  } catch (error: any) {
    console.error("FIFA API Error in /api/player-stats:", error);
    const fallback: PlayerStatsResponse = {
      goals: 0,
      yellowCards: 0,
      redCards: 0,
      source: "fallback",
      note: "Estatísticas indisponíveis — FIFA API inacessível.",
      updatedAt: new Date().toISOString(),
    };
    res.json(fallback);
  }
});

app.get("/api/player-incidents/:teamCode/:playerName", async (req, res) => {
  try {
    const teamCode = req.params.teamCode.toUpperCase();
    const playerName = req.params.playerName;
    const language =
      typeof req.query.language === "string" && req.query.language.trim()
        ? req.query.language.trim()
        : DEFAULT_BROADCAST_LANGUAGE;

    const payload = await aggregatePlayerIncidents(teamCode, playerName, language);
    if (!payload) {
      res.status(404).json({ error: "Jogador não encontrado" });
      return;
    }

    res.set("Cache-Control", "no-store");
    res.json(payload);
  } catch (error: any) {
    console.error("FIFA API Error in /api/player-incidents:", error);
    const fallback: PlayerIncidentsPayload = {
      player: {
        name: req.params.playerName,
        teamCode: req.params.teamCode.toUpperCase(),
        teamName: req.params.teamCode.toUpperCase(),
        teamFlagSvg: req.params.teamCode.toLowerCase(),
      },
      incidents: [],
      summary: { goals: 0, yellowCards: 0, redCards: 0, substitutionsOff: 0, substitutionsOn: 0 },
      source: "fallback",
      note: "Incidentes indisponíveis — FIFA API inacessível.",
      updatedAt: new Date().toISOString(),
    };
    res.json(fallback);
  }
});

app.get("/api/team-view/:teamCode", async (req, res) => {
  try {
    const country =
      typeof req.query.country === "string" && req.query.country.trim()
        ? req.query.country.trim().toUpperCase()
        : DEFAULT_BROADCAST_COUNTRY;
    const language =
      typeof req.query.language === "string" && req.query.language.trim()
        ? req.query.language.trim()
        : DEFAULT_BROADCAST_LANGUAGE;

    const payload = await buildTeamViewPayload(req.params.teamCode, country, language);
    if (!payload) {
      res.status(404).json({ error: "Seleção não encontrada" });
      return;
    }

    res.set("Cache-Control", "no-store");
    res.json(payload);
  } catch (error: any) {
    console.error("FIFA API Error in /api/team-view/:teamCode:", error);
    res
      .status(502)
      .json({ error: error?.message || "Erro ao carregar painel completo da seleção" });
  }
});

// ---------------------------------------------------------------------------
// Wikipedia / Wikidata country info
// ---------------------------------------------------------------------------
async function fetchCountryInfo(code: string): Promise<CountryInfoResponse | null> {
  const entry = WIKIPEDIA_COUNTRIES[code.toUpperCase()];
  if (!entry) return null;

  const cached = countryInfoCache.get(code);
  if (cached && cached.expiresAt > Date.now()) return cached.payload;

  const { ptArticle, wikidataId } = entry;
  const now = new Date().toISOString();

  // Wikipedia REST summary
  const encodedTitle = encodeURIComponent(ptArticle);
  const summaryUrl = `${WIKIPEDIA_API_BASE}/page/summary/${encodedTitle}`;
  const summaryRes = await fetch(summaryUrl, {
    headers: { "User-Agent": WIKIPEDIA_USER_AGENT },
  });
  if (!summaryRes.ok) {
    return {
      code,
      description: "",
      extract: "",
      thumbnailUrl: null,
      flagSvgUrl: null,
      wikipediaUrl: `https://pt.wikipedia.org/wiki/${encodedTitle}`,
      population: null,
      areaSqKm: null,
      capital: null,
      language: null,
      government: null,
      currency: null,
      source: "fallback",
      note: "Informações indisponíveis — Wikipedia inacessível.",
      updatedAt: now,
    };
  }
  const summary = (await summaryRes.json()) as {
    description?: string;
    extract?: string;
    thumbnail?: { source?: string };
    originalimage?: { source?: string };
    content_urls?: { desktop?: { page?: string } };
  };

  // Extract direct SVG URL from the Wikimedia thumb path:
  // .../commons/thumb/a/ab/Flag_of_X.svg/...px-....png → .../commons/a/ab/Flag_of_X.svg
  const svgFromThumb = (url: string | undefined): string | null => {
    if (!url) return null;
    const m = url.match(
      /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/thumb\/([^/]+\/[^/]+\/[^/]+\.svg)\//,
    );
    return m ? `${m[1]}/${m[2]}` : null;
  };
  const flagSvgUrl =
    svgFromThumb(summary.originalimage?.source) ??
    svgFromThumb(summary.thumbnail?.source);

  // Wikidata entity — P1082 population, P2046 area, P36 capital,
  //                    P37 language, P122 government, P38 currency
  const wdUrl =
    `${WIKIDATA_API_BASE}?action=wbgetentities&ids=${wikidataId}` +
    `&languages=pt&props=claims&format=json`;
  const wdRes = await fetch(wdUrl, {
    headers: { "User-Agent": WIKIPEDIA_USER_AGENT },
  });

  let population: number | null = null;
  let areaSqKm: number | null = null;
  // QIDs to resolve in one batch label call
  let capitalQid: string | null = null;
  let languageQids: string[] = [];
  let governmentQid: string | null = null;
  let currencyQid: string | null = null;

  // Pick the active claim: preferred rank > claim with no end-time > last claim
  const activeClaim = (arr: any[]) =>
    arr.find((c: any) => c.rank === "preferred") ??
    arr.find((c: any) => !c.qualifiers?.["P582"]) ??
    arr.at(-1);

  const qidOf = (claim: any): string | null =>
    claim?.mainsnak?.datavalue?.value?.id ?? null;

  if (wdRes.ok) {
    const wd = (await wdRes.json()) as {
      entities?: Record<string, { claims?: Record<string, any[]> }>;
    };
    const claims = wd.entities?.[wikidataId]?.claims ?? {};

    // Population: preferred rank = most recent census
    const popClaims: any[] = claims["P1082"] ?? [];
    const popAmount =
      (popClaims.find((c: any) => c.rank === "preferred") ?? popClaims.at(-1))
        ?.mainsnak?.datavalue?.value?.amount;
    if (popAmount) population = Math.abs(parseInt(popAmount, 10));

    const areaAmount = claims["P2046"]?.[0]?.mainsnak?.datavalue?.value?.amount;
    if (areaAmount) areaSqKm = Math.abs(parseFloat(areaAmount));

    capitalQid = qidOf(activeClaim(claims["P36"] ?? []));

    // Languages: take preferred-rank entries; if none, take those without P582
    const langClaims: any[] = claims["P37"] ?? [];
    const preferredLangs = langClaims.filter((c: any) => c.rank === "preferred");
    const activeLangs =
      preferredLangs.length > 0
        ? preferredLangs
        : langClaims.filter((c: any) => !c.qualifiers?.["P582"]);
    languageQids = activeLangs.slice(0, 3).map(qidOf).filter(Boolean) as string[];

    governmentQid = qidOf(activeClaim(claims["P122"] ?? []));
    currencyQid   = qidOf(activeClaim(claims["P38"]  ?? []));
  }

  // Batch-resolve all entity labels in a single Wikidata call
  const allQids = [...new Set(
    [capitalQid, ...languageQids, governmentQid, currencyQid].filter(Boolean)
  )] as string[];

  let capital: string | null = null;
  let language: string | null = null;
  let government: string | null = null;
  let currency: string | null = null;

  if (allQids.length > 0) {
    const labelsUrl =
      `${WIKIDATA_API_BASE}?action=wbgetentities&ids=${allQids.join("|")}` +
      `&languages=pt%7Cen&props=labels&format=json`;
    const labelsRes = await fetch(labelsUrl, {
      headers: { "User-Agent": WIKIPEDIA_USER_AGENT },
    });
    if (labelsRes.ok) {
      const labelsData = (await labelsRes.json()) as {
        entities?: Record<string, { labels?: Record<string, { value?: string }> }>;
      };
      // Prefer pt label; fall back to en (e.g. "euro" has no pt label in Wikidata)
      const labelOf = (qid: string | null) => {
        if (!qid) return null;
        const labels = labelsData.entities?.[qid]?.labels;
        return labels?.["pt"]?.value ?? labels?.["en"]?.value ?? null;
      };

      capital    = labelOf(capitalQid);
      language   = languageQids.map(labelOf).filter(Boolean).join(" / ") || null;
      government = labelOf(governmentQid);
      currency   = labelOf(currencyQid);
    }
  }

  const payload: CountryInfoResponse = {
    code,
    description: summary.description ?? "",
    extract: summary.extract ?? "",
    thumbnailUrl: summary.thumbnail?.source ?? null,
    flagSvgUrl,
    wikipediaUrl:
      summary.content_urls?.desktop?.page ??
      `https://pt.wikipedia.org/wiki/${encodedTitle}`,
    population,
    areaSqKm: areaSqKm ? Math.round(areaSqKm) : null,
    capital,
    language,
    government,
    currency,
    source: "wikipedia",
    note: "Dados da Wikipedia e Wikidata.",
    updatedAt: now,
  };

  countryInfoCache.set(code, {
    expiresAt: Date.now() + COUNTRY_INFO_CACHE_TTL_MS,
    payload,
  });
  return payload;
}

app.get("/api/country-info/:code", async (req, res) => {
  const code = req.params.code.toUpperCase();
  try {
    const payload = await fetchCountryInfo(code);
    if (!payload) {
      res.status(404).json({ error: "País não encontrado" });
      return;
    }
    res.set("Cache-Control", "public, max-age=3600");
    res.json(payload);
  } catch (error: any) {
    console.error("Wikipedia API Error in /api/country-info:", error);
    const stale = countryInfoCache.get(code);
    if (stale) {
      res.set("Cache-Control", "public, max-age=3600");
      res.json({ ...stale.payload, source: "fallback", note: "Usando dados em cache — Wikipedia inacessível." } satisfies CountryInfoResponse);
      return;
    }
    const fallback: CountryInfoResponse = {
      code,
      description: "",
      extract: "",
      thumbnailUrl: null,
      flagSvgUrl: null,
      wikipediaUrl: "",
      population: null,
      areaSqKm: null,
      capital: null,
      language: null,
      government: null,
      currency: null,
      source: "fallback",
      note: "Informações indisponíveis — Wikipedia inacessível.",
      updatedAt: new Date().toISOString(),
    };
    res.json(fallback);
  }
});

let googleTrendsCache: { payload: GoogleTrendsResponse; expiresAt: number } | null = null;

const GOOGLE_TRENDS_FETCH_TIMEOUT_MS = 6000;

const fetchGoogleTrends = async (): Promise<GoogleTrendsResponse> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GOOGLE_TRENDS_FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(GOOGLE_TRENDS_BATCH_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: buildGoogleTrendsRequestBody("BR", 24),
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Google Trends request failed (${response.status})`);
  }

  const raw = await response.text();
  const topics = parseGoogleTrendsBatch(raw, 12);
  if (topics.length === 0) {
    throw new Error("Google Trends returned no topics");
  }

  return {
    source: "google-trends",
    note: "Buscas em alta no Brasil • Google Trends",
    updatedAt: new Date().toISOString(),
    topics,
  };
};

// Refreshes the trends cache in the background. Never throws and never blocks
// a request — the endpoint always responds instantly from cache (or a fast
// fallback), so a slow/unreachable Google never leaves a browser request
// hanging (which would surface as a console resource error in the UI).
let googleTrendsRefreshing = false;
const refreshGoogleTrendsCache = async (): Promise<void> => {
  if (googleTrendsRefreshing) return;
  googleTrendsRefreshing = true;
  try {
    const payload = await fetchGoogleTrends();
    googleTrendsCache = { payload, expiresAt: Date.now() + GOOGLE_TRENDS_CACHE_TTL_MS };
  } catch (error) {
    console.error("Google Trends background refresh failed:", error);
  } finally {
    googleTrendsRefreshing = false;
  }
};

app.get("/api/google-trends", (_req, res) => {
  if (googleTrendsCache && googleTrendsCache.expiresAt > Date.now()) {
    res.set("Cache-Control", "public, max-age=600");
    res.json(googleTrendsCache.payload);
    return;
  }

  // Cache missing or stale: kick off a background refresh and respond now.
  void refreshGoogleTrendsCache();

  if (googleTrendsCache) {
    res.set("Cache-Control", "public, max-age=60");
    res.json({
      ...googleTrendsCache.payload,
      source: "fallback",
      note: "Atualizando tendências do Google…",
    } satisfies GoogleTrendsResponse);
    return;
  }

  res.set("Cache-Control", "public, max-age=60");
  res.json({
    source: "fallback",
    note: "Tendências indisponíveis no momento.",
    updatedAt: new Date().toISOString(),
    topics: [],
  } satisfies GoogleTrendsResponse);
});

// Warm the cache at startup so the first visitor gets real data when possible.
void refreshGoogleTrendsCache();

// Current weather at a match venue, used by the live scoreboard. Keyed by
// rounded coordinates so nearby requests share a cache entry. Free, key-less
// Open-Meteo source — follows the resilience shape and degrades gracefully.
const weatherCache = new Map<string, { payload: WeatherResponse; expiresAt: number }>();

const parseCoordinate = (value: unknown, max: number): number | null => {
  if (typeof value !== "string") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) > max) return null;
  return n;
};

const fetchVenueWeather = async (lat: number, lng: number): Promise<WeatherResponse> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEATHER_FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(buildOpenMeteoUrl(lat, lng), { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Open-Meteo request failed (${response.status})`);
  }

  const snapshot = parseOpenMeteoCurrent(await response.json());
  if (!snapshot) {
    throw new Error("Open-Meteo returned no current weather");
  }

  return {
    source: "open-meteo",
    note: "Condições no estádio • Open-Meteo",
    updatedAt: new Date().toISOString(),
    weather: snapshot,
  };
};

app.get("/api/match-weather", async (req, res) => {
  const lat = parseCoordinate(req.query.lat, 90);
  const lng = parseCoordinate(req.query.lng, 180);

  if (lat === null || lng === null) {
    res.status(400).json({
      source: "fallback",
      note: "Coordenadas do estádio inválidas.",
      updatedAt: new Date().toISOString(),
      weather: null,
    } satisfies WeatherResponse);
    return;
  }

  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = weatherCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    res.set("Cache-Control", "public, max-age=300");
    res.json(cached.payload);
    return;
  }

  try {
    const payload = await fetchVenueWeather(lat, lng);
    weatherCache.set(key, { payload, expiresAt: Date.now() + WEATHER_CACHE_TTL_MS });
    res.set("Cache-Control", "public, max-age=300");
    res.json(payload);
  } catch (error) {
    console.error("Weather fetch failed:", error);
    // Serve a stale snapshot if we have one; otherwise an empty fallback.
    if (cached) {
      res.set("Cache-Control", "public, max-age=60");
      res.json({ ...cached.payload, source: "fallback", note: "Atualizando o clima…" } satisfies WeatherResponse);
      return;
    }
    res.set("Cache-Control", "public, max-age=60");
    res.json({
      source: "fallback",
      note: "Clima indisponível no momento.",
      updatedAt: new Date().toISOString(),
      weather: null,
    } satisfies WeatherResponse);
  }
});

app.get("/api/fifa-sync-status", (_req, res) => {
  const now = Date.now();
  const broadcastGuideFallbackCount = broadcastGuideCache
    ? Object.values(broadcastGuideCache.payload.guides).filter(
        (guide) => guide.source === "fallback",
      ).length
    : 0;
  const matchStateFallbackCount = matchStatesCache
    ? Object.values(matchStatesCache.payload.states).filter(
        (state) => state.source === "fallback",
      ).length
    : 0;
  const teamLineupFallbackCount = teamLineupsCache
    ? Object.values(teamLineupsCache.payload.lineups).filter(
        (lineup) => lineup.teamA.source === "fallback" || lineup.teamB.source === "fallback",
      ).length
    : 0;

  res.set("Cache-Control", "no-store");
  res.json({
    generatedAt: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    services: {
      broadcastGuide: {
        ...fifaSyncDiagnostics.broadcastGuide,
        circuitOpen: isCircuitOpen(fifaSyncDiagnostics.broadcastGuide),
        circuitOpenRemainingMs: (() => {
          const openUntilMs = getCircuitOpenUntilMs(fifaSyncDiagnostics.broadcastGuide);
          return openUntilMs ? Math.max(0, openUntilMs - now) : null;
        })(),
        cacheKey: broadcastGuideCache?.key || null,
        cacheAgeMs: broadcastGuideCache ? now - broadcastGuideCache.createdAt : null,
        cacheExpiresInMs: broadcastGuideCache
          ? Math.max(0, broadcastGuideCache.expiresAt - now)
          : null,
        fallbackMatchCount: broadcastGuideFallbackCount,
      },
      matchStates: {
        ...fifaSyncDiagnostics.matchStates,
        circuitOpen: isCircuitOpen(fifaSyncDiagnostics.matchStates),
        circuitOpenRemainingMs: (() => {
          const openUntilMs = getCircuitOpenUntilMs(fifaSyncDiagnostics.matchStates);
          return openUntilMs ? Math.max(0, openUntilMs - now) : null;
        })(),
        cacheKey: matchStatesCache?.key || null,
        cacheAgeMs: matchStatesCache ? now - matchStatesCache.createdAt : null,
        cacheExpiresInMs: matchStatesCache
          ? Math.max(0, matchStatesCache.expiresAt - now)
          : null,
        fallbackMatchCount: matchStateFallbackCount,
      },
      teamLineups: {
        ...fifaSyncDiagnostics.teamLineups,
        circuitOpen: isCircuitOpen(fifaSyncDiagnostics.teamLineups),
        circuitOpenRemainingMs: (() => {
          const openUntilMs = getCircuitOpenUntilMs(fifaSyncDiagnostics.teamLineups);
          return openUntilMs ? Math.max(0, openUntilMs - now) : null;
        })(),
        cacheKey: teamLineupsCache?.key || null,
        cacheAgeMs: teamLineupsCache ? now - teamLineupsCache.createdAt : null,
        cacheExpiresInMs: teamLineupsCache
          ? Math.max(0, teamLineupsCache.expiresAt - now)
          : null,
        fallbackMatchCount: teamLineupFallbackCount,
      },
      backgroundWarm: fifaSyncDiagnostics.backgroundWarm,
    },
    summary: {
      hasLiveMatches: fifaSyncDiagnostics.matchStates.activeLiveMatchIds.length > 0,
      activeLiveMatchIds: fifaSyncDiagnostics.matchStates.activeLiveMatchIds,
    },
  });
});

app.get("/api/questions", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(TRIVIA_QUESTIONS);
});

// POST /api/predict — Fan Zone / bracket match predictor. Body { homeTeam, awayTeam,
// userNotes? } where home/awayTeam are team codes (or names). Returns { text (pt-BR
// markdown), simulated: true }: the Dixon–Coles bivariate Poisson model
// (predictMatchOutcome) over each team's REAL current standings, narrated by
// predict-core. No AI dependency, no env var, no failure mode — always "simulated".
// Not FIFA-sourced, so it carries no resilience shape.
app.post("/api/predict", (req, res) => {
  res.set("Cache-Control", "no-store");
  const body = (req.body ?? {}) as { homeTeam?: unknown; awayTeam?: unknown; userNotes?: unknown };
  const homeKey = typeof body.homeTeam === "string" ? body.homeTeam.trim() : "";
  const awayKey = typeof body.awayTeam === "string" ? body.awayTeam.trim() : "";
  const userNotes = typeof body.userNotes === "string" ? body.userNotes : undefined;

  if (!homeKey || !awayKey) {
    res.status(400).json({ error: "Informe as duas seleções (homeTeam e awayTeam)." });
    return;
  }
  if (homeKey.toUpperCase() === awayKey.toUpperCase()) {
    res.status(400).json({ error: "Escolha duas seleções diferentes." });
    return;
  }

  const rows = computeStandings(APP_MATCHES);
  const byKey = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    byKey.set(row.code.toUpperCase(), row);
    byKey.set(row.name.toUpperCase(), row);
  }

  const home = byKey.get(homeKey.toUpperCase());
  const away = byKey.get(awayKey.toUpperCase());
  if (!home || !away) {
    res.status(404).json({ error: "Seleção não encontrada." });
    return;
  }

  const toTeam = (row: (typeof rows)[number]): PredictionTeam => ({
    name: row.name,
    code: row.code,
    points: row.points,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    goalDifference: row.goalDifference,
  });

  const outcome = predictMatchOutcome(rows, home.code, away.code);
  res.json({ text: buildPrediction(toTeam(home), toTeam(away), outcome, userNotes), simulated: true });
});

// Monte-Carlo estimate of a team's odds of reaching the Round of 32 (top two of its
// group, or one of the eight best thirds), simulated from the current standings by
// qualification-sim-core. NOT FIFA-sourced: it is a model built locally and labeled
// "simulado", never a claim of fact (mirrors /api/predict's simulated framing). The
// odds are stable for the life of the process — APP_MATCHES does not change at
// runtime — so each (team, iterations) pair is computed once and cached.
const QUALIFICATION_SIM_SEED = 0x51bf2a3d;
const DEFAULT_QUALIFICATION_ITERATIONS = 4000;
const MIN_QUALIFICATION_ITERATIONS = 200;
const MAX_QUALIFICATION_ITERATIONS = 20000;

interface QualificationOddsResponse {
  source: "simulated";
  simulated: true;
  note: string;
  updatedAt: string;
  team: { code: string; name: string; group: string };
  iterations: number;
  odds: QualificationOdds;
}

const qualificationOddsCache = new Map<string, QualificationOddsResponse>();

app.get("/api/qualification-odds/:teamCode", (req, res) => {
  const rawKey = typeof req.params.teamCode === "string" ? req.params.teamCode.trim() : "";
  if (!rawKey) {
    res.status(400).json({ error: "Informe a seleção (código ou nome)." });
    return;
  }

  // Resolve by team code or name, exactly like /api/predict.
  const rows = computeStandings(APP_MATCHES);
  const byKey = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    byKey.set(row.code.toUpperCase(), row);
    byKey.set(row.name.toUpperCase(), row);
  }
  const team = byKey.get(rawKey.toUpperCase());
  if (!team) {
    res.status(404).json({ error: "Seleção não encontrada." });
    return;
  }

  const requested = Number.parseInt(String(req.query.iterations ?? ""), 10);
  const iterations = Number.isFinite(requested)
    ? Math.min(MAX_QUALIFICATION_ITERATIONS, Math.max(MIN_QUALIFICATION_ITERATIONS, requested))
    : DEFAULT_QUALIFICATION_ITERATIONS;

  const cacheKey = `${team.code}:${iterations}`;
  const cached = qualificationOddsCache.get(cacheKey);
  if (cached) {
    res.set("Cache-Control", "public, max-age=300");
    res.json(cached);
    return;
  }

  const odds = estimateQualificationOdds(APP_MATCHES, team.code, {
    iterations,
    seed: QUALIFICATION_SIM_SEED,
  });

  const payload: QualificationOddsResponse = {
    source: "simulated",
    simulated: true,
    note: odds.deterministic
      ? "Fase de grupos definida: a classificação já está decidida pelos resultados."
      : "Probabilidade simulada (Monte Carlo) a partir da campanha atual — palpite para a torcida, não cravada de resultado.",
    updatedAt: new Date().toISOString(),
    team: { code: team.code, name: team.name, group: team.group },
    iterations: odds.iterations,
    odds,
  };
  qualificationOddsCache.set(cacheKey, payload);

  res.set("Cache-Control", "public, max-age=300");
  res.json(payload);
});

// In-memory "online users" presence, counted by DISTINCT (IP + per-browser id).
// Hybrid keying: the IP grounds it to a real client, while the client-supplied
// per-browser id separates co-located users (same IP, different browser/device) and
// dedupes one browser's tabs/reloads. Falls back to IP alone when no id is sent.
// Single-instance only (resets on restart); keys are held transiently in memory and
// never stored/logged beyond the window. `req.ip` is the real client IP via
// `trust proxy` (nginx X-Forwarded-For). Not FIFA-sourced, so no resilience shape.
const PRESENCE_WINDOW_MS = 45 * 1000;
const presenceStore: PresenceStore = new Map();

// Derive the hybrid (IP|browserId) client key shared by presence and chat: the IP
// grounds it to a real client; the client-supplied per-browser id separates co-located
// users and dedupes one browser's tabs. Falls back to IP alone when no id is sent.
const deriveClientKey = (req: express.Request): string => {
  const ip = req.ip ?? "";
  const rawId = (req.body as { id?: unknown } | undefined)?.id;
  const clientId = typeof rawId === "string" ? rawId.slice(0, 64) : "";
  return clientId ? `${ip}|${clientId}` : ip;
};

app.post("/api/presence", (req, res) => {
  const now = Date.now();
  recordHeartbeat(presenceStore, deriveClientKey(req), now);
  res.set("Cache-Control", "no-store");
  res.json({
    online: countOnline(presenceStore, now, PRESENCE_WINDOW_MS),
    updatedAt: new Date(now).toISOString(),
  });
});

// In-memory live-match chat ("resenha"). A room exists only while its match is LIVE:
// posting is gated by the FIFA match-states sync (`activeLiveMatchIds`), buffers are
// FIFO-capped per match, and idle rooms are pruned each warm cycle. Single-instance,
// memory-only — history resets on restart, by design. Posting is disabled under memory
// pressure so the small, swap-less host can never be pushed to OOM by chat traffic.
const chatStore: ChatStore = new Map();
const chatRateMap: ChatRateMap = new Map();
// Reject posts once RSS crosses this ceiling (the box has ~1.9 GiB and no swap).
const CHAT_MAX_RSS_BYTES = Number(process.env.CHAT_MAX_RSS_MB ?? 1500) * 1024 * 1024;
// Valid match ids, so room keys can never be spoofed into unbounded growth.
const VALID_MATCH_IDS = new Set(APP_MATCHES.map((match) => match.id));

const isMatchLive = (matchId: string): boolean =>
  fifaSyncDiagnostics.matchStates.activeLiveMatchIds.includes(matchId);

// GET the chat for a match: whether it's open (LIVE) plus messages after `?since=<id>`.
app.get("/api/chat/:matchId", (req, res) => {
  res.set("Cache-Control", "no-store");
  const { matchId } = req.params;
  if (!VALID_MATCH_IDS.has(matchId)) {
    return res.status(404).json({ error: "Partida desconhecida." });
  }
  const rawSince = req.query.since;
  const sinceId = typeof rawSince === "string" && rawSince !== "" ? Number(rawSince) : undefined;
  const since = sinceId !== undefined && Number.isFinite(sinceId) ? sinceId : undefined;
  const payload: ChatResponse = {
    open: isMatchLive(matchId),
    messages: getMessages(chatStore, matchId, since),
    updatedAt: new Date().toISOString(),
  };
  return res.json(payload);
});

// POST a message to a match's live chat. Gated by: known match, memory headroom, match
// is LIVE, valid nickname/text, and per-client rate limit.
app.post("/api/chat/:matchId", (req, res) => {
  res.set("Cache-Control", "no-store");
  const { matchId } = req.params;
  if (!VALID_MATCH_IDS.has(matchId)) {
    return res.status(404).json({ error: "Partida desconhecida." });
  }
  if (process.memoryUsage().rss > CHAT_MAX_RSS_BYTES) {
    return res.status(503).json({ error: "Chat temporariamente indisponível. Tente em instantes." });
  }
  if (!isMatchLive(matchId)) {
    return res.status(403).json({ error: "O chat abre quando a partida começa." });
  }
  const body = (req.body ?? {}) as { nickname?: unknown; text?: unknown };
  const nickname = validateNickname(body.nickname);
  if (!nickname.ok) return res.status(400).json({ error: nickname.reason });
  const text = validateText(body.text);
  if (!text.ok) return res.status(400).json({ error: text.reason });

  const now = Date.now();
  if (!passesRateLimit(chatRateMap, deriveClientKey(req), now)) {
    return res.status(429).json({ error: "Você está enviando mensagens rápido demais. Respire." });
  }

  const message = appendMessage(
    chatStore,
    matchId,
    { nickname: nickname.value, text: text.value },
    now,
  );
  return res.status(201).json({ message });
});

app.get("/api/health", (_req, res) => {
  const mem = process.memoryUsage();
  res.set("Cache-Control", "no-store");
  res.json({
    status: "ok",
    version: APP_VERSION,
    uptime: Math.round(process.uptime()),
    load: os.loadavg(),
    memory: {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
    },
    system: {
      freeMem: os.freemem(),
      totalMem: os.totalmem(),
    },
  });
});

// Serve frontend build files in production or proxy to Vite in development
async function startServer() {
  const port = await resolveAppPort();
  const httpServer = createHttpServer(app);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(port, HOST, () => {
    if (port !== DEFAULT_PORT) {
      console.warn(`Port ${DEFAULT_PORT} was busy, using ${port} instead.`);
    }

    console.log(`Server is running on port ${port}`);
    void warmDefaultFifaCaches();
  });
}

startServer();

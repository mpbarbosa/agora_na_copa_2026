import express from "express";
import { createServer as createHttpServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import {
  buildMatchStateEntry as buildMatchStateEntryCore,
  buildTeamLineupEntry as buildTeamLineupEntryCore,
  findCalendarMatch as findCalendarMatchCore,
  normalizeBroadcasters as normalizeBroadcastersCore,
} from "./fifa-sync-core";
import type { FifaLiveMatch as FifaLiveMatchCore } from "./fifa-sync-core";
import { triviaQuestions } from "./src/data/questions";
import matchesData from "./src/matches.json";
import { computeStandings, groupStandings } from "./src/standings";
import type {
  Broadcaster,
  BroadcastGuideEntry,
  LineupEntry,
  Match,
  MatchOverlayEntry,
  MatchStateEntry,
  MatchStatus,
  TournamentLeadersResponse,
  TournamentPlayerLeader,
  TournamentTeamLeader,
  TeamRef,
  TeamViewMatchSummary,
  TeamViewResponse,
  TriviaQuestion,
  StandingsRow,
} from "./src/types";

dotenv.config();

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
const APP_MATCHES = matchesData as Match[];
const APP_MATCHES_BY_ID = new Map(APP_MATCHES.map((match) => [match.id, match]));
const GOAL_INCIDENT_SUFFIX = " marcou.";
const YELLOW_CARD_INCIDENT_SUFFIX = " recebeu amarelo.";
const RED_CARD_INCIDENT_SUFFIX = " foi expulso.";

app.use(express.json());

interface FifaLocalizedText {
  Locale?: string;
  Description?: string;
}

interface FifaCalendarTeam {
  TeamName?: FifaLocalizedText[];
  Abbreviation?: string;
}

interface FifaCalendarMatch {
  IdMatch: string;
  Date: string;
  MatchStatus?: number | null;
  HomeTeamScore?: number | null;
  AwayTeamScore?: number | null;
  Home?: FifaCalendarTeam;
  Away?: FifaCalendarTeam;
}

interface FifaCalendarResponse {
  Results?: FifaCalendarMatch[];
}

interface FifaWatchSource {
  IdChannel: string;
  Name: string;
  Logo?: string;
  TvChannelUrl?: string;
  IOsUrl?: string;
  AndroidUrl?: string;
  Url?: string;
  Language?: string;
}

interface FifaWatchMatch {
  IdMatch: string;
  Date: string;
  Sources?: FifaWatchSource[];
}

interface FifaWatchSeasonResponse {
  Matches?: FifaWatchMatch[];
}

interface FifaLiveTeam {
  Score?: number | null;
}

interface FifaLiveMatch {
  IdMatch: string;
  Date?: string;
  MatchStatus?: number | null;
  MatchTime?: string | null;
  Period?: number | null;
  HomeTeam?: FifaLiveTeam;
  AwayTeam?: FifaLiveTeam;
  HomeTeamScore?: number | null;
  AwayTeamScore?: number | null;
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

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();

const getLocalizedDescription = (entries: FifaLocalizedText[] | undefined, language: string) => {
  if (!entries || entries.length === 0) return "";

  const normalizedLanguage = language.toLowerCase();
  return (
    entries.find((entry) => entry.Locale?.toLowerCase().startsWith(normalizedLanguage))?.Description ||
    entries[0]?.Description ||
    ""
  );
};

interface PlayerLeaderMetadata {
  name: string;
  shirtNumber?: number;
  pictureUrl?: string;
}

const buildPlayerLeaderKey = (teamCode: string, playerName: string) =>
  `${teamCode}:${normalizeText(playerName)}`;

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
    pictureUrl?: string;
  },
) => {
  const playerKey = buildPlayerLeaderKey(teamCode, player.name);
  const current = metadataByPlayerKey.get(playerKey);

  if (!current) {
    metadataByPlayerKey.set(playerKey, {
      name: player.name,
      shirtNumber: player.number,
      pictureUrl: player.pictureUrl,
    });
    return;
  }

  metadataByPlayerKey.set(playerKey, {
    name: current.name || player.name,
    shirtNumber: current.shirtNumber ?? player.number,
    pictureUrl: current.pictureUrl ?? player.pictureUrl,
  });
};

const buildPlayerLeaderMetadataMap = (lineupsPayload: TeamLineupsResponse) => {
  const metadataByPlayerKey = new Map<string, PlayerLeaderMetadata>();

  APP_MATCHES.forEach((match) => {
    const lineupEntry = lineupsPayload.lineups[match.id];
    const teamALineup = lineupEntry?.teamA.players ?? match.teamA.lineup;
    const teamBLineup = lineupEntry?.teamB.players ?? match.teamB.lineup;

    teamALineup.forEach((player) => {
      upsertPlayerLeaderMetadata(metadataByPlayerKey, match.teamA.code, player);
    });
    teamBLineup.forEach((player) => {
      upsertPlayerLeaderMetadata(metadataByPlayerKey, match.teamB.code, player);
    });
  });

  return metadataByPlayerKey;
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

  const metadataByPlayerKey = buildPlayerLeaderMetadataMap(lineupsPayload);
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
      const playerKey = buildPlayerLeaderKey(team.code, playerName);
      const metadata = metadataByPlayerKey.get(playerKey);
      const current = playerLeaders.get(playerKey) ?? {
        id: `${team.code.toLowerCase()}-${normalizeText(playerName).toLowerCase()}`,
        name: metadata?.name ?? playerName,
        teamCode: team.code,
        teamName: team.name,
        teamFlagSvg: team.flagSvg,
        shirtNumber: metadata?.shirtNumber,
        pictureUrl: metadata?.pictureUrl,
        goals: 0,
        yellowCards: 0,
        redCards: 0,
      };

      if (incident.type === "GOAL") current.goals += 1;
      if (incident.type === "YELLOW_CARD") current.yellowCards += 1;
      if (incident.type === "RED_CARD") current.redCards += 1;

      playerLeaders.set(playerKey, current);
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

const SPORTV_URL = "https://ge.globo.com/sportv/";

const getWatchSourceUrl = (source: FifaWatchSource) =>
  source.Url || source.TvChannelUrl || source.IOsUrl || source.AndroidUrl || "";

const getNormalizedWatchSourceUrl = (source: FifaWatchSource) => {
  const link = getWatchSourceUrl(source);
  const haystack = `${source.Name} ${link}`.toLowerCase();

  if (haystack.includes("sportv")) {
    return SPORTV_URL;
  }

  return link;
};

const classifyBroadcasterType = (source: FifaWatchSource): Broadcaster["type"] => {
  const haystack = `${source.Name} ${getWatchSourceUrl(source)}`.toLowerCase();

  if (haystack.includes("youtube") || haystack.includes("caze")) {
    return "YOUTUBE";
  }

  if (
    haystack.includes("globoplay") ||
    haystack.includes("getv") ||
    haystack.includes("ge-tv") ||
    haystack.includes("nsports") ||
    haystack.includes("fifa+")
  ) {
    return "STREAM";
  }

  if (haystack.includes("sportv")) {
    return "TV PAGA";
  }

  if (haystack.includes("globo") || haystack.includes("sbt")) {
    return "TV ABERTA";
  }

  return "STREAM";
};

const getBroadcasterColor = (type: Broadcaster["type"]) => {
  switch (type) {
    case "TV ABERTA":
      return "#00e476";
    case "TV PAGA":
      return "#ffd700";
    case "YOUTUBE":
      return "#ed2939";
    case "STREAM":
    case "STREAM PAGO":
      return "#38bdf8";
    default:
      return "#94a3b8";
  }
};

const normalizeBroadcasters = (sources: FifaWatchSource[] | undefined): Broadcaster[] => {
  if (!sources || sources.length === 0) return [];

  const seen = new Set<string>();
  const broadcasters: Broadcaster[] = [];

  for (const source of sources) {
    const link = getNormalizedWatchSourceUrl(source);
    if (!source.Name || !link) continue;

    const dedupeKey = `${normalizeText(source.Name)}::${link}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const type = classifyBroadcasterType(source);
    broadcasters.push({
      id: source.IdChannel,
      name: source.Name,
      type,
      logoUrl: source.Logo || undefined,
      iconColor: getBroadcasterColor(type),
      link,
    });
  }

  return broadcasters;
};

const findCalendarMatch = (localMatch: Match, calendarMatches: FifaCalendarMatch[], language: string) => {
  const localKickoff = new Date(localMatch.kickoffTimestamp).getTime();
  const localHomeCode = normalizeText(localMatch.teamA.code);
  const localAwayCode = normalizeText(localMatch.teamB.code);
  const localHomeName = normalizeText(localMatch.teamA.name);
  const localAwayName = normalizeText(localMatch.teamB.name);

  const exactMatch = calendarMatches.find((calendarMatch) => {
    const fifaKickoff = new Date(calendarMatch.Date).getTime();
    const homeCode = normalizeText(calendarMatch.Home?.Abbreviation || "");
    const awayCode = normalizeText(calendarMatch.Away?.Abbreviation || "");

    return fifaKickoff === localKickoff && homeCode === localHomeCode && awayCode === localAwayCode;
  });

  if (exactMatch) return exactMatch;

  const nameAndDateMatch = calendarMatches.find((calendarMatch) => {
    const fifaKickoff = new Date(calendarMatch.Date).getTime();
    const homeName = normalizeText(getLocalizedDescription(calendarMatch.Home?.TeamName, language));
    const awayName = normalizeText(getLocalizedDescription(calendarMatch.Away?.TeamName, language));

    return fifaKickoff === localKickoff && homeName === localHomeName && awayName === localAwayName;
  });

  if (nameAndDateMatch) return nameAndDateMatch;

  return calendarMatches.find((calendarMatch) => {
    const homeCode = normalizeText(calendarMatch.Home?.Abbreviation || "");
    const awayCode = normalizeText(calendarMatch.Away?.Abbreviation || "");
    return homeCode === localHomeCode && awayCode === localAwayCode;
  });
};

const getMatchStatusFromFifa = (localMatch: Match, fifaMatch: FifaCalendarMatch): MatchStatus => {
  if (fifaMatch.MatchStatus === 0) {
    return "FINISHED";
  }

  if (fifaMatch.MatchStatus === 1) {
    return "PRE_GAME";
  }

  if (typeof fifaMatch.MatchStatus === "number") {
    return "LIVE";
  }

  const kickoffTime = new Date(fifaMatch.Date).getTime();
  if (!Number.isNaN(kickoffTime) && kickoffTime > Date.now()) {
    return "PRE_GAME";
  }

  if (
    typeof fifaMatch.HomeTeamScore === "number" ||
    typeof fifaMatch.AwayTeamScore === "number"
  ) {
    return "LIVE";
  }

  return localMatch.status;
};

const getScoreFromFifa = (fifaMatch: FifaCalendarMatch) => {
  if (
    typeof fifaMatch.HomeTeamScore === "number" &&
    typeof fifaMatch.AwayTeamScore === "number"
  ) {
    return {
      teamA: fifaMatch.HomeTeamScore,
      teamB: fifaMatch.AwayTeamScore,
    };
  }

  return undefined;
};

const getScoreFromLiveFifa = (fifaMatch: FifaLiveMatch) => {
  const homeScore =
    typeof fifaMatch.HomeTeam?.Score === "number"
      ? fifaMatch.HomeTeam.Score
      : fifaMatch.HomeTeamScore;
  const awayScore =
    typeof fifaMatch.AwayTeam?.Score === "number"
      ? fifaMatch.AwayTeam.Score
      : fifaMatch.AwayTeamScore;

  if (typeof homeScore === "number" && typeof awayScore === "number") {
    return {
      teamA: homeScore,
      teamB: awayScore,
    };
  }

  return undefined;
};

const buildMatchStateEntry = (
  localMatch: Match,
  fifaMatch: FifaCalendarMatch | undefined,
  fifaLiveMatch?: FifaLiveMatch,
): MatchStateEntry => {
  if (!fifaMatch) {
    return {
      status: localMatch.status,
      score: localMatch.score,
      source: "fallback",
      note: "Dados oficiais da FIFA indisponíveis para esta partida no momento; exibindo o estado local.",
      updatedAt: new Date().toISOString(),
    };
  }

  const fifaScore = getScoreFromFifa(fifaMatch);
  const liveScore = fifaLiveMatch ? getScoreFromLiveFifa(fifaLiveMatch) : undefined;
  const status = fifaLiveMatch
    ? getMatchStatusFromFifa(localMatch, {
        ...fifaMatch,
        Date: fifaLiveMatch.Date || fifaMatch.Date,
        MatchStatus: fifaLiveMatch.MatchStatus ?? fifaMatch.MatchStatus,
        HomeTeamScore: liveScore?.teamA ?? fifaMatch.HomeTeamScore,
        AwayTeamScore: liveScore?.teamB ?? fifaMatch.AwayTeamScore,
      })
    : getMatchStatusFromFifa(localMatch, fifaMatch);

  return {
    status,
    score: liveScore || fifaScore || (status === "PRE_GAME" ? undefined : localMatch.score),
    matchTime:
      status === "LIVE" && fifaLiveMatch?.MatchTime ? fifaLiveMatch.MatchTime : undefined,
    source: "fifa",
    note: fifaLiveMatch
      ? "Placar e status oficiais da FIFA com atualização ao vivo."
      : "Placar e status oficiais da FIFA.",
    fifaMatchId: fifaMatch.IdMatch,
    updatedAt: new Date().toISOString(),
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
  liveByMatchId: Map<string, FifaLiveMatchCore>,
) =>
  matchedFifa.some(({ match, fifaMatch }) => {
    const liveMatch = fifaMatch ? liveByMatchId.get(fifaMatch.IdMatch) : undefined;
    return buildMatchStateEntryCore(match, fifaMatch, liveMatch).status === "LIVE";
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

const fetchJson = async <T,>(url: string): Promise<T> => {
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
  fetchJson<FifaLiveMatchCore>(
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
        const fifaMatch = findCalendarMatchCore(match, calendarMatches, language);
        const fifaWatchMatch = fifaMatch
          ? watchByMatchId.get(fifaMatch.IdMatch)
          : undefined;
        const fifaBroadcasters = normalizeBroadcastersCore(fifaWatchMatch?.Sources);
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
      const fifaMatch = findCalendarMatchCore(match, calendarMatches, language);
      const calendarState = buildMatchStateEntryCore(match, fifaMatch);

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
          buildMatchStateEntryCore(
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
      fifaMatch: findCalendarMatchCore(match, calendarMatches, language),
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
        .filter((liveMatch): liveMatch is FifaLiveMatchCore => Boolean(liveMatch?.IdMatch))
        .map((liveMatch) => [liveMatch.IdMatch, liveMatch]),
    );

    const lineups = Object.fromEntries(
      matchedFifa.map(({ match, fifaMatch }) => {
        const liveMatch = fifaMatch ? liveByMatchId.get(fifaMatch.IdMatch) : undefined;

        return [
          match.id,
          {
            teamA: buildTeamLineupEntryCore(
              match.teamA.code,
              match.teamA.lineup,
              fifaMatch,
              liveMatch?.HomeTeam,
            ),
            teamB: buildTeamLineupEntryCore(
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

const buildFallbackLineupEntry = (players: LineupEntry["players"]): LineupEntry => ({
  players,
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

  const lineupReference =
    currentMatchReference ?? nextMatchReference ?? lastMatchReference ?? teamMatches[0] ?? null;
  const lineup = lineupReference
    ? lineupReference.isTeamA
      ? teamLineupsPayload.lineups[lineupReference.match.id]?.teamA ??
        buildFallbackLineupEntry(lineupReference.team.lineup)
      : teamLineupsPayload.lineups[lineupReference.match.id]?.teamB ??
        buildFallbackLineupEntry(lineupReference.team.lineup)
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

import express from "express";
import { createServer as createHttpServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import {
  buildMatchStateEntry as buildMatchStateEntryCore,
  findCalendarMatch as findCalendarMatchCore,
  normalizeBroadcasters as normalizeBroadcastersCore,
} from "./fifa-sync-core";
import { triviaQuestions } from "./src/data/questions";
import matchesData from "./src/matches.json";
import type {
  Broadcaster,
  BroadcastGuideEntry,
  Match,
  MatchOverlayEntry,
  MatchStateEntry,
  MatchStatus,
  TriviaQuestion,
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
const LIVE_MATCH_STATE_CACHE_TTL_MS = 10 * 1000;
const UPCOMING_SOON_MATCH_STATE_CACHE_TTL_MS = 30 * 1000;
const STABLE_MATCH_STATE_CACHE_TTL_MS = 5 * 60 * 1000;
const UPCOMING_SOON_WINDOW_MS = 6 * 60 * 60 * 1000;
const BACKGROUND_WARM_FAILURE_RETRY_MS = 30 * 1000;
const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 3;
const CIRCUIT_BREAKER_OPEN_MS = 60 * 1000;
const APP_MATCHES = matchesData as Match[];
const APP_MATCHES_BY_ID = new Map(APP_MATCHES.map((match) => [match.id, match]));

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

const fifaSyncDiagnostics: {
  broadcastGuide: FifaSyncServiceDiagnostics;
  matchStates: FifaSyncServiceDiagnostics & {
    activeLiveMatchIds: string[];
    lastRefreshAfterMs: number | null;
  };
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
    const payload = await getMatchOverlaysPayload(
      DEFAULT_BROADCAST_COUNTRY,
      DEFAULT_BROADCAST_LANGUAGE,
    );

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

import type {
  Broadcaster,
  CommentaryEvent,
  Match,
  MatchStateEntry,
  MatchStatus,
} from "./src/types";

export interface FifaLocalizedText {
  Locale?: string;
  Description?: string;
}

export interface FifaCalendarTeam {
  TeamName?: FifaLocalizedText[];
  Abbreviation?: string;
}

export interface FifaCalendarMatch {
  IdMatch: string;
  Date: string;
  MatchStatus?: number | null;
  HomeTeamScore?: number | null;
  AwayTeamScore?: number | null;
  Home?: FifaCalendarTeam;
  Away?: FifaCalendarTeam;
}

export interface FifaWatchSource {
  IdChannel: string;
  Name: string;
  Logo?: string;
  TvChannelUrl?: string;
  IOsUrl?: string;
  AndroidUrl?: string;
  Url?: string;
  Language?: string;
}

export interface FifaLiveTeam {
  TeamName?: FifaLocalizedText[];
  Abbreviation?: string;
  Score?: number | null;
  Goals?: FifaLiveGoal[];
  Bookings?: FifaLiveBooking[];
  Substitutions?: FifaLiveSubstitution[];
  Players?: FifaLivePlayer[];
}

export interface FifaLivePlayer {
  IdPlayer: string;
  PlayerName?: FifaLocalizedText[];
  ShortName?: FifaLocalizedText[];
}

export interface FifaLiveGoal {
  Type?: number | null;
  IdPlayer?: string | null;
  Minute?: string | null;
  Period?: number | null;
  IdGoal?: string | null;
  IdTeam?: string | null;
}

export interface FifaLiveBooking {
  Card?: number | null;
  Period?: number | null;
  IdEvent?: string | null;
  IdPlayer?: string | null;
  IdTeam?: string | null;
  Minute?: string | null;
}

export interface FifaLiveSubstitution {
  IdEvent?: string | null;
  Period?: number | null;
  IdPlayerOff?: string | null;
  IdPlayerOn?: string | null;
  PlayerOffName?: FifaLocalizedText[];
  PlayerOnName?: FifaLocalizedText[];
  Minute?: string | null;
  IdTeam?: string | null;
}

export interface FifaLiveMatch {
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

export const SPORTV_URL = "https://ge.globo.com/sportv/";

export const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();

export const getLocalizedDescription = (
  entries: FifaLocalizedText[] | undefined,
  language: string,
) => {
  if (!entries || entries.length === 0) return "";

  const normalizedLanguage = language.toLowerCase();
  return (
    entries.find((entry) =>
      entry.Locale?.toLowerCase().startsWith(normalizedLanguage),
    )?.Description ||
    entries[0]?.Description ||
    ""
  );
};

const getWatchSourceUrl = (source: FifaWatchSource) =>
  source.Url || source.TvChannelUrl || source.IOsUrl || source.AndroidUrl || "";

export const getNormalizedWatchSourceUrl = (source: FifaWatchSource) => {
  const link = getWatchSourceUrl(source);
  const haystack = `${source.Name} ${link}`.toLowerCase();

  if (haystack.includes("sportv")) {
    return SPORTV_URL;
  }

  return link;
};

export const classifyBroadcasterType = (
  source: FifaWatchSource,
): Broadcaster["type"] => {
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

export const getBroadcasterColor = (type: Broadcaster["type"]) => {
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

export const normalizeBroadcasters = (
  sources: FifaWatchSource[] | undefined,
): Broadcaster[] => {
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

export const findCalendarMatch = (
  localMatch: Match,
  calendarMatches: FifaCalendarMatch[],
  language: string,
) => {
  const localKickoff = new Date(localMatch.kickoffTimestamp).getTime();
  const localHomeCode = normalizeText(localMatch.teamA.code);
  const localAwayCode = normalizeText(localMatch.teamB.code);
  const localHomeName = normalizeText(localMatch.teamA.name);
  const localAwayName = normalizeText(localMatch.teamB.name);

  const exactMatch = calendarMatches.find((calendarMatch) => {
    const fifaKickoff = new Date(calendarMatch.Date).getTime();
    const homeCode = normalizeText(calendarMatch.Home?.Abbreviation || "");
    const awayCode = normalizeText(calendarMatch.Away?.Abbreviation || "");

    return (
      fifaKickoff === localKickoff &&
      homeCode === localHomeCode &&
      awayCode === localAwayCode
    );
  });

  if (exactMatch) return exactMatch;

  const nameAndDateMatch = calendarMatches.find((calendarMatch) => {
    const fifaKickoff = new Date(calendarMatch.Date).getTime();
    const homeName = normalizeText(
      getLocalizedDescription(calendarMatch.Home?.TeamName, language),
    );
    const awayName = normalizeText(
      getLocalizedDescription(calendarMatch.Away?.TeamName, language),
    );

    return (
      fifaKickoff === localKickoff &&
      homeName === localHomeName &&
      awayName === localAwayName
    );
  });

  if (nameAndDateMatch) return nameAndDateMatch;

  return calendarMatches.find((calendarMatch) => {
    const homeCode = normalizeText(calendarMatch.Home?.Abbreviation || "");
    const awayCode = normalizeText(calendarMatch.Away?.Abbreviation || "");
    return homeCode === localHomeCode && awayCode === localAwayCode;
  });
};

export const getMatchStatusFromFifa = (
  localMatch: Match,
  fifaMatch: FifaCalendarMatch,
): MatchStatus => {
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

export const getScoreFromFifa = (fifaMatch: FifaCalendarMatch) => {
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

export const getScoreFromLiveFifa = (fifaMatch: FifaLiveMatch) => {
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

const getPeriodSortValue = (period: number | null | undefined) => {
  if (typeof period !== "number") {
    return Number.MAX_SAFE_INTEGER;
  }

  return period;
};

const getMinuteSortValue = (minute: string | null | undefined) => {
  if (!minute) {
    return Number.MAX_SAFE_INTEGER;
  }

  const values = Array.from(minute.matchAll(/\d+/g)).map(([value]) => Number(value));
  if (values.length === 0) {
    return Number.MAX_SAFE_INTEGER;
  }

  return values.reduce((total, value) => total + value, 0);
};

const getBestPlayerName = (
  entries: FifaLocalizedText[] | undefined,
  fallback = "",
) => getLocalizedDescription(entries, "pt") || fallback;

const buildPlayerNameMap = (team: FifaLiveTeam | undefined) => {
  const players = team?.Players || [];
  return new Map(
    players.map((player) => [
      player.IdPlayer,
      getBestPlayerName(player.ShortName, getBestPlayerName(player.PlayerName, "Jogador")),
    ]),
  );
};

export const getIncidentsFromLiveFifa = (
  fifaMatch: FifaLiveMatch,
): CommentaryEvent[] => {
  const homePlayerNames = buildPlayerNameMap(fifaMatch.HomeTeam);
  const awayPlayerNames = buildPlayerNameMap(fifaMatch.AwayTeam);

  const buildGoalIncidents = (
    goals: FifaLiveGoal[] | undefined,
    playerNames: Map<string, string>,
    team: "A" | "B",
  ) =>
    (goals || []).map((goal, index) => {
      const playerName = goal.IdPlayer
        ? playerNames.get(goal.IdPlayer) || "Jogador"
        : "Jogador";

      return {
        id: `${team}-goal-${goal.IdGoal || `${goal.Minute || "sem-minuto"}-${index}`}`,
        time: goal.Minute || "--'",
        type: "GOAL" as const,
        text: `${playerName} marcou.`,
        team,
        period: goal.Period,
      };
    });

  const buildBookingIncidents = (
    bookings: FifaLiveBooking[] | undefined,
    playerNames: Map<string, string>,
    team: "A" | "B",
  ) =>
    (bookings || [])
      .filter((booking) => booking.Card === 1 || booking.Card === 2)
      .map((booking, index) => {
        const playerName = booking.IdPlayer
          ? playerNames.get(booking.IdPlayer) || "Jogador"
          : "Jogador";
        const isRedCard = booking.Card === 2;

        return {
          id: `${team}-card-${booking.IdEvent || `${booking.Minute || "sem-minuto"}-${index}`}`,
          time: booking.Minute || "--'",
          type: isRedCard ? ("RED_CARD" as const) : ("YELLOW_CARD" as const),
          text: isRedCard
            ? `${playerName} foi expulso.`
            : `${playerName} recebeu amarelo.`,
          team,
          period: booking.Period,
        };
      });

  const buildSubstitutionIncidents = (
    substitutions: FifaLiveSubstitution[] | undefined,
    playerNames: Map<string, string>,
    team: "A" | "B",
  ) =>
    (substitutions || []).map((substitution, index) => {
      const playerOffName =
        getBestPlayerName(
          substitution.PlayerOffName,
          substitution.IdPlayerOff
            ? playerNames.get(substitution.IdPlayerOff) || "Jogador"
            : "Jogador",
        ) || "Jogador";
      const playerOnName =
        getBestPlayerName(
          substitution.PlayerOnName,
          substitution.IdPlayerOn
            ? playerNames.get(substitution.IdPlayerOn) || "Jogador"
            : "Jogador",
        ) || "Jogador";

      return {
        id: `${team}-sub-${substitution.IdEvent || `${substitution.Minute || "sem-minuto"}-${index}`}`,
        time: substitution.Minute || "--'",
        type: "SUBSTITUTION" as const,
        text: `Sai ${playerOffName}, entra ${playerOnName}.`,
        team,
        period: substitution.Period,
      };
    });

  return [
    ...buildGoalIncidents(fifaMatch.HomeTeam?.Goals, homePlayerNames, "A"),
    ...buildGoalIncidents(fifaMatch.AwayTeam?.Goals, awayPlayerNames, "B"),
    ...buildBookingIncidents(fifaMatch.HomeTeam?.Bookings, homePlayerNames, "A"),
    ...buildBookingIncidents(fifaMatch.AwayTeam?.Bookings, awayPlayerNames, "B"),
    ...buildSubstitutionIncidents(
      fifaMatch.HomeTeam?.Substitutions,
      homePlayerNames,
      "A",
    ),
    ...buildSubstitutionIncidents(
      fifaMatch.AwayTeam?.Substitutions,
      awayPlayerNames,
      "B",
    ),
  ]
    .sort((a, b) => {
      const periodDiff = getPeriodSortValue(a.period) - getPeriodSortValue(b.period);
      if (periodDiff !== 0) {
        return periodDiff;
      }

      return getMinuteSortValue(a.time) - getMinuteSortValue(b.time);
    })
    .map(({ period: _period, ...incident }) => incident);
};

export const buildMatchStateEntry = (
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
  const incidents = fifaLiveMatch ? getIncidentsFromLiveFifa(fifaLiveMatch) : undefined;
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
    incidents: incidents && incidents.length > 0 ? incidents : undefined,
    source: "fifa",
    note: fifaLiveMatch
      ? incidents && incidents.length > 0
        ? "Placar, status e lances oficiais da FIFA com atualização ao vivo."
        : "Placar e status oficiais da FIFA com atualização ao vivo."
      : "Placar e status oficiais da FIFA.",
    fifaMatchId: fifaMatch.IdMatch,
    updatedAt: new Date().toISOString(),
  };
};

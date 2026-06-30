import { Position } from "./src/types";
import type {
  Broadcaster,
  CommentaryEvent,
  LineupEntry,
  Match,
  MatchReferee,
  MatchStateEntry,
  MatchStatus,
  Player,
} from "./src/types";
import { resolvePlayerEntry } from "./src/data/playerRegistry";

export interface FifaLocalizedText {
  Locale?: string;
  Description?: string;
}

export interface FifaCalendarTeam {
  TeamName?: FifaLocalizedText[];
  Abbreviation?: string;
}

export interface FifaMatchOfficial {
  OfficialId?: string;
  IdCountry?: string;
  /** 1 = Referee, 2/3 = Assistants, 4 = Fourth official, 5+ = VAR/AVAR. */
  OfficialType?: number | null;
  Name?: FifaLocalizedText[];
  NameShort?: FifaLocalizedText[];
}

export interface FifaCalendarMatch {
  IdMatch: string;
  Date: string;
  MatchStatus?: number | null;
  HomeTeamScore?: number | null;
  AwayTeamScore?: number | null;
  HomeTeamPenaltyScore?: number | null;
  AwayTeamPenaltyScore?: number | null;
  Home?: FifaCalendarTeam;
  Away?: FifaCalendarTeam;
  Officials?: FifaMatchOfficial[];
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
  Tactics?: string | null;
  Goals?: FifaLiveGoal[];
  Bookings?: FifaLiveBooking[];
  Substitutions?: FifaLiveSubstitution[];
  Players?: FifaLivePlayer[];
}

export interface FifaPlayerPicture {
  Id?: string | null;
  PictureUrl?: string | null;
}

export interface FifaLivePlayer {
  IdPlayer: string;
  PlayerName?: FifaLocalizedText[];
  ShortName?: FifaLocalizedText[];
  ShirtNumber?: number | null;
  Position?: number | null;
  Captain?: boolean | null;
  PlayerPicture?: FifaPlayerPicture | null;
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
  HomeTeamPenaltyScore?: number | null;
  AwayTeamPenaltyScore?: number | null;
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

// FIFA api.fifa.com `MatchStatus` integer codes (see the JantaoDev/FifaApi
// Match model). Anything not listed here that is still numeric is treated as
// an unknown in-progress state and mapped to LIVE.
export const FIFA_MATCH_STATUS = {
  PLAYED: 0, // full time
  FUTURE: 1, // not started
  LIVE: 3,
  ABANDONED: 4,
  POSTPONED: 7,
  CANCELLED: 8,
  LINE_UPS: 12, // line-ups published (still pre-match)
  SUSPENDED: 99, // stopped mid-match (e.g. weather), may resume
} as const;

export const getMatchStatusFromFifa = (
  localMatch: Match,
  fifaMatch: FifaCalendarMatch,
): MatchStatus => {
  switch (fifaMatch.MatchStatus) {
    case FIFA_MATCH_STATUS.PLAYED:
      return "FINISHED";
    case FIFA_MATCH_STATUS.FUTURE:
    case FIFA_MATCH_STATUS.LINE_UPS:
      return "PRE_GAME";
    case FIFA_MATCH_STATUS.LIVE:
      return "LIVE";
    case FIFA_MATCH_STATUS.ABANDONED:
    case FIFA_MATCH_STATUS.POSTPONED:
    case FIFA_MATCH_STATUS.CANCELLED:
    case FIFA_MATCH_STATUS.SUSPENDED:
      return "SUSPENDED";
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

// FIFA api.fifa.com `Period` integer codes (see the JantaoDev/FifaApi Match
// model) — the phase of play, richer than the coarse MatchStatus.
export const FIFA_PERIOD = {
  UNKNOWN: 0,
  SCHEDULED: 1,
  PRE_MATCH: 2,
  FIRST_HALF: 3,
  HALF_TIME: 4,
  SECOND_HALF: 5,
  EXTRA_TIME: 6,
  EXTRA_FIRST_HALF: 7,
  EXTRA_HALF_TIME: 8,
  EXTRA_SECOND_HALF: 9,
  FULL_TIME: 10,
  PENALTY_SHOOTOUT: 11,
  POST_MATCH: 12,
  ABANDONED: 13,
} as const;

const FIFA_PERIOD_LABELS: Record<number, string> = {
  [FIFA_PERIOD.SCHEDULED]: "Agendado",
  [FIFA_PERIOD.PRE_MATCH]: "Pré-jogo",
  [FIFA_PERIOD.FIRST_HALF]: "1º tempo",
  [FIFA_PERIOD.HALF_TIME]: "Intervalo",
  [FIFA_PERIOD.SECOND_HALF]: "2º tempo",
  [FIFA_PERIOD.EXTRA_TIME]: "Prorrogação",
  [FIFA_PERIOD.EXTRA_FIRST_HALF]: "Prorrogação · 1º tempo",
  [FIFA_PERIOD.EXTRA_HALF_TIME]: "Intervalo da prorrogação",
  [FIFA_PERIOD.EXTRA_SECOND_HALF]: "Prorrogação · 2º tempo",
  [FIFA_PERIOD.FULL_TIME]: "Fim de jogo",
  [FIFA_PERIOD.PENALTY_SHOOTOUT]: "Pênaltis",
  [FIFA_PERIOD.POST_MATCH]: "Pós-jogo",
  [FIFA_PERIOD.ABANDONED]: "Abandonado",
};

const FIFA_STATUS_LABELS: Record<number, string> = {
  [FIFA_MATCH_STATUS.PLAYED]: "Encerrado",
  [FIFA_MATCH_STATUS.FUTURE]: "Agendado",
  [FIFA_MATCH_STATUS.LINE_UPS]: "Escalações divulgadas",
  [FIFA_MATCH_STATUS.ABANDONED]: "Abandonado",
  [FIFA_MATCH_STATUS.POSTPONED]: "Adiado",
  [FIFA_MATCH_STATUS.CANCELLED]: "Cancelado",
  [FIFA_MATCH_STATUS.SUSPENDED]: "Paralisado",
};

// Terminal/abnormal statuses describe the match better than the period code.
const TERMINAL_OR_ABNORMAL_STATUS = new Set<number>([
  FIFA_MATCH_STATUS.PLAYED,
  FIFA_MATCH_STATUS.SUSPENDED,
  FIFA_MATCH_STATUS.ABANDONED,
  FIFA_MATCH_STATUS.POSTPONED,
  FIFA_MATCH_STATUS.CANCELLED,
]);

/**
 * Human-readable official FIFA match status in pt-BR. Prefers the live `Period`
 * (1º tempo, Intervalo, 2º tempo, Pênaltis…) while a match is in play; for a
 * terminal/abnormal state (Encerrado, Paralisado, Adiado…) the status wins.
 * Returns undefined when nothing is known.
 */
export const getOfficialFifaStatusLabel = (
  matchStatus?: number | null,
  period?: number | null,
): string | undefined => {
  if (typeof matchStatus === "number" && TERMINAL_OR_ABNORMAL_STATUS.has(matchStatus)) {
    return FIFA_STATUS_LABELS[matchStatus];
  }
  if (typeof period === "number" && FIFA_PERIOD_LABELS[period]) {
    return FIFA_PERIOD_LABELS[period];
  }
  if (typeof matchStatus === "number" && FIFA_STATUS_LABELS[matchStatus]) {
    return FIFA_STATUS_LABELS[matchStatus];
  }
  if (matchStatus === FIFA_MATCH_STATUS.LIVE) {
    return "Em andamento";
  }
  return undefined;
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

// A penalty shootout only exists when FIFA reports BOTH teams' shootout
// scores. Returns the pair only then — a match level on the scoreboard but
// never taken to penalties leaves these fields null. Reads from the live
// payload first (during/just after the shootout) and falls back to the
// calendar (settled result), mirroring `getScoreFrom*Fifa`.
export const getPenaltyScoreFromFifa = (
  fifaMatch: FifaCalendarMatch,
  fifaLiveMatch?: FifaLiveMatch,
) => {
  const homePenalties =
    typeof fifaLiveMatch?.HomeTeamPenaltyScore === "number"
      ? fifaLiveMatch.HomeTeamPenaltyScore
      : fifaMatch.HomeTeamPenaltyScore;
  const awayPenalties =
    typeof fifaLiveMatch?.AwayTeamPenaltyScore === "number"
      ? fifaLiveMatch.AwayTeamPenaltyScore
      : fifaMatch.AwayTeamPenaltyScore;

  if (typeof homePenalties === "number" && typeof awayPenalties === "number") {
    return {
      teamA: homePenalties,
      teamB: awayPenalties,
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

export const getBestPlayerName = (
  entries: FifaLocalizedText[] | undefined,
  fallback = "",
) => getLocalizedDescription(entries, "pt") || fallback;

const normalizePlayerName = (name: string) => normalizeText(name);

const findMatchingLineupPlayer = (
  player: Pick<Player, "name" | "number">,
  lineup: Player[],
) => {
  const normalizedName = normalizePlayerName(player.name);

  return (
    lineup.find(
      (candidate) =>
        candidate.number === player.number &&
        normalizePlayerName(candidate.name) === normalizedName,
    ) ||
    lineup.find((candidate) => candidate.number === player.number) ||
    lineup.find(
      (candidate) => normalizePlayerName(candidate.name) === normalizedName,
    )
  );
};

const getFifaPlayerPictureUrl = (player: FifaLivePlayer | undefined) =>
  player?.PlayerPicture?.PictureUrl || undefined;

const getNormalizedPlayerNameParts = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);

const getNormalizedSurname = (name: string) => getNormalizedPlayerNameParts(name).at(-1) || "";

const isInitialMatch = (left: string, right: string) =>
  Boolean(left) && Boolean(right) && left[0] === right[0];

const isStrongPlayerNameMatch = (leftName: string, rightName: string) => {
  const leftNormalized = normalizePlayerName(leftName);
  const rightNormalized = normalizePlayerName(rightName);
  if (leftNormalized === rightNormalized) {
    return true;
  }

  const leftParts = getNormalizedPlayerNameParts(leftName);
  const rightParts = getNormalizedPlayerNameParts(rightName);
  if (leftParts.length === 0 || rightParts.length === 0) {
    return false;
  }

  const leftSurname = leftParts.at(-1);
  const rightSurname = rightParts.at(-1);
  if (!leftSurname || !rightSurname || leftSurname !== rightSurname) {
    return false;
  }

  const leftFirst = leftParts[0] || "";
  const rightFirst = rightParts[0] || "";
  return isInitialMatch(leftFirst, rightFirst);
};

const getComparableFifaPlayerNames = (player: FifaLivePlayer) => [
  getBestPlayerName(player.PlayerName, ""),
  getBestPlayerName(player.ShortName, ""),
].filter(Boolean);

const findMatchingFifaPlayer = (
  player: Pick<Player, "name" | "number">,
  fifaPlayers: FifaLivePlayer[],
) => {
  return (
    fifaPlayers.find((candidate) => {
      return (
        (candidate.ShirtNumber || 0) === player.number &&
        getComparableFifaPlayerNames(candidate).some((candidateName) =>
          isStrongPlayerNameMatch(player.name, candidateName),
        )
      );
    }) ||
    fifaPlayers.find((candidate) => {
      return getComparableFifaPlayerNames(candidate).some((candidateName) =>
        isStrongPlayerNameMatch(player.name, candidateName),
      );
    }) ||
    fifaPlayers.find((candidate) => {
      const candidateSurnameMatches = getComparableFifaPlayerNames(candidate).some(
        (candidateName) => getNormalizedSurname(candidateName) === getNormalizedSurname(player.name),
      );

      return (candidate.ShirtNumber || 0) === player.number && candidateSurnameMatches;
    })
  );
};

const mergeLineupWithLocalMetadata = (
  players: Player[],
  fallbackLineup: Player[],
  teamCode: string,
): Player[] =>
  players.map((player) => {
    const fallbackPlayer = findMatchingLineupPlayer(player, fallbackLineup);
    const entry = resolvePlayerEntry(teamCode, player.name, player.number, player.fifaId);
    if (!fallbackPlayer) {
      return {
        ...player,
        // FIFA sometimes publishes a starter without a shirt number (ShirtNumber
        // missing → 0 from getStartingLineupFromLiveFifa). Recover it from the
        // local registry rather than rendering "0".
        number: player.number || entry?.number || player.number,
        socials: player.socials ?? entry?.socials,
        instagramPostUrl: player.instagramPostUrl ?? entry?.instagramPostUrl,
        instagramPostUrls: player.instagramPostUrls ?? entry?.instagramPostUrls,
        worldCupNote: player.worldCupNote ?? entry?.worldCupNote,
        fullName: player.fullName ?? entry?.fullName,
        dateOfBirth: player.dateOfBirth ?? entry?.dateOfBirth,
        height: player.height ?? entry?.height,
      };
    }

    return {
      ...player,
      // Recover a missing FIFA shirt number from the local lineup, then registry.
      number: player.number || fallbackPlayer.number || entry?.number || player.number,
      club: player.club ?? fallbackPlayer.club ?? entry?.club,
      pictureUrl: player.pictureUrl ?? fallbackPlayer.pictureUrl,
      socials: player.socials ?? fallbackPlayer.socials ?? entry?.socials,
      instagramPostUrl: player.instagramPostUrl ?? fallbackPlayer.instagramPostUrl ?? entry?.instagramPostUrl,
      instagramPostUrls:
        player.instagramPostUrls ?? fallbackPlayer.instagramPostUrls ?? entry?.instagramPostUrls,
      worldCupNote: player.worldCupNote ?? fallbackPlayer.worldCupNote ?? entry?.worldCupNote,
      fullName: player.fullName ?? fallbackPlayer.fullName ?? entry?.fullName,
      dateOfBirth: player.dateOfBirth ?? fallbackPlayer.dateOfBirth ?? entry?.dateOfBirth,
      height: player.height ?? fallbackPlayer.height ?? entry?.height,
    };
  });

const enrichFallbackLineupWithFifaPictures = (
  fallbackLineup: Player[],
  fifaTeam: FifaLiveTeam | undefined,
  teamCode: string,
): Player[] => {
  const fifaPlayers = fifaTeam?.Players ?? [];

  // Always enrich each local player from the squad registry (picture, socials,
  // instagramPostUrl, worldCupNote, metadata) so the player card is complete even
  // when no live FIFA lineup is available (finished/upcoming matches). When a
  // matching FIFA player exists, also overlay its picture/id/shirt number.
  return fallbackLineup.map((player) => {
    const fifaPlayer = fifaPlayers.length ? findMatchingFifaPlayer(player, fifaPlayers) : undefined;
    const fifaPicture = getFifaPlayerPictureUrl(fifaPlayer);
    const resolved = resolvePlayerEntry(
      teamCode,
      player.name,
      player.number,
      player.fifaId ?? fifaPlayer?.IdPlayer,
    );
    // Only trust the registry entry when it is a confident match (same name or
    // FIFA id) — never a number-only fallback, which could pull a different
    // player's data for a lineup name that isn't in the squad registry.
    const entry =
      resolved &&
      (normalizeText(resolved.name) === normalizeText(player.name) ||
        (player.fifaId !== undefined && resolved.fifaId === player.fifaId) ||
        (fifaPlayer?.IdPlayer !== undefined && resolved.fifaId === fifaPlayer.IdPlayer))
        ? resolved
        : null;

    return {
      ...player,
      fifaId: player.fifaId ?? fifaPlayer?.IdPlayer ?? entry?.fifaId,
      number: fifaPlayer?.ShirtNumber || player.number,
      club: player.club ?? entry?.club,
      pictureUrl: fifaPicture ?? player.pictureUrl ?? entry?.pictureUrl,
      socials: player.socials ?? entry?.socials,
      instagramPostUrl: player.instagramPostUrl ?? entry?.instagramPostUrl,
      instagramPostUrls: player.instagramPostUrls ?? entry?.instagramPostUrls,
      worldCupNote: player.worldCupNote ?? entry?.worldCupNote,
      fullName: player.fullName ?? entry?.fullName,
      dateOfBirth: player.dateOfBirth ?? entry?.dateOfBirth,
      height: player.height ?? entry?.height,
    };
  });
};

const buildPlayerNameMap = (team: FifaLiveTeam | undefined) => {
  const players = team?.Players || [];
  return new Map(
    players.map((player) => [
      player.IdPlayer,
      getBestPlayerName(player.ShortName, getBestPlayerName(player.PlayerName, "Jogador")),
    ]),
  );
};

const buildFifaPlayerMap = (team: FifaLiveTeam | undefined) => {
  const players = team?.Players || [];
  return new Map(players.map((player) => [player.IdPlayer, player]));
};

const toIncidentPlayerMention = (
  fifaPlayer: FifaLivePlayer | undefined,
  fallbackName: string,
  teamCode?: string,
) => {
  const fifaNumber =
    typeof fifaPlayer?.ShirtNumber === "number" ? fifaPlayer.ShirtNumber : undefined;
  const fifaPosition =
    typeof fifaPlayer?.Position === "number"
      ? FIFA_POSITION_TO_LOCAL[fifaPlayer.Position] ?? Position.MF
      : undefined;
  const fifaPicture = getFifaPlayerPictureUrl(fifaPlayer);

  // FIFA's live feed frequently omits the shirt number (and sometimes position
  // and picture) for substitutes and bench scorers, which previously left the
  // player card showing "Camisa 0". Recover the missing fields from the local
  // squad registry, matched by FIFA player id first, then team squad.
  const registryEntry =
    fifaNumber === undefined || fifaPosition === undefined || !fifaPicture
      ? resolvePlayerEntry(teamCode ?? "", fallbackName, fifaNumber ?? -1, fifaPlayer?.IdPlayer)
      : null;

  return {
    id: fifaPlayer?.IdPlayer ?? registryEntry?.fifaId,
    name: fallbackName,
    number: fifaNumber ?? registryEntry?.number ?? undefined,
    position: fifaPosition ?? registryEntry?.position ?? undefined,
    pictureUrl: fifaPicture ?? registryEntry?.pictureUrl,
  };
};

// FIFA `Goal.Type` integer codes seen in the api.fifa.com live feed: 2 = regular
// goal, 3 = own goal (verified against real WC2026 own goals — e.g. Bounou's own
// goal in MAR×HAI). Any other value is treated as a regular goal.
const FIFA_OWN_GOAL_TYPE = 3;

export const getIncidentsFromLiveFifa = (
  fifaMatch: FifaLiveMatch,
  homeTeamCode?: string,
  awayTeamCode?: string,
): CommentaryEvent[] => {
  const homePlayerNames = buildPlayerNameMap(fifaMatch.HomeTeam);
  const awayPlayerNames = buildPlayerNameMap(fifaMatch.AwayTeam);
  const homePlayers = buildFifaPlayerMap(fifaMatch.HomeTeam);
  const awayPlayers = buildFifaPlayerMap(fifaMatch.AwayTeam);
  const teamCodeFor = (team: "A" | "B") => (team === "A" ? homeTeamCode : awayTeamCode);

  // FIFA marks an own goal with `Goal.Type === 3` (regular goals are Type 2). An own
  // goal is credited to the team that benefits (`team`), but its scorer plays for the
  // OPPONENT — so the scorer's IdPlayer resolves in the opponent's roster, not this
  // team's. Resolving against the wrong roster is exactly why it used to read "Jogador
  // marcou"; here we look the scorer up in the opponent's roster and label it clearly.
  const buildGoalIncidents = (
    goals: FifaLiveGoal[] | undefined,
    playerNames: Map<string, string>,
    players: Map<string, FifaLivePlayer>,
    team: "A" | "B",
    oppPlayerNames: Map<string, string>,
    oppPlayers: Map<string, FifaLivePlayer>,
    oppTeam: "A" | "B",
  ) =>
    (goals || []).map((goal, index) => {
      const isOwnGoal = goal.Type === FIFA_OWN_GOAL_TYPE;
      const names = isOwnGoal ? oppPlayerNames : playerNames;
      const playerMap = isOwnGoal ? oppPlayers : players;
      const mentionTeam = isOwnGoal ? oppTeam : team;
      const playerName = goal.IdPlayer ? names.get(goal.IdPlayer) || "Jogador" : "Jogador";
      const text = isOwnGoal
        ? playerName === "Jogador"
          ? "Gol contra."
          : `Gol contra de ${playerName}.`
        : `${playerName} marcou.`;

      return {
        id: `${team}-goal-${goal.IdGoal || `${goal.Minute || "sem-minuto"}-${index}`}`,
        time: goal.Minute || "--'",
        type: "GOAL" as const,
        text,
        team,
        playerMentions: [toIncidentPlayerMention(goal.IdPlayer ? playerMap.get(goal.IdPlayer) : undefined, playerName, teamCodeFor(mentionTeam))],
        period: goal.Period,
      };
    });

  const buildBookingIncidents = (
    bookings: FifaLiveBooking[] | undefined,
    playerNames: Map<string, string>,
    players: Map<string, FifaLivePlayer>,
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
          playerMentions: [
            toIncidentPlayerMention(
              booking.IdPlayer ? players.get(booking.IdPlayer) : undefined,
              playerName,
              teamCodeFor(team),
            ),
          ],
          period: booking.Period,
        };
      });

  const buildSubstitutionIncidents = (
    substitutions: FifaLiveSubstitution[] | undefined,
    playerNames: Map<string, string>,
    players: Map<string, FifaLivePlayer>,
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
        playerMentions: [
          toIncidentPlayerMention(
            substitution.IdPlayerOff ? players.get(substitution.IdPlayerOff) : undefined,
            playerOffName,
            teamCodeFor(team),
          ),
          toIncidentPlayerMention(
            substitution.IdPlayerOn ? players.get(substitution.IdPlayerOn) : undefined,
            playerOnName,
            teamCodeFor(team),
          ),
        ],
        period: substitution.Period,
      };
    });

  return [
    ...buildGoalIncidents(fifaMatch.HomeTeam?.Goals, homePlayerNames, homePlayers, "A", awayPlayerNames, awayPlayers, "B"),
    ...buildGoalIncidents(fifaMatch.AwayTeam?.Goals, awayPlayerNames, awayPlayers, "B", homePlayerNames, homePlayers, "A"),
    ...buildBookingIncidents(fifaMatch.HomeTeam?.Bookings, homePlayerNames, homePlayers, "A"),
    ...buildBookingIncidents(fifaMatch.AwayTeam?.Bookings, awayPlayerNames, awayPlayers, "B"),
    ...buildSubstitutionIncidents(
      fifaMatch.HomeTeam?.Substitutions,
      homePlayerNames,
      homePlayers,
      "A",
    ),
    ...buildSubstitutionIncidents(
      fifaMatch.AwayTeam?.Substitutions,
      awayPlayerNames,
      awayPlayers,
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

// FIFA `OfficialType` integer codes within a match's `Officials` list.
const FIFA_OFFICIAL_TYPE = {
  REFEREE: 1,
  ASSISTANT_1: 2,
  ASSISTANT_2: 3,
  FOURTH_OFFICIAL: 4,
} as const;

// Extracts the main referee from a FIFA calendar match's `Officials` list.
// FIFA assigns referees only a day or two before kickoff and reliably populates
// just the main referee (assistants/VAR are sparse), so we surface that one.
// Returns undefined when no referee has been assigned/published yet.
export const getRefereeFromFifa = (
  fifaMatch: FifaCalendarMatch | undefined,
  language = "pt",
): MatchReferee | undefined => {
  const referee = fifaMatch?.Officials?.find(
    (official) => official.OfficialType === FIFA_OFFICIAL_TYPE.REFEREE,
  );
  if (!referee) return undefined;

  const name =
    getLocalizedDescription(referee.Name, language) ||
    getLocalizedDescription(referee.NameShort, language);
  if (!name) return undefined;

  return {
    name,
    country: referee.IdCountry || undefined,
    fifaOfficialId: referee.OfficialId || undefined,
  };
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
      penaltyScore: localMatch.penaltyScore,
      source: "fallback",
      note: "Dados oficiais da FIFA indisponíveis para esta partida no momento; exibindo o estado local.",
      updatedAt: new Date().toISOString(),
    };
  }

  const fifaScore = getScoreFromFifa(fifaMatch);
  const liveScore = fifaLiveMatch ? getScoreFromLiveFifa(fifaLiveMatch) : undefined;
  const penaltyScore = getPenaltyScoreFromFifa(fifaMatch, fifaLiveMatch);
  const incidents = fifaLiveMatch
    ? getIncidentsFromLiveFifa(fifaLiveMatch, localMatch.teamA.code, localMatch.teamB.code)
    : undefined;
  const status = fifaLiveMatch
    ? getMatchStatusFromFifa(localMatch, {
        ...fifaMatch,
        Date: fifaLiveMatch.Date || fifaMatch.Date,
        MatchStatus: fifaLiveMatch.MatchStatus ?? fifaMatch.MatchStatus,
        HomeTeamScore: liveScore?.teamA ?? fifaMatch.HomeTeamScore,
        AwayTeamScore: liveScore?.teamB ?? fifaMatch.AwayTeamScore,
      })
    : getMatchStatusFromFifa(localMatch, fifaMatch);

  const officialStatus = getOfficialFifaStatusLabel(
    fifaLiveMatch?.MatchStatus ?? fifaMatch.MatchStatus,
    fifaLiveMatch?.Period,
  );

  return {
    status,
    score: liveScore || fifaScore || (status === "PRE_GAME" ? undefined : localMatch.score),
    penaltyScore: status === "PRE_GAME" ? undefined : penaltyScore,
    matchTime:
      status === "LIVE" && fifaLiveMatch?.MatchTime ? fifaLiveMatch.MatchTime : undefined,
    officialStatus,
    referee: getRefereeFromFifa(fifaMatch),
    incidents: incidents && incidents.length > 0 ? incidents : undefined,
    source: "fifa",
    note:
      status === "SUSPENDED"
        ? "Jogo paralisado — placar e situação oficiais da FIFA."
        : fifaLiveMatch
          ? incidents && incidents.length > 0
            ? "Placar, status e lances oficiais da FIFA com atualização ao vivo."
            : "Placar e status oficiais da FIFA com atualização ao vivo."
          : "Placar e status oficiais da FIFA.",
    fifaMatchId: fifaMatch.IdMatch,
    updatedAt: new Date().toISOString(),
  };
};

const FIFA_POSITION_TO_LOCAL: Record<number, Position> = {
  0: Position.GK,
  1: Position.DF,
  2: Position.MF,
  3: Position.FW,
};

// Distance (in y%) between consecutive outfield rows, GK closest to its own
// goal line (y=88) and the last row closest to the opponent's goal (y=18).
const GK_Y = 88;
const FIRST_ROW_Y = 72;
const LAST_ROW_Y = 18;

// Parses a FIFA "Tactics" formation string (e.g. "4-1-2-3") into an array of
// outfield row sizes. Returns null when the string is missing, malformed, or
// doesn't add up to 10 outfield players (i.e. 11 with the goalkeeper).
export const parseFormation = (tactics: string | null | undefined): number[] | null => {
  if (!tactics) return null;

  const rows = tactics.split("-").map((part) => Number.parseInt(part, 10));
  if (rows.length < 2 || rows.some((count) => !Number.isFinite(count) || count <= 0)) {
    return null;
  }

  const total = rows.reduce((sum, count) => sum + count, 0);
  return total === 10 ? rows : null;
};

// Maps a parsed formation to pitch coordinates for the goalkeeper followed by
// each outfield row, ordered to match the FIFA starting-XI player ordering
// (GK, then defenders, then midfield rows, then forwards).
export const getFormationCoordinates = (formation: number[]): { x: number; y: number }[] => {
  const coords: { x: number; y: number }[] = [{ x: 50, y: GK_Y }];
  const rowCount = formation.length;

  formation.forEach((count, rowIndex) => {
    const y =
      rowCount === 1
        ? Math.round((FIRST_ROW_Y + LAST_ROW_Y) / 2)
        : Math.round(FIRST_ROW_Y - (rowIndex * (FIRST_ROW_Y - LAST_ROW_Y)) / (rowCount - 1));

    for (let i = 0; i < count; i++) {
      const x = count === 1 ? 50 : Math.round(12 + (i * (88 - 12)) / (count - 1));
      coords.push({ x, y });
    }
  });

  return coords;
};

// Derives the starting XI from a FIFA live-match team payload. FIFA orders
// the squad GK first, then defenders, midfielders, and forwards, with the
// first 11 entries forming the starting lineup whose position counts match
// the team's `Tactics` formation. Returns null when the squad/tactics data
// isn't usable (e.g. lineup not announced yet, formation not parseable).
export const getStartingLineupFromLiveFifa = (
  team: FifaLiveTeam | undefined,
): Player[] | null => {
  const players = team?.Players;
  if (!players || players.length < 11) return null;

  const formation = parseFormation(team?.Tactics);
  if (!formation) return null;

  const starters = players.slice(0, 11);
  const counts = [0, 0, 0, 0];
  for (const player of starters) {
    if (typeof player.Position === "number" && player.Position >= 0 && player.Position <= 3) {
      counts[player.Position] += 1;
    }
  }

  if (counts[0] !== 1) return null;

  const expectedDefenders = formation[0];
  const expectedMidfielders = formation.slice(1, -1).reduce((sum, count) => sum + count, 0);
  const expectedForwards = formation[formation.length - 1];

  // When position counts don't match the declared formation (e.g. wing-backs
  // classified as DF in a 3-back system), derive coordinates from actual
  // counts rather than rejecting the lineup entirely.
  const coordFormation =
    counts[1] === expectedDefenders &&
    counts[2] === expectedMidfielders &&
    counts[3] === expectedForwards
      ? formation
      : [counts[1], counts[2], counts[3]];

  if (coordFormation.reduce((s, n) => s + n, 0) !== 10) return null;

  const coords = getFormationCoordinates(coordFormation);

  return starters.map((player, index) => ({
    id: player.IdPlayer,
    fifaId: player.IdPlayer,
    captain: player.Captain ?? false,
    name: getBestPlayerName(player.ShortName, getBestPlayerName(player.PlayerName, "Jogador")),
    number: player.ShirtNumber || 0,
    position: FIFA_POSITION_TO_LOCAL[player.Position ?? 2] ?? Position.MF,
    x: coords[index]?.x ?? 50,
    y: coords[index]?.y ?? 50,
    pictureUrl: getFifaPlayerPictureUrl(player),
  }));
};

// Builds a LineupEntry for one team, preferring the FIFA-announced starting
// XI and falling back to the local matches.json lineup when FIFA hasn't
// published one yet (e.g. more than ~1h before kickoff) or is unavailable.
export const buildTeamLineupEntry = (
  teamCode: string,
  fallbackLineup: Player[],
  fifaMatch: FifaCalendarMatch | undefined,
  fifaTeam: FifaLiveTeam | undefined,
): LineupEntry => {
  const starters = getStartingLineupFromLiveFifa(fifaTeam);

  if (starters) {
    return {
      players: mergeLineupWithLocalMetadata(starters, fallbackLineup, teamCode),
      source: "fifa",
      note: "Escalação oficial divulgada pela FIFA.",
      fifaMatchId: fifaMatch?.IdMatch,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    players: enrichFallbackLineupWithFifaPictures(fallbackLineup, fifaTeam, teamCode),
    source: "fallback",
    note: fifaMatch
      ? "Escalação oficial da FIFA ainda não divulgada; exibindo dados locais."
      : "Dados oficiais da FIFA indisponíveis para esta partida no momento; exibindo dados locais.",
    fifaMatchId: fifaMatch?.IdMatch,
    updatedAt: new Date().toISOString(),
  };
};

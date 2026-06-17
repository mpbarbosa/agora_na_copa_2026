import {
  useState,
  useEffect,
  useRef,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Match,
  MatchStatus,
  MatchOverlayEntry,
  CommentaryEvent,
  TeamRef,
  type LineupEntry,
  Position,
  type Player,
} from "../types";
import { APP_MATCHES } from "../appMatches";
import MATCH_VIDEOS from "../data/matchVideos.json";
import type { TeamLineupsMap } from "../utils/teamLineup";
import { FlagIcon } from "./FlagIcon";
import { PlayerOverlayCard, PlayerPictureOverlay, buildTournamentStatCells, getPlayerAge, formatBirthDate } from "./PlayerOverlayCard";
import { usePlayerStats } from "../hooks/usePlayerStats";
import { getPositionLabel } from "../utils/playerDisplay";
import { PitchLineup } from "./PitchLineup";
import { useClockTick } from "../hooks/useClockTick";
import {
  MapPin,
  Settings,
  Edit3,
  Goal,
  ShieldAlert,
  CircleDot,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Header match-selector groups, split by match status
const MATCH_STATUS_GROUPS: { status: MatchStatus; label: string }[] = [
  { status: "FINISHED", label: "Jogos concluídos: " },
  { status: "LIVE", label: "Jogos atuais: " },
  { status: "PRE_GAME", label: "Próximos jogos: " },
];

const HEADER_MATCH_STATUS_GROUPS = MATCH_STATUS_GROUPS.filter(
  ({ status }) => status !== "FINISHED",
);

const DEFAULT_MATCH_OVERLAY_REFRESH_INTERVAL_MS = 15 * 1000;
const DEMO_MATCH_ID = "bra-mar-2026";
const INITIAL_MATCHES_BY_ID = new Map(
  APP_MATCHES.map((match) => [match.id, match]),
);


interface IncidentPlayerSelection {
  player: Player;
  team: Match["teamA"];
  opponentName: string;
}

interface IncidentRenderablePlayer {
  token: string;
  selection: IncidentPlayerSelection;
}

interface SimulatedMatchState {
  status: MatchStatus;
  score?: {
    teamA: number;
    teamB: number;
  };
  matchTime?: string;
  incidents: CommentaryEvent[];
  updatedAt: string;
}

// Live match takes priority; otherwise the soonest match that hasn't kicked off yet
function getInitialMatchId(matches: Match[]): string {
  const liveMatch = matches.find((m) => m.status === "LIVE");
  if (liveMatch) return liveMatch.id;

  const upcoming = matches
    .filter((m) => m.status === "PRE_GAME")
    .sort(
      (a, b) =>
        new Date(a.kickoffTimestamp).getTime() -
        new Date(b.kickoffTimestamp).getTime(),
    );
  if (upcoming.length > 0) return upcoming[0].id;

  return matches[0].id;
}

function getBroadcasterBadgeLabel(name: string) {
  return name
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(2, "•");
}

function formatCountryNameForTooltip(name: string) {
  const lowercaseWords = new Set(["e", "de", "da", "do", "dos", "das"]);

  return name
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((word, index) => {
      if (!word) return word;
      if (index > 0 && lowercaseWords.has(word)) return word;

      return word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1);
    })
    .join(" ");
}

function getIncidentLabel(type: CommentaryEvent["type"]) {
  switch (type) {
    case "GOAL":
      return "GOL";
    case "YELLOW_CARD":
      return "AM";
    case "RED_CARD":
      return "VM";
    case "SUBSTITUTION":
      return "SUB";
    default:
      return "LANCE";
  }
}

function getIncidentAccentClass(
  type: CommentaryEvent["type"],
  theme: "classic-light" | "stadium-dark",
) {
  if (type === "GOAL") {
    return theme === "classic-light"
      ? "border-[#009c3b]/25 bg-[#009c3b]/10 text-[#007a2f]"
      : "border-[#00e476]/20 bg-[#00e476]/10 text-[#a7e6bf]";
  }

  if (type === "YELLOW_CARD") {
    return theme === "classic-light"
      ? "border-[#d4a017]/25 bg-[#ffd84d]/15 text-[#9a6a00]"
      : "border-[#ffd84d]/20 bg-[#ffd84d]/10 text-[#ffe58b]";
  }

  if (type === "RED_CARD") {
    return theme === "classic-light"
      ? "border-[#c1121f]/25 bg-[#ed2939]/10 text-[#9f1239]"
      : "border-[#ed2939]/20 bg-[#ed2939]/10 text-[#ff9cab]";
  }

  return theme === "classic-light"
    ? "border-slate-200 bg-slate-100 text-slate-700"
    : "border-white/10 bg-white/10 text-slate-200";
}

function getIncidentCardClass(
  type: CommentaryEvent["type"],
  theme: "classic-light" | "stadium-dark",
) {
  if (type === "GOAL") {
    return theme === "classic-light"
      ? "border-[#009c3b]/30 bg-[linear-gradient(135deg,rgba(0,156,59,0.12),rgba(255,216,77,0.18))] shadow-[0_14px_34px_rgba(0,156,59,0.12)]"
      : "border-[#ffd84d]/25 bg-[linear-gradient(135deg,rgba(255,216,77,0.12),rgba(0,228,118,0.14))] shadow-[0_16px_36px_rgba(255,216,77,0.08)]";
  }

  return theme === "classic-light"
    ? "bg-white border-slate-200"
    : "bg-[#161919] border-white/10";
}

function getIncidentTextClass(
  type: CommentaryEvent["type"],
  theme: "classic-light" | "stadium-dark",
) {
  if (type === "GOAL") {
    return theme === "classic-light"
      ? "text-slate-900 text-base font-semibold"
      : "text-white text-base font-semibold";
  }

  return theme === "classic-light"
    ? "text-slate-700 text-sm"
    : "text-slate-100 text-sm";
}

function normalizePlayerLookupText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .toUpperCase();
}

function getNormalizedNameParts(value: string) {
  return normalizePlayerLookupText(value).split(/\s+/).filter(Boolean);
}

function isIncidentPlayerNameMatch(playerName: string, incidentName: string) {
  const normalizedPlayer = normalizePlayerLookupText(playerName);
  const normalizedIncident = normalizePlayerLookupText(incidentName);
  if (!normalizedPlayer || !normalizedIncident) {
    return false;
  }

  if (
    normalizedPlayer === normalizedIncident ||
    normalizedPlayer.includes(normalizedIncident) ||
    normalizedIncident.includes(normalizedPlayer)
  ) {
    return true;
  }

  const playerParts = getNormalizedNameParts(playerName);
  const incidentParts = getNormalizedNameParts(incidentName);
  if (playerParts.length === 0 || incidentParts.length === 0) {
    return false;
  }

  const playerSurname = playerParts.at(-1);
  const incidentSurname = incidentParts.at(-1);
  if (playerSurname && incidentSurname && playerSurname === incidentSurname) {
    const playerFirst = playerParts[0] || "";
    const incidentFirst = incidentParts[0] || "";
    return (
      playerFirst === incidentFirst ||
      playerFirst.startsWith(incidentFirst) ||
      incidentFirst.startsWith(playerFirst)
    );
  }

  return false;
}

function getIncidentPlayerTokens(incident: CommentaryEvent) {
  if (incident.type === "GOAL") {
    const match = incident.text.match(/^(.+?) marcou\.$/);
    return match ? [match[1]] : [];
  }

  if (incident.type === "YELLOW_CARD") {
    const match = incident.text.match(/^(.+?) recebeu amarelo\.$/);
    return match ? [match[1]] : [];
  }

  if (incident.type === "RED_CARD") {
    const match = incident.text.match(/^(.+?) foi expulso\.$/);
    return match ? [match[1]] : [];
  }

  if (incident.type === "SUBSTITUTION") {
    const match = incident.text.match(/^Sai (.+?), entra (.+?)\.$/);
    return match ? [match[1], match[2]] : [];
  }

  return [];
}

function buildIncidentPlayerSelections(
  incident: CommentaryEvent,
  match: Match,
  lineupEntry: { teamA: LineupEntry; teamB: LineupEntry } | undefined,
) {
  if (!incident.team) {
    return [];
  }

  const team = incident.team === "A" ? match.teamA : match.teamB;
  const opponentName = incident.team === "A" ? match.teamB.name : match.teamA.name;
  const lineup =
    incident.team === "A"
      ? lineupEntry?.teamA.players ?? match.teamA.lineup
      : lineupEntry?.teamB.players ?? match.teamB.lineup;
  const incidentTokens = getIncidentPlayerTokens(incident);

  const metadataSelections = (incident.playerMentions ?? [])
    .map((mention, index) => {
      const fallbackPlayer = lineup.find(
        (candidate) =>
          (mention.id && candidate.id === mention.id) ||
          isIncidentPlayerNameMatch(candidate.name, mention.name),
      );

      const player =
        fallbackPlayer ??
        ({
          id: mention.id ?? `${team.code.toLowerCase()}-${normalizePlayerLookupText(mention.name).replace(/\s+/g, "-")}`,
          name: mention.name,
          number: mention.number ?? 0,
          position: mention.position ?? Position.MF,
          x: 50,
          y: 50,
          pictureUrl: mention.pictureUrl,
        } satisfies Player);
      return {
        token: incidentTokens[index] ?? mention.name,
        selection: {
          player: {
            ...player,
            club: player.club ?? fallbackPlayer?.club,
            socials: player.socials ?? fallbackPlayer?.socials,
            pictureUrl: mention.pictureUrl ?? player.pictureUrl ?? fallbackPlayer?.pictureUrl,
          },
          team,
          opponentName,
        },
      } satisfies IncidentRenderablePlayer;
    })
    .filter((entry) => Boolean(entry.selection.player.name));

  if (metadataSelections.length > 0) {
    return metadataSelections;
  }

  return incidentTokens
    .map((token) => {
      const player = lineup.find((candidate) =>
        isIncidentPlayerNameMatch(candidate.name, token),
      );
      if (!player) {
        return null;
      }

      return {
        token,
        selection: {
          player,
          team,
          opponentName,
        },
      } satisfies IncidentRenderablePlayer;
    })
    .filter((entry): entry is IncidentRenderablePlayer => Boolean(entry));
}

function getMatchCountdownSeconds(match: Match, now: Date, customSeconds: number) {
  if (match.id === DEMO_MATCH_ID) {
    return Math.max(0, customSeconds);
  }

  if (match.status !== "PRE_GAME") {
    return 0;
  }

  const kickoffTime = new Date(match.kickoffTimestamp).getTime();
  if (Number.isNaN(kickoffTime)) {
    return Math.max(0, match.countdownTargetSeconds);
  }

  return Math.max(0, Math.floor((kickoffTime - now.getTime()) / 1000));
}

function applySimulatedState(match: Match, simulation: SimulatedMatchState | undefined): Match {
  if (!simulation) {
    return match;
  }

  return {
    ...match,
    status: simulation.status,
    score: simulation.score,
    matchTime: simulation.matchTime,
  };
}

function parseMinuteLabel(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseInt(value.replace(/\D/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMinuteLabel(minute: number) {
  return `${Math.max(1, minute)}'`;
}

function getMatchGroupLabel(match: Match) {
  if (match.stageName !== "Group Stage") {
    return null;
  }

  return match.teamA.group === match.teamB.group ? match.teamA.group : match.teamA.group || null;
}

function formatBrasiliaTime(date: Date) {
  return date.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatOverlayUpdatedAt(value: string | undefined) {
  if (!value) {
    return "Atualização pendente";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Atualização indisponível";
  }

  return `Atualizado ${date.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}

function formatCountdown(totalSecs: number) {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

interface StoredIncidentPlayerKey {
  id?: string;
  name: string;
  pictureUrl?: string;
}

interface StoredIncidentPlayer {
  playerKey: StoredIncidentPlayerKey;
  team: Match["teamA"];
  opponentName: string;
}

interface IncidentTextProps {
  incident: CommentaryEvent;
  match: Match;
  lineupEntry: { teamA: LineupEntry; teamB: LineupEntry } | undefined;
  theme: "classic-light" | "stadium-dark";
  onSelectPlayer: (selection: IncidentPlayerSelection) => void;
}

function IncidentText({ incident, match, lineupEntry, theme, onSelectPlayer }: IncidentTextProps) {
  const renderablePlayers = buildIncidentPlayerSelections(incident, match, lineupEntry);

  if (renderablePlayers.length === 0) {
    return <>{incident.text}</>;
  }

  const incidentPlayerButtonClasses =
    theme === "classic-light"
      ? "inline-flex items-center rounded-md border border-[#065f2c]/15 bg-[#065f2c]/8 px-1.5 py-0.5 font-semibold text-[#065f2c] underline decoration-[#065f2c]/35 underline-offset-4 transition hover:border-[#065f2c]/30 hover:bg-[#065f2c]/12 hover:text-[#0a7f3f]"
      : "inline-flex items-center rounded-md border border-[#ffd84d]/15 bg-[#ffd84d]/10 px-1.5 py-0.5 font-semibold text-[#ffd84d] underline decoration-[#ffd84d]/35 underline-offset-4 transition hover:border-[#ffd84d]/35 hover:bg-[#ffd84d]/15 hover:text-[#ffe58b]";

  if (
    (incident.type === "GOAL" ||
      incident.type === "YELLOW_CARD" ||
      incident.type === "RED_CARD") &&
    renderablePlayers[0]
  ) {
    const [entry] = renderablePlayers;
    const suffix =
      incident.type === "GOAL"
        ? " marcou."
        : incident.type === "YELLOW_CARD"
          ? " recebeu amarelo."
          : " foi expulso.";

    return (
      <>
        <button
          type="button"
          id={`btn-incident-player-${incident.id}-0`}
          onClick={() => onSelectPlayer(entry.selection)}
          className={`transition ${incidentPlayerButtonClasses}`}
        >
          {entry.token}
        </button>
        {suffix}
      </>
    );
  }

  if (incident.type === "SUBSTITUTION" && renderablePlayers.length >= 2) {
    return (
      <>
        Sai{" "}
        <button
          type="button"
          id={`btn-incident-player-${incident.id}-0`}
          onClick={() => onSelectPlayer(renderablePlayers[0].selection)}
          className={`transition ${incidentPlayerButtonClasses}`}
        >
          {renderablePlayers[0].token}
        </button>
        {", entra "}
        <button
          type="button"
          id={`btn-incident-player-${incident.id}-1`}
          onClick={() => onSelectPlayer(renderablePlayers[1].selection)}
          className={`transition ${incidentPlayerButtonClasses}`}
        >
          {renderablePlayers[1].token}
        </button>
        .
      </>
    );
  }

  return <>{incident.text}</>;
}

interface MatchOverlaysApiResponse {
  refreshAfterMs?: number;
  overlays: Record<string, MatchOverlayEntry>;
}

interface MatchDetailViewProps {
  matches: Match[];
  setMatches: Dispatch<SetStateAction<Match[]>>;
  theme: "classic-light" | "stadium-dark";
  onSelectTeamLineup: (team: TeamRef) => void;
  onOpenStandingsGroup: (group: string) => void;
  teamLineups: TeamLineupsMap;
}

export function MatchDetailView({
  matches,
  setMatches,
  theme,
  onSelectTeamLineup,
  onOpenStandingsGroup,
  teamLineups,
}: MatchDetailViewProps) {
  const [matchOverlays, setMatchOverlays] = useState<
    Record<string, MatchOverlayEntry>
  >({});
  const [simulatedMatchStates, setSimulatedMatchStates] = useState<
    Record<string, SimulatedMatchState>
  >({});
  const [selectedMatchId, setSelectedMatchId] = useState<string>(() =>
    getInitialMatchId(matches),
  );
  const [matchSelectionMode, setMatchSelectionMode] = useState<"auto" | "manual">(
    "auto",
  );
  const [activeTab, setActiveTab] = useState<"broadcast" | "lineup">(
    "broadcast",
  );
  // Custom interactive test parameters for custom mock simulations
  const [showConfig, setShowConfig] = useState(false);
  const [customKickoffTime, setCustomKickoffTime] = useState("16:00");
  const [customCountdownSeconds, setCustomCountdownSeconds] = useState(
    15 * 3600 + 2 * 60 + 3,
  ); // 15:02:03 default
  const [storedIncidentPlayer, setStoredIncidentPlayer] = useState<StoredIncidentPlayer | null>(null);
  const [expandedIncidentPlayerKey, setExpandedIncidentPlayerKey] = useState<StoredIncidentPlayerKey | null>(null);
  const incidentPlayerStats = usePlayerStats(
    storedIncidentPlayer?.team.code,
    storedIncidentPlayer?.playerKey.name,
  );
  const simulatedMatchStatesRef = useRef(simulatedMatchStates);
  const matchSelectorRailRefs = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    simulatedMatchStatesRef.current = simulatedMatchStates;
  }, [simulatedMatchStates]);
  const currentMatch =
    matches.find((m) => m.id === selectedMatchId) || matches[0];
  const currentSimulatedState = simulatedMatchStates[currentMatch.id];
  const currentOverlay = matchOverlays[currentMatch.id];
  const currentLineupEntry = teamLineups[currentMatch.id];
  const visibleBroadcasters = currentMatch.broadcasters;
  const currentIncidents =
    currentSimulatedState?.incidents || currentOverlay?.matchState.incidents || [];
  const visibleIncidents = [...currentIncidents].reverse();
  const shouldScrollIncidents = visibleIncidents.length > 6;
  const hasCurrentMatchScore = Boolean(currentMatch.score);
  const currentMatchScoreText = currentMatch.score
    ? `${currentMatch.score.teamA} x ${currentMatch.score.teamB}`
    : null;
  const currentMatchMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${currentMatch.stadiumName}, ${currentMatch.city}`,
  )}`;
  const currentOverlayUpdatedAt = [
    currentSimulatedState?.updatedAt,
    currentOverlay?.broadcastGuide.updatedAt,
    currentOverlay?.matchState.updatedAt,
  ]
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  const currentOverlaySourceLabel =
    currentSimulatedState
      ? "Simulação local"
      : currentOverlay?.broadcastGuide.source === "fifa" &&
          currentOverlay?.matchState.source === "fifa"
      ? "FIFA oficial"
      : "Fallback local";
  const currentMatchGroupLabel = getMatchGroupLabel(currentMatch);
  const headerMatchGroups = HEADER_MATCH_STATUS_GROUPS.map(({ status, label }) => ({
    status,
    label,
    matches: matches
      .filter((match) => match.status === status)
      .sort(
        (a, b) =>
          new Date(a.kickoffTimestamp).getTime() -
          new Date(b.kickoffTimestamp).getTime(),
      ),
  })).filter(({ matches: statusMatches }) => statusMatches.length > 0);
  const hasLiveHeaderGroup = headerMatchGroups.some(({ status }) => status === "LIVE");
  const hasUpcomingHeaderGroup = headerMatchGroups.some(({ status }) => status === "PRE_GAME");
  const currentLineupPlayers = useMemo(
    () =>
      currentLineupEntry
        ? [...currentLineupEntry.teamA.players, ...currentLineupEntry.teamB.players]
        : [...currentMatch.teamA.lineup, ...currentMatch.teamB.lineup],
    [currentLineupEntry, currentMatch],
  );

  const resolvePlayerFromKey = (key: StoredIncidentPlayerKey): Player => {
    const found = currentLineupPlayers.find(
      (p) =>
        (key.id !== undefined && p.id === key.id) ||
        isIncidentPlayerNameMatch(p.name, key.name),
    );
    return found ?? {
      id: key.id ?? `ref-${normalizePlayerLookupText(key.name).replace(/\s+/g, "-")}`,
      name: key.name,
      number: 0,
      position: Position.MF,
      x: 50,
      y: 50,
      pictureUrl: key.pictureUrl,
    };
  };

  const selectedIncidentPlayer: IncidentPlayerSelection | null = storedIncidentPlayer
    ? {
        player: resolvePlayerFromKey(storedIncidentPlayer.playerKey),
        team: storedIncidentPlayer.team,
        opponentName: storedIncidentPlayer.opponentName,
      }
    : null;

  const expandedIncidentPlayer: Player | null = expandedIncidentPlayerKey
    ? resolvePlayerFromKey(expandedIncidentPlayerKey)
    : null;

  const setMatchSelectorRailRef = (railKey: string, node: HTMLDivElement | null) => {
    if (node) {
      matchSelectorRailRefs.current[railKey] = node;
      return;
    }

    delete matchSelectorRailRefs.current[railKey];
  };

  const scrollMatchSelectorRail = (railKey: string, direction: "prev" | "next") => {
    const rail = matchSelectorRailRefs.current[railKey];
    if (!rail) {
      return;
    }

    const offset = Math.max(rail.clientWidth * 0.72, 180);
    rail.scrollBy({
      left: direction === "next" ? offset : -offset,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    for (const rail of Object.values(matchSelectorRailRefs.current) as Array<
      HTMLDivElement | null
    >) {
      const selectedButton = rail?.querySelector<HTMLButtonElement>(
        `#btn-match-${selectedMatchId}`,
      );
      if (!selectedButton) {
        continue;
      }

      selectedButton.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      return;
    }
  }, [selectedMatchId]);

  const hasClickableIncidentPlayers = visibleIncidents.some(
    (incident) =>
      buildIncidentPlayerSelections(incident, currentMatch, currentLineupEntry).length > 0,
  );

  const currentTime = useClockTick();
  const secondsRemaining = getMatchCountdownSeconds(
    currentMatch,
    currentTime,
    customCountdownSeconds,
  );

  useEffect(() => {
    if (matchSelectionMode !== "auto") {
      return;
    }

    const preferredMatchId = getInitialMatchId(matches);
    if (preferredMatchId !== selectedMatchId) {
      setSelectedMatchId(preferredMatchId);
      setStoredIncidentPlayer(null);
      setExpandedIncidentPlayerKey(null);
    }
  }, [matches, matchSelectionMode, selectedMatchId]);

  const handleSelectMatch = (matchId: string) => {
    setMatchSelectionMode("manual");
    setSelectedMatchId(matchId);
    setStoredIncidentPlayer(null);
    setExpandedIncidentPlayerKey(null);
  };

  useEffect(() => {
    let active = true;
    let timeoutId: number | undefined;
    let requestInFlight = false;

    const clearScheduledLoad = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };

    const isPageVisible = () =>
      typeof document === "undefined" || document.visibilityState === "visible";

    const scheduleNextLoad = (refreshAfterMs?: number) => {
      if (!isPageVisible()) {
        return;
      }

      const delay =
        typeof refreshAfterMs === "number" && refreshAfterMs > 0
          ? refreshAfterMs
          : DEFAULT_MATCH_OVERLAY_REFRESH_INTERVAL_MS;

      clearScheduledLoad();
      timeoutId = window.setTimeout(() => {
        void loadMatchOverlays();
      }, delay);
    };

    const loadMatchOverlays = async () => {
      if (!active || requestInFlight) {
        return;
      }

      requestInFlight = true;

      try {
        const response = await fetch("/api/match-overlays");
        if (!response.ok) {
          throw new Error("Falha ao atualizar dados da FIFA.");
        }

        const data: MatchOverlaysApiResponse = await response.json();
        if (!active) return;

        setMatchOverlays(data.overlays);
        setMatches((prev) =>
          prev.map((match) =>
            applySimulatedState(
              data.overlays[match.id]
                ? {
                    ...match,
                    broadcasters: data.overlays[match.id].broadcastGuide.broadcasters,
                    status: data.overlays[match.id].matchState.status,
                    score: data.overlays[match.id].matchState.score,
                    matchTime: data.overlays[match.id].matchState.matchTime,
                  }
                : match,
              simulatedMatchStatesRef.current[match.id],
            ),
          ),
        );
        scheduleNextLoad(data.refreshAfterMs);
      } catch (error) {
        console.error(error);
        scheduleNextLoad();
      } finally {
        requestInFlight = false;
      }
    };

    const handlePageVisible = () => {
      if (!active || !isPageVisible()) {
        return;
      }

      clearScheduledLoad();
      void loadMatchOverlays();
    };

    void loadMatchOverlays();
    window.addEventListener("focus", handlePageVisible);
    document.addEventListener("visibilitychange", handlePageVisible);

    return () => {
      active = false;
      clearScheduledLoad();
      window.removeEventListener("focus", handlePageVisible);
      document.removeEventListener("visibilitychange", handlePageVisible);
    };
  }, []);

  // Custom edit mode to test different lineups
  const handleUpdateKickoff = () => {
    const updatedAt = new Date().toISOString();

    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === currentMatch.id) {
          return {
            ...m,
            kickoffTime: customKickoffTime,
            status: m.id === DEMO_MATCH_ID ? "PRE_GAME" : m.status,
            score: m.id === DEMO_MATCH_ID ? undefined : m.score,
            matchTime: m.id === DEMO_MATCH_ID ? undefined : m.matchTime,
            countdownTargetSeconds:
              m.id === DEMO_MATCH_ID ? customCountdownSeconds : m.countdownTargetSeconds,
          };
        }
        return m;
      }),
    );

    if (currentMatch.id === DEMO_MATCH_ID) {
      setSimulatedMatchStates((prev) => ({
        ...prev,
        [currentMatch.id]: {
          status: "PRE_GAME",
          score: undefined,
          matchTime: undefined,
          incidents: [],
          updatedAt,
        },
      }));
    }

  };

  const updateSimulatedCurrentMatch = (
    buildNextState: (base: SimulatedMatchState | undefined) => SimulatedMatchState,
  ) => {
    const nextState = buildNextState(simulatedMatchStatesRef.current[currentMatch.id]);

    setSimulatedMatchStates((prev) => ({
      ...prev,
      [currentMatch.id]: nextState,
    }));
    simulatedMatchStatesRef.current = {
      ...simulatedMatchStatesRef.current,
      [currentMatch.id]: nextState,
    };

    setMatches((prev) =>
      prev.map((match) =>
        match.id === currentMatch.id ? applySimulatedState(match, nextState) : match,
      ),
    );
  };

  const createIncident = (
    type: CommentaryEvent["type"],
    team: "A" | "B",
    minute: number,
  ): CommentaryEvent => {
    const teamName = team === "A" ? currentMatch.teamA.name : currentMatch.teamB.name;
    const lineup =
      team === "A"
        ? currentLineupEntry?.teamA.players ?? currentMatch.teamA.lineup
        : currentLineupEntry?.teamB.players ?? currentMatch.teamB.lineup;
    const defenders = lineup.filter((player) => player.position === Position.DF);
    const midfielders = lineup.filter((player) => player.position === Position.MF);
    const forwards = lineup.filter((player) => player.position === Position.FW);
    const goalkeepers = lineup.filter((player) => player.position === Position.GK);
    const attackingPool = [...forwards, ...midfielders, ...defenders, ...goalkeepers];
    const disciplinePool = [...defenders, ...midfielders, ...forwards, ...goalkeepers];
    const substitutionPool = [...midfielders, ...forwards, ...defenders, ...goalkeepers];
    const getPoolPlayer = (pool: Player[], offset = 0) =>
      pool.length > 0 ? pool[(minute + offset) % pool.length] : null;
    const scoringPlayer = getPoolPlayer(attackingPool);
    const bookedPlayer = getPoolPlayer(disciplinePool);
    const sentOffPlayer = getPoolPlayer(disciplinePool, 1);
    const playerOff = getPoolPlayer(substitutionPool);
    const playerOn = getPoolPlayer(substitutionPool, 1);

    const texts: Record<CommentaryEvent["type"], string> = {
      GOAL: scoringPlayer
        ? `${scoringPlayer.name} marcou.`
        : `Gol da simulação para ${teamName}. A tabela do grupo foi recalculada na hora.`,
      YELLOW_CARD: bookedPlayer
        ? `${bookedPlayer.name} recebeu amarelo.`
        : `Cartão amarelo para ${teamName} na pressão da simulação.`,
      RED_CARD: sentOffPlayer
        ? `${sentOffPlayer.name} foi expulso.`
        : `Cartão vermelho para ${teamName} em lance recriado localmente.`,
      SUBSTITUTION:
        playerOff && playerOn && playerOff.id !== playerOn.id
          ? `Sai ${playerOff.name}, entra ${playerOn.name}.`
          : `Substituição simulada para ${teamName}.`,
      WHISTLE: `Apito simulado em ${teamName}.`,
      COMMENT: `Atualização local para ${teamName}.`,
    };

    return {
      id: `sim-${currentMatch.id}-${type}-${team}-${minute}-${Date.now()}`,
      time: formatMinuteLabel(minute),
      type,
      team,
      text: texts[type],
    };
  };

  const handleStartSimulation = () => {
    updateSimulatedCurrentMatch((base) => ({
      status: "LIVE",
      score: base?.score ?? currentMatch.score ?? { teamA: 0, teamB: 0 },
      matchTime: base?.matchTime ?? currentMatch.matchTime ?? "01'",
      incidents: base?.incidents ?? [],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleSimulatedGoal = (team: "A" | "B") => {
    updateSimulatedCurrentMatch((base) => {
      const nextMinute = parseMinuteLabel(base?.matchTime ?? currentMatch.matchTime) + 4;
      const previousScore = base?.score ?? currentMatch.score ?? { teamA: 0, teamB: 0 };
      const nextScore = {
        teamA: previousScore.teamA + (team === "A" ? 1 : 0),
        teamB: previousScore.teamB + (team === "B" ? 1 : 0),
      };

      return {
        status: "LIVE",
        score: nextScore,
        matchTime: formatMinuteLabel(nextMinute),
        incidents: [...(base?.incidents ?? []), createIncident("GOAL", team, nextMinute)],
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleSimulatedCard = (
    type: "YELLOW_CARD" | "RED_CARD",
    team: "A" | "B",
  ) => {
    updateSimulatedCurrentMatch((base) => {
      const nextMinute = parseMinuteLabel(base?.matchTime ?? currentMatch.matchTime) + 2;

      return {
        status: base?.status === "FINISHED" ? "FINISHED" : "LIVE",
        score: base?.score ?? currentMatch.score,
        matchTime:
          base?.status === "FINISHED" ? undefined : formatMinuteLabel(nextMinute),
        incidents: [...(base?.incidents ?? []), createIncident(type, team, nextMinute)],
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleFinishSimulation = () => {
    updateSimulatedCurrentMatch((base) => ({
      status: "FINISHED",
      score: base?.score ?? currentMatch.score ?? { teamA: 0, teamB: 0 },
      matchTime: undefined,
      incidents: base?.incidents ?? [],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleResetSimulation = () => {
    const initialMatch = INITIAL_MATCHES_BY_ID.get(currentMatch.id);
    if (!initialMatch) {
      return;
    }

    setSimulatedMatchStates((prev) => {
      const next = { ...prev };
      delete next[currentMatch.id];
      return next;
    });
    simulatedMatchStatesRef.current = Object.fromEntries(
      Object.entries(simulatedMatchStatesRef.current).filter(
        ([matchId]) => matchId !== currentMatch.id,
      ),
    );

    setMatches((prev) =>
      prev.map((match) => (match.id === currentMatch.id ? { ...initialMatch } : match)),
    );
  };

  return (
    <div id="match-detail-view">
      {/* MATCH SELECTOR BAR */}
      <div
        className={`border-b ${
          theme === "classic-light"
            ? "bg-white border-slate-200"
            : "bg-[#121414]/90 border-white/10 backdrop-blur-md"
        }`}
        id="match-selector-bar"
      >
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-start justify-between gap-4">
          {/* Match selector groups, split by status: live / upcoming */}
          <div
            className={`grid min-w-0 flex-1 gap-3 ${
              hasLiveHeaderGroup && hasUpcomingHeaderGroup
                ? "xl:grid-cols-[max-content_minmax(0,1fr)] xl:items-start"
                : ""
            }`}
            id="match-selector-groups"
          >
            {headerMatchGroups.map(({ status, label, matches: group }) => {
              return (
                <div
                  className={`grid min-w-0 gap-1 ${status === "LIVE" ? "xl:w-fit" : ""}`}
                  id={`match-group-${status}`}
                  key={status}
                >
                  <span
                    className={`shrink-0 font-mono text-xs font-bold uppercase tracking-wider ${
                      theme === "classic-light"
                        ? "text-slate-700"
                        : "text-slate-100"
                    }`}
                  >
                    {label}
                  </span>
                  {status === "LIVE" ? (
                    <div
                      className={`flex min-w-0 flex-wrap items-center gap-1 rounded-lg border p-1 xl:w-fit ${
                        theme === "classic-light"
                          ? "bg-slate-100 border-slate-200"
                          : "bg-white/10 border-white/15"
                      }`}
                      id={`match-selector-chips-${status}`}
                    >
                      {group.map((m) => (
                        <button
                          key={m.id}
                          id={`btn-match-${m.id}`}
                          onClick={() => handleSelectMatch(m.id)}
                          title={`${formatCountryNameForTooltip(m.teamA.name)} x ${formatCountryNameForTooltip(m.teamB.name)}`}
                          aria-label={`${formatCountryNameForTooltip(m.teamA.name)} x ${formatCountryNameForTooltip(m.teamB.name)}`}
                          className={`shrink-0 px-3.5 py-2 rounded-md text-[13px] md:text-sm leading-none font-anton transition-all uppercase tracking-wide ${
                            selectedMatchId === m.id
                              ? theme === "classic-light"
                                ? "bg-white text-slate-950 shadow-sm font-semibold"
                                : "bg-[#171a1c] text-[#ffd84d] shadow-sm font-semibold"
                              : theme === "classic-light"
                                ? "text-slate-700 hover:bg-white hover:text-slate-950"
                                : "text-slate-100 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <span>{m.teamA.code}</span>
                            <span>x</span>
                            <span>{m.teamB.code}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex min-w-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => scrollMatchSelectorRail(status, "prev")}
                        className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border md:inline-flex ${
                          theme === "classic-light"
                            ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            : "border-white/10 bg-[#171a1c] text-slate-100 hover:bg-white/10"
                        }`}
                        aria-label={`Ver jogos anteriores em ${label.toLowerCase()}`}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div className="relative min-w-0 flex-1">
                        <div
                          ref={(node) => setMatchSelectorRailRef(status, node)}
                          className={`match-selector-rail scrollbar-hidden flex min-w-0 max-w-full snap-x snap-mandatory flex-nowrap items-center gap-1 overflow-x-auto rounded-lg border p-1 scroll-smooth ${
                            theme === "classic-light"
                              ? "bg-slate-100 border-slate-200"
                              : "bg-white/10 border-white/15"
                          }`}
                          id={`match-selector-chips-${status}`}
                        >
                          {group.map((m) => (
                            <button
                              key={m.id}
                              id={`btn-match-${m.id}`}
                              onClick={() => handleSelectMatch(m.id)}
                              title={`${formatCountryNameForTooltip(m.teamA.name)} x ${formatCountryNameForTooltip(m.teamB.name)}`}
                              aria-label={`${formatCountryNameForTooltip(m.teamA.name)} x ${formatCountryNameForTooltip(m.teamB.name)}`}
                              className={`shrink-0 snap-center px-3.5 py-2 rounded-md text-[13px] md:text-sm leading-none font-anton transition-all uppercase tracking-wide ${
                                selectedMatchId === m.id
                                  ? theme === "classic-light"
                                    ? "bg-white text-slate-950 shadow-sm font-semibold"
                                    : "bg-[#171a1c] text-[#ffd84d] shadow-sm font-semibold"
                                  : theme === "classic-light"
                                    ? "text-slate-700 hover:bg-white hover:text-slate-950"
                                    : "text-slate-100 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <span>{m.teamA.code}</span>
                                <span>x</span>
                                <span>{m.teamB.code}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => scrollMatchSelectorRail(status, "next")}
                        className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border md:inline-flex ${
                          theme === "classic-light"
                            ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            : "border-white/10 bg-[#171a1c] text-slate-100 hover:bg-white/10"
                        }`}
                        aria-label={`Ver próximos jogos em ${label.toLowerCase()}`}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Match Detail Controls */}
          <div className="flex shrink-0 items-center space-x-2" id="match-detail-actions">
            {/* Config Mode Toggle */}
            <button
              id="btn-edit-match"
              onClick={() => setShowConfig(!showConfig)}
              className="p-2 rounded-lg bg-[#1e2020]/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition flex items-center space-x-1"
            >
              <Settings size={14} />
              <span className="text-xs font-mono font-bold uppercase">
                Mudar Relógio
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* QUICK MATCH EDITOR PREVIEW DRAWER (Only shows when clicked) */}
      {showConfig && (
        <div
          className="max-w-3xl mx-auto mt-4 mx-4 p-4 rounded-xl border bg-white dark:bg-[#121414] border-[#ffd700]/30 shadow-lg"
          id="simulation-panel"
        >
          <div className="flex items-center justify-between mb-3 border-b pb-2 border-slate-100 dark:border-white/5">
            <h3 className="font-anton text-sm tracking-wider uppercase text-[#ffd700] flex items-center gap-1.5">
              <Edit3 size={15} /> CONFIGUREM O CRONÔMETRO MOCK
            </h3>
            <button
              id="btn-close-config"
              onClick={() => setShowConfig(false)}
              className="text-xs text-red-500 font-mono"
            >
              Fechar [X]
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-mono mb-1 text-slate-600 dark:text-slate-300">
                Horário Principal de Entrada:
              </label>
              <input
                id="input-kickoff-time"
                type="text"
                value={customKickoffTime}
                onChange={(e) => setCustomKickoffTime(e.target.value)}
                className="w-full text-sm font-mono p-2 border rounded bg-slate-50 dark:bg-black text-slate-900 dark:text-white"
                placeholder="Exemplo: 16:00"
              />
            </div>
            <div>
              <label className="block text-sm font-mono mb-1 text-slate-600 dark:text-slate-300">
                Tempo Restante (Segundos):
              </label>
              <input
                id="input-countdown-seconds"
                type="number"
                value={customCountdownSeconds}
                onChange={(e) =>
                  setCustomCountdownSeconds(parseInt(e.target.value) || 0)
                }
                className="w-full text-sm font-mono p-2 border rounded bg-slate-50 dark:bg-black text-slate-900 dark:text-white"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300 italic">
                Previsão convertida: {formatCountdown(customCountdownSeconds)}
              </span>
            </div>
          </div>
          <div
            className="mt-4 rounded-xl border border-slate-100 dark:border-white/5 p-4"
            id="simulation-controls-panel"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-anton text-sm tracking-wider uppercase text-slate-800 dark:text-white">
                  Simulador de placar e disciplina
                </p>
                <p className="text-xs font-archivo text-slate-600 dark:text-slate-300 leading-5">
                  Use o duelo Brasil x Marrocos para validar o cronômetro demo e ver o
                  Grupos reagir a gols e cartões em tempo real.
                </p>
              </div>
              <button
                id="btn-reset-simulation"
                type="button"
                onClick={handleResetSimulation}
                className="px-3 py-2 border rounded font-mono text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                Resetar demo local
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              <button
                id="btn-sim-start-live"
                type="button"
                onClick={handleStartSimulation}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#004d2c] px-3 py-2 font-anton text-xs uppercase tracking-wider text-white hover:bg-[#00391f]"
              >
                <CircleDot size={14} />
                Iniciar ao vivo
              </button>
              <button
                id="btn-sim-goal-a"
                type="button"
                onClick={() => handleSimulatedGoal("A")}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-anton text-xs uppercase tracking-wider text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-[#161919] dark:text-white dark:hover:bg-white/10"
              >
                <Goal size={14} />
                Gol {currentMatch.teamA.code}
              </button>
              <button
                id="btn-sim-goal-b"
                type="button"
                onClick={() => handleSimulatedGoal("B")}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-anton text-xs uppercase tracking-wider text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-[#161919] dark:text-white dark:hover:bg-white/10"
              >
                <Goal size={14} />
                Gol {currentMatch.teamB.code}
              </button>
              <button
                id="btn-sim-yellow-a"
                type="button"
                onClick={() => handleSimulatedCard("YELLOW_CARD", "A")}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-anton text-xs uppercase tracking-wider text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-[#161919] dark:text-white dark:hover:bg-white/10"
              >
                <ShieldAlert size={14} />
                Amarelo {currentMatch.teamA.code}
              </button>
              <button
                id="btn-sim-red-b"
                type="button"
                onClick={() => handleSimulatedCard("RED_CARD", "B")}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-anton text-xs uppercase tracking-wider text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-[#161919] dark:text-white dark:hover:bg-white/10"
              >
                <ShieldAlert size={14} />
                Vermelho {currentMatch.teamB.code}
              </button>
              <button
                id="btn-sim-finish-match"
                type="button"
                onClick={handleFinishSimulation}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#1f2937] px-3 py-2 font-anton text-xs uppercase tracking-wider text-white hover:bg-[#111827]"
              >
                Encerrar jogo
              </button>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              id="btn-apply-match-config"
              onClick={handleUpdateKickoff}
              className="px-4 py-2 bg-[#004d2c] text-white rounded font-anton uppercase text-xs hover:bg-[#00391f]"
            >
              Aplicar ao Jogo
            </button>
          </div>
        </div>
      )}

      {/* CORE HERO SECTION */}
      <section
        className="max-w-5xl mx-auto px-4 mt-8"
        id="core-live-scoreboard"
      >
        {/* SCOREBOARD: Match detail box */}
        <div
          className={`p-6 md:p-8 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
            theme === "classic-light"
              ? "bg-white border-slate-200/90 shadow-sm"
              : "bg-gradient-to-br from-[#121414] to-[#1e2020] border-white/5 shadow-2xl"
          }`}
          id="live-jumbo-card"
        >
          <div
            className="flex flex-col items-center justify-between space-y-6 md:space-y-0 md:flex-row md:space-x-8"
            id="scoreboard-grid"
          >
            {/* LEFT TEAM */}
            <div
              className="flex flex-col items-center space-y-3 flex-1"
              id="team-a-display"
            >
              <div className="w-32 h-24 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-white/80 dark:border-white/10 shadow-lg overflow-hidden transition hover:scale-105 p-3">
                <FlagIcon
                  flag={currentMatch.teamA.flagSvg}
                  className="w-full h-full object-contain"
                  onClick={() => onSelectTeamLineup(currentMatch.teamA)}
                />
              </div>
              <h2
                className={`font-anton text-lg tracking-wider uppercase ${
                  theme === "classic-light" ? "text-slate-800" : "text-white"
                }`}
              >
                {currentMatch.teamA.name}
              </h2>
            </div>

            {/* CENTER TIME AND PLAY STATUS INDICATORS */}
            <div
              className="flex flex-col items-center text-center space-y-2 flex-1 min-w-[200px]"
              id="clock-center-display"
            >
              {/* Game state indicator, driven by the current match's status */}
              <div
                className="flex items-center space-x-1.5"
                id="game-state-badge"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    currentMatch.status === "LIVE"
                      ? "bg-red-500 animate-pulse"
                      : currentMatch.status === "FINISHED"
                        ? "bg-slate-400"
                        : "bg-[#00e476] animate-pulse"
                  }`}
                ></span>
                <span
                  className={`font-mono text-xs font-bold tracking-widest uppercase ${
                    currentMatch.status === "FINISHED"
                      ? "text-slate-500 dark:text-slate-300"
                      : theme === "classic-light"
                        ? "text-slate-600"
                        : "text-[#a7e6bf]"
                  }`}
                >
                  {currentMatch.status === "LIVE"
                    ? currentMatch.matchTime
                      ? `AO VIVO • ${currentMatch.matchTime}`
                      : "AO VIVO"
                    : currentMatch.status === "FINISHED"
                      ? "ENCERRADO"
                      : "PRÉ-JOGO"}
                </span>
              </div>
              <div
                className={`font-mono text-[11px] uppercase tracking-wider ${
                  theme === "classic-light"
                    ? "text-slate-500"
                    : "text-slate-300"
                }`}
              >
                {currentOverlaySourceLabel} • {formatOverlayUpdatedAt(currentOverlayUpdatedAt)}
              </div>

              {/* Main Scoreboard clock time or score line */}
              <div
                className={`font-anton text-7xl md:text-8xl tracking-tight leading-none ${
                  theme === "classic-light"
                    ? "text-slate-900"
                    : "text-white glowing-text-gold"
                }`}
                id="scoreboard-clock"
              >
                {hasCurrentMatchScore ? currentMatchScoreText : currentMatch.kickoffTime}
              </div>

              {/* Match date (Ex: "11 Junho, 2026") */}
              <div
                className={`font-archivo text-sm font-semibold tracking-wide uppercase ${
                  theme === "classic-light"
                    ? "text-slate-500"
                    : "text-slate-300"
                }`}
                id="scoreboard-date"
              >
                {currentMatch.kickoffDate}
              </div>

              {currentMatchGroupLabel && (
                <button
                  type="button"
                  onClick={() => onOpenStandingsGroup(currentMatchGroupLabel)}
                  className={`rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] ${
                    theme === "classic-light"
                      ? "border-slate-200 bg-slate-100 text-slate-700 hover:border-[#009c3b]/30 hover:bg-[#009c3b]/10 hover:text-[#007a2f]"
                      : "border-white/10 bg-white/5 text-slate-100 hover:border-[#00e476]/25 hover:bg-[#00e476]/10 hover:text-[#a7e6bf]"
                  }`}
                  id="scoreboard-group-label"
                  aria-label={`Abrir tabela do ${currentMatchGroupLabel}`}
                >
                  {currentMatchGroupLabel}
                </button>
              )}

              {/* Countdown Ticking section (Ex: "Faltam: 15:02:03") */}
              <div
                className="flex flex-col items-center"
                id="countdown-sub-wrapper"
              >
                {currentMatch.status === "PRE_GAME" && (
                  <div
                    className={`font-mono text-xs md:text-sm font-semibold tracking-wider ${
                      theme === "classic-light"
                        ? "text-[#009c3b]"
                        : "text-[#00e476] glowing-text-green"
                    }`}
                  >
                    Faltam:{" "}
                    <span className="font-bold">
                      {formatCountdown(secondsRemaining)}
                    </span>
                  </div>
                )}

                {/* HORÁRIO DE BRASÍLIA Badge with live clock */}
                {currentMatch.status !== "FINISHED" && (
                  <span
                    className={`mt-2 flex items-center gap-2 px-3 py-1.5 text-xs font-mono tracking-widest font-black uppercase ${
                      theme === "classic-light"
                        ? "text-slate-800"
                        : "text-white"
                    }`}
                  >
                    <span className={theme === "classic-light" ? "text-slate-800" : "text-white"}>HORÁRIO DE BRASÍLIA</span>
                    <span className="tabular-nums" id="brasilia-clock">
                      {formatBrasiliaTime(currentTime)}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* RIGHT TEAM */}
            <div
              className="flex flex-col items-center space-y-3 flex-1"
              id="team-b-display"
            >
              <div className="w-32 h-24 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-white/80 dark:border-white/10 shadow-lg overflow-hidden transition hover:scale-105 p-3">
                <FlagIcon
                  flag={currentMatch.teamB.flagSvg}
                  className="w-full h-full object-contain"
                  onClick={() => onSelectTeamLineup(currentMatch.teamB)}
                />
              </div>
              <h2
                className={`font-anton text-lg tracking-wider uppercase ${
                  theme === "classic-light" ? "text-slate-800" : "text-white"
                }`}
              >
                {currentMatch.teamB.name}
              </h2>
            </div>
          </div>

          {/* Stadium, Location & Capacity details */}
          <div
            className="mt-8 pt-6 border-t border-slate-150 dark:border-white/5 flex items-center justify-center text-center"
            id="stadium-footer-display"
          >
            <div className="flex flex-col items-center text-sm">
              <div className="flex flex-col sm:flex-row items-center sm:space-x-3">
                <div className="flex items-center space-x-1 text-amber-500 mb-1 sm:mb-0">
                  <MapPin size={16} className="text-amber-500 animate-bounce" />
                  <span className="font-anton uppercase tracking-widest text-amber-500">
                    {currentMatch.city}
                  </span>
                </div>
                <span className="hidden sm:inline text-slate-300">|</span>
                <a
                  href={currentMatchMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`font-archivo font-medium underline-offset-4 hover:underline ${
                    theme === "classic-light" ? "text-slate-700" : "text-slate-100"
                  }`}
                >
                  {currentMatch.stadiumName} • {currentMatch.stageName}
                </a>
              </div>

              {currentMatch.officialMatchUrl && (
                <a
                  href={currentMatch.officialMatchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-2 text-sm font-archivo underline underline-offset-4 ${
                    theme === "classic-light"
                      ? "text-[#0057b8] hover:text-[#003f86]"
                      : "text-[#8cc8ff] hover:text-white"
                  }`}
                >
                  Página oficial da FIFA para esta partida
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* VIEWPORT AREA RESPONDING TO SELECTED TABS */}
      <div className="max-w-5xl mx-auto px-4 mt-6" id="applet-main-body">
        {/* TAB SWITCHER: Onde Assistir vs Escalação */}
        <div
          className={`mb-4 inline-flex items-center gap-1 rounded-lg border p-1 ${
            theme === "classic-light"
              ? "bg-slate-100 border-slate-200"
              : "bg-white/10 border-white/15"
          }`}
          id="match-detail-tabs"
        >
          <button
            id="btn-tab-broadcast"
            onClick={() => setActiveTab("broadcast")}
            className={`px-3.5 py-2 min-h-11 rounded-md text-[13px] md:text-sm leading-none font-anton transition-all uppercase tracking-wide ${
              activeTab === "broadcast"
                ? theme === "classic-light"
                  ? "bg-white text-slate-950 shadow-sm font-semibold"
                  : "bg-[#171a1c] text-[#ffd84d] shadow-sm font-semibold"
                : theme === "classic-light"
                  ? "text-slate-700 hover:bg-white hover:text-slate-950"
                  : "text-slate-100 hover:bg-white/10 hover:text-white"
            }`}
          >
            Onde Assistir
          </button>
          <button
            id="btn-tab-lineup"
            onClick={() => setActiveTab("lineup")}
            className={`px-3.5 py-2 min-h-11 rounded-md text-[13px] md:text-sm leading-none font-anton transition-all uppercase tracking-wide ${
              activeTab === "lineup"
                ? theme === "classic-light"
                  ? "bg-white text-slate-950 shadow-sm font-semibold"
                  : "bg-[#171a1c] text-[#ffd84d] shadow-sm font-semibold"
                : theme === "classic-light"
                  ? "text-slate-700 hover:bg-white hover:text-slate-950"
                  : "text-slate-100 hover:bg-white/10 hover:text-white"
            }`}
          >
            Escalação
          </button>
        </div>

        {/* TAB 1: ONDE ASSISTIR BROADCAST GUIDE */}
        {activeTab === "broadcast" && (
          <div
            className={`${
              theme === "classic-light" ? "bg-white" : "bg-transparent"
            }`}
            id="broadcast-layout-grid"
          >
            <div
              className={`rounded-2xl ${
                theme === "classic-light" ? "bg-transparent" : "bg-transparent"
              }`}
              id="broadcaster-rows"
            >
              <p
                className={`mb-3 font-anton text-lg md:text-xl uppercase tracking-wide ${
                  theme === "classic-light" ? "text-slate-900" : "text-white"
                }`}
                id="broadcast-section-title"
              >
                Onde ver o jogo
              </p>
              <p
                className={`mb-4 font-mono text-[11px] uppercase tracking-wider ${
                  theme === "classic-light"
                    ? "text-slate-500"
                    : "text-slate-300"
                }`}
              >
                {currentOverlay?.broadcastGuide.note || "Carregando dados oficiais da FIFA..."} •{" "}
                {formatOverlayUpdatedAt(currentOverlay?.broadcastGuide.updatedAt)}
              </p>
              {currentMatch.status === "FINISHED" &&
              (MATCH_VIDEOS as Record<string, { embedUrl: string; title: string }[]>)[currentMatch.id]?.length ? (
                <div className="flex items-center gap-4" id="match-videos-list">
                  {/* TV icon — same as broadcaster strip */}
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${
                      theme === "classic-light"
                        ? "bg-white border-slate-200"
                        : "bg-[#161919] border-white/10"
                    }`}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M8.91634 8.03187V11.2807C8.91634 11.4363 9.08307 11.5313 9.21161 11.4487L11.7423 9.82434C11.8632 9.74672 11.8632 9.56583 11.7423 9.4882L9.21161 7.8638C9.08307 7.78129 8.91634 7.8762 8.91634 8.03187Z" fill="#505B73" />
                      <path fillRule="evenodd" clipRule="evenodd" d="M4.74967 5H15.2497C16.0321 5 16.6663 5.63426 16.6663 6.41667V12.75C16.6663 13.5324 16.0321 14.1667 15.2497 14.1667L13.333 14.1667V15H6.66634V14.1667L4.74967 14.1667C3.96727 14.1667 3.33301 13.5324 3.33301 12.75V6.41667C3.33301 5.63426 3.96727 5 4.74967 5ZM4.74967 6.25C4.65763 6.25 4.58301 6.32462 4.58301 6.41667V12.75C4.58301 12.842 4.65763 12.9167 4.74967 12.9167H15.2497C15.3417 12.9167 15.4163 12.842 15.4163 12.75V6.41667C15.4163 6.32462 15.3417 6.25 15.2497 6.25H4.74967Z" fill="#505B73" />
                    </svg>
                  </div>
                  {/* Small thumbnail cards */}
                  <div className="flex items-center gap-2 md:gap-3 overflow-x-auto">
                    {(MATCH_VIDEOS as Record<string, { embedUrl: string; title: string }[]>)[currentMatch.id].map(
                      (video, idx) => {
                        const videoId = video.embedUrl.match(/\/embed\/([^?/]+)/)?.[1] ?? "";
                        const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
                        const thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                        return (
                          <a
                            key={idx}
                            href={watchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative shrink-0 overflow-hidden rounded-xl border transition hover:-translate-y-0.5"
                            style={{ width: 120, height: 68 }}
                            aria-label={`Assistir no YouTube: ${video.title}`}
                            title={video.title}
                          >
                            <img
                              src={thumbUrl}
                              alt={video.title}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ff0000] group-hover:scale-110 transition-transform">
                                <svg viewBox="0 0 24 24" className="h-3 w-3 translate-x-px fill-white" aria-hidden="true">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                          </a>
                        );
                      },
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className="flex items-center gap-4"
                  id="fifa-broadcaster-strip"
                >
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${
                      theme === "classic-light"
                        ? "bg-white border-slate-200"
                        : "bg-[#161919] border-white/10"
                    }`}
                    id="broadcast-icon-container"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path
                        d="M8.91634 8.03187V11.2807C8.91634 11.4363 9.08307 11.5313 9.21161 11.4487L11.7423 9.82434C11.8632 9.74672 11.8632 9.56583 11.7423 9.4882L9.21161 7.8638C9.08307 7.78129 8.91634 7.8762 8.91634 8.03187Z"
                        fill="#505B73"
                      />
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M4.74967 5H15.2497C16.0321 5 16.6663 5.63426 16.6663 6.41667V12.75C16.6663 13.5324 16.0321 14.1667 15.2497 14.1667L13.333 14.1667V15H6.66634V14.1667L4.74967 14.1667C3.96727 14.1667 3.33301 13.5324 3.33301 12.75V6.41667C3.33301 5.63426 3.96727 5 4.74967 5ZM4.74967 6.25C4.65763 6.25 4.58301 6.32462 4.58301 6.41667V12.75C4.58301 12.842 4.65763 12.9167 4.74967 12.9167H15.2497C15.3417 12.9167 15.4163 12.842 15.4163 12.75V6.41667C15.4163 6.32462 15.3417 6.25 15.2497 6.25H4.74967Z"
                        fill="#505B73"
                      />
                    </svg>
                  </div>

                  <div
                    className="flex min-w-0 flex-1 items-center gap-2 md:gap-3 overflow-hidden"
                    id="fifa-broadcasters-list"
                  >
                    {visibleBroadcasters.map((cast) => (
                      <a
                        key={cast.id}
                        id={`link-broadcaster-${cast.id}`}
                        href={cast.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`${cast.name} • ${cast.type}`}
                        className={`flex h-[72px] w-[84px] shrink-0 items-center justify-center rounded-xl border px-2 py-2 transition hover:-translate-y-0.5 ${
                          theme === "classic-light"
                            ? "bg-white border-slate-200 hover:border-slate-300"
                            : "bg-[#161919] border-white/10 hover:border-white/20"
                        }`}
                      >
                        {cast.logoUrl ? (
                          <img
                            src={cast.logoUrl}
                            alt={cast.name}
                            className="h-full w-full object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <span
                            className="font-anton text-xs uppercase tracking-wide text-white"
                            style={{
                              color: cast.iconColor,
                            }}
                          >
                            {getBroadcasterBadgeLabel(cast.name)}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {(currentMatch.status !== "PRE_GAME" || visibleIncidents.length > 0) && (
                <div
                  className={`mt-5 rounded-2xl border px-4 py-4 ${
                    theme === "classic-light"
                      ? "bg-slate-50 border-slate-200"
                      : "bg-[#121414]/70 border-white/10"
                  }`}
                  id="match-incidents-panel"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className={`font-anton text-base uppercase tracking-wide ${
                          theme === "classic-light" ? "text-slate-900" : "text-white"
                        }`}
                      >
                        Lances do jogo
                      </p>
                      <p
                        className={`mt-1 font-mono text-[11px] uppercase tracking-wider ${
                          theme === "classic-light"
                            ? "text-slate-500"
                            : "text-slate-300"
                        }`}
                      >
                        {currentSimulatedState
                          ? "Feed da simulação local"
                          : currentOverlay?.matchState.source === "fifa"
                          ? "Feed oficial da FIFA"
                          : "Aguardando lances oficiais da FIFA"}{" "}
                        •{" "}
                        {formatOverlayUpdatedAt(
                          currentSimulatedState?.updatedAt ??
                            currentOverlay?.matchState.updatedAt,
                        )}
                      </p>
                      {hasClickableIncidentPlayers && (
                        <p
                          className={`mt-2 font-mono text-[10px] uppercase tracking-wider ${
                            theme === "classic-light"
                              ? "text-[#065f2c]"
                              : "text-[#ffd84d]"
                          }`}
                        >
                          Clique no nome destacado para abrir o card do jogador
                        </p>
                      )}
                    </div>
                  </div>

                  {visibleIncidents.length > 0 ? (
                    <div
                      className={`mt-4 flex flex-col gap-2 pr-1 ${
                        shouldScrollIncidents
                          ? "max-h-[32rem] overflow-y-auto"
                          : ""
                      }`}
                      id="match-incidents-list"
                      data-scrollable={shouldScrollIncidents ? "true" : "false"}
                    >
                      {visibleIncidents.map((incident) => (
                        <div
                          key={incident.id}
                          className={`rounded-xl border px-3 py-3 transition ${
                            getIncidentCardClass(incident.type, theme)
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`font-mono font-black uppercase tracking-wider ${
                                incident.type === "GOAL"
                                  ? theme === "classic-light"
                                    ? "text-[#007a2f] text-sm"
                                    : "text-[#ffe58b] text-sm"
                                  : theme === "classic-light"
                                    ? "text-slate-700 text-xs"
                                    : "text-slate-100 text-xs"
                              }`}
                            >
                              {incident.time}
                            </span>
                            <span
                              className={`rounded-full border px-2 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] ${getIncidentAccentClass(
                                incident.type,
                                theme,
                              )}`}
                            >
                              {getIncidentLabel(incident.type)}
                            </span>
                            {incident.team && (
                              <span
                                className={`rounded-full px-2 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] ${
                                  theme === "classic-light"
                                    ? "bg-slate-100 text-slate-600"
                                    : "bg-white/10 text-slate-200"
                                }`}
                              >
                                {incident.team === "A"
                                  ? currentMatch.teamA.code
                                  : currentMatch.teamB.code}
                              </span>
                            )}
                          </div>
                          <p
                            className={`mt-2 font-archivo leading-6 ${getIncidentTextClass(
                              incident.type,
                              theme,
                            )}`}
                          >
                            <IncidentText
                              incident={incident}
                              match={currentMatch}
                              lineupEntry={currentLineupEntry}
                              theme={theme}
                              onSelectPlayer={(selection) =>
                                setStoredIncidentPlayer({
                                  playerKey: {
                                    id: selection.player.id,
                                    name: selection.player.name,
                                    pictureUrl: selection.player.pictureUrl,
                                  },
                                  team: selection.team,
                                  opponentName: selection.opponentName,
                                })
                              }
                            />
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p
                      className={`mt-4 font-archivo text-sm leading-6 ${
                        theme === "classic-light"
                          ? "text-slate-600"
                          : "text-slate-200"
                      }`}
                    >
                      Sem lances oficiais registrados pela FIFA ate agora.
                    </p>
                  )}
                </div>
              )}

              {(() => {
                const finishedMatches = matches
                  .filter((m) => m.status === "FINISHED")
                  .sort(
                    (a, b) =>
                      new Date(a.kickoffTimestamp).getTime() -
                      new Date(b.kickoffTimestamp).getTime(),
                  );

                if (finishedMatches.length === 0) return null;

                return (
                  <div
                    className={`mt-4 flex flex-col gap-1 rounded-2xl border px-4 py-3 xl:flex-row xl:items-center xl:gap-2 ${
                      theme === "classic-light"
                        ? "bg-slate-50 border-slate-200"
                        : "bg-[#121414]/70 border-white/10"
                    }`}
                    id="finished-match-bar"
                  >
                    <span
                      className={`shrink-0 font-mono text-xs font-bold uppercase tracking-wider ${
                        theme === "classic-light"
                          ? "text-slate-700"
                          : "text-slate-100"
                      }`}
                    >
                      Jogos concluídos:
                    </span>
                    <div className="flex min-w-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => scrollMatchSelectorRail("finished", "prev")}
                        className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border md:inline-flex ${
                          theme === "classic-light"
                            ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            : "border-white/10 bg-[#171a1c] text-slate-100 hover:bg-white/10"
                        }`}
                        aria-label="Ver jogos concluídos anteriores"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div className="relative min-w-0 flex-1">
                        <div
                          className={`pointer-events-none absolute inset-y-1 left-0 z-10 hidden w-6 rounded-l-lg md:block ${
                            theme === "classic-light"
                              ? "bg-gradient-to-r from-slate-50 via-slate-50/90 to-transparent"
                              : "bg-gradient-to-r from-[#121414] via-[#121414]/90 to-transparent"
                          }`}
                        />
                        <div
                          className={`pointer-events-none absolute inset-y-1 right-0 z-10 hidden w-6 rounded-r-lg md:block ${
                            theme === "classic-light"
                              ? "bg-gradient-to-l from-slate-50 via-slate-50/90 to-transparent"
                              : "bg-gradient-to-l from-[#121414] via-[#121414]/90 to-transparent"
                          }`}
                        />
                        <div
                          ref={(node) => setMatchSelectorRailRef("finished", node)}
                          className={`flex min-w-0 max-w-full snap-x snap-mandatory flex-nowrap items-center gap-1 overflow-x-auto rounded-lg border p-1 scroll-smooth ${
                            theme === "classic-light"
                              ? "bg-white border-slate-200"
                              : "bg-white/10 border-white/15"
                          }`}
                          id="match-selector-chips-finished"
                        >
                          {finishedMatches.map((m) => (
                            <button
                              key={m.id}
                              id={`btn-match-${m.id}`}
                              onClick={() => handleSelectMatch(m.id)}
                              title={`${formatCountryNameForTooltip(m.teamA.name)} x ${formatCountryNameForTooltip(m.teamB.name)}`}
                              aria-label={`${formatCountryNameForTooltip(m.teamA.name)} x ${formatCountryNameForTooltip(m.teamB.name)}`}
                              className={`shrink-0 snap-center px-3.5 py-2 rounded-md text-[13px] md:text-sm leading-none font-anton transition-all uppercase tracking-wide ${
                                selectedMatchId === m.id
                                  ? theme === "classic-light"
                                    ? "bg-white text-slate-950 shadow-sm font-semibold"
                                    : "bg-[#171a1c] text-[#ffd84d] shadow-sm font-semibold"
                                  : theme === "classic-light"
                                    ? "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                                    : "text-slate-100 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <span>{m.teamA.code}</span>
                                <span>x</span>
                                <span>{m.teamB.code}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => scrollMatchSelectorRail("finished", "next")}
                        className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border md:inline-flex ${
                          theme === "classic-light"
                            ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            : "border-white/10 bg-[#171a1c] text-slate-100 hover:bg-white/10"
                        }`}
                        aria-label="Ver próximos jogos concluídos"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* TAB 2: INTERACTIVE TACTICAL LINEUPS / SQUAD PITCH */}
        {activeTab === "lineup" && (
          <div className="w-full" id="lineups-view-container">
            <div
              className={`p-6 rounded-2xl border transition ${
                theme === "classic-light"
                  ? "bg-white border-slate-200 shadow"
                  : "bg-gradient-to-br from-[#121414] to-[#1a1c1c] border-white/5 shadow-xl text-white"
              }`}
              id="lineup-tab-card"
            >
              <div
                className="flex items-center justify-between mb-6"
                id="lineup-tabs-header"
              >
                <div>
                  <h3 className="font-anton text-lg tracking-wider uppercase text-slate-800 dark:text-white">
                    CENTRAL TÁTICA E DISTRIBUIÇÃO ESPACIAL
                  </h3>
                  <p className="text-sm font-archivo text-slate-600 dark:text-slate-300 leading-6">
                    Posicionamento estratégico planejado para o confronto
                    oficial de São Paulo / Nova Iorque 2026.
                  </p>
                </div>
              </div>

              {/* Soccer Dynamic Pitch Lineup Board */}
              <PitchLineup
                match={currentMatch}
                onSelectTeamLineup={onSelectTeamLineup}
                lineupEntry={teamLineups[currentMatch.id]}
              />
            </div>
          </div>
        )}
      </div>

      {selectedIncidentPlayer && (
        <PlayerOverlayCard
          id="match-incident-player-overlay"
          theme={theme}
          player={selectedIncidentPlayer.player}
          teamName={selectedIncidentPlayer.team.name}
          primaryColor={selectedIncidentPlayer.team.primaryColor}
          secondaryColor={selectedIncidentPlayer.team.secondaryColor}
          stats={[
            { label: "Camisa", value: selectedIncidentPlayer.player.number },
            {
              label: "Posição",
              value: getPositionLabel(selectedIncidentPlayer.player.position),
            },
            { label: "Seleção", value: selectedIncidentPlayer.team.code },
            ...(selectedIncidentPlayer.player.dateOfBirth
              ? [{ label: "Idade", value: getPlayerAge(selectedIncidentPlayer.player.dateOfBirth) }]
              : []),
            ...(selectedIncidentPlayer.player.height
              ? [{ label: "Altura", value: `${selectedIncidentPlayer.player.height} cm` }]
              : []),
            ...buildTournamentStatCells(incidentPlayerStats, theme),
          ]}
          details={[
            ...(selectedIncidentPlayer.player.dateOfBirth
              ? [{ label: "Nascimento", value: formatBirthDate(selectedIncidentPlayer.player.dateOfBirth) }]
              : []),
            {
              label: "Clube atual",
              value: selectedIncidentPlayer.player.club || "Seleção Nacional",
            },
            {
              label: "Contexto da partida",
              value: `Contra ${selectedIncidentPlayer.opponentName}, ${selectedIncidentPlayer.player.name} aparece no radar dos lances da partida.`,
              fullWidth: true,
            },
          ]}
          onClose={() => setStoredIncidentPlayer(null)}
          onOpenPicture={() =>
            setExpandedIncidentPlayerKey({
              id: selectedIncidentPlayer.player.id,
              name: selectedIncidentPlayer.player.name,
              pictureUrl: selectedIncidentPlayer.player.pictureUrl,
            })
          }
          openPictureButtonId="btn-open-match-incident-player-picture"
        />
      )}

      {expandedIncidentPlayer && (
        <PlayerPictureOverlay
          id="match-incident-player-picture-overlay"
          player={expandedIncidentPlayer}
          onClose={() => setExpandedIncidentPlayerKey(null)}
        />
      )}
    </div>
  );
}

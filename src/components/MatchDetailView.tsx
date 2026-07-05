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
import { apiUrl, useT, useLocale, localeToIntlTag, getActiveLocale } from "../i18n";
import { buildGroupPositionMap } from "../standings";
import { localizedStageName } from "../utils/knockoutSlots";
import { localizeOfficialFifaStatus } from "../i18n/matchStatus";
import { BroadcastCountrySelect } from "./BroadcastCountrySelect";
import {
  DEFAULT_COUNTRY_BY_LOCALE,
  DEFAULT_BROADCAST_COUNTRY,
  isBroadcastCountry,
} from "../data/broadcastCountries";
import { resolveTeamDisplay } from "../utils/resolveTeamDisplay";
import MATCH_VIDEOS from "../data/matchVideos.json";
import MATCH_ANALYSIS from "../data/matchAnalysis.json";
import MATCH_ANALYSIS_EN from "../data/matchAnalysis.en.json";
import { pickEditorialText } from "../data/editorial";
import MATCH_INSTAGRAM from "../data/matchInstagram.json";
import { resolveVenueTimeZone } from "../utils/venueCoordinates";
import type { TeamLineupsMap } from "../utils/teamLineup";
import { FlagIcon } from "./FlagIcon";
import { PlayerOverlayCard, PlayerPictureOverlay, buildPlayerStatCells, formatBirthDate } from "./PlayerOverlayCard";
import { usePlayerStats } from "../hooks/usePlayerStats";
import { getPositionLabel, toTitleCasePtBr } from "../utils/playerDisplay";
import { MatchChatPanel } from "./MatchChatPanel";
import { AffiliateProducts } from "./AffiliateProducts";
import { resolveInstagramPostUrls } from "../utils/instagram";
import { MatchWeatherChip } from "./MatchWeatherChip";
import { RefereeChip } from "./RefereeChip";
import { RefereeCard } from "./RefereeCard";
import { resolveRefereeInstagram } from "../utils/refereeIdentity";
import { SimultaneousLiveMatches } from "./SimultaneousLiveMatches";
import { WeatherSuspensionNotice } from "./WeatherSuspensionNotice";
import { MatchAdvisoryNotice } from "./MatchAdvisoryNotice";
import MATCH_ADVISORIES from "../data/matchAdvisories.json";
import { MatchSpeechToggle } from "./MatchSpeechToggle";
import { useMatchSpeech } from "../hooks/useMatchSpeech";
import { runDirectSpeechTest } from "../utils/speech/catasSpeech";
import { useClockTick } from "../hooks/useClockTick";
import {
  MapPin,
  Edit3,
  Goal,
  ShieldAlert,
  CircleDot,
  ChevronLeft,
  ChevronRight,
  Zap,
  Clock,
  Mic,
  LayoutGrid,
} from "lucide-react";
import { IncidentText } from "./IncidentText";
import { MatchEditorialTab } from "./MatchEditorialTab";
import { MatchInstagramTab } from "./MatchInstagramTab";
import { MatchLineupTab } from "./MatchLineupTab";
import {
  buildIncidentSpeech,
  buildIncidentPlayerSelections,
  isIncidentPlayerNameMatch,
  normalizePlayerLookupText,
  getIncidentLabel,
  getIncidentAccentClass,
  getIncidentCardClass,
  getIncidentTextClass,
  type IncidentPlayerSelection,
  type StoredIncidentPlayer,
  type StoredIncidentPlayerKey,
} from "../utils/matchIncidents";
import {
  DEMO_MATCH_ID,
  getMatchCountdownSeconds,
  parseMinuteLabel,
  formatMinuteLabel,
  formatBrasiliaTime,
  formatTimeInZone,
  formatOverlayUpdatedAt,
  formatCountdown,
} from "../utils/matchClock";
import {
  getInitialMatchId,
  applySimulatedState,
  getMatchGroupLabel,
  getMatchStageLabel,
  getBroadcasterBadgeLabel,
  formatCountryNameForTooltip,
  type SimulatedMatchState,
} from "../utils/matchSelection";

// Header match-selector groups, split by match status. `labelKey` resolves to a
// catalog string at render time (the label text is localized, not stored here).
const MATCH_STATUS_GROUPS: { status: MatchStatus; labelKey: string }[] = [
  { status: "FINISHED", labelKey: "aoVivo.group.finished" },
  { status: "LIVE", labelKey: "aoVivo.group.live" },
  { status: "PRE_GAME", labelKey: "aoVivo.group.upcoming" },
];

const HEADER_MATCH_STATUS_GROUPS = MATCH_STATUS_GROUPS.filter(
  ({ status }) => status !== "FINISHED",
);

const DEFAULT_MATCH_OVERLAY_REFRESH_INTERVAL_MS = 15 * 1000;
const BROADCAST_COUNTRY_STORAGE_KEY = "agora-broadcast-country";
const INITIAL_MATCHES_BY_ID = new Map(
  APP_MATCHES.map((match) => [match.id, match]),
);

// Read the persisted broadcast-country choice, tolerating private-mode /
// sandboxed contexts where localStorage access throws.
function readStoredBroadcastCountry(): string | null {
  try {
    return window.localStorage?.getItem(BROADCAST_COUNTRY_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
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
  initialMatchId?: string;
}

export function MatchDetailView({
  matches,
  setMatches,
  theme,
  onSelectTeamLineup,
  onOpenStandingsGroup,
  teamLineups,
  initialMatchId,
}: MatchDetailViewProps) {
  const { t, locale } = useLocale();
  // Broadcast-guide country. Precedence: the user's stored choice → IP geo (set
  // by the effect below) → the locale default (pt→BR, es→MX). Persisted so the
  // pick sticks across visits.
  const [broadcastCountry, setBroadcastCountry] = useState<string>(() => {
    const stored = readStoredBroadcastCountry();
    if (isBroadcastCountry(stored)) return stored!.toUpperCase();
    return DEFAULT_COUNTRY_BY_LOCALE[locale];
  });
  const handleBroadcastCountryChange = (code: string) => {
    setBroadcastCountry(code);
    try {
      window.localStorage?.setItem(BROADCAST_COUNTRY_STORAGE_KEY, code);
    } catch {
      // Non-fatal — the choice just won't persist across reloads.
    }
  };
  // One-time IP geo auto-detect, only when the user hasn't explicitly chosen a
  // country. `/api/geo` returns `country: null` when the GeoLite2 db is absent
  // (preview builds) or the IP doesn't resolve — we then keep the locale default.
  useEffect(() => {
    if (isBroadcastCountry(readStoredBroadcastCountry())) return; // respect an explicit choice
    let active = true;
    fetch("/api/geo")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { country?: string | null } | null) => {
        if (active && isBroadcastCountry(data?.country)) {
          setBroadcastCountry(data!.country!.toUpperCase());
        }
      })
      .catch(() => {
        // Geo is best-effort — on any failure keep the locale default.
      });
    return () => {
      active = false;
    };
  }, []);
  const [matchOverlays, setMatchOverlays] = useState<
    Record<string, MatchOverlayEntry>
  >({});
  const [simulatedMatchStates, setSimulatedMatchStates] = useState<
    Record<string, SimulatedMatchState>
  >({});
  const [selectedMatchId, setSelectedMatchId] = useState<string>(() =>
    initialMatchId ?? getInitialMatchId(matches),
  );
  const [matchSelectionMode, setMatchSelectionMode] = useState<"auto" | "manual">(
    initialMatchId ? "manual" : "auto",
  );
  // When 2+ matches are live at once, the simultaneous toggle alternates between
  // an "overview" (both compact live cards grouped) and a per-match "focus" (the
  // full single-match detail). Deep-linking to a match opens straight in focus.
  const [liveViewMode, setLiveViewMode] = useState<"overview" | "focus">(
    initialMatchId ? "focus" : "overview",
  );
  const [activeTab, setActiveTab] = useState<"broadcast" | "lineup" | "pregame" | "instagram">(
    "broadcast",
  );
  // Custom interactive test parameters for custom mock simulations
  const [showConfig, setShowConfig] = useState(false);
  const [refereeCardOpen, setRefereeCardOpen] = useState(false);
  const [speechTestStatus, setSpeechTestStatus] = useState<string | null>(null);
  // "Mudar Relógio" now lives in the global header; it toggles this match
  // clock-config drawer via a window event (no-op on non-match tabs).
  useEffect(() => {
    const handler = () => setShowConfig((v) => !v);
    window.addEventListener("toggle-match-clock-config", handler);
    return () => window.removeEventListener("toggle-match-clock-config", handler);
  }, []);
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

  useEffect(() => {
    if (initialMatchId) {
      setMatchSelectionMode("manual");
      setSelectedMatchId(initialMatchId);
      setStoredIncidentPlayer(null);
      setExpandedIncidentPlayerKey(null);
    } else {
      setMatchSelectionMode("auto");
      setSelectedMatchId(getInitialMatchId(matches));
      setStoredIncidentPlayer(null);
      setExpandedIncidentPlayerKey(null);
    }
  // matches intentionally omitted — this effect only responds to external navigation signals
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMatchId]);
  const currentMatch =
    matches.find((m) => m.id === selectedMatchId) || matches[0];
  // Knockout fixtures carry placeholder slots ("2º A"). Project the team that
  // currently holds each group-position slot from live standings — exactly like
  // the Chaveamento bracket and Partidas — so the scoreboard and the match
  // selector show the provisional team instead of the raw label/empty flag.
  const groupPositionMap = useMemo(() => buildGroupPositionMap(matches), [matches]);
  const currentTeamA = resolveTeamDisplay(currentMatch, currentMatch.teamA, groupPositionMap);
  const currentTeamB = resolveTeamDisplay(currentMatch, currentMatch.teamB, groupPositionMap);
  const currentSimulatedState = simulatedMatchStates[currentMatch.id];
  const currentOverlay = matchOverlays[currentMatch.id];
  const currentLineupEntry = teamLineups[currentMatch.id];
  const matchAnalysisText = pickEditorialText(
    MATCH_ANALYSIS as Record<string, string>,
    MATCH_ANALYSIS_EN as Record<string, string>,
    currentMatch.id,
    locale,
  );
  const matchInstagramUrls = resolveInstagramPostUrls(
    (MATCH_INSTAGRAM as Record<string, string[]>)[currentMatch.id],
    undefined,
  );
  const hasMatchInstagram = matchInstagramUrls.length > 0;
  // Per-match schedule advisory (e.g. a weather kickoff delay the live feed
  // doesn't carry). Hidden once the match is FINISHED so it never lingers.
  const matchAdvisory = (MATCH_ADVISORIES as Record<string, string>)[currentMatch.id];
  const showMatchAdvisory = Boolean(matchAdvisory) && currentMatch.status !== "FINISHED";
  const visibleBroadcasters = currentMatch.broadcasters;
  const currentIncidents =
    currentSimulatedState?.incidents || currentOverlay?.matchState.incidents || [];
  const visibleIncidents = [...currentIncidents].reverse();

  // Live-match speech narration (goals, cards, period whistles, score) for the
  // selected match. Snapshot is in chronological incident order (the diff dedups
  // by id); the toggle lives in the clock-setup drawer below.
  const matchSpeech = useMatchSpeech({
    matchId: currentMatch.id,
    snapshot: {
      status: currentMatch.status,
      officialStatus: currentOverlay?.matchState.officialStatus,
      score:
        currentSimulatedState?.score ?? currentOverlay?.matchState.score ?? currentMatch.score,
      incidents: currentIncidents,
    },
    teamNames: { a: currentMatch.teamA.name, b: currentMatch.teamB.name },
  });
  const shouldScrollIncidents = visibleIncidents.length > 6;
  const hasCurrentMatchScore = Boolean(currentMatch.score);
  const currentMatchScoreText = currentMatch.score
    ? `${currentMatch.score.teamA} x ${currentMatch.score.teamB}`
    : null;
  // Penalty-shootout result, present only on a knockout tie decided on
  // penalties. The team with the higher tally advanced; an equal tally never
  // happens (one side always wins the shootout) but is guarded just in case.
  const currentMatchPenaltyScore = currentMatch.penaltyScore;
  const penaltyShootoutWinnerName = currentMatchPenaltyScore
    ? currentMatchPenaltyScore.teamA === currentMatchPenaltyScore.teamB
      ? null
      : currentMatchPenaltyScore.teamA > currentMatchPenaltyScore.teamB
        ? currentTeamA.name
        : currentTeamB.name
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
      ? t("aoVivo.overlay.sourceSimulation")
      : currentOverlay?.broadcastGuide.source === "fifa" &&
          currentOverlay?.matchState.source === "fifa"
      ? t("aoVivo.overlay.sourceOfficial")
      : t("aoVivo.overlay.sourceFallback");
  // Official FIFA status/period label (e.g. "2º tempo", "Intervalo", "Encerrado"),
  // only when the live state is genuinely FIFA-sourced (not a local simulation).
  const currentOfficialFifaStatus =
    !currentSimulatedState && currentOverlay?.matchState.source === "fifa"
      ? currentOverlay.matchState.officialStatus
      : undefined;
  // FIFA-assigned main referee, only when the state is genuinely FIFA-sourced.
  const currentMatchReferee =
    !currentSimulatedState && currentOverlay?.matchState.source === "fifa"
      ? currentOverlay.matchState.referee
      : undefined;
  const currentMatchGroupLabel = getMatchGroupLabel(currentMatch);
  const currentMatchStageLabel = getMatchStageLabel(currentMatch);
  const headerMatchGroups = HEADER_MATCH_STATUS_GROUPS.map(({ status, labelKey }) => ({
    status,
    label: t(labelKey),
    matches: matches
      // Suspended matches are still "current", so list them under the LIVE group.
      .filter(
        (match) =>
          match.status === status ||
          (status === "LIVE" && match.status === "SUSPENDED"),
      )
      .sort(
        (a, b) =>
          new Date(a.kickoffTimestamp).getTime() -
          new Date(b.kickoffTimestamp).getTime(),
      ),
  })).filter(({ matches: statusMatches }) => statusMatches.length > 0);
  const hasLiveHeaderGroup = headerMatchGroups.some(({ status }) => status === "LIVE");
  const hasUpcomingHeaderGroup = headerMatchGroups.some(({ status }) => status === "PRE_GAME");
  // Matches in progress right now (live or paused). When two or more overlap we
  // alert the viewer and surface quick-switch chips so none is missed.
  const liveMatches = matches.filter(
    (match) => match.status === "LIVE" || match.status === "SUSPENDED",
  );
  const hasSimultaneousLive = liveMatches.length >= 2;
  // The simultaneous toggle drives two mutually exclusive views when 2+ matches are
  // live: "overview" stacks one full card per live game (SimultaneousLiveMatches) so
  // none is missed; "focus" shows the single-match detail below (scoreboard, tabs,
  // incidents, chat). With fewer than two live matches there is no overview, so the
  // focus detail always shows and the toggle stays hidden.
  const showLiveOverview = hasSimultaneousLive && liveViewMode === "overview";
  const showFocusDetail = !showLiveOverview;
  // Other matches kicking off at the exact same time as the current pre-game match
  // (the final group round plays both of a group's games simultaneously). We surface
  // them in the scoreboard so a simultaneous slot is as clear BEFORE kickoff as it is
  // once the games go live (see SimultaneousLiveMatches for the live case).
  const currentKickoffMs = new Date(currentMatch.kickoffTimestamp).getTime();
  const simultaneousUpcomingMatches =
    currentMatch.status === "PRE_GAME" && !Number.isNaN(currentKickoffMs)
      ? matches.filter(
          (match) =>
            match.id !== currentMatch.id &&
            match.status === "PRE_GAME" &&
            new Date(match.kickoffTimestamp).getTime() === currentKickoffMs,
        )
      : [];
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
  // Local time at the current match's stadium (its own time zone).
  const currentStadiumTimeZone = resolveVenueTimeZone(currentMatch);

  // The live/pré-jogo status line: game-state badge + official FIFA status.
  // Shown in the center column on desktop; on mobile it is relocated above the
  // team-A flag. Only the canonical (desktop) copy carries the element ids, so
  // they stay unique across the two render positions.
  const renderMatchStatusLine = (withIds: boolean) => (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
      {/* Game state indicator, driven by the current match's status */}
      <div
        className="flex items-center space-x-1.5"
        {...(withIds ? { id: "game-state-badge" } : {})}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            currentMatch.status === "LIVE"
              ? "bg-red-500 animate-pulse"
              : currentMatch.status === "SUSPENDED"
                ? "bg-amber-500 animate-pulse"
                : currentMatch.status === "FINISHED"
                  ? "bg-slate-400"
                  : "bg-[#00e476] animate-pulse"
          }`}
        ></span>
        <span
          className={`font-mono text-xs font-bold tracking-widest uppercase ${
            currentMatch.status === "SUSPENDED"
              ? "text-amber-600 dark:text-amber-400"
              : currentMatch.status === "FINISHED"
                ? "text-slate-500 dark:text-slate-300"
                : theme === "classic-light"
                  ? "text-slate-600"
                  : "text-[#a7e6bf]"
          }`}
        >
          {currentMatch.status === "LIVE"
            ? currentMatch.matchTime
              ? t("aoVivo.status.liveWithTime", { time: currentMatch.matchTime })
              : t("aoVivo.status.live")
            : currentMatch.status === "SUSPENDED"
              ? t("aoVivo.status.suspended")
              : currentMatch.status === "FINISHED"
                ? t("aoVivo.status.finished")
                : t("aoVivo.status.preGame")}
        </span>
      </div>

      {/* Official FIFA match status / period (only when FIFA-sourced) */}
      {currentOfficialFifaStatus && (
        <div
          {...(withIds ? { id: "fifa-official-status" } : {})}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${
            theme === "classic-light"
              ? "border-slate-200 bg-slate-100 text-slate-600"
              : "border-white/10 bg-white/5 text-slate-300"
          }`}
          title={t("aoVivo.status.officialFifaTitle")}
        >
          <span>{localizeOfficialFifaStatus(currentOfficialFifaStatus, locale)}</span>
        </div>
      )}
    </div>
  );

  // The overlay source/updated line ("Oficial • Atualizado em …").
  // Shown in the center column on desktop; on mobile it is relocated above the
  // team-A flag (directly above it, below the status line).
  const renderOverlaySourceLine = () => (
    <div
      className={`text-center font-mono text-[11px] uppercase tracking-wider ${
        theme === "classic-light" ? "text-slate-500" : "text-slate-300"
      }`}
    >
      {currentOverlaySourceLabel} • {formatOverlayUpdatedAt(currentOverlayUpdatedAt, t)}
    </div>
  );

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
    // Opening a specific match always lands on its full detail (focus view).
    setLiveViewMode("focus");
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
        // Keep the request bare-path for the server default (BR) so it stays
        // byte-identical to before (and existing `**/api/match-overlays` route
        // mocks still match); only add `?country=` for a non-default pick.
        const overlaysPath =
          broadcastCountry === DEFAULT_BROADCAST_COUNTRY
            ? "/api/match-overlays"
            : `/api/match-overlays?country=${encodeURIComponent(broadcastCountry)}`;
        const response = await fetch(apiUrl(overlaysPath));
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
                    penaltyScore: data.overlays[match.id].matchState.penaltyScore,
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
    // Re-fetch (and re-poll) whenever the chosen broadcast country changes.
  }, [broadcastCountry]);

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
        ? `${scoringPlayer.name}${t("aoVivo.incidentText.scoredSuffix")}`
        : t("aoVivo.sim.goalGeneric", { teamName }),
      YELLOW_CARD: bookedPlayer
        ? `${bookedPlayer.name}${t("aoVivo.incidentText.yellowSuffix")}`
        : t("aoVivo.sim.yellowGeneric", { teamName }),
      RED_CARD: sentOffPlayer
        ? `${sentOffPlayer.name}${t("aoVivo.incidentText.redSuffix")}`
        : t("aoVivo.sim.redGeneric", { teamName }),
      SUBSTITUTION:
        playerOff && playerOn && playerOff.id !== playerOn.id
          ? `${t("aoVivo.incidentText.subOut")}${playerOff.name}${t("aoVivo.incidentText.subIn")}${playerOn.name}.`
          : t("aoVivo.sim.subGeneric", { teamName }),
      WHISTLE: t("aoVivo.sim.whistle", { teamName }),
      COMMENT: t("aoVivo.sim.comment", { teamName }),
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
      {/* SIMULTANEOUS LIVE-MATCH ALERT — only when 2+ matches overlap */}
      {hasSimultaneousLive && (
        <div
          id="simultaneous-live-alert"
          role="status"
          aria-live="polite"
          className={`border-b ${
            theme === "classic-light"
              ? "border-amber-200 bg-[#fff7e6]"
              : "border-amber-400/20 bg-amber-400/10"
          }`}
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
            <span
              className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider ${
                theme === "classic-light" ? "text-amber-700" : "text-amber-300"
              }`}
            >
              <Zap size={13} className="animate-pulse" aria-hidden="true" />
              {t("aoVivo.simultaneous.liveNow", { count: liveMatches.length })}
            </span>
            <span
              className={`text-[11px] ${
                theme === "classic-light" ? "text-amber-700/80" : "text-amber-200/80"
              }`}
            >
              {t("aoVivo.simultaneous.tapToSwitch")}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Overview pill: stack both live games side by side. The match pills
                  that follow each open a single game's full detail (focus view). */}
              <button
                type="button"
                id="btn-simultaneous-overview"
                onClick={() => setLiveViewMode("overview")}
                aria-label={t("aoVivo.simultaneous.bothAria")}
                aria-pressed={liveViewMode === "overview"}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-anton text-xs uppercase tracking-wide transition ${
                  liveViewMode === "overview"
                    ? "border-amber-400 bg-amber-400 text-amber-950"
                    : theme === "classic-light"
                      ? "border-amber-200 bg-white text-amber-800 hover:border-amber-300"
                      : "border-amber-400/30 bg-white/5 text-amber-100 hover:border-amber-400/60"
                }`}
              >
                <LayoutGrid size={12} aria-hidden="true" />
                <span>{t("aoVivo.simultaneous.both")}</span>
              </button>
              {liveMatches.map((m) => {
                const isFocused =
                  liveViewMode === "focus" && selectedMatchId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    id={`btn-simultaneous-${m.id}`}
                    onClick={() => handleSelectMatch(m.id)}
                    aria-label={t("aoVivo.simultaneous.matchAria", {
                      teamA: formatCountryNameForTooltip(m.teamA.name),
                      teamB: formatCountryNameForTooltip(m.teamB.name),
                    })}
                    aria-pressed={isFocused}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-anton text-xs uppercase tracking-wide transition ${
                      isFocused
                        ? "border-amber-400 bg-amber-400 text-amber-950"
                        : theme === "classic-light"
                          ? "border-amber-200 bg-white text-amber-800 hover:border-amber-300"
                          : "border-amber-400/30 bg-white/5 text-amber-100 hover:border-amber-400/60"
                    }`}
                  >
                    <span>{m.teamA.code}</span>
                    <span className="opacity-60">x</span>
                    <span>{m.teamB.code}</span>
                    {m.score && (
                      <span className="ml-1 font-mono font-bold">
                        {m.score.teamA}-{m.score.teamB}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
                      {group.map((m) => {
                        const a = resolveTeamDisplay(m, m.teamA, groupPositionMap);
                        const b = resolveTeamDisplay(m, m.teamB, groupPositionMap);
                        return (
                        <button
                          key={m.id}
                          id={`btn-match-${m.id}`}
                          onClick={() => handleSelectMatch(m.id)}
                          title={t("aoVivo.selector.matchTooltip", {
                            teamA: formatCountryNameForTooltip(a.name),
                            teamB: formatCountryNameForTooltip(b.name),
                          })}
                          aria-label={t("aoVivo.selector.matchTooltip", {
                            teamA: formatCountryNameForTooltip(a.name),
                            teamB: formatCountryNameForTooltip(b.name),
                          })}
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
                            <span>{a.code}</span>
                            <span>x</span>
                            <span>{b.code}</span>
                          </span>
                        </button>
                        );
                      })}
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
                        aria-label={t("aoVivo.selector.prevIn", {
                          label: label.toLowerCase(),
                        })}
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
                          {group.map((m) => {
                            const a = resolveTeamDisplay(m, m.teamA, groupPositionMap);
                            const b = resolveTeamDisplay(m, m.teamB, groupPositionMap);
                            return (
                            <button
                              key={m.id}
                              id={`btn-match-${m.id}`}
                              onClick={() => handleSelectMatch(m.id)}
                              title={t("aoVivo.selector.matchTooltip", {
                                teamA: formatCountryNameForTooltip(a.name),
                                teamB: formatCountryNameForTooltip(b.name),
                              })}
                              aria-label={t("aoVivo.selector.matchTooltip", {
                                teamA: formatCountryNameForTooltip(a.name),
                                teamB: formatCountryNameForTooltip(b.name),
                              })}
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
                                <span>{a.code}</span>
                                <span>x</span>
                                <span>{b.code}</span>
                              </span>
                            </button>
                            );
                          })}
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
                        aria-label={t("aoVivo.selector.nextIn", {
                          label: label.toLowerCase(),
                        })}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* QUICK MATCH EDITOR PREVIEW DRAWER (Only shows when clicked) */}
      {refereeCardOpen && currentMatchReferee && (
        <RefereeCard
          theme={theme}
          referee={currentMatchReferee}
          instagramPostUrls={resolveRefereeInstagram(currentMatchReferee)}
          onClose={() => setRefereeCardOpen(false)}
          id="referee-card"
        />
      )}

      {showConfig && (
        <div
          className="max-w-3xl mx-auto mt-4 mx-4 p-4 rounded-xl border bg-white dark:bg-[#121414] border-[#ffd700]/30 shadow-lg"
          id="simulation-panel"
        >
          <div className="flex items-center justify-between mb-3 border-b pb-2 border-slate-100 dark:border-white/5">
            <h3 className="font-anton text-sm tracking-wider uppercase text-[#ffd700] flex items-center gap-1.5">
              <Edit3 size={15} /> {t("aoVivo.config.title")}
            </h3>
            <button
              id="btn-close-config"
              onClick={() => setShowConfig(false)}
              className="text-xs text-red-500 font-mono"
            >
              {t("aoVivo.config.close")}
            </button>
          </div>

          {/* Speech (Narração) status — diagnostic readout */}
          <div
            id="speech-status-info"
            data-testid="speech-status-info"
            className="mb-4 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 p-3"
          >
            <p className="font-mono text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              {t("aoVivo.config.narrationStatus")}
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[11px]">
              <dt className="text-slate-400">{t("aoVivo.config.browserSupport")}</dt>
              <dd className={matchSpeech.status.supported ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                {matchSpeech.status.supported ? t("aoVivo.config.available") : t("aoVivo.config.unavailable")}
              </dd>
              <dt className="text-slate-400">{t("aoVivo.config.voiceEngine")}</dt>
              <dd className={matchSpeech.status.engineLoaded ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}>
                {matchSpeech.status.engineLoaded ? t("aoVivo.config.loaded") : matchSpeech.status.supported ? t("aoVivo.config.loading") : t("aoVivo.config.dash")}
              </dd>
              <dt className="text-slate-400">{t("aoVivo.config.selectedVoice")}</dt>
              <dd className="text-slate-700 dark:text-slate-200 truncate">
                {matchSpeech.status.voiceName ?? (matchSpeech.status.engineLoaded ? t("aoVivo.config.loadingVoice") : t("aoVivo.config.dash"))}
                {matchSpeech.status.voiceLocal !== null && (
                  <span className="text-slate-400">
                    {matchSpeech.status.voiceLocal ? t("aoVivo.config.voiceOnDevice") : t("aoVivo.config.voiceOnNetwork")}
                  </span>
                )}
              </dd>
              <dt className="text-slate-400">{t("aoVivo.config.narration")}</dt>
              <dd className={matchSpeech.enabled ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}>
                {matchSpeech.enabled ? t("aoVivo.config.enabled") : t("aoVivo.config.disabled")}
              </dd>
            </dl>

            {matchSpeech.supported && (
              <>
                {matchSpeech.voices.length > 0 && (
                  <div className="mt-3">
                    <label
                      htmlFor="select-narration-voice"
                      className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1"
                    >
                      {t("aoVivo.config.voiceLabel")}
                    </label>
                    <select
                      id="select-narration-voice"
                      data-testid="select-narration-voice"
                      value={matchSpeech.selectedVoiceUri ?? ""}
                      onChange={(e) => matchSpeech.selectVoice(e.target.value)}
                      className="w-full rounded-lg border px-2 py-2 font-mono text-xs border-slate-300 bg-white text-slate-800 dark:border-white/15 dark:bg-black dark:text-white"
                    >
                      <option value="">{t("aoVivo.config.voiceAuto")}</option>
                      {matchSpeech.voices.map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name} ({v.lang}){v.localService ? "" : t("aoVivo.config.voiceNetworkSuffix")}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  type="button"
                  id="btn-test-narration"
                  data-testid="btn-test-narration"
                  onClick={() => {
                    setSpeechTestStatus(t("aoVivo.config.testVoiceStarting"));
                    // Pass a voice only when the user explicitly picked one;
                    // "Automática" → simplest call (device default voice).
                    runDirectSpeechTest(
                      setSpeechTestStatus,
                      matchSpeech.selectedVoiceUri ? matchSpeech.selectedVoice : null,
                    );
                  }}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider transition border-[#009c3b]/40 bg-[#009c3b]/10 text-[#007a2f] hover:bg-[#009c3b]/20 dark:border-[#00e476]/30 dark:bg-[#00e476]/10 dark:text-[#00e476] dark:hover:bg-[#00e476]/20"
                  title={t("aoVivo.config.testVoiceTitle")}
                >
                  <Mic size={14} aria-hidden="true" />
                  {t("aoVivo.config.testVoice")}
                </button>
                {speechTestStatus && (
                  <p
                    data-testid="speech-test-result"
                    className="mt-2 font-mono text-[11px] text-slate-600 dark:text-slate-300"
                  >
                    {speechTestStatus}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-mono mb-1 text-slate-600 dark:text-slate-300">
                {t("aoVivo.config.kickoffLabel")}
              </label>
              <input
                id="input-kickoff-time"
                type="text"
                value={customKickoffTime}
                onChange={(e) => setCustomKickoffTime(e.target.value)}
                className="w-full text-sm font-mono p-2 border rounded bg-slate-50 dark:bg-black text-slate-900 dark:text-white"
                placeholder={t("aoVivo.config.kickoffPlaceholder")}
              />
            </div>
            <div>
              <label className="block text-sm font-mono mb-1 text-slate-600 dark:text-slate-300">
                {t("aoVivo.config.remainingLabel")}
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
                {t("aoVivo.config.convertedPreview", {
                  value: formatCountdown(customCountdownSeconds),
                })}
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
                  {t("aoVivo.config.simulatorTitle")}
                </p>
                <p className="text-xs font-archivo text-slate-600 dark:text-slate-300 leading-5">
                  {t("aoVivo.config.simulatorDesc")}
                </p>
              </div>
              <button
                id="btn-reset-simulation"
                type="button"
                onClick={handleResetSimulation}
                className="px-3 py-2 border rounded font-mono text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                {t("aoVivo.config.resetDemo")}
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
                {t("aoVivo.config.startLive")}
              </button>
              <button
                id="btn-sim-goal-a"
                type="button"
                onClick={() => handleSimulatedGoal("A")}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-anton text-xs uppercase tracking-wider text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-[#161919] dark:text-white dark:hover:bg-white/10"
              >
                <Goal size={14} />
                {t("aoVivo.config.goal", { code: currentTeamA.code })}
              </button>
              <button
                id="btn-sim-goal-b"
                type="button"
                onClick={() => handleSimulatedGoal("B")}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-anton text-xs uppercase tracking-wider text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-[#161919] dark:text-white dark:hover:bg-white/10"
              >
                <Goal size={14} />
                {t("aoVivo.config.goal", { code: currentTeamB.code })}
              </button>
              <button
                id="btn-sim-yellow-a"
                type="button"
                onClick={() => handleSimulatedCard("YELLOW_CARD", "A")}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-anton text-xs uppercase tracking-wider text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-[#161919] dark:text-white dark:hover:bg-white/10"
              >
                <ShieldAlert size={14} />
                {t("aoVivo.config.yellow", { code: currentTeamA.code })}
              </button>
              <button
                id="btn-sim-red-b"
                type="button"
                onClick={() => handleSimulatedCard("RED_CARD", "B")}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-anton text-xs uppercase tracking-wider text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-[#161919] dark:text-white dark:hover:bg-white/10"
              >
                <ShieldAlert size={14} />
                {t("aoVivo.config.red", { code: currentTeamB.code })}
              </button>
              <button
                id="btn-sim-finish-match"
                type="button"
                onClick={handleFinishSimulation}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#1f2937] px-3 py-2 font-anton text-xs uppercase tracking-wider text-white hover:bg-[#111827]"
              >
                {t("aoVivo.config.finishMatch")}
              </button>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              id="btn-apply-match-config"
              onClick={handleUpdateKickoff}
              className="px-4 py-2 bg-[#004d2c] text-white rounded font-anton uppercase text-xs hover:bg-[#00391f]"
            >
              {t("aoVivo.config.applyToMatch")}
            </button>
          </div>
        </div>
      )}

      {/* OVERVIEW VIEW — when two or more matches are live at once (final group
          round), the simultaneous toggle's "Os dois" option surfaces a full card per
          live game so every match is visible at a glance. The per-match focus detail
          below is hidden in this mode (they are mutually exclusive). */}
      {showLiveOverview && (
        <SimultaneousLiveMatches
          matches={liveMatches}
          overlays={matchOverlays}
          theme={theme}
          onSelectTeamLineup={onSelectTeamLineup}
          onOpenStandingsGroup={onOpenStandingsGroup}
        />
      )}
      {/* FOCUS VIEW — single-match detail (scoreboard, tabs, incidents, chat). Shown
          unless the live overview is active, so it is the default with 0–1 live
          matches and the per-match drill-in while 2+ are live. */}
      {showFocusDetail && (
      <>
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
          {/* Narração toggle + the simultaneous-match alert share one row, so the
              mic sits beside the "Atenção: outro jogo no mesmo horário" banner
              instead of floating alone above it. Either can appear without the
              other: with the banner the mic aligns to its right; without it the
              mic stays pinned right (ml-auto). */}
          {(matchSpeech.supported || simultaneousUpcomingMatches.length > 0) && (
            <div className="mb-5 flex items-center gap-3">
              {/* Simultaneous pré-jogo alert: another game kicks off at the very
                  same time (final group round). A bold banner so the simultaneous
                  slot is impossible to miss — and each sibling chip jumps to that
                  match. Mirrors the live SimultaneousLiveMatches case. */}
              {simultaneousUpcomingMatches.length > 0 && (
                <div
                  id="simultaneous-upcoming-matches"
                  data-testid="simultaneous-upcoming-matches"
                  className={`flex flex-1 flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed px-4 py-3 text-center sm:flex-row sm:gap-3 ${
                    theme === "classic-light"
                      ? "border-amber-300 bg-amber-50"
                      : "border-amber-400/40 bg-amber-400/10"
                  }`}
                >
                  <span
                    className={`flex items-center gap-2 font-anton text-sm uppercase tracking-wide ${
                      theme === "classic-light" ? "text-amber-700" : "text-amber-300"
                    }`}
                  >
                    <Zap size={18} className="shrink-0 animate-pulse" aria-hidden="true" />
                    {simultaneousUpcomingMatches.length === 1
                      ? t("aoVivo.scoreboard.simultaneousOne")
                      : t("aoVivo.scoreboard.simultaneousMany")}
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {simultaneousUpcomingMatches.map((m) => {
                      const a = resolveTeamDisplay(m, m.teamA, groupPositionMap);
                      const b = resolveTeamDisplay(m, m.teamB, groupPositionMap);
                      return (
                      <button
                        key={m.id}
                        type="button"
                        id={`btn-simultaneous-${m.id}`}
                        onClick={() => handleSelectMatch(m.id)}
                        title={t("aoVivo.scoreboard.simultaneousTitle", {
                          teamA: formatCountryNameForTooltip(a.name),
                          teamB: formatCountryNameForTooltip(b.name),
                        })}
                        aria-label={t("aoVivo.scoreboard.simultaneousAria", {
                          teamA: formatCountryNameForTooltip(a.name),
                          teamB: formatCountryNameForTooltip(b.name),
                        })}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-anton text-sm uppercase tracking-wide transition ${
                          theme === "classic-light"
                            ? "border-amber-300 bg-white text-slate-800 hover:border-amber-400 hover:bg-amber-100"
                            : "border-amber-400/30 bg-[#1a1c14] text-amber-50 hover:border-amber-300/60 hover:bg-amber-400/15"
                        }`}
                      >
                        <FlagIcon
                          flag={a.flagSvg}
                          className="h-4 w-6 shrink-0 rounded-[2px] object-cover"
                        />
                        <span>{a.code} x {b.code}</span>
                        <FlagIcon
                          flag={b.flagSvg}
                          className="h-4 w-6 shrink-0 rounded-[2px] object-cover"
                        />
                      </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {matchSpeech.supported && (
                <div className="ml-auto shrink-0">
                  <MatchSpeechToggle
                    enabled={matchSpeech.enabled}
                    onToggle={matchSpeech.toggle}
                    theme={theme}
                  />
                </div>
              )}
            </div>
          )}

          <div
            className="flex flex-col items-center justify-between space-y-6 md:space-y-0 md:flex-row md:space-x-8"
            id="scoreboard-grid"
          >
            {/* MOBILE ONLY: the pré-jogo/live status line and the
                source/updated line sit above the team-A flag. Desktop keeps
                both in the center column. */}
            <div className="w-full md:hidden">{renderMatchStatusLine(false)}</div>
            <div className="w-full md:hidden">{renderOverlaySourceLine()}</div>

            {/* LEFT TEAM */}
            <div
              className="flex flex-col items-center space-y-3 flex-1"
              id="team-a-display"
            >
              <div className="w-32 h-24 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-white/80 dark:border-white/10 shadow-lg overflow-hidden transition hover:scale-105 p-3">
                <FlagIcon
                  flag={currentTeamA.flagSvg}
                  className="w-full h-full object-contain"
                  onClick={() => onSelectTeamLineup(currentTeamA.ref)}
                />
              </div>
              <h2
                className={`font-anton text-lg tracking-wider uppercase ${
                  theme === "classic-light" ? "text-slate-800" : "text-white"
                }`}
              >
                {currentTeamA.name}
              </h2>
            </div>

            {/* CENTER TIME AND PLAY STATUS INDICATORS */}
            <div
              className="flex flex-col items-center text-center space-y-2 flex-1 min-w-[200px]"
              id="clock-center-display"
            >
              {/* Live status + official FIFA status share a single line.
                  On mobile this line is relocated above the team-A flag (see
                  the scoreboard grid), so it is shown here only from md up. */}
              <div className="hidden md:block w-full">{renderMatchStatusLine(true)}</div>

              {/* Source/updated line. On mobile it is relocated above the
                  team-A flag (see the scoreboard grid), so it shows here only
                  from md up. */}
              <div className="hidden md:block w-full">{renderOverlaySourceLine()}</div>

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

              {/* Penalty-shootout result, for a knockout tie decided on penalties */}
              {currentMatchPenaltyScore && (
                <div
                  className="flex flex-col items-center gap-1"
                  id="scoreboard-penalty"
                >
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 font-mono text-xs font-bold uppercase tracking-wider ${
                      theme === "classic-light"
                        ? "border-amber-300 bg-amber-50 text-amber-700"
                        : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                    }`}
                    title={t("aoVivo.scoreboard.penaltyTitle")}
                  >
                    {t("aoVivo.scoreboard.penaltyLabel", {
                      a: currentMatchPenaltyScore.teamA,
                    })}
                    <span className="opacity-50">x</span>
                    {currentMatchPenaltyScore.teamB}
                  </span>
                  {penaltyShootoutWinnerName && currentMatch.status === "FINISHED" && (
                    <span
                      className={`font-archivo text-[11px] font-semibold uppercase tracking-wide ${
                        theme === "classic-light" ? "text-slate-500" : "text-slate-300"
                      }`}
                    >
                      {t("aoVivo.scoreboard.advancesOnPenalties", {
                        name: penaltyShootoutWinnerName,
                      })}
                    </span>
                  )}
                </div>
              )}

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
                  aria-label={t("aoVivo.scoreboard.openGroupTable", {
                    group: currentMatchGroupLabel,
                  })}
                >
                  {currentMatchGroupLabel}
                </button>
              )}

              {!currentMatchGroupLabel && currentMatchStageLabel && (
                <span
                  className={`rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] ${
                    theme === "classic-light"
                      ? "border-slate-200 bg-slate-100 text-slate-700"
                      : "border-white/10 bg-white/5 text-slate-100"
                  }`}
                  id="scoreboard-stage-label"
                >
                  {localizedStageName(currentMatchStageLabel)}
                </span>
              )}

            </div>

            {/* RIGHT TEAM */}
            <div
              className="flex flex-col items-center space-y-3 flex-1"
              id="team-b-display"
            >
              <div className="w-32 h-24 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-white/80 dark:border-white/10 shadow-lg overflow-hidden transition hover:scale-105 p-3">
                <FlagIcon
                  flag={currentTeamB.flagSvg}
                  className="w-full h-full object-contain"
                  onClick={() => onSelectTeamLineup(currentTeamB.ref)}
                />
              </div>

              <h2
                className={`font-anton text-lg tracking-wider uppercase ${
                  theme === "classic-light" ? "text-slate-800" : "text-white"
                }`}
              >
                {currentTeamB.name}
              </h2>
            </div>
          </div>

          {/* Weather/lightning suspension advisory + link to the FIFA regulations */}
          {currentMatch.status === "SUSPENDED" && (
            <div className="mt-5 flex justify-center">
              <WeatherSuspensionNotice theme={theme} />
            </div>
          )}

          {/* Per-match schedule advisory (e.g. weather kickoff delay) */}
          {showMatchAdvisory && (
            <div className="mt-5 flex justify-center">
              <MatchAdvisoryNotice message={matchAdvisory} theme={theme} />
            </div>
          )}

          {/* Stadium, Location & Capacity details */}
          <div
            className="mt-8 pt-6 border-t border-slate-150 dark:border-white/5 flex items-center justify-center text-center"
            id="stadium-footer-display"
          >
            <div className="flex flex-col items-center text-sm">
              {/* Current local time at the stadium, above its location */}
              {(currentMatch.status === "LIVE" || currentMatch.status === "SUSPENDED") &&
                currentStadiumTimeZone && (
                  <div
                    id="stadium-local-time"
                    className={`mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider ${
                      theme === "classic-light" ? "text-slate-500" : "text-slate-400"
                    }`}
                    title={t("aoVivo.scoreboard.stadiumLocalTimeTitle")}
                  >
                    <Clock size={12} aria-hidden="true" />
                    <span>{t("aoVivo.scoreboard.localTime")}</span>
                    <span className="font-bold tabular-nums text-amber-500">
                      {formatTimeInZone(currentTime, currentStadiumTimeZone)}
                    </span>
                  </div>
                )}

              {/* Countdown ("Faltam: …") — immediately above the Brasília clock */}
              <div className="mb-2 flex flex-col items-center" id="countdown-sub-wrapper">
                {currentMatch.status === "PRE_GAME" && (
                  <div
                    className={`font-mono text-xs md:text-sm font-semibold tracking-wider ${
                      theme === "classic-light"
                        ? "text-[#009c3b]"
                        : "text-[#00e476] glowing-text-green"
                    }`}
                  >
                    {t("aoVivo.scoreboard.countdown")}{" "}
                    <span className="font-bold">
                      {formatCountdown(secondsRemaining)}
                    </span>
                  </div>
                )}
              </div>

              {/* HORÁRIO DE BRASÍLIA — immediately above the stadium name and location */}
              {currentMatch.status !== "FINISHED" && (
                <span
                  className={`mb-2 flex items-center gap-2 text-xs font-mono tracking-widest font-black uppercase ${
                    theme === "classic-light" ? "text-slate-800" : "text-white"
                  }`}
                >
                  <span className={theme === "classic-light" ? "text-slate-800" : "text-white"}>{t("aoVivo.scoreboard.brasiliaTime")}</span>
                  <span className="tabular-nums" id="brasilia-clock">
                    {formatBrasiliaTime(currentTime)}
                  </span>
                </span>
              )}

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
                  {currentMatch.stadiumName} • {localizedStageName(currentMatch.stageName)}
                </a>
              </div>

              {/* Venue weather, right below the stadium location, while the
                  match is in progress or paused (a stoppage is often weather-related) */}
              {(currentMatch.status === "LIVE" || currentMatch.status === "SUSPENDED") && (
                <div className="mt-3">
                  <MatchWeatherChip match={currentMatch} theme={theme} />
                </div>
              )}

              {/* FIFA-assigned referee, whenever one has been published for the
                  match (assigned a day or two before kickoff). */}
              {currentMatchReferee && (
                <div className="mt-3">
                  <RefereeChip
                    referee={currentMatchReferee}
                    theme={theme}
                    onClick={() => setRefereeCardOpen(true)}
                  />
                </div>
              )}

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
                  {t("aoVivo.scoreboard.fifaMatchPage")}
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
            {t("aoVivo.tab.broadcast")}
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
            {t("aoVivo.tab.lineup")}
          </button>
          {locale !== "es" && matchAnalysisText && (
            <button
              id="btn-tab-pregame"
              onClick={() => setActiveTab("pregame")}
              className={`px-3.5 py-2 min-h-11 rounded-md text-[13px] md:text-sm leading-none font-anton transition-all uppercase tracking-wide ${
                activeTab === "pregame"
                  ? theme === "classic-light"
                    ? "bg-white text-slate-950 shadow-sm font-semibold"
                    : "bg-[#171a1c] text-[#ffd84d] shadow-sm font-semibold"
                  : theme === "classic-light"
                    ? "text-slate-700 hover:bg-white hover:text-slate-950"
                    : "text-slate-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              {currentMatch.status === "FINISHED" ? t("aoVivo.tab.postGame") : t("aoVivo.tab.preGame")}
            </button>
          )}
          {hasMatchInstagram && (
            <button
              id="btn-tab-instagram"
              onClick={() => setActiveTab("instagram")}
              className={`px-3.5 py-2 min-h-11 rounded-md text-[13px] md:text-sm leading-none font-anton transition-all uppercase tracking-wide ${
                activeTab === "instagram"
                  ? theme === "classic-light"
                    ? "bg-white text-slate-950 shadow-sm font-semibold"
                    : "bg-[#171a1c] text-[#ffd84d] shadow-sm font-semibold"
                  : theme === "classic-light"
                    ? "text-slate-700 hover:bg-white hover:text-slate-950"
                    : "text-slate-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              {t("aoVivo.tab.instagram")}
            </button>
          )}
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
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p
                  className={`font-anton text-lg md:text-xl uppercase tracking-wide ${
                    theme === "classic-light" ? "text-slate-900" : "text-white"
                  }`}
                  id="broadcast-section-title"
                >
                  {t("aoVivo.broadcast.title")}
                </p>
                <BroadcastCountrySelect
                  value={broadcastCountry}
                  onChange={handleBroadcastCountryChange}
                  theme={theme}
                  label={t("aoVivo.broadcast.countryLabel")}
                />
              </div>
              <p
                className={`mb-4 font-mono text-[11px] uppercase tracking-wider ${
                  theme === "classic-light"
                    ? "text-slate-500"
                    : "text-slate-300"
                }`}
              >
                {currentOverlay?.broadcastGuide.note || t("aoVivo.broadcast.loadingNote")} •{" "}
                {formatOverlayUpdatedAt(currentOverlay?.broadcastGuide.updatedAt, t)}
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
                            aria-label={t("aoVivo.broadcast.videoAria", {
                              title: video.title,
                            })}
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
                    className="flex min-w-0 flex-1 items-center gap-2 md:gap-3 overflow-x-auto scrollbar-hidden snap-x py-1"
                    id="fifa-broadcasters-list"
                  >
                    {visibleBroadcasters.length === 0 && (
                      <span
                        id="broadcast-none-for-country"
                        className={`font-mono text-[11px] uppercase tracking-wider ${
                          theme === "classic-light" ? "text-slate-500" : "text-slate-400"
                        }`}
                      >
                        {t("aoVivo.broadcast.noneForCountry")}
                      </span>
                    )}
                    {visibleBroadcasters.map((cast) => (
                      <a
                        key={cast.id}
                        id={`link-broadcaster-${cast.id}`}
                        href={cast.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`${cast.name} • ${cast.type}`}
                        className={`flex h-[72px] w-[84px] shrink-0 snap-start items-center justify-center rounded-xl border px-2 py-2 transition hover:-translate-y-0.5 ${
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
                        {t("aoVivo.incidents.title")}
                      </p>
                      <p
                        className={`mt-1 font-mono text-[11px] uppercase tracking-wider ${
                          theme === "classic-light"
                            ? "text-slate-500"
                            : "text-slate-300"
                        }`}
                      >
                        {currentSimulatedState
                          ? t("aoVivo.incidents.feedSimulation")
                          : currentOverlay?.matchState.source === "fifa"
                          ? t("aoVivo.incidents.feedOfficial")
                          : t("aoVivo.incidents.feedWaiting")}{" "}
                        •{" "}
                        {formatOverlayUpdatedAt(
                          currentSimulatedState?.updatedAt ??
                            currentOverlay?.matchState.updatedAt,
                          t,
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
                          {t("aoVivo.incidents.clickHint")}
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
                          className={`flex items-start justify-between gap-2 rounded-xl border px-3 py-3 transition ${
                            getIncidentCardClass(incident.type, theme)
                          }`}
                        >
                          <div className="min-w-0 flex-1">
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
                              {getIncidentLabel(incident.type, t)}
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
                                  ? currentTeamA.code
                                  : currentTeamB.code}
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
                          {matchSpeech.supported && (
                            <button
                              type="button"
                              data-testid="incident-speak"
                              onClick={() => matchSpeech.speak(buildIncidentSpeech(incident))}
                              aria-label={t("aoVivo.incidents.listenPlay")}
                              title={t("aoVivo.incidents.listenPlay")}
                              className={`mt-0.5 shrink-0 rounded-full border p-2 transition ${
                                theme === "classic-light"
                                  ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                                  : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                              }`}
                            >
                              <Mic size={16} aria-hidden="true" />
                            </button>
                          )}
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
                      {t("aoVivo.incidents.empty")}
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
                      {t("aoVivo.finished.label")}
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
                        aria-label={t("aoVivo.finished.prev")}
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
                              title={t("aoVivo.selector.matchTooltip", {
                                teamA: formatCountryNameForTooltip(m.teamA.name),
                                teamB: formatCountryNameForTooltip(m.teamB.name),
                              })}
                              aria-label={t("aoVivo.selector.matchTooltip", {
                                teamA: formatCountryNameForTooltip(m.teamA.name),
                                teamB: formatCountryNameForTooltip(m.teamB.name),
                              })}
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
                        aria-label={t("aoVivo.finished.next")}
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

        {/* AFFILIATE: "Equipe para assistir" — Amazon Associates gear strip, paired with Onde Assistir */}
        {activeTab === "broadcast" && <AffiliateProducts theme={theme} />}

        {/* TAB: PRE-GAME / POST-GAME EDITORIAL ANALYSIS */}
        {activeTab === "pregame" && locale !== "es" && matchAnalysisText && (
          <MatchEditorialTab
            analysisText={matchAnalysisText}
            status={currentMatch.status}
            theme={theme}
          />
        )}

        {/* TAB: INSTAGRAM POST(S) FOR THIS MATCH */}
        {activeTab === "instagram" && hasMatchInstagram && (
          <MatchInstagramTab urls={matchInstagramUrls} theme={theme} />
        )}

        {/* TAB 2: INTERACTIVE TACTICAL LINEUPS / SQUAD PITCH */}
        {activeTab === "lineup" && (
          <MatchLineupTab
            match={currentMatch}
            onSelectTeamLineup={onSelectTeamLineup}
            lineupEntry={teamLineups[currentMatch.id]}
            theme={theme}
          />
        )}

        {/* Anonymous live-match chat ("Resenha ao vivo") — open only while LIVE */}
        <MatchChatPanel matchId={currentMatch.id} theme={theme} />
      </div>
      </>
      )}

      {selectedIncidentPlayer && (
        <PlayerOverlayCard
          id="match-incident-player-overlay"
          theme={theme}
          player={selectedIncidentPlayer.player}
          teamName={selectedIncidentPlayer.team.name}
          primaryColor={selectedIncidentPlayer.team.primaryColor}
          secondaryColor={selectedIncidentPlayer.team.secondaryColor}
          stats={buildPlayerStatCells(
            selectedIncidentPlayer.player,
            incidentPlayerStats,
            theme,
          )}
          details={[
            { label: t("aoVivo.overlayCard.position"), value: getPositionLabel(selectedIncidentPlayer.player.position) },
            ...(selectedIncidentPlayer.player.dateOfBirth
              ? [{ label: t("aoVivo.overlayCard.birth"), value: formatBirthDate(selectedIncidentPlayer.player.dateOfBirth) }]
              : []),
            ...(selectedIncidentPlayer.player.club
              ? [{ label: t("aoVivo.overlayCard.currentClub"), value: selectedIncidentPlayer.player.club }]
              : []),
            {
              label: t("aoVivo.overlayCard.matchContext"),
              value: t("aoVivo.overlayCard.matchContextValue", {
                teamName: toTitleCasePtBr(selectedIncidentPlayer.team.name),
                opponentName: toTitleCasePtBr(selectedIncidentPlayer.opponentName),
                playerName: toTitleCasePtBr(selectedIncidentPlayer.player.name),
              }),
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

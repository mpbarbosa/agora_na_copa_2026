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
import {
  DEFAULT_COUNTRY_BY_LOCALE,
  DEFAULT_BROADCAST_COUNTRY,
  isBroadcastCountry,
} from "../data/broadcastCountries";
import { resolveTeamDisplay } from "../utils/resolveTeamDisplay";
import MATCH_ANALYSIS from "../data/matchAnalysis.json";
import MATCH_ANALYSIS_EN from "../data/matchAnalysis.en.json";
import { pickEditorialText } from "../data/editorial";
import { resolvePlayerEntry } from "../data/playerRegistry";
import MATCH_INSTAGRAM from "../data/matchInstagram.json";
import { formatKickoffFromInstant } from "../utils/kickoffFormat";
import type { TeamLineupsMap } from "../utils/teamLineup";
import { PlayerOverlayCard, PlayerPictureOverlay } from "./PlayerOverlayCard";
import { usePlayerStats } from "../hooks/usePlayerStats";
import { buildPlayerStatCells, buildPlayerDetailRows, buildMatchContextRow } from "../utils/playerDisplay";
import { MatchChatPanel } from "./MatchChatPanel";
import { resolveInstagramPostUrls } from "../utils/instagram";
import { RefereeCard } from "./RefereeCard";
import { resolveRefereeInstagram } from "../utils/refereeIdentity";
import { SimultaneousLiveMatches } from "./SimultaneousLiveMatches";
import MATCH_ADVISORIES from "../data/matchAdvisories.json";
import { useMatchSpeech } from "../hooks/useMatchSpeech";
import { useClockTick } from "../hooks/useClockTick";
import {
  Zap,
  LayoutGrid,
} from "lucide-react";
import { MatchEditorialTab } from "./MatchEditorialTab";
import { MatchInstagramTab } from "./MatchInstagramTab";
import { MatchLineupTab } from "./MatchLineupTab";
import { MatchSelectorBar } from "./MatchSelectorBar";
import { MatchClockConfigDrawer } from "./MatchClockConfigDrawer";
import { MatchScoreboard } from "./MatchScoreboard";
import { BroadcastGuideTab } from "./BroadcastGuideTab";
import {
  isIncidentPlayerNameMatch,
  normalizePlayerLookupText,
  type IncidentPlayerSelection,
  type StoredIncidentPlayer,
  type StoredIncidentPlayerKey,
} from "../utils/matchIncidents";
import {
  DEMO_MATCH_ID,
  getMatchCountdownSeconds,
  parseMinuteLabel,
  formatMinuteLabel,
} from "../utils/matchClock";
import {
  getInitialMatchId,
  applySimulatedState,
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

// Turns a FIFA kickoff-override instant (MatchStateEntry.kickoffOverride) into
// the seed-shaped kickoff fields to spread over a match. Returns an empty patch
// when there is no override or it can't be parsed, so the seed kickoff stands.
function applyKickoffOverride(
  match: Match,
  kickoffOverride: string | undefined,
): Partial<Pick<Match, "kickoffTime" | "kickoffDate" | "kickoffTimestamp">> {
  if (!kickoffOverride) return {};
  const display = formatKickoffFromInstant(kickoffOverride);
  if (!display) return {};
  return {
    kickoffTime: display.kickoffTime,
    kickoffDate: display.kickoffDate,
    kickoffTimestamp: kickoffOverride,
  };
}

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

  const resolvePlayerFromKey = (key: StoredIncidentPlayerKey, teamCode?: string): Player => {
    const found = currentLineupPlayers.find(
      (p) =>
        (key.id !== undefined && p.id === key.id) ||
        isIncidentPlayerNameMatch(p.name, key.name),
    );
    if (found) return found;
    // Not in the loaded lineup (the incident arrived before the lineup, or the mention is a
    // name-only reference): enrich from the squad registry so the card shows the real shirt
    // number, position and bio instead of the "0 / Meio-campista" placeholder. Resolves by
    // FIFA id first (key.id), then by name within the team.
    const entry = resolvePlayerEntry(teamCode ?? "", key.name, Number.NaN, key.id);
    if (entry) {
      return {
        id: entry.fifaId,
        name: entry.name,
        number: entry.number,
        position: entry.position,
        x: 50,
        y: 50,
        fifaId: entry.fifaId,
        fullName: entry.fullName,
        club: entry.club,
        pictureUrl: key.pictureUrl ?? entry.pictureUrl,
        socials: entry.socials,
        instagramPostUrl: entry.instagramPostUrl,
        instagramPostUrls: entry.instagramPostUrls,
        worldCupNote: entry.worldCupNote,
        dateOfBirth: entry.dateOfBirth,
        height: entry.height,
      };
    }
    return {
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
        player: resolvePlayerFromKey(storedIncidentPlayer.playerKey, storedIncidentPlayer.team.code),
        team: storedIncidentPlayer.team,
        opponentName: storedIncidentPlayer.opponentName,
      }
    : null;

  const expandedIncidentPlayer: Player | null = expandedIncidentPlayerKey
    ? resolvePlayerFromKey(expandedIncidentPlayerKey)
    : null;

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
                    // FIFA rescheduled the kickoff — prefer its authoritative
                    // instant over the now-stale seed time/date (and the
                    // countdown target). Falls back to the seed if unparseable.
                    ...applyKickoffOverride(
                      match,
                      data.overlays[match.id].matchState.kickoffOverride,
                    ),
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
      <MatchSelectorBar
        groups={headerMatchGroups}
        groupPositionMap={groupPositionMap}
        selectedMatchId={selectedMatchId}
        onSelectMatch={handleSelectMatch}
        theme={theme}
      />
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
        <MatchClockConfigDrawer
          theme={theme}
          matchSpeech={matchSpeech}
          homeCode={currentTeamA.code}
          awayCode={currentTeamB.code}
          customKickoffTime={customKickoffTime}
          onKickoffTimeChange={setCustomKickoffTime}
          customCountdownSeconds={customCountdownSeconds}
          onCountdownSecondsChange={setCustomCountdownSeconds}
          onApply={handleUpdateKickoff}
          onClose={() => setShowConfig(false)}
          simulation={{
            onStartLive: handleStartSimulation,
            onGoal: handleSimulatedGoal,
            onCard: handleSimulatedCard,
            onFinish: handleFinishSimulation,
            onReset: handleResetSimulation,
          }}
        />
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
      <MatchScoreboard
        match={currentMatch}
        teamA={currentTeamA}
        teamB={currentTeamB}
        theme={theme}
        currentTime={currentTime}
        secondsRemaining={secondsRemaining}
        matchSpeech={matchSpeech}
        simultaneousUpcomingMatches={simultaneousUpcomingMatches}
        groupPositionMap={groupPositionMap}
        officialFifaStatus={currentOfficialFifaStatus}
        overlaySourceLabel={currentOverlaySourceLabel}
        overlayUpdatedAt={currentOverlayUpdatedAt}
        referee={currentMatchReferee}
        matchAdvisory={matchAdvisory}
        onSelectMatch={handleSelectMatch}
        onSelectTeamLineup={onSelectTeamLineup}
        onOpenStandingsGroup={onOpenStandingsGroup}
        onOpenReferee={() => setRefereeCardOpen(true)}
      />

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

        {/* TAB 1: ONDE ASSISTIR BROADCAST GUIDE + paired affiliate strip */}
        {activeTab === "broadcast" && (
          <BroadcastGuideTab
            theme={theme}
            match={currentMatch}
            broadcasters={visibleBroadcasters}
            broadcastCountry={broadcastCountry}
            onCountryChange={handleBroadcastCountryChange}
            broadcastNote={currentOverlay?.broadcastGuide.note}
            broadcastUpdatedAt={currentOverlay?.broadcastGuide.updatedAt}
            incidents={visibleIncidents}
            simulated={Boolean(currentSimulatedState)}
            matchStateSource={currentOverlay?.matchState.source}
            incidentsUpdatedAt={
              currentSimulatedState?.updatedAt ?? currentOverlay?.matchState.updatedAt
            }
            teamACode={currentTeamA.code}
            teamBCode={currentTeamB.code}
            lineupEntry={currentLineupEntry}
            matchSpeech={matchSpeech}
            onSelectIncidentPlayer={(selection) =>
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
            matches={matches}
            selectedMatchId={selectedMatchId}
            onSelectMatch={handleSelectMatch}
          />
        )}

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
            t,
          )}
          details={[
            ...buildPlayerDetailRows(selectedIncidentPlayer.player, t),
            buildMatchContextRow(
              selectedIncidentPlayer.team.name,
              selectedIncidentPlayer.opponentName,
              selectedIncidentPlayer.player.name,
              t,
            ),
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

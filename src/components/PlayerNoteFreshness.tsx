import { useEffect, useState } from "react";
import { apiUrl, useT } from "../i18n";
import { getPlayerByFifaId } from "../data/playerRegistry";
import { APP_MATCHES } from "../appMatches";
import {
  isAnalysisUpToDate,
  lastFinishedKickoff,
  type FinishableMatch,
} from "../utils/analysisFreshness";
import { formatAnalysisTimestamp } from "../utils/dateFormat";
import { AnalysisFreshnessBadge } from "./AnalysisFreshnessBadge";

type LiveState = { status: string };

// Module-level cache so opening several player cards doesn't refetch the live
// statuses. The map is small and short-lived; a single in-flight promise is
// shared across mounts.
let statesCache: Record<string, LiveState> | null = null;
let statesPromise: Promise<Record<string, LiveState>> | null = null;

function fetchMatchStates(): Promise<Record<string, LiveState>> {
  if (statesCache) return Promise.resolve(statesCache);
  if (!statesPromise) {
    statesPromise = fetch(apiUrl("/api/match-states"))
      .then((res) => (res.ok ? res.json() : { states: {} }))
      .then((data: { states?: Record<string, LiveState> }) => {
        statesCache = data.states ?? {};
        return statesCache;
      })
      .catch(() => ({}) as Record<string, LiveState>);
  }
  return statesPromise;
}

interface PlayerNoteFreshnessProps {
  fifaId?: string;
  theme: "classic-light" | "stadium-dark";
  mutedClasses: string;
  id?: string;
}

/**
 * Freshness line for a player's editorial note ("Leitura"/worldCupNote): an
 * Atualizada/Desatualizada badge plus the "Atualizado em …" stamp. The note is
 * up to date when its `worldCupNoteUpdatedAt` is at/after the player's team's
 * most recent finished match. Self-resolves everything from the player's FIFA id
 * (squad registry + fixtures), overlaying live `/api/match-states` statuses on
 * the local seed for accuracy. Renders nothing when the player has no note.
 */
export function PlayerNoteFreshness({
  fifaId,
  theme,
  mutedClasses,
  id,
}: PlayerNoteFreshnessProps) {
  // Freshness label + "Atualizado em …" stamp are delegated to AnalysisFreshnessBadge
  // and formatAnalysisTimestamp, so this component has no hardcoded UI strings of its
  // own to localize. The hook is kept so future in-component copy can translate.
  useT();
  const entry = fifaId ? getPlayerByFifaId(fifaId) : null;
  const hasNote = Boolean(entry?.worldCupNote);
  const [states, setStates] = useState<Record<string, LiveState> | null>(statesCache);

  useEffect(() => {
    if (!hasNote) return;
    let active = true;
    void fetchMatchStates().then((s) => {
      if (active) setStates(s);
    });
    return () => {
      active = false;
    };
  }, [hasNote]);

  if (!entry || !hasNote) return null;

  // The team's fixtures with live status overlaid on the seed where available.
  const teamMatches: FinishableMatch[] = APP_MATCHES.filter(
    (m) => m.teamA.code === entry.teamCode || m.teamB.code === entry.teamCode,
  ).map((m) => ({
    status: states?.[m.id]?.status ?? m.status,
    kickoffTimestamp: m.kickoffTimestamp,
  }));

  const lastFinished = lastFinishedKickoff(teamMatches);
  const upToDate = isAnalysisUpToDate(entry.worldCupNoteUpdatedAt, lastFinished);
  const stamp = formatAnalysisTimestamp(entry.worldCupNoteUpdatedAt);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2" id={id}>
      <AnalysisFreshnessBadge
        upToDate={upToDate}
        theme={theme}
        testId={id ? `${id}-badge` : undefined}
      />
      {stamp && (
        <span
          className={`font-mono text-[9px] uppercase tracking-wider ${mutedClasses}`}
          data-testid={id ? `${id}-updated` : undefined}
        >
          {stamp}
        </span>
      )}
    </div>
  );
}

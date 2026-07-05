// Match-selection helpers for the "Ao Vivo" view: initial-match resolution,
// simulated-state application, and the scoreboard group/stage + broadcaster/
// country labels. Pure — no React, no I/O — so they are unit-tested in isolation
// (`tests/match-selection.test.ts`). Extracted from
// `src/components/MatchDetailView.tsx`.
import { Match, MatchStatus, CommentaryEvent } from "../types";

export interface SimulatedMatchState {
  status: MatchStatus;
  score?: {
    teamA: number;
    teamB: number;
  };
  matchTime?: string;
  incidents: CommentaryEvent[];
  updatedAt: string;
}

// A live (or suspended) match takes priority; otherwise the soonest match that
// hasn't kicked off yet
export function getInitialMatchId(matches: Match[]): string {
  const liveMatch = matches.find((m) => m.status === "LIVE" || m.status === "SUSPENDED");
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

export function applySimulatedState(match: Match, simulation: SimulatedMatchState | undefined): Match {
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

export function getMatchGroupLabel(match: Match) {
  if (match.stageName !== "Group Stage") {
    return null;
  }

  return match.teamA.group === match.teamB.group ? match.teamA.group : match.teamA.group || null;
}

// Knockout matches have no group, so the scoreboard shows the round name
// (e.g. "16 Avos de Final", "Oitavas de Final", "Final") in place of the
// "Grupo X" label, keeping stage context once the group stage is over.
export function getMatchStageLabel(match: Match) {
  if (match.stageName === "Group Stage" || !match.stageName) {
    return null;
  }

  return match.stageName;
}

export function getBroadcasterBadgeLabel(name: string) {
  return name
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(2, "•");
}

export function formatCountryNameForTooltip(name: string) {
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

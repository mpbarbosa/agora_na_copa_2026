import type { Match, StandingsRow } from "./types";
import { stadiums } from "./data/tournament";
import { KNOCKOUT_MATCHES } from "./data/knockoutBracket";
import teamsByContinent from "./data/teamsByContinent.json";
import goalTimeline from "./data/goalTimeline.json";

type ContinentJson = (typeof teamsByContinent)["continents"][number];

/**
 * Pure aggregation logic for the Dashboard view. Each function takes already-computed
 * inputs (the live `matches` array and/or the reconciled `StandingsRow[]` from
 * `computeStandings`) and returns plain data the chart components render — no React,
 * no fetching — so the maths is unit-tested independently (`tests/dashboard-stats.test.ts`).
 *
 * `goalsByGroup` / `topScoringTeams` / `tournamentTotals.groupGoals` are group-stage
 * figures: `computeStandings` only counts "Group Stage" fixtures, so knockout goals are
 * intentionally excluded (labelled as such in the UI). Match COUNTS, by contrast, span the
 * whole tournament because they come straight off `matches`.
 */

/** The 48-team field size, summed from the continent breakdown (single source of truth). */
export const TEAM_COUNT = teamsByContinent.continents.reduce((sum, c) => sum + c.count, 0);

export interface TournamentTotals {
  teams: number;
  stadiums: number;
  matchesTotal: number;
  matchesFinished: number;
  matchesLive: number;
  matchesUpcoming: number;
  /** Goals scored across completed group-stage matches. */
  groupGoals: number;
  /** Goals per completed group-stage match (0 when none played yet). */
  groupGoalsPerMatch: number;
}

/** Headline KPI figures for the stat cards. `standings` is the reconciled group table. */
export function tournamentTotals(matches: Match[], standings: StandingsRow[]): TournamentTotals {
  const groupGoals = standings.reduce((sum, row) => sum + row.goalsFor, 0);
  // Each finished group match increments `played` for both sides, so halve the sum.
  const groupMatchesPlayed = standings.reduce((sum, row) => sum + row.played, 0) / 2;
  const countBy = (predicate: (m: Match) => boolean) => matches.filter(predicate).length;
  return {
    teams: TEAM_COUNT,
    stadiums: stadiums.length,
    matchesTotal: matches.length,
    matchesFinished: countBy((m) => m.status === "FINISHED"),
    matchesLive: countBy((m) => m.status === "LIVE" || m.status === "SUSPENDED"),
    matchesUpcoming: countBy((m) => m.status === "PRE_GAME"),
    groupGoals,
    groupGoalsPerMatch: groupMatchesPlayed ? groupGoals / groupMatchesPlayed : 0,
  };
}

export interface ContinentDatum {
  continent: string;
  confederation: string;
  count: number;
}

/** Teams per continent (FIFA confederation), straight from the seeded JSON report. */
export function continentBreakdown(): ContinentDatum[] {
  return teamsByContinent.continents.map(({ continent, confederation, count }) => ({
    continent,
    confederation,
    count,
  }));
}

export interface ContinentPhaseDatum {
  continent: string;
  confederation: string;
  /** Teams that reached the group stage (i.e. all qualified — the 48-team field). */
  groupStage: number;
  /** Teams that advanced to the Round of 32 (16-avos). */
  roundOf32: number;
}

/**
 * Teams per continent broken down by phase reached: group stage (all qualified) vs the
 * Round of 32. Pure over its inputs — `continents` is the seeded breakdown and
 * `roundOf32Codes` the 32 advancing team codes — so it's unit-tested; `continentByPhase`
 * is the wrapper that sources them from the JSON + the knockout bracket. A R32 code with no
 * continent mapping is ignored (defensive; every real code resolves).
 */
export function aggregateContinentByPhase(
  continents: ContinentJson[],
  roundOf32Codes: string[],
): ContinentPhaseDatum[] {
  const codeToContinent = new Map<string, string>();
  for (const c of continents) {
    for (const team of c.teams) codeToContinent.set(team.code, c.continent);
  }
  const r32ByContinent = new Map<string, number>();
  for (const code of roundOf32Codes) {
    const continent = codeToContinent.get(code);
    if (continent) r32ByContinent.set(continent, (r32ByContinent.get(continent) ?? 0) + 1);
  }
  return continents.map((c) => ({
    continent: c.continent,
    confederation: c.confederation,
    groupStage: c.count,
    roundOf32: r32ByContinent.get(c.continent) ?? 0,
  }));
}

/** The 32 team codes contesting the Round of 32 (16-avos), from the resolved bracket draw. */
export function roundOf32TeamCodes(): string[] {
  const codes: string[] = [];
  for (const match of KNOCKOUT_MATCHES) {
    if (match.stage !== "R32") continue;
    if (match.teamA?.code) codes.push(match.teamA.code);
    if (match.teamB?.code) codes.push(match.teamB.code);
  }
  return codes;
}

/** Continent × phase breakdown (group stage vs Round of 32) from the seeded data + bracket. */
export function continentByPhase(): ContinentPhaseDatum[] {
  return aggregateContinentByPhase(teamsByContinent.continents, roundOf32TeamCodes());
}

export interface GroupGoalsDatum {
  /** Bare group letter, e.g. "A" (the "Grupo " prefix stripped). */
  group: string;
  goals: number;
}

/** Goals scored per group (A–L), summed from each group's rows, ordered by letter. */
export function goalsByGroup(standings: StandingsRow[]): GroupGoalsDatum[] {
  const byGroup = new Map<string, number>();
  for (const row of standings) {
    const group = row.group.replace(/^Grupo\s+/i, "").trim() || row.group;
    byGroup.set(group, (byGroup.get(group) ?? 0) + row.goalsFor);
  }
  return [...byGroup.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
    .map(([group, goals]) => ({ group, goals }));
}

export type MatchStatusKey = "finished" | "live" | "upcoming";

export interface MatchStatusDatum {
  key: MatchStatusKey;
  label: string;
  value: number;
}

/** Match counts by situation, for the donut: finished / live (incl. suspended) / upcoming. */
export function matchStatusBreakdown(matches: Match[]): MatchStatusDatum[] {
  const count = (predicate: (m: Match) => boolean) => matches.filter(predicate).length;
  return [
    { key: "finished", label: "Encerradas", value: count((m) => m.status === "FINISHED") },
    {
      key: "live",
      label: "Ao vivo",
      value: count((m) => m.status === "LIVE" || m.status === "SUSPENDED"),
    },
    { key: "upcoming", label: "Agendadas", value: count((m) => m.status === "PRE_GAME") },
  ];
}

export interface TeamGoalsDatum {
  code: string;
  name: string;
  goalsFor: number;
  primaryColor: string;
}

/** The top `limit` group-stage scoring teams, ties broken alphabetically (pt-BR). */
export function topScoringTeams(standings: StandingsRow[], limit = 8): TeamGoalsDatum[] {
  return [...standings]
    .sort((a, b) => b.goalsFor - a.goalsFor || a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, limit)
    .map(({ code, name, goalsFor, primaryColor }) => ({ code, name, goalsFor, primaryColor }));
}

export interface GoalMinuteDatum {
  /** Elapsed match minute (stoppage folded in, e.g. 45'+5' → 50). */
  minute: number;
  /** Number of goals scored across all finished matches at that minute. */
  goals: number;
}

/**
 * Collapse per-match goal-minute lists into a (minute → count) scatter series, sorted by
 * minute. Pure over its input so it's unit-tested; `goalsByMinute` is the thin wrapper
 * that feeds it the generated `goalTimeline.json`.
 */
export function aggregateGoalsByMinute(perMatchMinutes: number[][]): GoalMinuteDatum[] {
  const counts = new Map<number, number>();
  for (const minutes of perMatchMinutes) {
    for (const minute of minutes) counts.set(minute, (counts.get(minute) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a - b)
    .map(([minute, goals]) => ({ minute, goals }));
}

/** Scatter points (minute, goal count) over every finished match, from `goalTimeline.json`. */
export function goalsByMinute(): GoalMinuteDatum[] {
  return aggregateGoalsByMinute(Object.values(goalTimeline as Record<string, number[]>));
}

import type { KnockoutMatch, Match, StandingsRow } from "./types";
import { stadiums } from "./data/tournament";
import { APP_MATCHES } from "./appMatches";
import { KNOCKOUT_MATCHES } from "./data/knockoutBracket";
import { KNOCKOUT_RESULTS } from "./data/knockoutResults";
import { decisiveSlot } from "./utils/matchResult";
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
  /** Teams that advanced to the Round of 16 (oitavas) — only the decided ties so far. */
  roundOf16: number;
}

/** Tally how many of `codes` belong to each continent, via the code→continent index. */
function countByContinent(codeToContinent: Map<string, string>, codes: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const code of codes) {
    const continent = codeToContinent.get(code);
    if (continent) counts.set(continent, (counts.get(continent) ?? 0) + 1);
  }
  return counts;
}

/**
 * Teams per continent broken down by phase reached: group stage (all qualified), the Round
 * of 32, and the Round of 16. Pure over its inputs — `continents` is the seeded breakdown,
 * `roundOf32Codes` the 32 R32 participants, `roundOf16Codes` the confirmed R16 qualifiers —
 * so it's unit-tested; `continentByPhase` sources them from the JSON + bracket + results. A
 * code with no continent mapping is ignored (defensive; every real code resolves).
 */
export function aggregateContinentByPhase(
  continents: ContinentJson[],
  roundOf32Codes: string[],
  roundOf16Codes: string[],
): ContinentPhaseDatum[] {
  const codeToContinent = new Map<string, string>();
  for (const c of continents) {
    for (const team of c.teams) codeToContinent.set(team.code, c.continent);
  }
  const r32 = countByContinent(codeToContinent, roundOf32Codes);
  const r16 = countByContinent(codeToContinent, roundOf16Codes);
  return continents.map((c) => ({
    continent: c.continent,
    confederation: c.confederation,
    groupStage: c.count,
    roundOf32: r32.get(c.continent) ?? 0,
    roundOf16: r16.get(c.continent) ?? 0,
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

/**
 * The confirmed Round-of-16 (oitavas) qualifiers: the winners of finished R32 ties, read from
 * the seeded `KNOCKOUT_RESULTS` (the same source the bracket resolves from). A tie level after
 * regular/extra time is decided by its real `penaltyScore` when seeded (mirrors
 * `knockoutWinnerSlot`); a level tie with no penalty tally yields no winner — we never invent
 * who advanced.
 */
export function roundOf16TeamCodes(): string[] {
  const codes: string[] = [];
  for (const match of KNOCKOUT_MATCHES) {
    if (match.stage !== "R32" || !match.teamA || !match.teamB) continue;
    const result = KNOCKOUT_RESULTS[match.matchNumber];
    if (!result || result.status !== "FINISHED") continue;
    const winningSlot = decisiveSlot(result.score, result.penaltyScore);
    if (!winningSlot) continue; // level with no shootout tally — winner unknown to the app
    codes.push(winningSlot === "A" ? match.teamA.code : match.teamB.code);
  }
  return codes;
}

/** Continent × phase breakdown (group stage → 16-avos → oitavas) from the seeded data. */
export function continentByPhase(): ContinentPhaseDatum[] {
  return aggregateContinentByPhase(
    teamsByContinent.continents,
    roundOf32TeamCodes(),
    roundOf16TeamCodes(),
  );
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

/** Per-match goal minutes split by the side credited (mirrors the scoreline). */
export interface MatchGoalTimeline {
  teamA: number[];
  teamB: number[];
}

const GOAL_TIMELINE = goalTimeline as Record<string, MatchGoalTimeline>;

// matchId → the two sides' team codes, resolved from APP_MATCHES (group + knockout, the
// latter resolved once its teams are known). Lets the per-side timeline be filtered by team
// without embedding codes in the JSON.
const MATCH_SIDE_CODES: Record<string, { a: string; b: string }> = Object.fromEntries(
  APP_MATCHES.map((match) => [match.id, { a: match.teamA.code, b: match.teamB.code }]),
);

// Team code → display name, for the goal-filter option labels.
const TEAM_NAME_BY_CODE: Record<string, string> = Object.fromEntries(
  APP_MATCHES.flatMap((match) => [
    [match.teamA.code, match.teamA.name],
    [match.teamB.code, match.teamB.name],
  ]),
);

/**
 * Flat list of goal minutes for the scatter, optionally limited to one national team's goals.
 * Pure over its inputs (the per-side timeline + a matchId → side-codes map) so it is
 * unit-tested; `goalsByMinute` feeds it the seeded timeline + APP_MATCHES. `teamCode` null →
 * every team's goals; otherwise only the minutes credited to that team's side of each match.
 */
export function collectGoalMinutes(
  timeline: Record<string, MatchGoalTimeline>,
  sideCodes: Record<string, { a: string; b: string }>,
  teamCode: string | null,
): number[] {
  const minutes: number[] = [];
  for (const [matchId, sides] of Object.entries(timeline)) {
    if (teamCode === null) {
      minutes.push(...sides.teamA, ...sides.teamB);
      continue;
    }
    const codes = sideCodes[matchId];
    if (!codes) continue;
    if (codes.a === teamCode) minutes.push(...sides.teamA);
    if (codes.b === teamCode) minutes.push(...sides.teamB);
  }
  return minutes;
}

/**
 * Scatter points (minute, goal count) over finished matches, from `goalTimeline.json`.
 * Pass a `teamCode` to limit the plot to that national team's goals; null/omitted = all.
 */
export function goalsByMinute(teamCode: string | null = null): GoalMinuteDatum[] {
  return aggregateGoalsByMinute([collectGoalMinutes(GOAL_TIMELINE, MATCH_SIDE_CODES, teamCode)]);
}

export interface GoalScorerTeam {
  code: string;
  name: string;
  /** Goals this team scored across the timeline (the count shown in the filter). */
  goals: number;
}

/**
 * National teams that scored at least one goal in the timeline, with their tally, sorted by
 * name (pt-BR) — the option set for the "Gols por minuto" team filter. Teams with no goals
 * are omitted (nothing to plot for them).
 */
export function goalScorerTeams(): GoalScorerTeam[] {
  const tally = new Map<string, number>();
  for (const [matchId, sides] of Object.entries(GOAL_TIMELINE)) {
    const codes = MATCH_SIDE_CODES[matchId];
    if (!codes) continue;
    if (sides.teamA.length) tally.set(codes.a, (tally.get(codes.a) ?? 0) + sides.teamA.length);
    if (sides.teamB.length) tally.set(codes.b, (tally.get(codes.b) ?? 0) + sides.teamB.length);
  }
  return [...tally.entries()]
    .map(([code, goals]) => ({ code, name: TEAM_NAME_BY_CODE[code] ?? code, goals }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export interface PhaseGoalsDatum {
  /** Short pt-BR phase label, e.g. "Fase de grupos", "16-avos". */
  phase: string;
  /** Goals scored in completed matches of this phase (penalty shoot-outs excluded). */
  goals: number;
  /** Completed matches counted into this phase. */
  played: number;
}

/** Knockout stage → short pt-BR label, in bracket order, for the goals-by-phase chart. */
const KNOCKOUT_PHASE_LABELS: { stage: KnockoutMatch["stage"]; label: string }[] = [
  { stage: "R32", label: "16-avos" },
  { stage: "R16", label: "Oitavas" },
  { stage: "QF", label: "Quartas" },
  { stage: "SF", label: "Semifinais" },
  { stage: "TP", label: "3º lugar" },
  { stage: "F", label: "Final" },
];

/**
 * Goals scored per tournament phase, over COMPLETED matches only and in bracket order
 * (group stage → 16-avos → … → final). Group-stage goals are the reconciled `groupGoals`
 * (the same group-only figure as `tournamentTotals`); knockout goals sum each FINISHED
 * tie's regulation + extra-time score from `results` — penalty shoot-outs are NOT goals
 * and are excluded, so a 1–1 tie decided on penalties contributes its two open-play goals.
 * A phase with no completed match yet is omitted, so the chart grows as the bracket plays
 * out. Pure over its inputs so it is unit-tested; `goalsByPhase` sources them from the
 * standings + the seeded bracket/results.
 */
export function aggregateGoalsByPhase(
  groupGoals: number,
  groupMatchesPlayed: number,
  knockoutMatches: { stage: KnockoutMatch["stage"]; matchNumber: number }[],
  results: Record<number, { status: string; score: { teamA: number; teamB: number } } | undefined>,
): PhaseGoalsDatum[] {
  const out: PhaseGoalsDatum[] = [];
  if (groupMatchesPlayed > 0) {
    out.push({ phase: "Fase de grupos", goals: groupGoals, played: groupMatchesPlayed });
  }
  for (const { stage, label } of KNOCKOUT_PHASE_LABELS) {
    let goals = 0;
    let played = 0;
    for (const m of knockoutMatches) {
      if (m.stage !== stage) continue;
      const result = results[m.matchNumber];
      if (!result || result.status !== "FINISHED") continue;
      goals += result.score.teamA + result.score.teamB;
      played += 1;
    }
    if (played > 0) out.push({ phase: label, goals, played });
  }
  return out;
}

/** Goals per phase across the whole tournament, from the standings + the knockout seed. */
export function goalsByPhase(standings: StandingsRow[]): PhaseGoalsDatum[] {
  const groupGoals = standings.reduce((sum, row) => sum + row.goalsFor, 0);
  const groupMatchesPlayed = standings.reduce((sum, row) => sum + row.played, 0) / 2;
  return aggregateGoalsByPhase(groupGoals, groupMatchesPlayed, KNOCKOUT_MATCHES, KNOCKOUT_RESULTS);
}

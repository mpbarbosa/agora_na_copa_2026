import type { KnockoutMatch, Match, StandingsRow } from "./types";
import { stadiums } from "./data/tournament";
import { APP_MATCHES } from "./appMatches";
import { KNOCKOUT_MATCHES } from "./data/knockoutBracket";
import { KNOCKOUT_RESULTS } from "./data/knockoutResults";
import { knockoutWinnerSlot } from "./utils/matchResult";
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
  /** Goals across ALL finished matches — group stage + knockout open play. */
  totalGoals: number;
  /** Goals per finished match (0 when none finished). Penalty-shootout goals excluded. */
  goalsPerMatch: number;
}

/** Headline KPI figures for the stat cards. `standings` is the reconciled group table. */
export function tournamentTotals(matches: Match[], standings: StandingsRow[]): TournamentTotals {
  const groupGoals = standings.reduce((sum, row) => sum + row.goalsFor, 0);
  // Each finished group match increments `played` for both sides, so halve the sum.
  const groupMatchesPlayed = standings.reduce((sum, row) => sum + row.played, 0) / 2;
  const countBy = (predicate: (m: Match) => boolean) => matches.filter(predicate).length;
  const matchesFinished = countBy((m) => m.status === "FINISHED");
  // Every finished fixture's open-play goals (group + knockout). A knockout tie decided on
  // penalties keeps its level `score` (e.g. 1-1) here — the shoot-out tally lives in
  // `penaltyScore` and is deliberately NOT counted as goals.
  const totalGoals = matches.reduce(
    (sum, m) => (m.status === "FINISHED" && m.score ? sum + m.score.teamA + m.score.teamB : sum),
    0,
  );
  return {
    teams: TEAM_COUNT,
    stadiums: stadiums.length,
    matchesTotal: matches.length,
    matchesFinished,
    matchesLive: countBy((m) => m.status === "LIVE" || m.status === "SUSPENDED"),
    matchesUpcoming: countBy((m) => m.status === "PRE_GAME"),
    groupGoals,
    groupGoalsPerMatch: groupMatchesPlayed ? groupGoals / groupMatchesPlayed : 0,
    totalGoals,
    goalsPerMatch: matchesFinished ? totalGoals / matchesFinished : 0,
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

/**
 * Ordered knockout phases after the group stage. Each phase's count is the teams that
 * REACHED that round: `roundOf32` = the 32 participants of the 16-avos draw, then the winners
 * of each preceding round (Round of 16 = R32 winners, … `champion` = the Final winner).
 */
export const KNOCKOUT_PHASE_KEYS = [
  "roundOf32",
  "roundOf16",
  "roundOf8",
  "roundOf4",
  "final",
  "champion",
] as const;
export type KnockoutPhaseKey = (typeof KNOCKOUT_PHASE_KEYS)[number];
/** Every funnel phase, group stage first. */
export type PhaseKey = "groupStage" | KnockoutPhaseKey;
export const PHASE_KEYS: readonly PhaseKey[] = ["groupStage", ...KNOCKOUT_PHASE_KEYS];

export interface ContinentPhaseDatum {
  continent: string;
  confederation: string;
  /** Teams from this continent that reached each phase (groupStage = all qualified). */
  counts: Record<PhaseKey, number>;
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
 * Teams per continent broken down by every phase reached: group stage (all qualified) and
 * each knockout round (the teams that reached it). Pure over its inputs — `continents` is the
 * seeded breakdown and `codesByPhase` maps each knockout phase to the codes that reached it —
 * so it's unit-tested; `continentByPhase` sources them from the JSON + bracket + results. A
 * code with no continent mapping is ignored (defensive; every real code resolves).
 */
export function aggregateContinentByPhase(
  continents: ContinentJson[],
  codesByPhase: Record<KnockoutPhaseKey, string[]>,
): ContinentPhaseDatum[] {
  const codeToContinent = new Map<string, string>();
  for (const c of continents) {
    for (const team of c.teams) codeToContinent.set(team.code, c.continent);
  }
  const perPhase = {} as Record<KnockoutPhaseKey, Map<string, number>>;
  for (const key of KNOCKOUT_PHASE_KEYS) {
    perPhase[key] = countByContinent(codeToContinent, codesByPhase[key]);
  }
  return continents.map((c) => {
    const counts = { groupStage: c.count } as Record<PhaseKey, number>;
    for (const key of KNOCKOUT_PHASE_KEYS) counts[key] = perPhase[key].get(c.continent) ?? 0;
    return { continent: c.continent, confederation: c.confederation, counts };
  });
}

/** Stage code (R32…F) of each knockout fixture, by FIFA match number. */
const STAGE_BY_KO_NUMBER = new Map<number, KnockoutMatch["stage"]>(
  KNOCKOUT_MATCHES.map((m) => [m.matchNumber, m.stage]),
);

/**
 * The knockout stage of an assembled `APP_MATCHES` fixture (id `ko-<n>-2026`), or null for a
 * group-stage match. Unlike the raw `KNOCKOUT_MATCHES` bracket — which names concrete teams
 * only for the R32 group-draw slots and leaves every later round as feeder refs ("W74") — the
 * assembled matches carry the RESOLVED teams once a tie's feeders are decided, so reading the
 * winners/participants from them works for every round, not just the R32.
 */
function knockoutStageOf(match: Match): KnockoutMatch["stage"] | null {
  const n = /^ko-(\d+)-/.exec(match.id);
  return n ? STAGE_BY_KO_NUMBER.get(Number(n[1])) ?? null : null;
}

/** The 32 team codes contesting the Round of 32 (16-avos), from the resolved bracket draw. */
export function roundOf32TeamCodes(): string[] {
  const codes: string[] = [];
  for (const match of APP_MATCHES) {
    if (knockoutStageOf(match) !== "R32") continue;
    if (match.teamA?.code) codes.push(match.teamA.code);
    if (match.teamB?.code) codes.push(match.teamB.code);
  }
  return codes;
}

/**
 * Winners of the finished ties at a given knockout stage — i.e. the teams that advanced to the
 * NEXT round. Read from the assembled `APP_MATCHES` (resolved feeders), so it works past the
 * R32. A tie level after regular/extra time is decided by its real `penaltyScore` (via
 * `knockoutWinnerSlot`); a level tie with no penalty tally yields no winner — we never invent
 * who advanced.
 */
export function stageWinnerCodes(stage: KnockoutMatch["stage"]): string[] {
  const codes: string[] = [];
  for (const match of APP_MATCHES) {
    if (knockoutStageOf(match) !== stage) continue;
    const winningSlot = knockoutWinnerSlot(match);
    if (!winningSlot) continue; // unfinished, or level with no shootout tally
    const code = winningSlot === "A" ? match.teamA?.code : match.teamB?.code;
    if (code) codes.push(code);
  }
  return codes;
}

/** The confirmed Round-of-16 (oitavas) qualifiers: the winners of the finished R32 ties. */
export function roundOf16TeamCodes(): string[] {
  return stageWinnerCodes("R32");
}

/**
 * Continent × phase funnel (group stage → 16-avos → oitavas → quartas → semifinais → final →
 * campeão) from the seeded bracket + results. Later rounds read 0 until their ties finish, so
 * the funnel deepens automatically as the tournament advances.
 */
export function continentByPhase(): ContinentPhaseDatum[] {
  return aggregateContinentByPhase(teamsByContinent.continents, {
    roundOf32: roundOf32TeamCodes(),
    roundOf16: stageWinnerCodes("R32"),
    roundOf8: stageWinnerCodes("R16"),
    roundOf4: stageWinnerCodes("QF"),
    final: stageWinnerCodes("SF"),
    champion: stageWinnerCodes("F"),
  });
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
 * Whole-tournament goals per team code (group + knockout), summed from the per-side timeline.
 * The timeline mirrors each scoreline, so extra-time goals count but penalty-shootout goals do
 * not. Pure over its inputs so both callers below stay unit-tested through it.
 */
export function tallyTimelineGoals(
  timeline: Record<string, MatchGoalTimeline>,
  sideCodes: Record<string, { a: string; b: string }>,
): Map<string, number> {
  const tally = new Map<string, number>();
  for (const [matchId, sides] of Object.entries(timeline)) {
    const codes = sideCodes[matchId];
    if (!codes) continue;
    if (sides.teamA.length) tally.set(codes.a, (tally.get(codes.a) ?? 0) + sides.teamA.length);
    if (sides.teamB.length) tally.set(codes.b, (tally.get(codes.b) ?? 0) + sides.teamB.length);
  }
  return tally;
}

/**
 * National teams that scored at least one goal in the timeline, with their tally, sorted by
 * name (pt-BR) — the option set for the "Gols por minuto" team filter. Teams with no goals
 * are omitted (nothing to plot for them).
 */
export function goalScorerTeams(): GoalScorerTeam[] {
  return [...tallyTimelineGoals(GOAL_TIMELINE, MATCH_SIDE_CODES).entries()]
    .map(([code, goals]) => ({ code, name: TEAM_NAME_BY_CODE[code] ?? code, goals }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/**
 * The top `limit` scoring teams across the WHOLE tournament (group stage + knockout), for the
 * "Artilharia das seleções" bars. Unlike `topScoringTeams` (group-stage only, off the standings
 * table), goals come from `goalTimeline.json` so knockout goals count — extra time included,
 * penalty shootouts excluded (the timeline mirrors each scoreline). Ties break alphabetically
 * (pt-BR). Team names/colours are resolved from `standings` (every team has a group-stage row),
 * falling back to the timeline name map. Pure over its inputs so it is unit-tested.
 */
export function topScoringTeamsAllPhases(
  standings: StandingsRow[],
  timeline: Record<string, MatchGoalTimeline> = GOAL_TIMELINE,
  sideCodes: Record<string, { a: string; b: string }> = MATCH_SIDE_CODES,
  limit = 8,
): TeamGoalsDatum[] {
  const meta = new Map(standings.map((row) => [row.code, row]));
  return [...tallyTimelineGoals(timeline, sideCodes).entries()]
    .map(([code, goalsFor]) => ({
      code,
      name: meta.get(code)?.name ?? TEAM_NAME_BY_CODE[code] ?? code,
      goalsFor,
      primaryColor: meta.get(code)?.primaryColor ?? "#94a3b8",
    }))
    .sort((a, b) => b.goalsFor - a.goalsFor || a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, limit);
}

// 15-minute goal-interval buckets. Minutes fold stoppage into the raw clock
// (e.g. 45'+5' → 50), so a first-half-stoppage goal lands in the next bucket —
// the same convention the `goalsByMinute` scatter already uses.
export const GOAL_INTERVAL_LABELS = ["1-15", "16-30", "31-45", "46-60", "61-75", "76-90", "90+"] as const;
const GOAL_INTERVAL_BOUNDS = [15, 30, 45, 60, 75, 90];

/** Bucket a goal minute into a 0-based `GOAL_INTERVAL_LABELS` index (last = "90+"). */
export function goalIntervalIndex(minute: number): number {
  const i = GOAL_INTERVAL_BOUNDS.findIndex((bound) => minute <= bound);
  return i === -1 ? GOAL_INTERVAL_BOUNDS.length : i;
}

// Team code → group letter (A–L). Only group-stage fixtures populate `group`
// ("Grupo A"); knockout fixtures carry none, so a knockout goal is still
// attributed to the scoring team's permanent group.
const GROUP_BY_CODE: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const m of APP_MATCHES) {
    for (const team of [m.teamA, m.teamB]) {
      const letter = team.group.replace(/^Grupo\s+/i, "").trim();
      if (letter && !(team.code in map)) map[team.code] = letter;
    }
  }
  return map;
})();

export interface GoalHeatmapRow {
  /** Group letter, e.g. "A". */
  group: string;
  /** Goals in each interval, aligned to `GOAL_INTERVAL_LABELS`. */
  cells: number[];
  /** Row total across all intervals. */
  total: number;
}

export interface GoalHeatmap {
  /** Column labels (the 15-min intervals). */
  intervals: string[];
  /** One row per group, ordered A→L (every group seeded, even with zero goals). */
  rows: GoalHeatmapRow[];
  /** Hottest single cell, for the colour scale (≥1 so callers can divide safely). */
  maxCell: number;
  /** Goals placed across the whole grid. */
  total: number;
}

/**
 * Aggregate goal minutes into a group × 15-min-interval matrix — the heat-map source.
 * Pure over its inputs (the per-side timeline, a matchId → side-codes map, and a
 * team-code → group map) so it is unit-tested; `goalsByGroupAndInterval` feeds it the
 * seeded data. Every goal is bucketed by the scoring side's group and minute; all groups
 * present in `groupByCode` are seeded so the grid stays rectangular.
 */
export function aggregateGoalsByGroupInterval(
  timeline: Record<string, MatchGoalTimeline>,
  sideCodes: Record<string, { a: string; b: string }>,
  groupByCode: Record<string, string>,
): GoalHeatmap {
  const intervals = [...GOAL_INTERVAL_LABELS];
  const blank = () => intervals.map(() => 0);
  const byGroup = new Map<string, number[]>();
  for (const group of new Set(Object.values(groupByCode))) byGroup.set(group, blank());
  const place = (code: string | undefined, minute: number) => {
    const group = code ? groupByCode[code] : undefined;
    const cells = group ? byGroup.get(group) : undefined;
    if (cells) cells[goalIntervalIndex(minute)] += 1;
  };
  for (const [matchId, sides] of Object.entries(timeline)) {
    const codes = sideCodes[matchId];
    for (const minute of sides.teamA) place(codes?.a, minute);
    for (const minute of sides.teamB) place(codes?.b, minute);
  }
  const rows: GoalHeatmapRow[] = [...byGroup.entries()]
    .map(([group, cells]) => ({ group, cells, total: cells.reduce((s, n) => s + n, 0) }))
    .sort((a, b) => a.group.localeCompare(b.group));
  const maxCell = Math.max(1, ...rows.flatMap((r) => r.cells));
  const total = rows.reduce((s, r) => s + r.total, 0);
  return { intervals, rows, maxCell, total };
}

/** Group × 15-min-interval goal heat-map over finished matches, from `goalTimeline.json`. */
export function goalsByGroupAndInterval(): GoalHeatmap {
  return aggregateGoalsByGroupInterval(GOAL_TIMELINE, MATCH_SIDE_CODES, GROUP_BY_CODE);
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

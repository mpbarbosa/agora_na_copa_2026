// Pure Monte-Carlo simulator for a team's odds of reaching the Round of 32 of the
// FIFA World Cup 2026 — the top two of each group plus the eight best third-placed
// teams advance. Like predict-core.ts, this has NO AI dependency: every estimate is
// derived only from each team's REAL current form (the live standings) and a seeded
// RNG, so it is reproducible and unit-testable. The framing is deliberately
// "simulado": it is a model, never a claim of fact.
//
// It reuses the real ranking machinery — computeStandings, groupStandings and
// rankBestThirds (Art. 13 tie-breakers) — so a simulated table is ranked exactly the
// way the live table and the Chaveamento bracket are. The harness here only samples
// the remaining group-stage results and tallies how often the target team lands in a
// qualifying slot. Extracted from any endpoint so it can be tested in isolation
// (tests/qualification-sim-core.test.ts) — mirrors predict-core.ts / weather-core.ts.

import type { Match, StandingsRow, MatchOutcome } from "./src/types";
import { computeStandings, groupStandings, rankBestThirds } from "./src/standings";

// --- Seeded RNG (mulberry32) ---------------------------------------------------
// A tiny deterministic PRNG so every run with the same seed yields identical odds.
// We never use Math.random — reproducibility is a hard requirement for the tests
// and for serving stable numbers from a cache.

export type Rng = () => number; // uniform in [0, 1)

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Remaining fixtures --------------------------------------------------------
// A group-stage match still to be played (or in progress). FINISHED group matches
// already feed the live standings; everything else is what we simulate. Knockout
// fixtures carry placeholder sides and never count toward the group tables.

function isRemainingGroupMatch(match: Match): boolean {
  return match.stageName === "Group Stage" && match.status !== "FINISHED";
}

export function listRemainingGroupMatches(matches: Match[]): Match[] {
  return matches.filter(isRemainingGroupMatch);
}

// --- Outcome sampler (the v1 model — pluggable) --------------------------------
// Produces a SCORELINE, not just win/draw/loss: goal difference and goals scored are
// tie-breakers in both the group table and the best-third ranking, so the sampler has
// to generate goals. The default model draws each side's goals from a Poisson whose
// mean blends that team's attacking rate with the opponent's defensive rate, taken
// from current form. Swap it via options.sampler to upgrade the model later (Elo,
// market odds, …) without touching the harness.

export interface SampledScore {
  teamA: number;
  teamB: number;
}

// A sampler turns a fixture into a scoreline using the seeded RNG. It is a closure
// that already carries its model (built from the current standings), so swapping in a
// different model — Elo, market odds — is just passing another factory's output.
export type MatchSampler = (match: Match, rng: Rng) => SampledScore;

// Fallback baseline (goals per team per game) before any match has been played, and
// the clamp keeping a single fixture's expected goals in a sane range.
const LEAGUE_AVG_GOALS = 1.35;
const MIN_EXPECTED_GOALS = 0.2;
const MAX_EXPECTED_GOALS = 5;
const MAX_GOALS_PER_SIDE = 8; // scoreline grid cap; beyond this is negligible

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface PoissonSamplerOptions {
  // Shrinkage strength: pseudo-matches of the league baseline mixed into each team's
  // rate. Higher = trust early small samples less. ~1.5 keeps a 2-game team roughly
  // 55% data / 45% prior, which tames the noise of one lopsided result.
  priorWeight?: number;
  // Dixon–Coles low-score correlation. Negative inflates exact draws (0-0, 1-1) and
  // tempers 1-0/0-1, correcting independent Poisson's well-known shortfall of draws —
  // and draws swing group points. 0 disables the correction.
  rho?: number;
}

const DEFAULT_PRIOR_WEIGHT = 1.5;
const DEFAULT_RHO = -0.13;

// A team's multiplicative strength relative to the league: 1.0 is average. attack > 1
// scores more than average; defense > 1 concedes more than average (weaker defence).
interface TeamStrength {
  attack: number;
  defense: number;
}

interface StrengthModel {
  baseline: number;
  teams: Map<string, TeamStrength>;
}

// Build the attack/defense model from current form. Each rate is shrunk toward the
// league baseline by `priorWeight` pseudo-matches, so a team with one freak result
// isn't taken at face value; a team yet to play sits exactly at the baseline.
function buildStrengthModel(standings: StandingsRow[], priorWeight: number): StrengthModel {
  let totalGoals = 0;
  let totalGames = 0;
  for (const row of standings) {
    totalGoals += row.goalsFor;
    totalGames += row.played;
  }
  const baseline = totalGames > 0 ? totalGoals / totalGames : LEAGUE_AVG_GOALS;

  const teams = new Map<string, TeamStrength>();
  for (const row of standings) {
    const attackRate = (row.goalsFor + priorWeight * baseline) / (row.played + priorWeight);
    const defenseRate = (row.goalsAgainst + priorWeight * baseline) / (row.played + priorWeight);
    teams.set(row.code, { attack: attackRate / baseline, defense: defenseRate / baseline });
  }
  return { baseline, teams };
}

// Poisson pmf for k=0..max, computed iteratively (p_k = p_{k-1}·λ/k) to avoid factorials.
function poissonPmf(lambda: number, max: number): number[] {
  const pmf = new Array<number>(max + 1);
  pmf[0] = Math.exp(-lambda);
  for (let k = 1; k <= max; k += 1) pmf[k] = (pmf[k - 1] * lambda) / k;
  return pmf;
}

// Dixon–Coles correction τ for the four lowest scorelines; 1 elsewhere.
function dixonColesTau(x: number, y: number, lambda: number, mu: number, rho: number): number {
  if (x === 0 && y === 0) return 1 - lambda * mu * rho;
  if (x === 0 && y === 1) return 1 + lambda * rho;
  if (x === 1 && y === 0) return 1 + mu * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
}

const STRENGTH_FALLBACK: TeamStrength = { attack: 1, defense: 1 };

// A fixture's full scoreline grid: the expected goals (λ for home, μ for away) and the
// normalised probability of every scoreline 0-0 … MAX×MAX. Built once per matchup and
// shared by both the RNG sampler and the single-match predictor (predictMatchOutcome),
// so the simulated tables and the bracket/Fan Zone palpite use the exact same model.
interface ScoreCell {
  home: number;
  away: number;
  prob: number;
}

interface ScoreGrid {
  lambda: number; // expected home goals
  mu: number; // expected away goals
  cells: ScoreCell[]; // probabilities sum to 1
}

function buildScoreGrid(
  model: StrengthModel,
  homeCode: string,
  awayCode: string,
  rho: number,
): ScoreGrid {
  const home = model.teams.get(homeCode) ?? STRENGTH_FALLBACK;
  const away = model.teams.get(awayCode) ?? STRENGTH_FALLBACK;
  // λ = baseline · attack(self) · defense(opponent). Symmetric for the away side.
  const lambda = clamp(model.baseline * home.attack * away.defense, MIN_EXPECTED_GOALS, MAX_EXPECTED_GOALS);
  const mu = clamp(model.baseline * away.attack * home.defense, MIN_EXPECTED_GOALS, MAX_EXPECTED_GOALS);

  const pmfHome = poissonPmf(lambda, MAX_GOALS_PER_SIDE);
  const pmfAway = poissonPmf(mu, MAX_GOALS_PER_SIDE);

  const cells: ScoreCell[] = [];
  let total = 0;
  for (let x = 0; x <= MAX_GOALS_PER_SIDE; x += 1) {
    for (let y = 0; y <= MAX_GOALS_PER_SIDE; y += 1) {
      const weight = pmfHome[x] * pmfAway[y] * Math.max(0, dixonColesTau(x, y, lambda, mu, rho));
      total += weight;
      cells.push({ home: x, away: y, prob: weight });
    }
  }
  for (const cell of cells) cell.prob /= total;
  return { lambda, mu, cells };
}

// A fixture's full scoreline distribution as a flat cumulative table, sampled by one
// RNG draw. Built once per matchup and reused across iterations (the grid never changes).
interface ScoreDistribution {
  cumulative: number[];
  scores: SampledScore[];
}

function buildScoreDistribution(
  model: StrengthModel,
  homeCode: string,
  awayCode: string,
  rho: number,
): ScoreDistribution {
  const { cells } = buildScoreGrid(model, homeCode, awayCode, rho);
  const scores: SampledScore[] = [];
  const cumulative: number[] = [];
  let running = 0;
  for (const cell of cells) {
    running += cell.prob;
    scores.push({ teamA: cell.home, teamB: cell.away });
    cumulative.push(running);
  }
  return { cumulative, scores };
}

/**
 * Build the default scoreline sampler from the current standings: shrunk
 * attack/defense strengths drive a Dixon–Coles-corrected bivariate Poisson. Each
 * matchup's distribution is memoised, so simulating it thousands of times is cheap.
 */
export function createPoissonSampler(
  standings: StandingsRow[],
  options: PoissonSamplerOptions = {},
): MatchSampler {
  const priorWeight = Math.max(0, options.priorWeight ?? DEFAULT_PRIOR_WEIGHT);
  const rho = options.rho ?? DEFAULT_RHO;
  const model = buildStrengthModel(standings, priorWeight);
  const cache = new Map<string, ScoreDistribution>();

  return (match, rng) => {
    const key = `${match.teamA.code}|${match.teamB.code}`;
    let dist = cache.get(key);
    if (!dist) {
      dist = buildScoreDistribution(model, match.teamA.code, match.teamB.code, rho);
      cache.set(key, dist);
    }
    const u = rng();
    const { cumulative, scores } = dist;
    for (let i = 0; i < cumulative.length; i += 1) {
      if (u <= cumulative[i]) return scores[i];
    }
    return scores[scores.length - 1]; // RNG rounding guard
  };
}

// --- Single-match prediction ---------------------------------------------------
// The same Dixon–Coles bivariate Poisson model, collapsed for ONE fixture into a
// win/draw/loss split plus the modal scoreline. No RNG, no sampling: it sums the
// closed-form scoreline grid directly, so it is exact and deterministic. Powers the
// Fan Zone and bracket "palpite simulado" (predict-core.ts narrates this outcome).

/**
 * Predict a single fixture from the current standings using the default Dixon–Coles
 * Poisson model. Returns the home/draw/away probabilities (summing to ~1), each side's
 * expected goals (λ/μ), and the most likely scoreline. Deterministic — same standings →
 * same outcome. Unknown team codes fall back to league-average strength.
 */
export function predictMatchOutcome(
  standings: StandingsRow[],
  homeCode: string,
  awayCode: string,
  options: PoissonSamplerOptions = {},
): MatchOutcome {
  const priorWeight = Math.max(0, options.priorWeight ?? DEFAULT_PRIOR_WEIGHT);
  const rho = options.rho ?? DEFAULT_RHO;
  const model = buildStrengthModel(standings, priorWeight);
  const { lambda, mu, cells } = buildScoreGrid(model, homeCode, awayCode, rho);

  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  let modal = cells[0];
  for (const cell of cells) {
    if (cell.home > cell.away) homeWin += cell.prob;
    else if (cell.home < cell.away) awayWin += cell.prob;
    else draw += cell.prob;
    if (cell.prob > modal.prob) modal = cell;
  }

  return {
    homeWin,
    draw,
    awayWin,
    expectedHomeGoals: lambda,
    expectedAwayGoals: mu,
    mostLikelyScore: { teamA: modal.home, teamB: modal.away },
  };
}

// --- One simulated tournament --------------------------------------------------
// Replace each remaining group match with a sampled FINISHED result, recompute the
// whole table the real way, and rank the thirds. We pass the SIMULATED match list to
// groupStandings so head-to-head tie-breakers reflect the simulated results too.

interface SimulatedTables {
  groups: { group: string; rows: StandingsRow[] }[];
  thirds: ReturnType<typeof rankBestThirds>;
}

function simulateOnce(
  finished: Match[],
  remaining: Match[],
  sampler: MatchSampler,
  rng: Rng,
): SimulatedTables {
  const sampled: Match[] = remaining.map((match) => ({
    ...match,
    status: "FINISHED",
    score: sampler(match, rng),
  }));
  const simulatedMatches: Match[] = [...finished, ...sampled];
  const rows = computeStandings(simulatedMatches);
  const groups = groupStandings(rows, simulatedMatches);
  const thirds = rankBestThirds(groups);
  return { groups, thirds };
}

// Where the target team finished in this simulated tournament. position is 0-based
// (0 = group winner … 3 = bottom). advanced folds in the best-third rule.
type FinalPosition = 0 | 1 | 2 | 3;

interface SimulatedFinish {
  position: FinalPosition;
  advanced: boolean;
}

function classifyFinish(
  { groups, thirds }: SimulatedTables,
  teamCode: string,
): SimulatedFinish {
  for (const group of groups) {
    const index = group.rows.findIndex((row) => row.code === teamCode);
    if (index === -1) continue;
    const position = index as FinalPosition;
    if (position <= 1) return { position, advanced: true }; // top two
    if (position === 3) return { position, advanced: false }; // bottom — out
    // Third place: advances only if ranked among the eight best thirds.
    const ranked = thirds.find((third) => third.row.code === teamCode);
    return { position, advanced: Boolean(ranked?.qualifies) };
  }
  throw new Error(`Team "${teamCode}" not found in the group standings.`);
}

// --- Public API ----------------------------------------------------------------

export interface QualificationOdds {
  teamCode: string;
  iterations: number;
  /** P(reaches the Round of 32) — asTop2 + asBestThird. */
  advance: number;
  /** P(finishes 1st or 2nd in the group). */
  asTop2: number;
  /** P(finishes 3rd AND ranks among the eight best thirds). */
  asBestThird: number;
  /** P(does not reach the Round of 32). */
  eliminated: number;
  /** P(finishing 1st, 2nd, 3rd, 4th) — sums to 1. */
  finishPosition: [number, number, number, number];
  /** True when the group stage is already complete: the result is fixed, not sampled. */
  deterministic: boolean;
}

export interface QualificationOddsOptions {
  iterations?: number;
  seed?: number;
  sampler?: MatchSampler;
}

const DEFAULT_ITERATIONS = 3000;
const DEFAULT_SEED = 0x9e3779b9;

/**
 * Estimate the probability that `teamCode` reaches the Round of 32, by simulating the
 * remaining group-stage fixtures `iterations` times. Deterministic for a given seed.
 * Throws if `teamCode` is not a competing team. When no group fixtures remain the
 * result is already fixed, so a single pass settles it (deterministic: true).
 */
export function estimateQualificationOdds(
  matches: Match[],
  teamCode: string,
  options: QualificationOddsOptions = {},
): QualificationOdds {
  const seed = options.seed ?? DEFAULT_SEED;
  const rng = createRng(seed);

  const remaining = matches.filter(isRemainingGroupMatch);
  const finished = matches.filter((match) => !isRemainingGroupMatch(match));
  // The default sampler's strength model is built from the CURRENT standings, once.
  const sampler = options.sampler ?? createPoissonSampler(computeStandings(matches));

  // With nothing left to play every pass is identical, so one settles the odds.
  const deterministic = remaining.length === 0;
  const iterations = deterministic ? 1 : Math.max(1, options.iterations ?? DEFAULT_ITERATIONS);

  const positionCounts = [0, 0, 0, 0];
  let top2 = 0;
  let bestThird = 0;

  for (let i = 0; i < iterations; i += 1) {
    const tables = simulateOnce(finished, remaining, sampler, rng);
    const { position, advanced } = classifyFinish(tables, teamCode);
    positionCounts[position] += 1;
    if (advanced) {
      if (position <= 1) top2 += 1;
      else bestThird += 1;
    }
  }

  const asTop2 = top2 / iterations;
  const asBestThird = bestThird / iterations;
  return {
    teamCode,
    iterations,
    advance: asTop2 + asBestThird,
    asTop2,
    asBestThird,
    eliminated: 1 - asTop2 - asBestThird,
    finishPosition: [
      positionCounts[0] / iterations,
      positionCounts[1] / iterations,
      positionCounts[2] / iterations,
      positionCounts[3] / iterations,
    ],
    deterministic,
  };
}

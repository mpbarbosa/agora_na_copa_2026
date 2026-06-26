import test from "node:test";
import assert from "node:assert/strict";

import { computeStandings, groupStandings } from "../src/standings";
import type { Match, StandingsRow } from "../src/types";
import {
  estimateQualificationOdds,
  createPoissonSampler,
  createRng,
  listRemainingGroupMatches,
} from "../qualification-sim-core";

// --- Fixtures grounded in the real seed roster --------------------------------
// computeStandings always works over the 48-team / 12-group seed (data/tournament.ts),
// so the fixtures reuse REAL seed team codes. That keeps the simulated tables shaped
// like the real tournament (4 teams per group) without coupling to live results — the
// seed is static, version-controlled data.

const SEED_GROUPS = groupStandings(computeStandings([]), []);
const GROUP_A = SEED_GROUPS[0].rows; // four real teams of Grupo A, all at 0-0

function teamSide(row: StandingsRow): Match["teamA"] {
  return {
    name: row.name,
    code: row.code,
    flagSvg: row.flagSvg,
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
    group: row.group,
    lineup: [],
  };
}

function makeMatch(
  home: StandingsRow,
  away: StandingsRow,
  status: Match["status"],
  score?: Match["score"],
): Match {
  return {
    id: `${home.code}-${away.code}`,
    teamA: teamSide(home),
    teamB: teamSide(away),
    stadiumName: "Estádio",
    city: "Cidade",
    stageName: "Group Stage",
    kickoffTime: "16:00",
    kickoffDate: "01 Junho, 2026",
    kickoffTimestamp: "2026-06-01T16:00:00-03:00",
    status,
    score,
    countdownTargetSeconds: 0,
    broadcasters: [],
  };
}

// A fully decided Grupo A: t0 wins all (9 pts), then t1 (6), t2 (3), t3 (0) — every
// 1-0, so the order is unambiguous. Returns [matches, [t0, t1, t2, t3]].
function finishedGroupA(): { matches: Match[]; teams: StandingsRow[] } {
  const [t0, t1, t2, t3] = GROUP_A;
  const w = (home: StandingsRow, away: StandingsRow) =>
    makeMatch(home, away, "FINISHED", { teamA: 1, teamB: 0 });
  return {
    matches: [w(t0, t1), w(t0, t2), w(t0, t3), w(t1, t2), w(t1, t3), w(t2, t3)],
    teams: [t0, t1, t2, t3],
  };
}

// --- Determinism & the qualification rule -------------------------------------

test("a fully decided group stage is deterministic (one pass, fixed odds)", () => {
  const { matches, teams } = finishedGroupA();
  assert.equal(listRemainingGroupMatches(matches).length, 0);
  const odds = estimateQualificationOdds(matches, teams[0].code, { iterations: 2000 });
  assert.equal(odds.deterministic, true);
  assert.equal(odds.iterations, 1); // sampling is skipped — nothing left to play
});

test("a guaranteed group winner advances with probability 1", () => {
  const { matches, teams } = finishedGroupA();
  const odds = estimateQualificationOdds(matches, teams[0].code);
  assert.equal(odds.advance, 1);
  assert.equal(odds.asTop2, 1);
  assert.equal(odds.finishPosition[0], 1);
});

test("a team that finished bottom never advances (4th is out, not a third)", () => {
  const { matches, teams } = finishedGroupA();
  const odds = estimateQualificationOdds(matches, teams[3].code);
  assert.equal(odds.advance, 0);
  assert.equal(odds.eliminated, 1);
  assert.equal(odds.finishPosition[3], 1);
});

test("a third-placed team with points qualifies as a best third over empty groups", () => {
  // Only Grupo A is played; the other 11 groups sit at 0-0, so their thirds rank
  // below A's third — which therefore lands inside the best-eight cut.
  const { matches, teams } = finishedGroupA();
  const odds = estimateQualificationOdds(matches, teams[2].code);
  assert.equal(odds.advance, 1);
  assert.equal(odds.asBestThird, 1);
  assert.equal(odds.asTop2, 0);
  assert.equal(odds.finishPosition[2], 1); // finished 3rd
});

test("estimateQualificationOdds throws for a team that is not competing", () => {
  const { matches } = finishedGroupA();
  assert.throws(() => estimateQualificationOdds(matches, "ZZZ"), /not found/);
});

// --- Probabilistic invariants & reproducibility -------------------------------

// Grupo A decided + one unplayed Grupo B fixture, so there is something to simulate.
function withRemaining(): Match[] {
  const groupB = SEED_GROUPS[1].rows;
  const { matches } = finishedGroupA();
  return [...matches, makeMatch(groupB[0], groupB[1], "PRE_GAME")];
}

test("odds are a coherent probability distribution", () => {
  const matches = withRemaining();
  const odds = estimateQualificationOdds(matches, GROUP_A[2].code, { iterations: 800, seed: 7 });
  assert.equal(odds.deterministic, false);
  for (const p of [odds.advance, odds.asTop2, odds.asBestThird, odds.eliminated]) {
    assert.ok(p >= 0 && p <= 1, `probability out of range: ${p}`);
  }
  assert.ok(Math.abs(odds.advance - (odds.asTop2 + odds.asBestThird)) < 1e-9);
  assert.ok(Math.abs(odds.advance + odds.eliminated - 1) < 1e-9);
  const posSum = odds.finishPosition.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(posSum - 1) < 1e-9, `finishPosition sums to ${posSum}`);
});

test("the same seed yields identical odds (reproducible)", () => {
  const matches = withRemaining();
  const a = estimateQualificationOdds(matches, GROUP_A[2].code, { iterations: 800, seed: 42 });
  const b = estimateQualificationOdds(matches, GROUP_A[2].code, { iterations: 800, seed: 42 });
  assert.deepEqual(a, b);
});

test("an injected custom sampler is used and still yields valid odds", () => {
  const matches = withRemaining();
  // Every remaining match is a 1-0 home win — a fixed, well-formed sampler.
  const odds = estimateQualificationOdds(matches, GROUP_A[2].code, {
    iterations: 50,
    sampler: () => ({ teamA: 1, teamB: 0 }),
  });
  assert.ok(odds.advance >= 0 && odds.advance <= 1);
  assert.ok(Math.abs(odds.advance + odds.eliminated - 1) < 1e-9);
});

// --- Sampler model properties (Phase 2) ---------------------------------------

function row(code: string, played: number, goalsFor: number, goalsAgainst: number): StandingsRow {
  return { code, name: code, played, goalsFor, goalsAgainst } as unknown as StandingsRow;
}

function sideOnly(code: string): Match["teamA"] {
  return { code } as unknown as Match["teamA"];
}

function pairMatch(aCode: string, bCode: string): Match {
  return { id: `${aCode}-${bCode}`, teamA: sideOnly(aCode), teamB: sideOnly(bCode) } as unknown as Match;
}

test("Dixon–Coles correction raises the draw rate (vs independent Poisson)", () => {
  const standings = [row("AAA", 2, 2, 2), row("BBB", 2, 2, 2)]; // two average, equal teams
  const fixture = pairMatch("AAA", "BBB");
  const drawRate = (rho: number): number => {
    const sample = createPoissonSampler(standings, { rho });
    const rng = createRng(1);
    let draws = 0;
    const n = 20000;
    for (let i = 0; i < n; i += 1) {
      const r = sample(fixture, rng);
      if (r.teamA === r.teamB) draws += 1;
    }
    return draws / n;
  };
  assert.ok(drawRate(-0.13) > drawRate(0), "rho < 0 should inflate draws");
});

test("shrinkage pulls an inflated expectation toward the league baseline", () => {
  // FRK thrashed WEAK 5-0 in their only games, so an un-shrunk FRK-vs-WEAK expectation
  // is wildly high (freak attack AND weak defence). Heavy shrinkage must rein it in.
  const standings = [row("FRK", 1, 5, 0), row("WEK", 1, 0, 5)];
  const fixture = pairMatch("FRK", "WEK");
  const meanGoals = (priorWeight: number): number => {
    const sample = createPoissonSampler(standings, { priorWeight });
    const rng = createRng(3);
    let total = 0;
    const n = 20000;
    for (let i = 0; i < n; i += 1) total += sample(fixture, rng).teamA;
    return total / n;
  };
  // Heavy shrinkage must produce fewer expected goals than no shrinkage.
  assert.ok(meanGoals(5) < meanGoals(0), "more shrinkage should lower an inflated expectation");
});

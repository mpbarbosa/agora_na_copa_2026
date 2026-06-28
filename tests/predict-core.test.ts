import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPrediction, type PredictionTeam } from "../predict-core";
import type { MatchOutcome } from "../src/types";

const team = (over: Partial<PredictionTeam>): PredictionTeam => ({
  name: "Time",
  code: "TIM",
  points: 0,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  ...over,
});

// A model outcome the narrator reads. Defaults to a dead-even matchup; tests override
// the win split to exercise each verdict branch. (In production this comes from
// predictMatchOutcome — the Dixon–Coles Poisson model — but buildPrediction only needs
// the shape, so the unit test stays decoupled from the simulator.)
const outcome = (over: Partial<MatchOutcome> = {}): MatchOutcome => ({
  homeWin: 0.34,
  draw: 0.33,
  awayWin: 0.33,
  expectedHomeGoals: 1.4,
  expectedAwayGoals: 1.4,
  mostLikelyScore: { teamA: 1, teamB: 1 },
  ...over,
});

const strong = team({
  name: "Brasil",
  code: "BRA",
  points: 9,
  played: 3,
  won: 3,
  goalsFor: 8,
  goalsAgainst: 1,
  goalDifference: 7,
});
const weak = team({
  name: "Haiti",
  code: "HAI",
  points: 0,
  played: 3,
  lost: 3,
  goalsFor: 1,
  goalsAgainst: 8,
  goalDifference: -7,
});

// A lopsided model outcome consistent with Brasil thrashing Haiti.
const lopsided = outcome({ homeWin: 0.74, draw: 0.16, awayWin: 0.1, mostLikelyScore: { teamA: 2, teamB: 0 } });

test("buildPrediction is deterministic for the same inputs", () => {
  assert.equal(buildPrediction(strong, weak, lopsided), buildPrediction(strong, weak, lopsided));
});

test("favors the higher model probability and cites real numbers", () => {
  const text = buildPrediction(strong, weak, lopsided);
  assert.match(text, /Brasil entra como favorito claro/);
  assert.match(text, /## Prognóstico/);
  assert.match(text, /## Números/);
  // Real stats surfaced, not invented.
  assert.match(text, /9 pts em 3 jogos/);
  assert.match(text, /saldo \+7/);
  // The model's probabilities and modal scoreline appear when both teams have played.
  assert.match(text, /Probabilidades: Brasil 74% · empate 16% · Haiti 10%/);
  assert.match(text, /Placar mais provável: Brasil 2 x 0 Haiti/);
});

test("close probabilities read as an even tie, no false favorite", () => {
  const a = team({ name: "Suíça", code: "SUI", points: 4, played: 2, goalsFor: 3, goalsAgainst: 2, goalDifference: 1 });
  const b = team({ name: "Canadá", code: "CAN", points: 4, played: 2, goalsFor: 3, goalsAgainst: 2, goalDifference: 1 });
  const text = buildPrediction(a, b, outcome({ homeWin: 0.36, draw: 0.3, awayWin: 0.34 }));
  assert.match(text, /igual para igual|moeda no ar/);
  assert.doesNotMatch(text, /favorito/);
});

test("teams that have not played yet → open matchup, no scoreline", () => {
  const text = buildPrediction(team({ name: "Argentina", code: "ARG" }), team({ name: "México", code: "MEX" }), outcome());
  assert.match(text, /Cedo demais|aberto/);
  assert.doesNotMatch(text, /Placar mais provável/);
  assert.match(text, /ainda não entrou em campo/);
});

test("user notes are acknowledged but never treated as fact", () => {
  const text = buildPrediction(strong, weak, lopsided, "  acho que vai dar zebra  ");
  assert.match(text, /Você destacou: "acho que vai dar zebra"/);
  assert.match(text, /não cravada de resultado/);
});

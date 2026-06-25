import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPrediction, type PredictionTeam } from "../predict-core";

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

test("buildPrediction is deterministic for the same inputs", () => {
  assert.equal(buildPrediction(strong, weak), buildPrediction(strong, weak));
});

test("favors the stronger campaign and cites real numbers", () => {
  const text = buildPrediction(strong, weak);
  assert.match(text, /Brasil entra como favorito claro/);
  assert.match(text, /## Prognóstico/);
  assert.match(text, /## Números/);
  // Real stats surfaced, not invented.
  assert.match(text, /9 pts em 3 jogos/);
  assert.match(text, /saldo \+7/);
  // A simulated scoreline appears when both teams have played.
  assert.match(text, /Placar simulado:/);
});

test("close strengths read as an even tie, no false favorite", () => {
  const a = team({ name: "Suíça", code: "SUI", points: 4, played: 2, goalsFor: 3, goalsAgainst: 2, goalDifference: 1 });
  const b = team({ name: "Canadá", code: "CAN", points: 4, played: 2, goalsFor: 3, goalsAgainst: 2, goalDifference: 1 });
  const text = buildPrediction(a, b);
  assert.match(text, /igual para igual|moeda no ar/);
  assert.doesNotMatch(text, /favorito/);
});

test("teams that have not played yet → open matchup, no scoreline", () => {
  const text = buildPrediction(team({ name: "Argentina", code: "ARG" }), team({ name: "México", code: "MEX" }));
  assert.match(text, /Cedo demais|aberto/);
  assert.doesNotMatch(text, /Placar simulado/);
  assert.match(text, /ainda não entrou em campo/);
});

test("user notes are acknowledged but never treated as fact", () => {
  const text = buildPrediction(strong, weak, "  acho que vai dar zebra  ");
  assert.match(text, /Você destacou: "acho que vai dar zebra"/);
  assert.match(text, /não cravada de resultado/);
});

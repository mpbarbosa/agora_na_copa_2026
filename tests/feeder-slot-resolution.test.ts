import { test } from "node:test";
import assert from "node:assert/strict";
import type { KnockoutMatch, KnockoutTeamRef } from "../src/types";
import type { KnockoutResultSeed } from "../src/data/knockoutResults";
import { resolveFeederSlot } from "../src/appMatches";

// Minimal KnockoutMatch / result factories — resolveFeederSlot only reads
// matchNumber (the map key), slotA/slotB, teamA/teamB, and the seed's score/penaltyScore.
const km = (
  matchNumber: number,
  slotA: string,
  slotB: string,
  teamA: KnockoutTeamRef | null = null,
  teamB: KnockoutTeamRef | null = null,
): KnockoutMatch =>
  ({ matchNumber, stage: "R16", dateUtc: "", stadium: "", city: "", slotA, slotB, teamA, teamB }) as KnockoutMatch;
const fin = (a: number, b: number, pen?: [number, number]): KnockoutResultSeed => ({
  status: "FINISHED",
  score: { teamA: a, teamB: b },
  ...(pen ? { penaltyScore: { teamA: pen[0], teamB: pen[1] } } : {}),
});
const ref = (code: string, name: string): KnockoutTeamRef => ({ code, name }) as KnockoutTeamRef;
const BRA = ref("BRA", "Brasil");
const JPN = ref("JPN", "Japão");
const GER = ref("GER", "Alemanha");
const PAR = ref("PAR", "Paraguai");

test("resolveFeederSlot returns the winner (W) / loser (RU) of a decided feeder", () => {
  const bracket = new Map<number, KnockoutMatch>([
    [76, km(76, "2A", "2B", BRA, JPN)], // R32: Brasil 2×1 Japão
    [78, km(78, "2C", "2D", GER, PAR)], // R32: not yet played
    [91, km(91, "W76", "W78")], // R16 fed by #76 / #78
  ]);
  const results: Record<number, KnockoutResultSeed> = { 76: fin(2, 1) };
  assert.equal(resolveFeederSlot("W76", bracket, results)?.code, "BRA"); // winner of #76
  assert.equal(resolveFeederSlot("RU76", bracket, results)?.code, "JPN"); // loser of #76
  assert.equal(resolveFeederSlot("W78", bracket, results), null); // feeder undecided → placeholder
});

test("resolveFeederSlot uses the penalty tally and ignores non-feeder slots", () => {
  const bracket = new Map<number, KnockoutMatch>([[74, km(74, "1J", "3X", GER, PAR)]]);
  const pens: Record<number, KnockoutResultSeed> = { 74: fin(1, 1, [3, 4]) }; // 1×1, Paraguai 4×3 nos pênaltis
  assert.equal(resolveFeederSlot("W74", bracket, pens)?.code, "PAR");
  assert.equal(resolveFeederSlot("RU74", bracket, pens)?.code, "GER");
  // Group / best-third slots are not feeder refs.
  assert.equal(resolveFeederSlot("2A", bracket, pens), null);
  assert.equal(resolveFeederSlot("3ABCDF", bracket, pens), null);
  // A level feeder with no shootout tally → winner unknown, never guessed.
  assert.equal(resolveFeederSlot("W74", bracket, { 74: fin(1, 1) }), null);
});

test("resolveFeederSlot chains through a resolved feeder into the next round", () => {
  const bracket = new Map<number, KnockoutMatch>([
    [76, km(76, "2A", "2B", BRA, JPN)], // R32
    [91, km(91, "W76", "W78")], // R16 fed by #76 (home slot)
    [99, km(99, "W91", "W92")], // QF fed by #91
  ]);
  // #76 → Brasil; #91 home side (W76) wins → "W91" chains to Brasil.
  const results: Record<number, KnockoutResultSeed> = { 76: fin(2, 1), 91: fin(3, 0) };
  assert.equal(resolveFeederSlot("W91", bracket, results)?.code, "BRA");
});

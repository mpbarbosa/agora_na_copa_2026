import assert from "node:assert/strict";
import test from "node:test";

import { fairPlayPointsFromCounts, fairPlayPointsForSide } from "../src/disciplinary";
import { compareThirdPlaceRanking } from "../src/standings";
import type { StandingsRow } from "../src/types";

test("fairPlayPointsFromCounts applies the Art. 13.2f weights", () => {
  assert.equal(fairPlayPointsFromCounts({ yellow: 0, secondYellow: 0, directRed: 0, yellowAndDirectRed: 0 }), 0);
  assert.equal(fairPlayPointsFromCounts({ yellow: 2, secondYellow: 0, directRed: 0, yellowAndDirectRed: 0 }), -2);
  assert.equal(fairPlayPointsFromCounts({ yellow: 0, secondYellow: 1, directRed: 0, yellowAndDirectRed: 0 }), -3);
  assert.equal(fairPlayPointsFromCounts({ yellow: 0, secondYellow: 0, directRed: 1, yellowAndDirectRed: 0 }), -4);
  assert.equal(fairPlayPointsFromCounts({ yellow: 0, secondYellow: 0, directRed: 0, yellowAndDirectRed: 1 }), -5);
  // Mixed: 1 yellow (−1) + 1 direct red (−4) = −5.
  assert.equal(fairPlayPointsFromCounts({ yellow: 1, secondYellow: 0, directRed: 1, yellowAndDirectRed: 0 }), -5);
});

test("fairPlayPointsForSide reads recorded card data and defaults to 0", () => {
  // mex-rsa-2026: México had 1 yellow + 1 direct red (−5); África do Sul 2 yellows + 2 direct reds (−10).
  assert.equal(fairPlayPointsForSide("mex-rsa-2026", "teamA"), -5);
  assert.equal(fairPlayPointsForSide("mex-rsa-2026", "teamB"), -10);
  // Unknown match id (e.g. not yet played) contributes nothing and never throws.
  assert.equal(fairPlayPointsForSide("zzz-zzz-2026", "teamA"), 0);
});

function row(overrides: Partial<StandingsRow>): StandingsRow {
  return {
    id: "x",
    name: "X",
    code: "X",
    flagSvg: "x",
    primaryColor: "#000",
    secondaryColor: "#fff",
    group: "Grupo A",
    points: 3,
    played: 3,
    won: 1,
    drawn: 0,
    lost: 2,
    goalsFor: 2,
    goalsAgainst: 2,
    goalDifference: 0,
    dataSource: "result",
    fairPlayPoints: 0,
    ...overrides,
  };
}

test("compareThirdPlaceRanking breaks GD/GF ties on fair play (cleaner team first)", () => {
  const cleaner = row({ code: "CLN", fairPlayPoints: -2 });
  const dirtier = row({ code: "DRT", fairPlayPoints: -7 });
  // Identical on points/GD/GF — only discipline differs.
  assert.deepEqual([dirtier, cleaner].sort(compareThirdPlaceRanking).map((r) => r.code), ["CLN", "DRT"]);
});

test("compareThirdPlaceRanking keeps points/GD/GF ahead of fair play", () => {
  // A dirtier team with a better goal difference still ranks ahead of a cleaner one.
  const dirtierBetterGD = row({ code: "GD", goalDifference: 3, fairPlayPoints: -9 });
  const cleanerWorseGD = row({ code: "FP", goalDifference: 1, fairPlayPoints: 0 });
  assert.deepEqual(
    [cleanerWorseGD, dirtierBetterGD].sort(compareThirdPlaceRanking).map((r) => r.code),
    ["GD", "FP"],
  );
});

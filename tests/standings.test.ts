import assert from "node:assert/strict";
import test from "node:test";

import matchesData from "../src/matches.json";
import { computeStandings, groupStandings } from "../src/standings";
import type { Match } from "../src/types";

test("computeStandings matches the official FIFA group composition", () => {
  const rows = computeStandings(matchesData as Match[]);
  const groups = new Map(groupStandings(rows).map(({ group, rows: groupRows }) => [group, groupRows]));

  assert.deepEqual(
    Array.from(groups.entries()).map(([group, groupRows]) => ({
      group,
      teamCodes: groupRows.map((row) => row.code).sort(),
    })),
    [
      { group: "Grupo A", teamCodes: ["CZE", "KOR", "MEX", "RSA"] },
      { group: "Grupo B", teamCodes: ["BIH", "CAN", "QAT", "SUI"] },
      { group: "Grupo C", teamCodes: ["BRA", "HAI", "MAR", "SCO"] },
      { group: "Grupo D", teamCodes: ["AUS", "PAR", "TUR", "USA"] },
      { group: "Grupo E", teamCodes: ["CIV", "CUW", "ECU", "GER"] },
      { group: "Grupo F", teamCodes: ["JPN", "NED", "SWE", "TUN"] },
      { group: "Grupo G", teamCodes: ["BEL", "EGY", "IRN", "NZL"] },
      { group: "Grupo H", teamCodes: ["CPV", "ESP", "KSA", "URU"] },
      { group: "Grupo I", teamCodes: ["FRA", "IRQ", "NOR", "SEN"] },
      { group: "Grupo J", teamCodes: ["ALG", "ARG", "AUT", "JOR"] },
      { group: "Grupo K", teamCodes: ["COD", "COL", "POR", "UZB"] },
      { group: "Grupo L", teamCodes: ["CRO", "ENG", "GHA", "PAN"] },
    ],
  );
});

import type { StandingsRow } from "../src/types";
import {
  compareThirdPlaceRanking,
  rankBestThirds,
  computeContentionNote,
  computeQualificationNote,
  computeEliminationNote,
} from "../src/standings";

// Minimal fixtures — only the fields the standings math reads.
function row(code: string, over: Partial<StandingsRow> = {}): StandingsRow {
  return {
    id: code.toLowerCase(), name: code, code, flagSvg: "",
    primaryColor: "#000", secondaryColor: "#fff", group: "Grupo A",
    points: 0, played: 0, won: 0, drawn: 0, lost: 0,
    goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
    dataSource: "result", fairPlayPoints: 0, ...over,
  };
}
// A Group Stage match between two team codes. Defaults to FINISHED; pass
// `{ status: "PRE_GAME" }` (and no score) for a still-to-play fixture.
function gm(a: string, b: string, over: Record<string, unknown> = {}): Match {
  return {
    id: `${a}-${b}`,
    teamA: { code: a, name: a, group: "Grupo A" },
    teamB: { code: b, name: b, group: "Grupo A" },
    stageName: "Group Stage",
    status: "FINISHED",
    ...over,
  } as unknown as Match;
}

test("compareThirdPlaceRanking orders by points → GD → GF → fair play", () => {
  const base = { points: 4, goalDifference: 2, goalsFor: 5, fairPlayPoints: -3 };
  assert.ok(compareThirdPlaceRanking(row("A", { ...base, points: 6 }), row("B", base)) < 0); // more points
  assert.ok(compareThirdPlaceRanking(row("A", { ...base, goalDifference: 3 }), row("B", base)) < 0); // higher GD
  assert.ok(compareThirdPlaceRanking(row("A", { ...base, goalsFor: 9 }), row("B", base)) < 0); // higher GF
  // Same pts/GD/GF → higher fairPlayPoints (fewer disciplinary points) ranks first.
  assert.ok(compareThirdPlaceRanking(row("A", { ...base, fairPlayPoints: -1 }), row("B", base)) < 0);
});

test("rankBestThirds flags the eight best third-placed teams", () => {
  const groups = "ABCDEFGHIJKL".split("").map((L, i) => ({
    group: `Grupo ${L}`,
    rows: [row(`${L}1`), row(`${L}2`), row(`${L}3`, { points: i })], // third's points = 0..11
  }));
  const ranked = rankBestThirds(groups);
  assert.equal(ranked.length, 12);
  assert.equal(ranked[0].groupLetter, "L"); // group L's third (11 pts) ranks first
  assert.deepEqual(
    ranked.filter((t) => t.qualifies).map((t) => t.row.points).sort((a, b) => a - b),
    [4, 5, 6, 7, 8, 9, 10, 11], // the eight highest qualify; 0..3 do not
  );
});

test("groupStandings breaks a points tie by head-to-head (Art. 13 Step 1)", () => {
  const rows = [
    row("AAA", { points: 4, goalDifference: 1, goalsFor: 3 }),
    row("BBB", { points: 4, goalDifference: 1, goalsFor: 3 }), // identical overall to AAA → only H2H can split
    row("CCC", { points: 1 }),
    row("DDD", { points: 1 }),
  ];
  const [grp] = groupStandings(rows, [gm("AAA", "BBB", { score: { teamA: 2, teamB: 1 } })]); // AAA won the H2H
  assert.deepEqual(grp.rows.slice(0, 2).map((r) => r.code), ["AAA", "BBB"]);
});

test("groupStandings qualification on a fully-played group: top-2 qualified, 4th eliminated", () => {
  const rows = [
    row("AAA", { points: 9 }), row("BBB", { points: 6 }), row("CCC", { points: 3 }), row("DDD", { points: 0 }),
  ];
  const [grp] = groupStandings(rows, []); // no remaining fixtures → final positions
  assert.equal(grp.qualification.get("AAA"), "qualified");
  assert.equal(grp.qualification.get("BBB"), "qualified");
  assert.equal(grp.qualification.get(grp.rows[2].code), "contention"); // 3rd may still be a best third
  assert.equal(grp.qualification.get(grp.rows[3].code), "eliminated"); // 4th is out
});

test("groupStandings: leader is 'qualified' when the only two chasers must play each other", () => {
  const rows = [
    row("AAA", { points: 6 }), row("BBB", { points: 3 }), row("CCC", { points: 3 }), row("DDD", { points: 0 }),
  ];
  // The one remaining game is BBB vs CCC — only one of them can win it, so both cannot reach 6.
  const [grp] = groupStandings(rows, [gm("BBB", "CCC", { status: "PRE_GAME" })]);
  assert.equal(grp.qualification.get("AAA"), "qualified");
});

test("groupStandings: leader is NOT yet qualified when both chasers play someone else", () => {
  const rows = [
    row("AAA", { points: 6 }), row("BBB", { points: 3 }), row("CCC", { points: 3 }), row("DDD", { points: 0 }),
  ];
  // BBB and CCC each still have a game (vs DDD) but not against each other → both can reach 6.
  const matches = [gm("BBB", "DDD", { status: "PRE_GAME" }), gm("CCC", "DDD", { status: "PRE_GAME" })];
  assert.equal(groupStandings(rows, matches)[0].qualification.get("AAA"), "contention");
});

test("computeEliminationNote explains a mathematically-out team", () => {
  const rows = [row("AAA", { points: 6 }), row("BBB", { points: 6 }), row("CCC", { points: 3 }), row("DDD", { points: 0 })];
  const note = computeEliminationNote("DDD", rows, [gm("CCC", "DDD", { status: "PRE_GAME" })]);
  assert.match(note, /Eliminada matematicamente/);
  assert.match(note, /no máximo 3 pontos/); // 0 pts + one remaining win
  assert.match(note, /AAA e BBB/); // the two teams already out of reach
});

test("computeQualificationNote explains a clinched team (nobody can catch it)", () => {
  const rows = [row("AAA", { points: 9 }), row("BBB", { points: 3 }), row("CCC", { points: 3 }), row("DDD", { points: 0 })];
  const note = computeQualificationNote("AAA", rows, [gm("BBB", "CCC", { status: "PRE_GAME" })]);
  assert.match(note, /nenhuma seleção do grupo pode mais alcançar/);
  assert.match(note, /garantida/);
});

test("computeContentionNote explains a top-2 team not yet secured", () => {
  const rows = [row("AAA", { points: 4 }), row("BBB", { points: 3 }), row("CCC", { points: 3 }), row("DDD", { points: 1 })];
  const matches = [gm("AAA", "DDD", { status: "PRE_GAME" }), gm("BBB", "CCC", { status: "PRE_GAME" })];
  const note = computeContentionNote("AAA", rows, matches);
  assert.match(note, /1ª colocação/);
  assert.match(note, /ainda não está matematicamente garantida/);
});

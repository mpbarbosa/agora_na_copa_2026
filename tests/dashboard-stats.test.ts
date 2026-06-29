import { test } from "node:test";
import assert from "node:assert/strict";
import type { Match, StandingsRow } from "../src/types";
import {
  TEAM_COUNT,
  continentBreakdown,
  goalsByGroup,
  matchStatusBreakdown,
  topScoringTeams,
  tournamentTotals,
} from "../src/dashboardStats";

// A minimal StandingsRow factory — only the fields the dashboard stats read.
function row(partial: Partial<StandingsRow> & { code: string; group: string }): StandingsRow {
  return {
    id: partial.code.toLowerCase(),
    name: partial.name ?? partial.code,
    code: partial.code,
    flagSvg: "",
    primaryColor: partial.primaryColor ?? "#000000",
    secondaryColor: "#ffffff",
    group: partial.group,
    points: 0,
    played: partial.played ?? 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: partial.goalsFor ?? 0,
    goalsAgainst: 0,
    goalDifference: 0,
    dataSource: "result",
    fairPlayPoints: 0,
  };
}

function match(status: Match["status"]): Match {
  return {
    id: `m-${status}-${Math.round(Math.random() * 1e9)}`,
    teamA: { name: "A", code: "AAA", flagSvg: "", primaryColor: "#000", secondaryColor: "#fff", group: "", lineup: [] },
    teamB: { name: "B", code: "BBB", flagSvg: "", primaryColor: "#000", secondaryColor: "#fff", group: "", lineup: [] },
    stadiumName: "",
    city: "",
    stageName: "Group Stage",
    kickoffTime: "",
    kickoffDate: "",
    kickoffTimestamp: "2026-06-01T00:00:00-03:00",
    status,
    countdownTargetSeconds: 0,
    broadcasters: [],
  } as Match;
}

test("continentBreakdown sums to the 48-team field", () => {
  const continents = continentBreakdown();
  assert.equal(continents.reduce((s, c) => s + c.count, 0), 48);
  assert.equal(TEAM_COUNT, 48);
  // Every entry carries a confederation label and a positive count.
  for (const c of continents) {
    assert.ok(c.confederation.length > 0, `missing confederation for ${c.continent}`);
    assert.ok(c.count > 0);
  }
});

test("goalsByGroup strips the 'Grupo ' prefix, sums per group, and orders by letter", () => {
  const standings = [
    row({ code: "T2", group: "Grupo B", goalsFor: 1 }),
    row({ code: "T1", group: "Grupo A", goalsFor: 3 }),
    row({ code: "T3", group: "Grupo A", goalsFor: 2 }),
  ];
  assert.deepEqual(goalsByGroup(standings), [
    { group: "A", goals: 5 },
    { group: "B", goals: 1 },
  ]);
});

test("tournamentTotals counts statuses and derives group goals per match", () => {
  const matches = [match("FINISHED"), match("FINISHED"), match("LIVE"), match("SUSPENDED"), match("PRE_GAME")];
  // Two finished group matches → played increments both sides → sum(played) = 4 → 2 matches.
  const standings = [
    row({ code: "T1", group: "Grupo A", goalsFor: 3, played: 2 }),
    row({ code: "T2", group: "Grupo A", goalsFor: 1, played: 2 }),
  ];
  const totals = tournamentTotals(matches, standings);
  assert.equal(totals.teams, 48);
  assert.equal(totals.matchesTotal, 5);
  assert.equal(totals.matchesFinished, 2);
  assert.equal(totals.matchesLive, 2); // LIVE + SUSPENDED
  assert.equal(totals.matchesUpcoming, 1);
  assert.equal(totals.groupGoals, 4);
  assert.equal(totals.groupGoalsPerMatch, 2); // 4 goals / 2 matches
});

test("tournamentTotals avoids dividing by zero before any match is played", () => {
  const totals = tournamentTotals([match("PRE_GAME")], [row({ code: "T1", group: "Grupo A" })]);
  assert.equal(totals.groupGoalsPerMatch, 0);
});

test("matchStatusBreakdown returns the three situations in order", () => {
  const data = matchStatusBreakdown([match("FINISHED"), match("LIVE"), match("PRE_GAME"), match("PRE_GAME")]);
  assert.deepEqual(
    data.map((d) => [d.key, d.value]),
    [
      ["finished", 1],
      ["live", 1],
      ["upcoming", 2],
    ],
  );
});

test("topScoringTeams sorts by goals then name, and honours the limit", () => {
  const standings = [
    row({ code: "LOW", name: "Baixa", group: "Grupo A", goalsFor: 1 }),
    row({ code: "TOP", name: "Alta", group: "Grupo A", goalsFor: 5 }),
    row({ code: "MIDB", name: "Beta", group: "Grupo B", goalsFor: 3 }),
    row({ code: "MIDA", name: "Alfa", group: "Grupo B", goalsFor: 3 }),
  ];
  const top = topScoringTeams(standings, 3);
  assert.deepEqual(
    top.map((t) => t.code),
    ["TOP", "MIDA", "MIDB"], // 5, then 3/3 broken alphabetically (Alfa < Beta)
  );
  assert.equal(top.length, 3);
});

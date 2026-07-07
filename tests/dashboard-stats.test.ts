import { test } from "node:test";
import assert from "node:assert/strict";
import type { Match, StandingsRow } from "../src/types";
import {
  GOAL_INTERVAL_LABELS,
  TEAM_COUNT,
  aggregateContinentByPhase,
  aggregateGoalsByGroupInterval,
  aggregateGoalsByMinute,
  aggregateGoalsByPhase,
  collectGoalMinutes,
  continentBreakdown,
  continentByPhase,
  goalIntervalIndex,
  goalScorerTeams,
  goalsByGroup,
  goalsByGroupAndInterval,
  goalsByMinute,
  goalsByPhase,
  groupTotals,
  matchStatusBreakdown,
  roundOf16TeamCodes,
  roundOf32TeamCodes,
  stageWinnerCodes,
  topScoringTeams,
  topScoringTeamsAllPhases,
  tournamentTotals,
  type MatchGoalTimeline,
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

function match(status: Match["status"], score?: { teamA: number; teamB: number }): Match {
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
    ...(score ? { score } : {}),
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

// No knockout progress beyond the given phases — the later rounds are all empty.
const noLaterRounds = { roundOf8: [], roundOf4: [], final: [], champion: [] };

test("aggregateContinentByPhase counts every phase reached per continent", () => {
  const continents = [
    { continent: "Europa", confederation: "UEFA", count: 3, teams: [{ code: "GER" }, { code: "ESP" }, { code: "POR" }] },
    { continent: "Ásia", confederation: "AFC", count: 2, teams: [{ code: "JPN" }, { code: "KOR" }] },
    { continent: "Oceania", confederation: "OFC", count: 1, teams: [{ code: "NZL" }] },
  ];
  // R32: GER, ESP, JPN reached. R16: GER, ESP. R8 (quartas): only GER.
  const out = aggregateContinentByPhase(continents as never, {
    roundOf32: ["GER", "ESP", "JPN"],
    roundOf16: ["GER", "ESP"],
    roundOf8: ["GER"],
    roundOf4: [],
    final: [],
    champion: [],
  });
  assert.deepEqual(out, [
    { continent: "Europa", confederation: "UEFA", counts: { groupStage: 3, roundOf32: 2, roundOf16: 2, roundOf8: 1, roundOf4: 0, final: 0, champion: 0 } },
    { continent: "Ásia", confederation: "AFC", counts: { groupStage: 2, roundOf32: 1, roundOf16: 0, roundOf8: 0, roundOf4: 0, final: 0, champion: 0 } },
    { continent: "Oceania", confederation: "OFC", counts: { groupStage: 1, roundOf32: 0, roundOf16: 0, roundOf8: 0, roundOf4: 0, final: 0, champion: 0 } },
  ]);
});

test("aggregateContinentByPhase ignores codes with no continent mapping", () => {
  const continents = [
    { continent: "Europa", confederation: "UEFA", count: 1, teams: [{ code: "GER" }] },
  ];
  const out = aggregateContinentByPhase(continents as never, {
    roundOf32: ["GER", "ZZZ"],
    roundOf16: ["ZZZ"],
    ...noLaterRounds,
  });
  assert.equal(out[0].counts.roundOf32, 1); // ZZZ dropped, not crashed
  assert.equal(out[0].counts.roundOf16, 0);
});

test("roundOf16TeamCodes are a subset of R32 participants (winners only)", () => {
  const r32 = new Set(roundOf32TeamCodes());
  const r16 = roundOf16TeamCodes();
  for (const code of r16) assert.ok(r32.has(code), `${code} in R16 but not an R32 participant`);
  // At most one survivor per R32 tie → never more R16 than half of R32.
  assert.ok(r16.length <= r32.size / 2, "more R16 qualifiers than ties allow");
});

test("continentByPhase is a monotonic funnel covering the 48-team field", () => {
  const phased = continentByPhase();
  const total = (key: "groupStage" | "roundOf32" | "roundOf16") =>
    phased.reduce((s, c) => s + c.counts[key], 0);
  assert.equal(total("groupStage"), 48);
  assert.equal(total("roundOf32"), 32);
  // Each phase is a subset of the previous, all the way down the ladder.
  const keys = ["groupStage", "roundOf32", "roundOf16", "roundOf8", "roundOf4", "final", "champion"] as const;
  for (const c of phased) {
    for (let i = 1; i < keys.length; i++) {
      assert.ok(c.counts[keys[i]] <= c.counts[keys[i - 1]], `${c.continent} ${keys[i]} > ${keys[i - 1]}`);
    }
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

test("tournamentTotals counts statuses and derives group + all-match goals", () => {
  const matches = [
    match("FINISHED", { teamA: 2, teamB: 1 }), // group tie, 3 goals
    match("FINISHED", { teamA: 3, teamB: 0 }), // knockout blowout, 3 goals
    match("FINISHED", { teamA: 1, teamB: 1 }), // knockout draw → 2 open-play goals (pens not counted)
    match("LIVE", { teamA: 1, teamB: 0 }), // in progress → excluded from goals
    match("SUSPENDED"),
    match("PRE_GAME"),
  ];
  // Two finished GROUP matches → played increments both sides → sum(played) = 4 → 2 matches.
  const standings = [
    row({ code: "T1", group: "Grupo A", goalsFor: 3, played: 2 }),
    row({ code: "T2", group: "Grupo A", goalsFor: 1, played: 2 }),
  ];
  const totals = tournamentTotals(matches, standings);
  assert.equal(totals.teams, 48);
  assert.equal(totals.matchesTotal, 6);
  assert.equal(totals.matchesFinished, 3);
  assert.equal(totals.matchesLive, 2); // LIVE + SUSPENDED
  assert.equal(totals.matchesUpcoming, 1);
  assert.equal(totals.groupGoals, 4); // from the reconciled standings
  assert.equal(totals.groupGoalsPerMatch, 2); // 4 goals / 2 group matches
  assert.equal(totals.totalGoals, 8); // 3 + 3 + 2 across the three finished fixtures
  assert.equal(totals.goalsPerMatch, 8 / 3); // over all finished matches, not just group
});

test("tournamentTotals avoids dividing by zero before any match is played", () => {
  const totals = tournamentTotals([match("PRE_GAME")], [row({ code: "T1", group: "Grupo A" })]);
  assert.equal(totals.groupGoalsPerMatch, 0);
  assert.equal(totals.goalsPerMatch, 0);
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

test("aggregateGoalsByMinute counts goals per minute and sorts ascending", () => {
  const perMatch = [
    [7, 45, 45],
    [45, 90],
    [7],
  ];
  assert.deepEqual(aggregateGoalsByMinute(perMatch), [
    { minute: 7, goals: 2 },
    { minute: 45, goals: 3 },
    { minute: 90, goals: 1 },
  ]);
  // Total across points equals the flattened goal count.
  const total = aggregateGoalsByMinute(perMatch).reduce((s, d) => s + d.goals, 0);
  assert.equal(total, 6);
});

test("aggregateGoalsByMinute returns [] for no goals", () => {
  assert.deepEqual(aggregateGoalsByMinute([]), []);
  assert.deepEqual(aggregateGoalsByMinute([[], []]), []);
});

test("goalsByMinute reads the seeded timeline and stays monotonic with positive counts", () => {
  const series = goalsByMinute();
  assert.ok(series.length > 0, "expected seeded goal-timeline data");
  for (let i = 1; i < series.length; i++) {
    assert.ok(series[i].minute > series[i - 1].minute, "minutes must be strictly ascending");
  }
  for (const point of series) {
    assert.ok(point.minute >= 1, "minute should be a real clock minute");
    assert.ok(point.goals >= 1, "each plotted minute has at least one goal");
  }
});

test("collectGoalMinutes returns all goals unfiltered, and one team's goals when filtered", () => {
  const timeline: Record<string, MatchGoalTimeline> = {
    "bra-jpn": { teamA: [56, 90], teamB: [29] },
    "bra-mar": { teamA: [21], teamB: [44] },
    "ger-par": { teamA: [54], teamB: [42] },
  };
  const sideCodes = {
    "bra-jpn": { a: "BRA", b: "JPN" },
    "bra-mar": { a: "BRA", b: "MAR" },
    "ger-par": { a: "GER", b: "PAR" },
  };
  // null → every goal from both sides of every match.
  assert.deepEqual(
    collectGoalMinutes(timeline, sideCodes, null).sort((a, b) => a - b),
    [21, 29, 42, 44, 54, 56, 90],
  );
  // BRA is the home side in both bra-* matches → only its scored minutes.
  assert.deepEqual(collectGoalMinutes(timeline, sideCodes, "BRA").sort((a, b) => a - b), [21, 56, 90]);
  // JPN is the away side in bra-jpn → just its goal.
  assert.deepEqual(collectGoalMinutes(timeline, sideCodes, "JPN"), [29]);
  // A team that didn't score → empty.
  assert.deepEqual(collectGoalMinutes(timeline, sideCodes, "ARG"), []);
  // A match with no side-code mapping is skipped under a team filter (never crashes).
  assert.deepEqual(collectGoalMinutes({ x: { teamA: [10], teamB: [20] } }, {}, "BRA"), []);
});

test("goalScorerTeams lists only teams that scored, sorted by name, with a per-team tally", () => {
  const teams = goalScorerTeams();
  assert.ok(teams.length > 0, "expected seeded scorers");
  for (const t of teams) {
    assert.ok(t.goals >= 1, `${t.code} listed with no goals`);
    assert.ok(t.name.length > 0, `${t.code} missing a name`);
  }
  const names = teams.map((t) => t.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, "pt-BR")), "sorted by name");
  // Every goal belongs to exactly one scoring team, so the tallies sum to the all-teams total.
  const totalFromTeams = teams.reduce((s, t) => s + t.goals, 0);
  const allGoals = goalsByMinute(null).reduce((s, d) => s + d.goals, 0);
  assert.equal(totalFromTeams, allGoals);
});

test("goalsByMinute(teamCode) plots exactly that team's goal tally", () => {
  const team = goalScorerTeams()[0];
  const teamTotal = goalsByMinute(team.code).reduce((s, d) => s + d.goals, 0);
  assert.equal(teamTotal, team.goals);
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

test("topScoringTeamsAllPhases sums whole-tournament goals from the timeline, not group standings", () => {
  const standings = [
    row({ code: "AAA", name: "Alfa", group: "Grupo A", goalsFor: 2, primaryColor: "#a1" }),
    row({ code: "BBB", name: "Beta", group: "Grupo A", goalsFor: 5, primaryColor: "#b2" }),
    row({ code: "CCC", name: "Gama", group: "Grupo B", goalsFor: 0, primaryColor: "#c3" }),
  ];
  const timeline = {
    m1: { teamA: [10, 20], teamB: [30] }, //   AAA 2, BBB 1
    ko1: { teamA: [5, 15, 88], teamB: [] }, //  BBB +3 (a knockout match)
    m2: { teamA: [40], teamB: [50, 60] }, //   AAA 1, CCC 2
  };
  const sideCodes = {
    m1: { a: "AAA", b: "BBB" },
    ko1: { a: "BBB", b: "CCC" },
    m2: { a: "AAA", b: "CCC" },
  };
  // Totals: BBB 1+3=4, AAA 2+1=3, CCC 2 — driven by the timeline, so BBB's group-only
  // goalsFor of 5 is irrelevant and its knockout goals (ko1) count.
  const top = topScoringTeamsAllPhases(standings, timeline, sideCodes, 2);
  assert.deepEqual(
    top.map((t) => ({ code: t.code, goalsFor: t.goalsFor })),
    [
      { code: "BBB", goalsFor: 4 },
      { code: "AAA", goalsFor: 3 },
    ],
  );
  assert.equal(top.length, 2);
  // Name + colour are resolved from the standings row, not the timeline.
  assert.equal(top[0].name, "Beta");
  assert.equal(top[0].primaryColor, "#b2");
});

test("aggregateGoalsByPhase orders phases, sums knockout scores, and skips unplayed phases", () => {
  const knockout = [
    { stage: "R32" as const, matchNumber: 73 },
    { stage: "R32" as const, matchNumber: 74 },
    { stage: "R16" as const, matchNumber: 89 }, // not played yet → omitted
  ];
  const results = {
    73: { status: "FINISHED", score: { teamA: 0, teamB: 1 } },
    74: { status: "FINISHED", score: { teamA: 1, teamB: 1 } }, // decided on pens → still 2 open-play goals
    89: undefined,
  };
  const out = aggregateGoalsByPhase(312, 104, knockout, results);
  assert.deepEqual(out, [
    { phase: "Fase de grupos", goals: 312, played: 104 },
    { phase: "16-avos", goals: 3, played: 2 }, // (0+1) + (1+1)
  ]);
});

test("aggregateGoalsByPhase omits the group stage before any group match is played", () => {
  const out = aggregateGoalsByPhase(0, 0, [{ stage: "R32" as const, matchNumber: 73 }], {
    73: { status: "FINISHED", score: { teamA: 2, teamB: 0 } },
  });
  assert.deepEqual(out, [{ phase: "16-avos", goals: 2, played: 1 }]);
});

test("aggregateGoalsByPhase ignores live/unfinished knockout ties", () => {
  const out = aggregateGoalsByPhase(10, 4, [
    { stage: "R32" as const, matchNumber: 73 },
    { stage: "R32" as const, matchNumber: 74 },
  ], {
    73: { status: "FINISHED", score: { teamA: 1, teamB: 2 } },
    74: { status: "LIVE", score: { teamA: 1, teamB: 0 } }, // in progress → excluded
  });
  assert.deepEqual(out, [
    { phase: "Fase de grupos", goals: 10, played: 4 },
    { phase: "16-avos", goals: 3, played: 1 },
  ]);
});

test("goalIntervalIndex buckets minutes into 15-min intervals with a 90+ overflow", () => {
  assert.equal(GOAL_INTERVAL_LABELS.length, 7);
  assert.equal(goalIntervalIndex(1), 0); // 1-15
  assert.equal(goalIntervalIndex(15), 0);
  assert.equal(goalIntervalIndex(16), 1); // 16-30
  assert.equal(goalIntervalIndex(45), 2); // 31-45 (regulation first half)
  assert.equal(goalIntervalIndex(46), 3); // 46-60 — a folded 45'+X lands here too
  assert.equal(goalIntervalIndex(90), 5); // 76-90
  assert.equal(goalIntervalIndex(91), 6); // 90+ overflow
  assert.equal(goalIntervalIndex(126), 6);
});

test("aggregateGoalsByGroupInterval buckets each goal by the scoring side's group and minute", () => {
  const timeline: Record<string, MatchGoalTimeline> = {
    "bra-jpn": { teamA: [10, 50], teamB: [90] }, // BRA(L) → 1-15, 46-60 ; JPN(L) → 76-90
    "arg-ger": { teamA: [46], teamB: [120] }, // ARG(C) → 46-60 ; GER(F) → 90+
  };
  const sideCodes = {
    "bra-jpn": { a: "BRA", b: "JPN" },
    "arg-ger": { a: "ARG", b: "GER" },
  };
  const groupByCode = { BRA: "L", JPN: "L", ARG: "C", GER: "F" };
  const out = aggregateGoalsByGroupInterval(timeline, sideCodes, groupByCode);

  assert.deepEqual([...GOAL_INTERVAL_LABELS], out.intervals);
  // Rows cover every group in the map, ordered alphabetically, even zero ones.
  assert.deepEqual(out.rows.map((r) => r.group), ["C", "F", "L"]);
  const byGroup = Object.fromEntries(out.rows.map((r) => [r.group, r]));
  assert.deepEqual(byGroup.C.cells, [0, 0, 0, 1, 0, 0, 0]); // ARG 46'
  assert.deepEqual(byGroup.F.cells, [0, 0, 0, 0, 0, 0, 1]); // GER 120'
  assert.deepEqual(byGroup.L.cells, [1, 0, 0, 1, 0, 1, 0]); // BRA 10'/50' + JPN 90'
  assert.equal(byGroup.L.total, 3);
  assert.equal(out.maxCell, 1);
  assert.equal(out.total, 5);
});

test("aggregateGoalsByGroupInterval skips goals with no side-code or no group mapping", () => {
  const timeline: Record<string, MatchGoalTimeline> = {
    mapped: { teamA: [30], teamB: [] },
    unmapped: { teamA: [40], teamB: [] }, // no entry in sideCodes → skipped
  };
  const sideCodes = { mapped: { a: "BRA", b: "JPN" } };
  const groupByCode = { BRA: "L" }; // JPN absent → its goals (none here) would be skipped too
  const out = aggregateGoalsByGroupInterval(timeline, sideCodes, groupByCode);
  assert.equal(out.total, 1); // only BRA's 30' counted
  assert.deepEqual(out.rows.map((r) => r.group), ["L"]);
});

test("goalsByGroupAndInterval reconciles with the all-teams goal total and stays rectangular", () => {
  const heat = goalsByGroupAndInterval();
  assert.equal(heat.intervals.length, GOAL_INTERVAL_LABELS.length);
  assert.ok(heat.rows.length > 0, "expected seeded groups");
  // Groups are ordered A→L and every row has one cell per interval.
  assert.deepEqual(heat.rows.map((r) => r.group), [...heat.rows.map((r) => r.group)].sort());
  for (const r of heat.rows) {
    assert.equal(r.cells.length, heat.intervals.length, `${r.group} row not rectangular`);
    assert.equal(r.total, r.cells.reduce((s, n) => s + n, 0), `${r.group} total mismatch`);
    for (const c of r.cells) assert.ok(c <= heat.maxCell, "cell exceeds reported maxCell");
  }
  // Every goal has a scoring team with a group, so the grid holds all of them.
  const allGoals = goalsByMinute(null).reduce((s, d) => s + d.goals, 0);
  assert.equal(heat.total, allGoals);
  assert.ok(heat.maxCell >= 1);
});

test("goalsByPhase leads with the group stage and never exceeds bracket order", () => {
  const standings = [
    row({ code: "AAA", group: "Grupo A", goalsFor: 6, played: 3 }),
    row({ code: "BBB", group: "Grupo A", goalsFor: 4, played: 3 }),
  ];
  const phases = goalsByPhase(standings);
  assert.ok(phases.length >= 1, "at least the group stage is present");
  assert.equal(phases[0].phase, "Fase de grupos");
  assert.equal(phases[0].goals, 10);
  const order = ["Fase de grupos", "16-avos", "Oitavas", "Quartas", "Semifinais", "3º lugar", "Final"];
  const indices = phases.map((p) => order.indexOf(p.phase));
  assert.deepEqual(indices, [...indices].sort((a, b) => a - b), "phases stay in bracket order");
  for (const p of phases) assert.ok(p.played > 0, `${p.phase} has a completed match`);
});

// ── Knockout-stage readers: now pure over an injected `matches` array (R32 = FIFA #73–88) ──
const koMatch = (num: number, over: Record<string, unknown>): Match =>
  ({
    id: `ko-${num}-2026`,
    status: "FINISHED",
    stageName: "16-avos de Final",
    teamA: { code: `A${num}` },
    teamB: { code: `B${num}` },
    ...over,
  }) as unknown as Match;

test("roundOf32TeamCodes lists both sides of each R32 fixture, ignoring non-knockout matches", () => {
  const matches = [
    koMatch(73, { teamA: { code: "BRA" }, teamB: { code: "ARG" } }),
    koMatch(74, { teamA: { code: "FRA" }, teamB: { code: "ESP" } }),
    { id: "bra-mar-2026", teamA: { code: "XXX" }, teamB: { code: "YYY" } } as unknown as Match, // group → ignored
  ];
  assert.deepEqual(roundOf32TeamCodes(matches), ["BRA", "ARG", "FRA", "ESP"]);
});

test("stageWinnerCodes returns only the decided winners of the given stage", () => {
  const matches = [
    koMatch(73, { score: { teamA: 2, teamB: 1 }, teamA: { code: "BRA" }, teamB: { code: "ARG" } }), // A wins on score
    koMatch(74, {
      score: { teamA: 1, teamB: 1 },
      penaltyScore: { teamA: 4, teamB: 2 },
      teamA: { code: "FRA" },
      teamB: { code: "ESP" },
    }), // A wins on penalties
    koMatch(75, { score: { teamA: 0, teamB: 0 }, teamA: { code: "GER" }, teamB: { code: "ITA" } }), // level, no shootout → no winner
    koMatch(76, { status: "LIVE", score: { teamA: 3, teamB: 0 }, teamA: { code: "POR" }, teamB: { code: "NED" } }), // unfinished → excluded
    {
      id: "col-per-2026",
      status: "FINISHED",
      stageName: "Group Stage",
      score: { teamA: 5, teamB: 0 },
      teamA: { code: "COL" },
      teamB: { code: "PER" },
    } as unknown as Match, // not a knockout fixture → excluded
  ];
  assert.deepEqual(stageWinnerCodes("R32", matches), ["BRA", "FRA"]);
  // roundOf16TeamCodes is stageWinnerCodes("R32") over APP_MATCHES — sanity-check it still returns an array.
  assert.ok(Array.isArray(roundOf16TeamCodes()));
});

test("groupTotals sums group goals and halves the double-counted played column", () => {
  const standings = [
    row({ code: "AAA", group: "Grupo A", goalsFor: 5, played: 3 }),
    row({ code: "BBB", group: "Grupo A", goalsFor: 2, played: 3 }),
    row({ code: "CCC", group: "Grupo B", goalsFor: 4, played: 2 }),
  ];
  assert.deepEqual(groupTotals(standings), { groupGoals: 11, groupMatchesPlayed: 4 });
});

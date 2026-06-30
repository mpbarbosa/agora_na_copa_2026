import { test } from "node:test";
import assert from "node:assert/strict";
import type { TeamViewMatchSummary } from "../src/types";
import { coachRecord } from "../src/utils/coachRecord";

// coachRecord only reads status + the team-oriented score, so a tiny partial is enough.
const m = (status: TeamViewMatchSummary["status"], team?: number, opponent?: number): TeamViewMatchSummary =>
  ({ status, ...(team != null ? { score: { team, opponent } } : {}) }) as unknown as TeamViewMatchSummary;

test("coachRecord tallies W/D/L and goals over finished matches only", () => {
  const history = [
    m("FINISHED", 3, 0), // win
    m("FINISHED", 1, 1), // draw
    m("FINISHED", 0, 2), // loss
    m("FINISHED", 2, 1), // win
    m("PRE_GAME"), // upcoming — ignored
    m("LIVE", 1, 0), // in progress — ignored (no final yet)
  ];
  assert.deepEqual(coachRecord(history), {
    played: 4,
    wins: 2,
    draws: 1,
    losses: 1,
    goalsFor: 6, // 3+1+0+2
    goalsAgainst: 4, // 0+1+2+1
  });
});

test("coachRecord counts a penalty-decided knockout draw as a draw", () => {
  // 1-1 lost on penalties is still a draw on the scoreboard (advancement lives elsewhere).
  const history = [m("FINISHED", 1, 1)];
  const record = coachRecord(history);
  assert.equal(record.draws, 1);
  assert.equal(record.wins, 0);
  assert.equal(record.losses, 0);
});

test("coachRecord is an all-zero record for an empty/missing/finished-but-scoreless history", () => {
  const zero = { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
  assert.deepEqual(coachRecord([]), zero);
  assert.deepEqual(coachRecord(undefined), zero);
  assert.deepEqual(coachRecord(null), zero);
  assert.deepEqual(coachRecord([m("FINISHED")]), zero); // finished but no score → not counted
});

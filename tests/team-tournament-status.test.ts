import { test } from "node:test";
import assert from "node:assert/strict";
import type { TeamViewMatchSummary } from "../src/types";
import { getTeamTournamentStatus } from "../src/utils/teamTournamentStatus";
import { KNOCKOUT_STAGE_NAMES } from "../src/utils/knockoutSlots";

// getTeamTournamentStatus only reads status/stageName/score/penaltyScore.
const ko = (
  stageName: string,
  team: number,
  opponent: number,
  pen?: [number, number],
): TeamViewMatchSummary =>
  ({
    status: "FINISHED",
    stageName,
    score: { team, opponent },
    ...(pen ? { penaltyScore: { team: pen[0], opponent: pen[1] } } : {}),
  }) as unknown as TeamViewMatchSummary;

const group = (team: number, opponent: number): TeamViewMatchSummary =>
  ({ status: "FINISHED", stageName: "Group Stage", score: { team, opponent } }) as unknown as TeamViewMatchSummary;

test("a 16-avos loss reads 'Eliminado em 16 avos de final'", () => {
  // South Africa: three group games, then lost the R32 tie to Canada 0-1.
  const history = [group(0, 2), group(1, 1), group(1, 0), ko(KNOCKOUT_STAGE_NAMES.R32, 0, 1)];
  assert.deepEqual(getTeamTournamentStatus(history), {
    label: "Eliminado em 16 avos de final",
    tone: "eliminated",
  });
});

test("a penalty-shootout loss eliminates at that round", () => {
  // Germany: 1-1 in the R32, lost 3-4 on penalties.
  assert.deepEqual(getTeamTournamentStatus([ko(KNOCKOUT_STAGE_NAMES.R32, 1, 1, [3, 4])]), {
    label: "Eliminado em 16 avos de final",
    tone: "eliminated",
  });
  // A level tie with no shootout data is not resolved.
  assert.equal(getTeamTournamentStatus([ko(KNOCKOUT_STAGE_NAMES.R16, 1, 1)]), null);
});

test("a knockout WIN leaves the team alive (no concluded status)", () => {
  assert.equal(getTeamTournamentStatus([ko(KNOCKOUT_STAGE_NAMES.R32, 2, 0)]), null);
  // Winning on penalties also just advances.
  assert.equal(getTeamTournamentStatus([ko(KNOCKOUT_STAGE_NAMES.QF, 1, 1, [5, 4])]), null);
});

test("losing a Semifinal is not elimination (drops to the 3rd-place match)", () => {
  assert.equal(getTeamTournamentStatus([ko(KNOCKOUT_STAGE_NAMES.SF, 0, 1)]), null);
});

test("Final and 3rd-place play-off get their own labels", () => {
  assert.deepEqual(getTeamTournamentStatus([ko(KNOCKOUT_STAGE_NAMES.F, 2, 1)]), {
    label: "Campeão",
    tone: "champion",
  });
  assert.deepEqual(getTeamTournamentStatus([ko(KNOCKOUT_STAGE_NAMES.F, 0, 2)]), {
    label: "Vice-campeão",
    tone: "eliminated",
  });
  assert.deepEqual(getTeamTournamentStatus([ko(KNOCKOUT_STAGE_NAMES.TP, 3, 1)]), {
    label: "3º lugar",
    tone: "advanced",
  });
  assert.deepEqual(getTeamTournamentStatus([ko(KNOCKOUT_STAGE_NAMES.TP, 1, 2)]), {
    label: "4º lugar",
    tone: "eliminated",
  });
});

test("no finished knockout match yields no status (group phase / not yet played)", () => {
  assert.equal(getTeamTournamentStatus([group(2, 0), group(1, 1)]), null);
  assert.equal(getTeamTournamentStatus([]), null);
});

test("a missing/non-array history is tolerated (fallback or stubbed payload)", () => {
  assert.equal(getTeamTournamentStatus(undefined), null);
  assert.equal(getTeamTournamentStatus(null), null);
});

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
// A scheduled knockout fixture the bracket placed the team in (no score yet).
const koScheduled = (stageName: string): TeamViewMatchSummary =>
  ({ status: "PRE_GAME", stageName, score: undefined }) as unknown as TeamViewMatchSummary;

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

test("a knockout WIN names the round the team qualified for", () => {
  // Canada won the R32 → classified for the Oitavas.
  assert.deepEqual(getTeamTournamentStatus([ko(KNOCKOUT_STAGE_NAMES.R32, 2, 0)]), {
    label: "Classificado para oitavas de final",
    tone: "advanced",
  });
  assert.deepEqual(getTeamTournamentStatus([ko(KNOCKOUT_STAGE_NAMES.R16, 1, 0)]), {
    label: "Classificado para quartas de final",
    tone: "advanced",
  });
  // Winning on penalties also advances.
  assert.deepEqual(getTeamTournamentStatus([ko(KNOCKOUT_STAGE_NAMES.QF, 1, 1, [5, 4])]), {
    label: "Classificado para semifinal",
    tone: "advanced",
  });
  // A Semifinal win reaches the Final.
  assert.deepEqual(getTeamTournamentStatus([ko(KNOCKOUT_STAGE_NAMES.SF, 2, 1)]), {
    label: "Classificado para final",
    tone: "advanced",
  });
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

test("a group qualifier with a scheduled 16-avos tie is 'Classificado para 16 avos de final'", () => {
  // Mexico: won its group, R32 tie vs Ecuador scheduled but not played.
  const history = [group(2, 0), group(1, 0), group(3, 0), koScheduled(KNOCKOUT_STAGE_NAMES.R32)];
  assert.deepEqual(getTeamTournamentStatus(history), {
    label: "Classificado para 16 avos de final",
    tone: "advanced",
  });
});

test("no knockout fixture at all yields no status (group phase / not placed)", () => {
  assert.equal(getTeamTournamentStatus([group(2, 0), group(1, 1)]), null);
  assert.equal(getTeamTournamentStatus([]), null);
});

test("once the group stage is over, a team with no knockout tie is eliminated in the group phase", () => {
  // South Korea / Czechia: only group games, no bracket fixture, group stage complete.
  const history = [group(2, 1), group(0, 1), group(1, 1)];
  assert.deepEqual(getTeamTournamentStatus(history, true), {
    label: "Eliminada na fase de grupos",
    tone: "eliminated",
  });
  // Mid-group-stage (not yet complete) we can't tell a future qualifier apart — stay quiet.
  assert.equal(getTeamTournamentStatus(history, false), null);
  // A qualifier with a scheduled R32 tie still reads "Classificado", complete or not.
  const qualifier = [group(2, 0), group(1, 0), group(3, 0), koScheduled(KNOCKOUT_STAGE_NAMES.R32)];
  assert.deepEqual(getTeamTournamentStatus(qualifier, true), {
    label: "Classificado para 16 avos de final",
    tone: "advanced",
  });
});

test("a missing/non-array history is tolerated (fallback or stubbed payload)", () => {
  assert.equal(getTeamTournamentStatus(undefined), null);
  assert.equal(getTeamTournamentStatus(null), null);
});

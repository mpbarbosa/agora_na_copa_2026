import { test } from "node:test";
import assert from "node:assert/strict";
import type { Match, TeamViewMatchSummary } from "../src/types";
import {
  buildTeamResultHistory,
  getTeamTournamentStatus,
} from "../src/utils/teamTournamentStatus";
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

test("losing a Semifinal reads as qualified for the 3rd-place match, not eliminated", () => {
  assert.deepEqual(getTeamTournamentStatus([ko(KNOCKOUT_STAGE_NAMES.SF, 0, 1)]), {
    label: "Classificado para disputa do 3º lugar",
    tone: "advanced",
  });
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

// buildTeamResultHistory — orient APP_MATCHES into team/opponent summaries.
const m = (
  ts: string,
  stageName: string,
  homeCode: string,
  awayCode: string,
  score?: [number, number],
  pen?: [number, number],
): Match =>
  ({
    teamA: { code: homeCode },
    teamB: { code: awayCode },
    stageName,
    status: score ? "FINISHED" : "PRE_GAME",
    kickoffTimestamp: ts,
    ...(score ? { score: { teamA: score[0], teamB: score[1] } } : {}),
    ...(pen ? { penaltyScore: { teamA: pen[0], teamB: pen[1] } } : {}),
  }) as unknown as Match;

test("buildTeamResultHistory orients score by side and sorts chronologically", () => {
  const matches = [
    m("2026-06-29T16:00:00-03:00", KNOCKOUT_STAGE_NAMES.R32, "BEL", "SEN", [3, 2]), // SEN away, lost
    m("2026-06-15T16:00:00-03:00", "Group Stage", "SEN", "NED", [1, 1]), // SEN home
    m("2026-06-20T16:00:00-03:00", "Group Stage", "QAT", "USA", [0, 2]), // not SEN — excluded
  ];
  const history = buildTeamResultHistory("SEN", matches);
  assert.deepEqual(
    history.map((h) => ({ stage: h.stageName, score: h.score })),
    [
      { stage: "Group Stage", score: { team: 1, opponent: 1 } }, // earlier kickoff first
      { stage: KNOCKOUT_STAGE_NAMES.R32, score: { team: 2, opponent: 3 } }, // away side flipped
    ],
  );
  // Feeds straight into the status derivation → eliminated in the 16-avos.
  assert.deepEqual(getTeamTournamentStatus(history), {
    label: "Eliminado em 16 avos de final",
    tone: "eliminated",
  });
});

test("buildTeamResultHistory flips the penalty tally for the away side", () => {
  // Germany lost the R32 shoot-out 3-4 as the home side; from the away team's
  // orientation the same tie is a 4-3 win.
  const tie = m("2026-06-28T16:00:00-03:00", KNOCKOUT_STAGE_NAMES.R32, "GER", "PAR", [1, 1], [3, 4]);
  assert.deepEqual(buildTeamResultHistory("PAR", [tie])[0].penaltyScore, { team: 4, opponent: 3 });
  assert.deepEqual(getTeamTournamentStatus(buildTeamResultHistory("PAR", [tie])), {
    label: "Classificado para oitavas de final",
    tone: "advanced",
  });
});

import type { TeamViewMatchSummary } from "../types";
import { KNOCKOUT_STAGE_NAMES } from "./knockoutSlots";

export type TeamStatusTone = "champion" | "advanced" | "eliminated";

export interface TeamTournamentStatus {
  label: string;
  tone: TeamStatusTone;
}

// The team's CONCLUDED tournament status, derived from its most recent finished
// knockout match (team/opponent-oriented summary). Returns null while the team
// is still alive — it advanced and has a later tie to play, or it lost a
// Semifinal and drops to the 3rd-place match — and also before the knockout
// phase, where the header shows the group instead.
//
// A level knockout scoreline is resolved from the real penalty-shootout tally
// (`penaltyScore`); without it the outcome is unknown and the status is omitted
// (the app never invents who advanced).
export function getTeamTournamentStatus(
  matchHistory: TeamViewMatchSummary[] | undefined | null,
): TeamTournamentStatus | null {
  if (!Array.isArray(matchHistory)) return null; // payload may omit the history (fallback/stub)
  const lastKnockout = [...matchHistory]
    .reverse()
    .find((m) => m.status === "FINISHED" && m.stageName !== "Group Stage" && m.score);
  if (!lastKnockout?.score) return null;

  const { team, opponent } = lastKnockout.score;
  let won: boolean;
  if (team !== opponent) {
    won = team > opponent;
  } else if (
    lastKnockout.penaltyScore &&
    lastKnockout.penaltyScore.team !== lastKnockout.penaltyScore.opponent
  ) {
    won = lastKnockout.penaltyScore.team > lastKnockout.penaltyScore.opponent;
  } else {
    return null; // level with no shootout data — don't invent
  }

  const stage = lastKnockout.stageName;
  if (stage === KNOCKOUT_STAGE_NAMES.F) {
    return won
      ? { label: "Campeão", tone: "champion" }
      : { label: "Vice-campeão", tone: "eliminated" };
  }
  if (stage === KNOCKOUT_STAGE_NAMES.TP) {
    return won
      ? { label: "3º lugar", tone: "advanced" }
      : { label: "4º lugar", tone: "eliminated" };
  }
  // A win leaves the team alive for the next round; losing a Semifinal drops it
  // to the 3rd-place match (also still alive). Neither is a concluded status.
  if (won || stage === KNOCKOUT_STAGE_NAMES.SF) return null;
  // Lost a 16-avos / Oitavas / Quartas tie → out of the tournament.
  return { label: `Eliminado em ${stage.toLowerCase()}`, tone: "eliminated" };
}

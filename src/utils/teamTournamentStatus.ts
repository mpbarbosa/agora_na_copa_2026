import type { TeamViewMatchSummary } from "../types";
import { KNOCKOUT_STAGE_NAMES } from "./knockoutSlots";

export type TeamStatusTone = "champion" | "advanced" | "eliminated";

export interface TeamTournamentStatus {
  label: string;
  tone: TeamStatusTone;
}

// The round each winners'-bracket stage feeds into, by pt-BR stage name, used to
// name the tie a team has just qualified for. The Final has no successor.
const NEXT_KNOCKOUT_STAGE: Record<string, string> = {
  [KNOCKOUT_STAGE_NAMES.R32]: KNOCKOUT_STAGE_NAMES.R16,
  [KNOCKOUT_STAGE_NAMES.R16]: KNOCKOUT_STAGE_NAMES.QF,
  [KNOCKOUT_STAGE_NAMES.QF]: KNOCKOUT_STAGE_NAMES.SF,
  [KNOCKOUT_STAGE_NAMES.SF]: KNOCKOUT_STAGE_NAMES.F,
};

// The team's tournament status, derived from its most recent finished knockout
// match (team/opponent-oriented summary): "Eliminado em …" when it lost, the
// title/podium labels at the Final and 3rd-place match, and "Classificado para
// …" (the round just reached) when it advanced. Returns null before the knockout
// phase — the header shows the group there — and for a Semifinal loss (the team
// drops to the 3rd-place match, status pending).
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
  // A Semifinal loss drops the team to the 3rd-place match — status pending.
  if (!won && stage === KNOCKOUT_STAGE_NAMES.SF) return null;
  if (won) {
    // Advanced — name the round it qualified for (e.g. won the R32 → oitavas).
    const nextStage = NEXT_KNOCKOUT_STAGE[stage];
    if (!nextStage) return null; // unrecognized stage label — stay quiet
    return { label: `Classificado para ${nextStage.toLowerCase()}`, tone: "advanced" };
  }
  // Lost a 16-avos / Oitavas / Quartas tie → out of the tournament.
  return { label: `Eliminado em ${stage.toLowerCase()}`, tone: "eliminated" };
}

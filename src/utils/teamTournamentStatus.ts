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

// The team's tournament status, derived from its knockout fixtures
// (team/opponent-oriented summaries): "Eliminado em …" when it lost a tie, the
// title/podium labels at the Final and 3rd-place match, and "Classificado para
// …" (the round it qualified for) both after a win and once the bracket places
// it in a tie it hasn't played yet — including a group qualifier whose 16-avos
// tie is merely scheduled. Returns null while still in the group phase (or not
// placed in the bracket) and for a Semifinal loss (the team drops to the
// 3rd-place match, status pending).
//
// A level knockout scoreline is resolved from the real penalty-shootout tally
// (`penaltyScore`); without it the outcome is unknown and the status is omitted
// (the app never invents who advanced).
export function getTeamTournamentStatus(
  matchHistory: TeamViewMatchSummary[] | undefined | null,
): TeamTournamentStatus | null {
  if (!Array.isArray(matchHistory)) return null; // payload may omit the history (fallback/stub)
  const classifiedFor = (stageName: string): TeamTournamentStatus => ({
    label: `Classificado para ${stageName.toLowerCase()}`,
    tone: "advanced",
  });

  const lastKnockout = [...matchHistory]
    .reverse()
    .find((m) => m.status === "FINISHED" && m.stageName !== "Group Stage" && m.score);

  if (lastKnockout?.score) {
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
      return classifiedFor(nextStage);
    }
    // Lost a 16-avos / Oitavas / Quartas tie → out of the tournament.
    return { label: `Eliminado em ${stage.toLowerCase()}`, tone: "eliminated" };
  }

  // No finished knockout tie yet. If the bracket already placed the team in a
  // knockout fixture, it has qualified for that round (e.g. a group runner-up
  // with its 16-avos tie scheduled → "Classificado para 16 avos de final").
  const upcomingKnockout = matchHistory.find((m) => m.stageName !== "Group Stage");
  if (upcomingKnockout) return classifiedFor(upcomingKnockout.stageName);

  return null; // still in the group phase, or not placed in the bracket
}

import type { Match, MatchStatus } from "../types";
import { KNOCKOUT_STAGE_NAMES, localizedStageName } from "./knockoutSlots";
import { translate, getActiveLocale } from "../i18n";

const t = (key: string, params?: Record<string, string | number>) =>
  translate(getActiveLocale(), key, params);

export type TeamStatusTone = "champion" | "advanced" | "eliminated";

export interface TeamTournamentStatus {
  label: string;
  tone: TeamStatusTone;
}

/**
 * The minimal per-team result shape getTeamTournamentStatus reads: a match's
 * status, its stage, and the team/opponent-oriented score (+ penalty tally). A
 * structural subset of the server's `TeamViewMatchSummary`, so a `/api/team-view`
 * matchHistory passes straight through, while `buildTeamResultHistory` produces
 * the same shape from the client-side APP_MATCHES for the Seleções grid.
 */
export interface TeamResultSummary {
  status: MatchStatus;
  stageName: string;
  score?: { team: number; opponent: number };
  penaltyScore?: { team: number; opponent: number };
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
// tie is merely scheduled. With `groupStageComplete`, a team that never reaches
// the bracket reads "Eliminada na fase de grupos" (see below). Returns null
// while still in the group phase (or not placed in the bracket) and for a
// Semifinal loss (the team drops to the 3rd-place match, status pending).
//
// A level knockout scoreline is resolved from the real penalty-shootout tally
// (`penaltyScore`); without it the outcome is unknown and the status is omitted
// (the app never invents who advanced).
//
// `groupStageComplete` lets the caller (server-fed, from APP_MATCHES) signal
// that every group-stage match is finished. Only then can a side with no
// knockout fixture be called eliminated in the group phase — until the stage
// ends the eight best thirds aren't fixed, so a future qualifier and an
// eliminated team are indistinguishable from one team's history alone.
export function getTeamTournamentStatus(
  matchHistory: TeamResultSummary[] | undefined | null,
  groupStageComplete = false,
): TeamTournamentStatus | null {
  if (!Array.isArray(matchHistory)) return null; // payload may omit the history (fallback/stub)
  const classifiedFor = (stageName: string): TeamTournamentStatus => ({
    label: t("utils.classifiedFor", { stage: localizedStageName(stageName).toLowerCase() }),
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
        ? { label: t("utils.champion"), tone: "champion" }
        : { label: t("utils.runnerUp"), tone: "eliminated" };
    }
    if (stage === KNOCKOUT_STAGE_NAMES.TP) {
      return won
        ? { label: t("utils.thirdPlace"), tone: "advanced" }
        : { label: t("utils.fourthPlace"), tone: "eliminated" };
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
    return {
      label: t("utils.eliminatedIn", { stage: localizedStageName(stage).toLowerCase() }),
      tone: "eliminated",
    };
  }

  // No finished knockout tie yet. If the bracket already placed the team in a
  // knockout fixture, it has qualified for that round (e.g. a group runner-up
  // with its 16-avos tie scheduled → "Classificado para 16 avos de final").
  const upcomingKnockout = matchHistory.find((m) => m.stageName !== "Group Stage");
  if (upcomingKnockout) return classifiedFor(upcomingKnockout.stageName);

  // No knockout fixture at all. Once the group stage is globally complete the
  // bracket — including the eight best thirds — is fully drawn, so a side still
  // without a tie did not advance: eliminated in the group phase. (A qualified
  // team, best thirds included, carries its R32 fixture in matchHistory and was
  // handled above.) Mid-group-stage we can't tell a future qualifier from an
  // eliminated team, so stay quiet.
  if (groupStageComplete) {
    return { label: t("utils.eliminatedGroupStage"), tone: "eliminated" };
  }

  return null; // still in the group phase, or not placed in the bracket
}

/**
 * Orient every match a team played into the team/opponent summaries
 * getTeamTournamentStatus consumes, chronologically (so the deepest finished
 * knockout tie is last). Lets the client-side Seleções grid derive a team's
 * round from the shared APP_MATCHES without the `/api/team-view` payload. A
 * knockout fixture the bracket hasn't resolved to this team is simply absent
 * (its slots carry no matching code), so only ties the team actually reached
 * appear.
 */
export function buildTeamResultHistory(
  teamCode: string,
  matches: readonly Match[],
): TeamResultSummary[] {
  return matches
    .filter((m) => m.teamA.code === teamCode || m.teamB.code === teamCode)
    .sort((a, b) => a.kickoffTimestamp.localeCompare(b.kickoffTimestamp))
    .map((m) => {
      const isHome = m.teamA.code === teamCode;
      const summary: TeamResultSummary = { status: m.status, stageName: m.stageName };
      if (m.score) {
        summary.score = isHome
          ? { team: m.score.teamA, opponent: m.score.teamB }
          : { team: m.score.teamB, opponent: m.score.teamA };
      }
      if (m.penaltyScore) {
        summary.penaltyScore = isHome
          ? { team: m.penaltyScore.teamA, opponent: m.penaltyScore.teamB }
          : { team: m.penaltyScore.teamB, opponent: m.penaltyScore.teamA };
      }
      return summary;
    });
}

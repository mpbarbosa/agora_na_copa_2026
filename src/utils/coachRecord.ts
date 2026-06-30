import type { TeamViewMatchSummary } from "../types";

export interface CoachRecord {
  /** FINISHED matches the team has played (group + knockout). */
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

/**
 * The team's record under its coach across every FINISHED World Cup 2026 match (group and
 * knockout), from the team-oriented match summaries (`score.team` / `score.opponent`). A
 * knockout tie level after regulation/extra time counts as a draw — the penalty shoot-out
 * decides who advances but isn't a win or loss on the scoreboard (the bracket/status carry
 * the "advanced" story separately). Pure over its input so it is unit-tested.
 */
export function coachRecord(matchHistory: TeamViewMatchSummary[] | undefined | null): CoachRecord {
  const record: CoachRecord = { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
  if (!Array.isArray(matchHistory)) return record;
  for (const match of matchHistory) {
    if (match.status !== "FINISHED" || !match.score) continue;
    record.played += 1;
    record.goalsFor += match.score.team;
    record.goalsAgainst += match.score.opponent;
    if (match.score.team > match.score.opponent) record.wins += 1;
    else if (match.score.team < match.score.opponent) record.losses += 1;
    else record.draws += 1;
  }
  return record;
}

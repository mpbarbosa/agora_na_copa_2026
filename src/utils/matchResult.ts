import type { Match } from "../types";
import { KNOCKOUT_STAGE_NAMES } from "./knockoutSlots";

// Pure logic for the per-team result line under a FINISHED match in the compact
// "Partidas" list. Group-stage fixtures earned points (3/1/0); knockout fixtures
// don't — single-elimination has no points — so they show the OUTCOME instead.
// Extracted from PartidasView so the branching is unit-tested independently of React.

/** Points each side earned from a finished score: 3 win / 1 draw / 0 loss. */
export function matchPoints(scoreA: number, scoreB: number): { a: number; b: number } {
  if (scoreA > scoreB) return { a: 3, b: 0 };
  if (scoreA < scoreB) return { a: 0, b: 3 };
  return { a: 1, b: 1 };
}

/** pt-BR points label, e.g. "+3 pts", "+1 pt", "0 pts". */
export function ptLabel(pts: number): string {
  return pts === 1 ? "+1 pt" : pts > 0 ? `+${pts} pts` : "0 pts";
}

export type ResultTone = "win" | "draw" | "loss";

/**
 * The per-team line for a FINISHED match. Group stage → points won; knockout →
 * the outcome (Campeão/Vice in the Final, 3º/4º lugar in the play-off, otherwise
 * Classificado/Eliminado). A knockout tie level on the scoreline is resolved from
 * the real penalty-shootout tally when present. Returns null when there is nothing
 * to show — a non-finished match, or a level knockout score with no shootout data
 * (we never invent who advanced).
 */
export function finishedSideResult(
  match: Match,
  side: "a" | "b",
): { label: string; tone: ResultTone } | null {
  if (match.status !== "FINISHED" || !match.score) return null;
  const { teamA, teamB } = match.score;
  if (match.stageName === "Group Stage") {
    const pts = side === "a" ? matchPoints(teamA, teamB).a : matchPoints(teamA, teamB).b;
    return { label: ptLabel(pts), tone: pts === 3 ? "win" : pts === 1 ? "draw" : "loss" };
  }
  const advancedSlot = knockoutWinnerSlot(match);
  if (!advancedSlot) return null; // level with no shootout data — don't invent
  const advanced = advancedSlot === (side === "a" ? "A" : "B");
  const label =
    match.stageName === KNOCKOUT_STAGE_NAMES.F
      ? advanced ? "Campeão" : "Vice"
      : match.stageName === KNOCKOUT_STAGE_NAMES.TP
        ? advanced ? "3º lugar" : "4º lugar"
        : advanced ? "Classificado" : "Eliminado";
  return { label, tone: advanced ? "win" : "loss" };
}

/**
 * Which slot ("A" = home, "B" = away) won a knockout tie, for the bracket's winner/loser
 * markers. A level scoreline is resolved from the real penalty-shootout tally when present.
 * Null when the tie isn't a decided knockout: a non-finished or scoreless match, a
 * group-stage fixture, or a level score with no shootout data (never guess).
 */
export function knockoutWinnerSlot(match: Match): "A" | "B" | null {
  if (match.status !== "FINISHED" || !match.score || match.stageName === "Group Stage") return null;
  const { teamA, teamB } = match.score;
  if (teamA !== teamB) return teamA > teamB ? "A" : "B";
  // Level after regular/extra time → decided on penalties when we have the tally.
  if (!match.penaltyScore || match.penaltyScore.teamA === match.penaltyScore.teamB) return null;
  return match.penaltyScore.teamA > match.penaltyScore.teamB ? "A" : "B";
}

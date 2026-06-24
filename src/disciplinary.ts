import disciplinaryData from "./data/matchDisciplinary.json";

// FIFA WC 2026 Regulations, Art. 13.2f — fair-play tiebreaker. Cards are reduced
// to per-team OUTCOME COUNTS per match (see scripts/build-match-disciplinary.py),
// keyed by match id then by match side. A match absent from the dataset contributes
// 0 points — identical to having no card data at all.
//
// Counts are stored (not pre-summed points) so the deduction weights live here, in
// one unit-tested place, and the raw data stays auditable against real incidents.

export interface DisciplinaryCounts {
  /** Players who received a single yellow card (no sending-off). */
  yellow: number;
  /** Players sent off for a second yellow (indirect red). */
  secondYellow: number;
  /** Players shown a straight (direct) red, with no prior yellow. */
  directRed: number;
  /** Players who received a yellow and then a separate direct red. */
  yellowAndDirectRed: number;
}

export type MatchSide = "teamA" | "teamB";

type MatchDisciplinary = Record<MatchSide, DisciplinaryCounts>;

const DATA = disciplinaryData as Record<string, MatchDisciplinary>;

// Art. 13.2f deduction weights. All non-positive; a cleaner team scores higher.
const WEIGHT_YELLOW = -1;
const WEIGHT_SECOND_YELLOW = -3;
const WEIGHT_DIRECT_RED = -4;
const WEIGHT_YELLOW_AND_DIRECT_RED = -5;

/** Fair-play points for a single match/side's card outcomes (0 or negative). */
export function fairPlayPointsFromCounts(counts: DisciplinaryCounts): number {
  const total =
    counts.yellow * WEIGHT_YELLOW +
    counts.secondYellow * WEIGHT_SECOND_YELLOW +
    counts.directRed * WEIGHT_DIRECT_RED +
    counts.yellowAndDirectRed * WEIGHT_YELLOW_AND_DIRECT_RED;
  return total || 0; // normalise −0 (all-zero counts) to +0
}

/**
 * Fair-play points for one side of one match, or 0 when no card data is recorded
 * for that match (e.g. not yet played, or a clean game). Never throws on unknown ids.
 */
export function fairPlayPointsForSide(matchId: string, side: MatchSide): number {
  const counts = DATA[matchId]?.[side];
  return counts ? fairPlayPointsFromCounts(counts) : 0;
}

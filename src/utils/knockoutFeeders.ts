import type { Match, KnockoutMatch } from "../types";
import { KNOCKOUT_MATCHES } from "../data/knockoutBracket";
import { knockoutWinnerSlot } from "./matchResult";

type Slot = "A" | "B";

// Map a knockout fixture's match number → the slot that WON it ("A"/"B"), for the finished
// ties only (Match.score.teamA/B align with slotA/slotB, see appMatches). Winner resolution
// — incl. leaving drawn-on-penalties ties unmarked — lives in the tested knockoutWinnerSlot.
export function buildWinnerSlotByNumber(matches: Match[]): Map<number, Slot> {
  const map = new Map<number, Slot>();
  for (const match of matches) {
    const n = /^ko-(\d+)-/.exec(match.id);
    const winner = n ? knockoutWinnerSlot(match) : null;
    if (n && winner) map.set(Number(n[1]), winner);
  }
  return map;
}

// Resolve later-round feeder slots to a concrete team once their feeder tie has finished:
// "W74" → that tie's winner, "RU101" → its loser. Lets an Oitavas card show "Canadá"
// instead of "Vencedor #73" the moment #73 is decided — and, crucially, lets a QF slot
// "W89" reach FRANÇA even though R16 #89's own sides are the deeper feeder refs "W74"/"W77"
// (the bracket skeleton only names R32 group-draw sides; every later round is a feeder ref,
// so the winning team must be chased down the chain). Keyed by the raw slot label so a card
// can look its slots up directly.
export function buildFeederTeamBySlot(
  matches: Match[],
): Map<string, NonNullable<KnockoutMatch["teamA"]>> {
  const winnerSlot = buildWinnerSlotByNumber(matches);
  const byNumber = new Map<number, KnockoutMatch>();
  for (const km of KNOCKOUT_MATCHES) byNumber.set(km.matchNumber, km);

  // Resolve a slot label to the concrete team occupying it, following the feeder chain: a
  // bracket-named side wins; otherwise the decided winner ("W") / loser ("RU"/"L") of its
  // feeder tie, recursively. Null while any link is still undecided. Mirrors
  // appMatches.resolveFeederSlot, but driven by the live winner map (buildWinnerSlotByNumber)
  // so it tracks the exact results the rest of the bracket renders.
  const resolveSlot = (
    slot: string,
    seen: Set<number>,
  ): NonNullable<KnockoutMatch["teamA"]> | null => {
    const parsed = /^(W|RU|L)(\d+)$/.exec(slot);
    if (!parsed) return null;
    const feederNumber = Number(parsed[2]);
    if (seen.has(feederNumber)) return null; // defensive: never loop on a malformed bracket
    seen.add(feederNumber);
    const feeder = byNumber.get(feederNumber);
    const won = winnerSlot.get(feederNumber);
    if (!feeder || !won) return null;
    const targetSlot: Slot = parsed[1] === "W" ? won : won === "A" ? "B" : "A";
    const directRef = targetSlot === "A" ? feeder.teamA : feeder.teamB;
    if (directRef) return directRef;
    // The winning side is itself a feeder ref (a deeper round) — resolve it recursively.
    const nestedSlot = targetSlot === "A" ? feeder.slotA : feeder.slotB;
    return resolveSlot(nestedSlot, seen);
  };

  const map = new Map<string, NonNullable<KnockoutMatch["teamA"]>>();
  for (const km of KNOCKOUT_MATCHES) {
    if (!winnerSlot.get(km.matchNumber)) continue;
    const winner = resolveSlot(`W${km.matchNumber}`, new Set());
    const loser = resolveSlot(`RU${km.matchNumber}`, new Set());
    if (winner) map.set(`W${km.matchNumber}`, winner);
    if (loser) map.set(`RU${km.matchNumber}`, loser);
  }
  return map;
}

// The two feeder fixtures of a knockout match, by number ("W89"/"W90" → [89, 90]). Empty for
// R32 (fed by group/best-third slots) — so walking feeders from any match bottoms out at R32.
export function feederNumbersOf(matchNumber: number): number[] {
  const km = KNOCKOUT_MATCHES.find((m) => m.matchNumber === matchNumber);
  if (!km) return [];
  const nums: number[] = [];
  for (const slot of [km.slotA, km.slotB]) {
    const parsed = /^(?:W|RU|L)(\d+)$/.exec(slot);
    if (parsed) nums.push(Number(parsed[1]));
  }
  return nums;
}

// The matchup a "W##"/"RU##"/"L##" slot points at, as team codes ("MEX x ECU"), so a still-
// unresolved feeder slot reads "Vencedor #79 MEX x ECU" — telling you which tie decides it.
// Each side is the R32 group-draw team when the bracket already names it, else its own
// feeder's resolved winner (`feederTeamBySlot`). Null when either side isn't a concrete team
// yet (a deeper, undecided feeder), so the label stays a bare "Vencedor #NN". Shared by the
// Chaveamento bracket and the Partidas list so both annotate feeder slots identically.
export function feederMatchupCodes(
  rawSlot: string,
  feederTeamBySlot: Map<string, NonNullable<KnockoutMatch["teamA"]>>,
): string | null {
  const ref = /^(?:W|RU|L)(\d+)$/.exec(rawSlot);
  if (!ref) return null;
  const feeder = KNOCKOUT_MATCHES.find((km) => km.matchNumber === Number(ref[1]));
  if (!feeder) return null;
  const sideCode = (team: KnockoutMatch["teamA"], slot: string): string | null =>
    team?.code ?? feederTeamBySlot.get(slot)?.code ?? null;
  const a = sideCode(feeder.teamA, feeder.slotA);
  const b = sideCode(feeder.teamB, feeder.slotB);
  return a && b ? `${a} x ${b}` : null;
}

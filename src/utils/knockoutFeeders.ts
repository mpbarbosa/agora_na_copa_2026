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
// instead of "Vencedor #73" the moment #73 is decided. Keyed by the raw slot label so a
// card can look its slots up directly.
export function buildFeederTeamBySlot(
  matches: Match[],
): Map<string, NonNullable<KnockoutMatch["teamA"]>> {
  const winnerSlot = buildWinnerSlotByNumber(matches);
  const map = new Map<string, NonNullable<KnockoutMatch["teamA"]>>();
  for (const km of KNOCKOUT_MATCHES) {
    const won = winnerSlot.get(km.matchNumber);
    if (!won) continue;
    const winnerRef = won === "A" ? km.teamA : km.teamB;
    const loserRef = won === "A" ? km.teamB : km.teamA;
    if (winnerRef) map.set(`W${km.matchNumber}`, winnerRef);
    if (loserRef) map.set(`RU${km.matchNumber}`, loserRef);
  }
  return map;
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

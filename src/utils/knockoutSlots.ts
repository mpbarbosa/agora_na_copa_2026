import type { KnockoutMatch } from "../types";

/**
 * Humanize an official FIFA knockout slot label into pt-BR:
 *   "1A" → "1º A", "2B" → "2º B", "3EHIJK" → "3º E/H/I/J/K",
 *   "W74" → "Vencedor #74", "RU101" → "Perdedor #101".
 * Unknown shapes pass through unchanged. Shared by BracketView (the Chaveamento
 * tree) and appMatches (knockout fixtures inserted into the scheduled list).
 */
export function humanizeSlot(slot: string): string {
  const groupPos = slot.match(/^([12])([A-L])$/);
  if (groupPos) return `${groupPos[1]}º ${groupPos[2]}`;
  const bestThird = slot.match(/^3([A-L]{2,})$/);
  if (bestThird) return `3º ${bestThird[1].split("").join("/")}`;
  const winner = slot.match(/^W(\d+)$/);
  if (winner) return `Vencedor #${winner[1]}`;
  const loser = slot.match(/^RU(\d+)$/);
  if (loser) return `Perdedor #${loser[1]}`;
  return slot;
}

/** Full pt-BR stage name for a knockout fixture, used as `Match.stageName`. */
export const KNOCKOUT_STAGE_NAMES: Record<KnockoutMatch["stage"], string> = {
  R32: "16 Avos de Final",
  R16: "Oitavas de Final",
  QF: "Quartas de Final",
  SF: "Semifinal",
  TP: "Disputa do 3º Lugar",
  F: "Final",
};

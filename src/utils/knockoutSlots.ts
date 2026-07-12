import type { KnockoutMatch } from "../types";
import { translate, getActiveLocale } from "../i18n";

/**
 * Humanize an official FIFA knockout slot label into pt-BR:
 *   "1A" → "1º A", "2B" → "2º B", "3EHIJK" → "Melhor 3º · E/H/I/J/K",
 *   "W74" → "Vencedor #74", "RU101" → "Perdedor #101".
 * Unknown shapes pass through unchanged. Shared by BracketView (the Chaveamento
 * tree) and appMatches (knockout fixtures inserted into the scheduled list).
 */
export function humanizeSlot(slot: string): string {
  const locale = getActiveLocale();
  const groupPos = slot.match(/^([12])([A-L])$/);
  if (groupPos) return translate(locale, `utils.slot.pos${groupPos[1]}`, { group: groupPos[2] });
  const bestThird = slot.match(/^3([A-L]{2,})$/);
  if (bestThird)
    return translate(locale, "utils.slot.bestThird", { groups: bestThird[1].split("").join("/") });
  const winner = slot.match(/^W(\d+)$/);
  if (winner) return translate(locale, "utils.slot.winner", { n: winner[1] });
  const loser = slot.match(/^RU(\d+)$/);
  if (loser) return translate(locale, "utils.slot.loser", { n: loser[1] });
  return slot;
}

/**
 * Long-form pt-BR description of a best-third combo slot ("3CDFGH"), for an a11y
 * `title`/`aria-label` on the otherwise cryptic bracket placeholder. The slot is
 * filled — once results come in — by one of the eight best third-placed teams,
 * drawn from the listed groups (FIFA's allocation table picks which). Returns
 * null for any non-best-third slot.
 */
export function describeBestThirdSlot(slot: string): string | null {
  const bestThird = slot.match(/^3([A-L]{2,})$/);
  if (!bestThird) return null;
  const locale = getActiveLocale();
  const letters = bestThird[1].split("");
  const connector = translate(locale, "utils.slot.orConnector");
  const groups = `${letters.slice(0, -1).join(", ")}${connector}${letters[letters.length - 1]}`;
  return translate(locale, "utils.slot.bestThirdDesc", { groups });
}

/**
 * The bare group shortlist of a best-third combo slot ("3CDFGH" → "C/D/F/G/H"),
 * for contexts (the bracket) where a separate "Melhor 3º" badge already conveys
 * the category, so the label only needs the differentiating groups. Returns null
 * for non-best-third slots.
 */
export function bestThirdGroups(slot: string): string | null {
  const bestThird = slot.match(/^3([A-L]{2,})$/);
  return bestThird ? bestThird[1].split("").join("/") : null;
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

// Reverse map: pt stage name → stage code. KNOCKOUT_STAGE_NAMES stays pt because
// it doubles as the canonical `Match.stageName` identity (equality-checked across
// the code); this lets DISPLAY sites translate a pt stageName for the UI locale.
const STAGE_CODE_BY_PT_NAME: Record<string, KnockoutMatch["stage"]> = Object.fromEntries(
  (Object.entries(KNOCKOUT_STAGE_NAMES) as [KnockoutMatch["stage"], string][]).map(
    ([code, name]) => [name, code],
  ),
);

/**
 * Display-only: translate a canonical `stageName` to the active UI locale (pt by
 * default → unchanged). Handles the knockout pt names and the internal English
 * "Group Stage" sentinel; returns any other value verbatim, so it is always safe
 * to wrap a stageName with this.
 */
export function localizedStageName(stageName: string): string {
  if (stageName === "Group Stage") {
    return translate(getActiveLocale(), "utils.stage.group");
  }
  const code = STAGE_CODE_BY_PT_NAME[stageName];
  return code ? translate(getActiveLocale(), `utils.stage.${code}`) : stageName;
}

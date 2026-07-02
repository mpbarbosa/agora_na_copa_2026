import REFEREE_INSTAGRAM from "../data/refereeInstagram.json";
import type { MatchReferee } from "../types";

const INSTAGRAM_BY_NAME: Record<string, string[]> = REFEREE_INSTAGRAM;

/**
 * Canonical form for matching a referee across data sources: lowercased, with
 * diacritics stripped and whitespace collapsed. FIFA's `Officials` names and our
 * curated keys can differ in accents/casing, so both are normalized before
 * comparison.
 */
export const normalizeRefereeName = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * Resolves a referee's curated Instagram highlights (src/data/refereeInstagram.json)
 * by tolerant name match: a stored key matches when — normalized — it equals,
 * contains, or is contained by the live FIFA name. FIFA frequently publishes
 * extra given/family-name parts (e.g. "Katia Itzel Garcia Villalpando"), so the
 * shorter curated key ("katia itzel garcia") still matches. Returns [] when no
 * curated entry exists for the referee.
 */
export const resolveRefereeInstagram = (referee: MatchReferee | undefined): string[] => {
  if (!referee?.name) return [];
  const target = normalizeRefereeName(referee.name);
  if (!target) return [];
  for (const [key, urls] of Object.entries(INSTAGRAM_BY_NAME)) {
    const normalizedKey = normalizeRefereeName(key);
    if (!normalizedKey) continue;
    if (normalizedKey === target || target.includes(normalizedKey) || normalizedKey.includes(target)) {
      return Array.isArray(urls) ? urls : [];
    }
  }
  return [];
};

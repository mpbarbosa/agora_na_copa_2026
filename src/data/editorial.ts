// Locale-aware editorial resolution. The pt files are the reference; parallel
// `*.en.json` files hold the English translations (keyed identically). es hides
// editorial (handled at the component gate), so only pt and en resolve here —
// en falls back to the pt text when a translation is missing, mirroring the UI
// catalog fallback so a partial en set never renders a blank.
import type { Locale } from "../i18n/locale";

/** Pick the localized text for a plain `Record<key, string>` editorial map. */
export const pickEditorialText = (
  ptMap: Record<string, string>,
  enMap: Record<string, string>,
  key: string,
  locale: Locale,
): string | undefined =>
  locale === "en" ? enMap[key] ?? ptMap[key] : ptMap[key];

/** An editorial entry carrying text + a freshness timestamp. */
export interface EditorialEntry {
  text: string;
  updatedAt: string | null;
}

/**
 * Pick a localized `{ text, updatedAt }` entry. The `updatedAt` always comes
 * from the pt (canonical) entry — the freshness of an analysis is a property of
 * the underlying facts, not the translation — while `text` swaps to en.
 */
export const pickEditorialEntry = (
  ptMap: Record<string, EditorialEntry>,
  enMap: Record<string, EditorialEntry>,
  key: string,
  locale: Locale,
): EditorialEntry | undefined => {
  const pt = ptMap[key];
  if (!pt) return undefined;
  if (locale === "en") {
    const en = enMap[key];
    if (en?.text) return { text: en.text, updatedAt: pt.updatedAt };
  }
  return pt;
};

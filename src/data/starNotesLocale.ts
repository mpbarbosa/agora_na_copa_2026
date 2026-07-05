// Locale-aware resolution of a player's editorial `worldCupNote` (the star
// note). The pt text lives in squads.json per player; the English translations
// live in the parallel `worldCupNotesEn.json`, keyed by the stable FIFA id. es
// hides star notes (handled at the component gate), so only pt and en resolve
// here — en falls back to the pt note when a translation is missing.
import WORLD_CUP_NOTES_EN from "./worldCupNotesEn.json";
import type { Locale } from "../i18n/locale";

const EN_NOTES = WORLD_CUP_NOTES_EN as Record<string, string>;

/** Pick the localized star note for a player. pt/es → the pt note; en → the
 *  English note (fallback to pt when absent). */
export const localizeWorldCupNote = (
  fifaId: string | undefined,
  ptNote: string | undefined,
  locale: Locale,
): string | undefined =>
  locale === "en" && fifaId ? EN_NOTES[fifaId] ?? ptNote : ptNote;

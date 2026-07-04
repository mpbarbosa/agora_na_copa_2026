// Shared "Atualizado em …" timestamp formatter for editorial analyses.
// Renders a Brasília-local stamp, e.g. "Atualizado em 21/06/2026, 18h50".
// Returns null for missing/invalid timestamps so callers can hide the line.
// Locale-aware (non-component): reads the active locale for the prefix + date
// format via getActiveLocale(), which is pt by default (so pt is unchanged).
import { translate, getActiveLocale, localeToIntlTag } from "../i18n";

export function formatAnalysisTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const locale = getActiveLocale();
  const stamp = date
    .toLocaleString(localeToIntlTag(locale), {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(",", "")
    .replace(":", "h");
  return translate(locale, "utils.updatedOn", { stamp });
}

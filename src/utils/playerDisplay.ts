import { Position, type PlayerSocials } from "../types";
import { translate, getActiveLocale, type Locale } from "../i18n";

const t = (key: string, params?: Record<string, string | number>) =>
  translate(getActiveLocale(), key, params);

export function getPositionLabel(position: Position): string {
  if (position === Position.GK) return t("utils.positionGK");
  if (position === Position.DF) return t("utils.positionDF");
  if (position === Position.MF) return t("utils.positionMF");
  return t("utils.positionFW");
}

// pt-BR title-case for prose. Normalizes FIFA "First LAST" names ("Sebastian
// BERHALTER" → "Sebastian Berhalter") and the canonical uppercase team names
// ("ESTADOS UNIDOS" → "Estados Unidos"), keeping connectors lowercased
// ("COREIA DO SUL" → "Coreia do Sul", "TRINDADE E TOBAGO" → "Trindade e Tobago").
const PT_TITLE_LOWER_WORDS = new Set(["de", "do", "da", "dos", "das", "e"]);

export function toTitleCasePtBr(text: string): string {
  return text
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\s-]+/g, (word, offset: number) =>
      offset > 0 && PT_TITLE_LOWER_WORDS.has(word)
        ? word
        : word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1),
    );
}

// Web-search links for a player's overlay card. Derived purely from the player's
// name (+ team + "futebol" to disambiguate common names, e.g. the several "Suzuki"s)
// — no stored data, so it works for every player. Localized to pt-BR / Brazil results.
export function buildPlayerSearchUrls(playerName: string, teamName: string) {
  const query = `"${playerName}" ${toTitleCasePtBr(teamName)} futebol`;
  const base = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR`;
  return { google: base, news: `${base}&tbm=nws` };
}

// The player card always links Wikipedia to the English edition, regardless of which
// language the curated URL points at, by swapping the language subdomain
// (e.g. `pt.wikipedia.org/wiki/Jordan_Pickford` → `en.wikipedia.org/wiki/Jordan_Pickford`).
// Player article titles match across editions in the common case; a rare mismatch resolves
// via Wikipedia's search redirect. Non-`wikipedia.org` URLs are returned unchanged.
export function toEnglishWikipediaUrl(url: string): string {
  return url.replace(/^(https?:\/\/)[a-z0-9.-]+\.wikipedia\.org\b/i, "$1en.wikipedia.org");
}

// Keys of PlayerSocials that are NOT outbound links, so they must be skipped when building the
// list of social buttons (e.g. `instagramFollowers` is metadata for the Instagram link, not a URL).
const NON_LINK_SOCIAL_KEYS = new Set<keyof PlayerSocials>(["instagramFollowers"]);

export function getPlayerSocialEntries(socials: PlayerSocials | undefined) {
  return (
    Object.entries(socials ?? {}) as Array<[keyof PlayerSocials, unknown]>
  ).filter(
    (entry): entry is [keyof PlayerSocials, string] =>
      !NON_LINK_SOCIAL_KEYS.has(entry[0]) && typeof entry[1] === "string" && entry[1].length > 0,
  );
}

/**
 * Compact, locale-aware rendering of an (approximate) follower count for the player card's
 * Instagram chip. The magnitude suffix and decimal formatting follow the active locale:
 *   pt → "1,2 mi" / "850 mil"   es → "1,2 M" / "850 mil"   en → "1.2M" / "850K"
 * Values below 1_000 render as-is (localized). Returns "" for non-positive/non-finite input
 * so callers can skip rendering.
 */
export function formatFollowerCount(count: number, locale: Locale = "pt"): string {
  if (!Number.isFinite(count) || count <= 0) return "";
  const intlTag = locale === "es" ? "es-MX" : locale === "en" ? "en-US" : "pt-BR";
  const millionsSuffix = locale === "pt" ? "mi" : "M"; // pt "milhões" → "mi"; es/en → "M"
  const thousandsSuffix = locale === "en" ? "K" : "mil";
  const sep = locale === "en" ? "" : " "; // English abbreviations sit tight: "230M", not "230 M"
  if (count >= 1_000_000) {
    const millions = count / 1_000_000;
    const rounded = millions >= 10 ? Math.round(millions) : Math.round(millions * 10) / 10;
    return `${rounded.toLocaleString(intlTag)}${sep}${millionsSuffix}`;
  }
  if (count >= 1_000) {
    return `${Math.round(count / 1_000).toLocaleString(intlTag)}${sep}${thousandsSuffix}`;
  }
  return count.toLocaleString(intlTag);
}

// ─── Player-card display helpers ──────────────────────────────────────────────
// Pure text/URL helpers backing the player card. They take an optional `t` and
// fall back to Portuguese when it is absent, so callers that have not been
// threaded through i18n still render (the `t`-aware callers localize fully).

/** Translate function shape from `useT()`; threaded into helpers that build display text. */
export type TFn = (key: string, params?: Record<string, string | number>) => string;

/** Whole-years age from an ISO birth date. `now` is injectable for deterministic tests. */
export function getPlayerAge(dateOfBirth: string, now: number = Date.now()): number {
  return Math.floor((now - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000));
}

const PT_MONTHS_SHORT = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// Formats "1993-07-28" → "28 jul. 1993" without timezone shift risk. Pass `t`
// to localize the month abbreviation; without it, pt is used.
export function formatBirthDate(isoDate: string, t?: TFn): string {
  const [yearStr, monthStr, dayStr] = isoDate.split("-");
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  const monthLabel = t ? t(`playerCard.month.${MONTH_KEYS[month - 1]}`) : PT_MONTHS_SHORT[month - 1];
  return `${day} ${monthLabel} ${yearStr}`;
}

export interface TournamentStats {
  goals: number;
  yellowCards: number;
  redCards: number;
}

interface StatCell {
  label: string;
  value: string | number;
  accent?: string;
}

// Returns stat cells for goals/yellows/reds, only including rows with value > 0.
export function buildTournamentStatCells(
  stats: TournamentStats | null | undefined,
  theme: "classic-light" | "stadium-dark",
  t?: TFn,
): StatCell[] {
  if (!stats) return [];
  const label = (key: string, pt: string) => (t ? t(key) : pt);
  const cells: StatCell[] = [];
  if (stats.goals > 0)
    cells.push({
      label: label("playerCard.stat.goals", "Gols"),
      value: stats.goals,
      accent: theme === "classic-light" ? "text-[#065f2c]" : "text-[#00e476]",
    });
  if (stats.yellowCards > 0)
    cells.push({
      label: label("playerCard.stat.yellows", "Amarelos"),
      value: stats.yellowCards,
      accent: theme === "classic-light" ? "text-[#9a6700]" : "text-[#ffd84d]",
    });
  if (stats.redCards > 0)
    cells.push({
      label: label("playerCard.stat.reds", "Vermelhos"),
      value: stats.redCards,
      accent: theme === "classic-light" ? "text-[#9f1239]" : "text-[#ff879d]",
    });
  return cells;
}

// Numeric stat tiles for the "full" player card: shirt number, age, height, then
// the tournament cells (goals/cards). All values are short numbers or "NNN cm",
// so they share one uniform tile size. Categorical fields (Posição, Seleção) are
// intentionally NOT tiles — long text breaks the grid's alignment.
export function buildPlayerStatCells(
  player: { number?: number; dateOfBirth?: string; height?: number },
  tournamentStats: TournamentStats | null | undefined,
  theme: "classic-light" | "stadium-dark",
  t?: TFn,
): StatCell[] {
  const label = (key: string, pt: string) => (t ? t(key) : pt);
  return [
    ...(player.number != null ? [{ label: label("playerCard.stat.shirt", "Camisa"), value: player.number }] : []),
    ...(player.dateOfBirth ? [{ label: label("playerCard.stat.age", "Idade"), value: getPlayerAge(player.dateOfBirth) }] : []),
    ...(player.height ? [{ label: label("playerCard.stat.height", "Altura"), value: `${player.height} cm` }] : []),
    ...buildTournamentStatCells(tournamentStats, theme, t),
  ];
}

export interface DetailRow {
  label?: string;
  value: string;
  fullWidth?: boolean;
}

/**
 * Core detail rows shared by EVERY player overlay-card entry point (Jogadores,
 * Líderes, Ao Vivo, team pitch) so the card renders identically regardless of
 * where it's opened: position, birth date, current club — each only when the
 * datum exists. Callers append their own additive rows (e.g. the match-context
 * line) on top. Reuses the canonical `aoVivo.overlayCard.*` labels so there is a
 * single source for the detail wording across every context.
 */
export function buildPlayerDetailRows(
  player: { position?: Position; dateOfBirth?: string; club?: string },
  t?: TFn,
): DetailRow[] {
  const label = (key: string, pt: string) => (t ? t(key) : pt);
  const rows: DetailRow[] = [];
  if (player.position != null) {
    rows.push({ label: label("aoVivo.overlayCard.position", "Posição"), value: getPositionLabel(player.position) });
  }
  if (player.dateOfBirth) {
    rows.push({ label: label("aoVivo.overlayCard.birth", "Nascimento"), value: formatBirthDate(player.dateOfBirth, t) });
  }
  if (player.club) {
    rows.push({ label: label("aoVivo.overlayCard.currentClub", "Clube atual"), value: player.club });
  }
  return rows;
}

/**
 * The additive "match context" row — shown ONLY when the card is opened from a
 * specific match (Ao Vivo incident, team-pitch board), so it can't be
 * context-independent. Uses the shared i18n template so every match flow reads
 * identically (the team-pitch flow previously hard-coded this line in pt-BR).
 */
export function buildMatchContextRow(
  teamName: string,
  opponentName: string,
  playerName: string,
  t?: TFn,
): DetailRow {
  return {
    label: t ? t("aoVivo.overlayCard.matchContext") : "Contexto da partida",
    value: t
      ? t("aoVivo.overlayCard.matchContextValue", {
          teamName: toTitleCasePtBr(teamName),
          opponentName: toTitleCasePtBr(opponentName),
          playerName: toTitleCasePtBr(playerName),
        })
      : `${toTitleCasePtBr(teamName)} x ${toTitleCasePtBr(opponentName)}`,
    fullWidth: true,
  };
}

// `instagramFollowers` is metadata for the Instagram chip, not a linkable platform, so it is
// excluded here (and never surfaces from `getPlayerSocialEntries`).
const SOCIAL_PLATFORM_LABELS: Record<Exclude<keyof PlayerSocials, "instagramFollowers">, string> = {
  instagram: "Instagram",
  x: "X",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  site: "Site oficial",
  wikipedia: "Wikipédia",
};

const SOCIAL_BASE_URLS: Partial<Record<keyof PlayerSocials, string>> = {
  instagram: "https://www.instagram.com/",
  x:         "https://x.com/",
  tiktok:    "https://www.tiktok.com/@",
  youtube:   "https://www.youtube.com/@",
  facebook:  "https://www.facebook.com/",
};

// Resolves a stored social value (a handle or a full URL) to its outbound link.
export function getSocialUrl(platform: keyof PlayerSocials, value: string): string {
  // Wikipedia always opens the English edition, whichever language the curated URL stores.
  if (platform === "wikipedia") return toEnglishWikipediaUrl(value);
  const base = SOCIAL_BASE_URLS[platform];
  if (!base) return value; // "site" already stores the full URL
  if (value.startsWith("http")) return value;
  return `${base}${value}`;
}

// Localizable labels for the non-brand platforms; brand names (Instagram, X, …)
// stay verbatim. Pass `t` to translate; without it, pt is used.
export function socialPlatformLabel(platform: keyof PlayerSocials, t?: TFn): string {
  if (!t) return SOCIAL_PLATFORM_LABELS[platform];
  if (platform === "site") return t("playerCard.social.site");
  if (platform === "wikipedia") return t("playerCard.social.wikipedia");
  return SOCIAL_PLATFORM_LABELS[platform];
}

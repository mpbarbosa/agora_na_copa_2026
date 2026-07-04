import { Position, type PlayerSocials } from "../types";

export function getPositionLabel(position: Position): string {
  if (position === Position.GK) return "Goleiro";
  if (position === Position.DF) return "Defensor";
  if (position === Position.MF) return "Meio-Campista";
  return "Atacante";
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
 * Compact pt-BR rendering of an (approximate) follower count for the player card's Instagram chip:
 * 1_000_000 → "1 mi", 1_200_000 → "1,2 mi", 850_000 → "850 mil", 12_400 → "12 mil". Values below
 * 1_000 render as-is. Returns "" for non-positive/non-finite input so callers can skip rendering.
 */
export function formatFollowerCount(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return "";
  if (count >= 1_000_000) {
    const millions = count / 1_000_000;
    const rounded = millions >= 10 ? Math.round(millions) : Math.round(millions * 10) / 10;
    return `${rounded.toLocaleString("pt-BR")} mi`;
  }
  if (count >= 1_000) {
    return `${Math.round(count / 1_000).toLocaleString("pt-BR")} mil`;
  }
  return count.toLocaleString("pt-BR");
}

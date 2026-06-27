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

export function getPlayerSocialEntries(socials: PlayerSocials | undefined) {
  return (
    Object.entries(socials ?? {}) as Array<[keyof PlayerSocials, string | undefined]>
  ).filter((entry): entry is [keyof PlayerSocials, string] => Boolean(entry[1]));
}

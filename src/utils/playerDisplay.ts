import { Position, type PlayerSocials } from "../types";

export function getPositionLabel(position: Position): string {
  if (position === Position.GK) return "Goleiro";
  if (position === Position.DF) return "Defensor";
  if (position === Position.MF) return "Meio-Campista";
  return "Atacante";
}

export function getPlayerSocialEntries(socials: PlayerSocials | undefined) {
  return (
    Object.entries(socials ?? {}) as Array<[keyof PlayerSocials, string | undefined]>
  ).filter((entry): entry is [keyof PlayerSocials, string] => Boolean(entry[1]));
}

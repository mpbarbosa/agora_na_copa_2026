import type { PlayerSocials } from "../types";

interface PlayerMetadataEntry {
  teamCode: string;
  aliases: string[];
  socials?: PlayerSocials;
}

const normalizePlayerMetadataName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9]+/g, "")
    .toUpperCase();

const PLAYER_METADATA: PlayerMetadataEntry[] = [
  {
    teamCode: "KSA",
    aliases: ["Abdulilah Alamri", "Alamri", "Al-Amri"],
    socials: {
      instagram: "https://instagram.com/aalamri32",
    },
  },
];

export const getPlayerMetadataSupplement = (teamCode: string, playerName: string) => {
  const normalizedTeamCode = teamCode.trim().toUpperCase();
  const normalizedPlayerName = normalizePlayerMetadataName(playerName);

  const entry = PLAYER_METADATA.find(
    (candidate) =>
      candidate.teamCode === normalizedTeamCode &&
      candidate.aliases.some(
        (alias) => normalizePlayerMetadataName(alias) === normalizedPlayerName,
      ),
  );

  return entry
    ? {
        socials: entry.socials,
      }
    : null;
};

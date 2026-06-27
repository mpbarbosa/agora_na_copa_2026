import squadsData from "./squads.json";
import type { SquadPlayer } from "../types";

const byFifaId = new Map<string, SquadPlayer>(
  Object.entries(squadsData as Record<string, SquadPlayer>),
);

const byTeamCode = new Map<string, SquadPlayer[]>();
for (const player of byFifaId.values()) {
  const team = byTeamCode.get(player.teamCode) ?? [];
  team.push(player);
  byTeamCode.set(player.teamCode, team);
}

const normalizeText = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9]+/g, "")
    .toUpperCase();

export const getPlayerByFifaId = (fifaId: string): SquadPlayer | null =>
  byFifaId.get(fifaId) ?? null;

export const getTeamSquad = (teamCode: string): SquadPlayer[] =>
  byTeamCode.get(teamCode.toUpperCase()) ?? [];

/** Every registered squad player, in squads.json insertion order. */
export const getAllSquadPlayers = (): SquadPlayer[] => [...byFifaId.values()];

/**
 * Resolve a registry entry for a player.
 * When fifaId is known, uses it directly.
 * Falls back to shirt number match, then normalised name match.
 */
export const resolvePlayerEntry = (
  teamCode: string,
  name: string,
  number: number,
  fifaId?: string,
): SquadPlayer | null => {
  if (fifaId) {
    const byId = getPlayerByFifaId(fifaId);
    if (byId) return byId;
  }
  const squad = getTeamSquad(teamCode);
  const normalizedName = normalizeText(name);
  // Prefer an exact name match over shirt number: a name is more specific, and
  // two squad players can share a number (e.g. a late call-up reusing #9), in
  // which case number-first would resolve the wrong player.
  return (
    squad.find((p) => normalizeText(p.name) === normalizedName) ??
    squad.find((p) => p.number === number) ??
    null
  );
};

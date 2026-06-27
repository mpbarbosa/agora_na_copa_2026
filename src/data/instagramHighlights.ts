import { getAllSquadPlayers } from "./playerRegistry";
import { standings } from "./tournament";
import { isSafeInstagramUrl } from "../utils/instagram";
import type { Position } from "../types";

/** A squad player's Instagram highlight, enriched for the Redes Sociais feed. */
export interface InstagramHighlight {
  fifaId: string;
  name: string;
  teamCode: string;
  teamName: string;
  flagSvg: string;
  position: Position;
  pictureUrl?: string;
  instagramPostUrl: string;
}

// Team display name + flag key, resolved from the seed standings (the same
// source the bracket and standings views use). Built once at module load.
const teamMetaByCode = new Map(
  standings.map((row) => [row.code, { name: row.name, flagSvg: row.flagSvg }]),
);

/**
 * Every squad player carrying a safe Instagram highlight permalink, enriched
 * with their team's display name + flag. Powers the "Destaques no Instagram"
 * feed on Redes Sociais. Order follows squads.json; callers may sort/slice.
 * A player whose team is absent from the standings falls back to the raw code.
 */
export const getInstagramHighlights = (): InstagramHighlight[] => {
  const highlights: InstagramHighlight[] = [];
  for (const player of getAllSquadPlayers()) {
    const url = player.instagramPostUrl;
    if (!url || !isSafeInstagramUrl(url)) continue;
    const meta = teamMetaByCode.get(player.teamCode);
    highlights.push({
      fifaId: player.fifaId,
      name: player.name,
      teamCode: player.teamCode,
      teamName: meta?.name ?? player.teamCode,
      flagSvg: meta?.flagSvg ?? player.teamCode.toLowerCase(),
      position: player.position,
      pictureUrl: player.pictureUrl,
      instagramPostUrl: url,
    });
  }
  return highlights;
};

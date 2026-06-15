import type { LineupEntry, Match, Player } from "../types";

export type TeamLineupsMap = Record<string, { teamA: LineupEntry; teamB: LineupEntry }>;

export interface TeamLineupResult {
  players: Player[];
  source?: "fifa" | "fallback";
}

// Lineups are primarily sourced live from the FIFA API (`/api/team-lineups`,
// keyed by local match id). When FIFA hasn't announced a lineup yet or the
// fetch fails, this falls back to the static lineup embedded in matches.json
// (teamA/teamB of each fixture). Teams that haven't been drawn into a seeded
// match yet have no lineup data at all, so this returns null and the UI shows
// a "not available" message.
export function findTeamLineup(
  code: string,
  matches: Match[],
  teamLineups: TeamLineupsMap = {},
): TeamLineupResult | null {
  for (const match of matches) {
    if (match.teamA.code === code) {
      const entry = teamLineups[match.id]?.teamA;
      return entry ? { players: entry.players, source: entry.source } : { players: match.teamA.lineup };
    }
    if (match.teamB.code === code) {
      const entry = teamLineups[match.id]?.teamB;
      return entry ? { players: entry.players, source: entry.source } : { players: match.teamB.lineup };
    }
  }
  return null;
}

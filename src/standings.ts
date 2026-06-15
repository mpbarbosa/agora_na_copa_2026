import type { Match, StandingsRow } from "./types";
import { standings as seedStandings } from "./data/tournament";
import matchesData from "./matches.json";

const POINTS_FOR_WIN = 3;
const POINTS_FOR_DRAW = 1;

interface MatchTally {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
}

function emptyTally(): MatchTally {
  return { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 };
}

function addResult(tally: MatchTally, scored: number, conceded: number): void {
  tally.played += 1;
  tally.goalsFor += scored;
  tally.goalsAgainst += conceded;
  if (scored > conceded) tally.won += 1;
  else if (scored === conceded) tally.drawn += 1;
  else tally.lost += 1;
}

function countsForStandings(match: Match) {
  const teamASeed = seedStandings.find((row) => row.code === match.teamA.code);
  const teamBSeed = seedStandings.find((row) => row.code === match.teamB.code);

  return (
    teamASeed &&
    teamBSeed &&
    teamASeed.group === teamBSeed.group &&
    match.stageName === "Group Stage" &&
    (match.status === "LIVE" || match.status === "FINISHED") &&
    match.score
  );
}

// Reconciles the tournament.ts seed roster with any scored LIVE/FINISHED
// matches in matches.json (matched by team code), so the Grupos view updates
// as live scores arrive without needing to hand-edit the seed data.
export function computeStandings(matches: Match[] = matchesData as Match[]): StandingsRow[] {
  const tallies = new Map<string, MatchTally>();

  for (const match of matches) {
    if (!countsForStandings(match)) continue;

    const tallyA = tallies.get(match.teamA.code) ?? emptyTally();
    const tallyB = tallies.get(match.teamB.code) ?? emptyTally();
    addResult(tallyA, match.score.teamA, match.score.teamB);
    addResult(tallyB, match.score.teamB, match.score.teamA);
    tallies.set(match.teamA.code, tallyA);
    tallies.set(match.teamB.code, tallyB);
  }

  return seedStandings.map((row) => {
    const tally = tallies.get(row.code);
    if (!tally) return row;

    return {
      ...row,
      ...tally,
      goalDifference: tally.goalsFor - tally.goalsAgainst,
      points: tally.won * POINTS_FOR_WIN + tally.drawn * POINTS_FOR_DRAW,
      dataSource: "result",
    };
  });
}

function sortGroupTable(rows: StandingsRow[]): StandingsRow[] {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor
  );
}

// Groups standings rows by their "Grupo X" label, sorted A-L, with each
// group's rows sorted Pts -> SG -> GF (descending).
export function groupStandings(rows: StandingsRow[]): { group: string; rows: StandingsRow[] }[] {
  const byGroup = new Map<string, StandingsRow[]>();
  for (const row of rows) {
    const existing = byGroup.get(row.group);
    if (existing) existing.push(row);
    else byGroup.set(row.group, [row]);
  }

  return Array.from(byGroup.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, groupRows]) => ({ group, rows: sortGroupTable(groupRows) }));
}

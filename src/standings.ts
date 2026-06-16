import type { Match, StandingsRow } from "./types";
import { standings as seedStandings } from "./data/tournament";
import { APP_MATCHES } from "./appMatches";

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

function createSeedRowFromMatchTeam(team: Match["teamA"]): StandingsRow {
  return {
    id: team.code.toLowerCase(),
    name: team.name,
    code: team.code,
    flagSvg: team.flagSvg,
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
    group: team.group,
    points: 0,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    dataSource: "seed",
  };
}

export function getCanonicalSeedStandings(
  matches: Match[] = APP_MATCHES,
): StandingsRow[] {
  const canonicalRows = new Map(
    seedStandings.map((row) => [
      row.code,
      {
        ...row,
      } satisfies StandingsRow,
    ]),
  );

  for (const match of matches) {
    for (const team of [match.teamA, match.teamB]) {
      if (!canonicalRows.has(team.code)) {
        canonicalRows.set(team.code, createSeedRowFromMatchTeam(team));
      }
    }
  }

  return Array.from(canonicalRows.values());
}

function countsForStandings(match: Match, groupByCode: Map<string, string>) {
  const teamAGroup = groupByCode.get(match.teamA.code);
  const teamBGroup = groupByCode.get(match.teamB.code);

  return (
    Boolean(teamAGroup) &&
    Boolean(teamBGroup) &&
    teamAGroup === teamBGroup &&
    match.stageName === "Group Stage" &&
    (match.status === "LIVE" || match.status === "FINISHED") &&
    match.score
  );
}

// Reconciles the tournament.ts seed roster with any scored LIVE/FINISHED
// matches in matches.json (matched by team code), so the Grupos view updates
// as live scores arrive without needing to hand-edit the seed data.
export function computeStandings(matches: Match[] = APP_MATCHES): StandingsRow[] {
  const canonicalSeedStandings = getCanonicalSeedStandings(matches);
  const groupByCode = new Map(
    canonicalSeedStandings.map((row) => [row.code, row.group]),
  );
  const tallies = new Map<string, MatchTally>();

  for (const match of matches) {
    if (!countsForStandings(match, groupByCode)) continue;

    const tallyA = tallies.get(match.teamA.code) ?? emptyTally();
    const tallyB = tallies.get(match.teamB.code) ?? emptyTally();
    addResult(tallyA, match.score.teamA, match.score.teamB);
    addResult(tallyB, match.score.teamB, match.score.teamA);
    tallies.set(match.teamA.code, tallyA);
    tallies.set(match.teamB.code, tallyB);
  }

  return canonicalSeedStandings.map((row) => {
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

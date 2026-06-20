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

interface H2HTally {
  points: number;
  gd: number;
  gf: number;
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

// --- Tiebreaker logic (Art. 13, FIFA WC 2026 Regulations) ---

// Accumulates head-to-head stats for `teamCode` against the given `opponents`
// across all completed Group Stage matches.
function computeH2H(teamCode: string, opponents: Set<string>, matches: Match[]): H2HTally {
  let points = 0, gd = 0, gf = 0;
  for (const match of matches) {
    if (match.stageName !== "Group Stage") continue;
    if (match.status !== "LIVE" && match.status !== "FINISHED") continue;
    if (!match.score) continue;

    let scored: number, conceded: number;
    if (match.teamA.code === teamCode && opponents.has(match.teamB.code)) {
      scored = match.score.teamA;
      conceded = match.score.teamB;
    } else if (match.teamB.code === teamCode && opponents.has(match.teamA.code)) {
      scored = match.score.teamB;
      conceded = match.score.teamA;
    } else {
      continue;
    }

    gf += scored;
    gd += scored - conceded;
    if (scored > conceded) points += POINTS_FOR_WIN;
    else if (scored === conceded) points += POINTS_FOR_DRAW;
  }
  return { points, gd, gf };
}

function cmpH2H(a: H2HTally, b: H2HTally): number {
  return b.points - a.points || b.gd - a.gd || b.gf - a.gf;
}

// Art. 13 Step 2d-e: overall GD → overall GF.
// Fair play (2f) and FIFA ranking (Step 3) are omitted — no card/ranking data available.
function sortByOverall(rows: StandingsRow[]): StandingsRow[] {
  return [...rows].sort(
    (a, b) => b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor,
  );
}

// Art. 13 Step 2: re-apply H2H to the remaining sub-cluster, then fall back to overall.
function sortSubcluster(rows: StandingsRow[], matches: Match[]): StandingsRow[] {
  if (rows.length === 1) return rows;

  const codes = new Set(rows.map((r) => r.code));
  const h2h = new Map(
    rows.map((r) => [
      r.code,
      computeH2H(r.code, new Set([...codes].filter((c) => c !== r.code)), matches),
    ]),
  );

  const sorted = [...rows].sort((a, b) => cmpH2H(h2h.get(a.code)!, h2h.get(b.code)!));
  const result: StandingsRow[] = [];
  let i = 0;
  while (i < sorted.length) {
    const ha = h2h.get(sorted[i].code)!;
    let j = i + 1;
    while (j < sorted.length && cmpH2H(h2h.get(sorted[j].code)!, ha) === 0) j++;
    const sub = sorted.slice(i, j);
    result.push(...(sub.length === 1 ? sub : sortByOverall(sub)));
    i = j;
  }
  return result;
}

// Art. 13 Step 1: H2H among all tied teams; recurse into sub-clusters.
function sortTiedCluster(rows: StandingsRow[], matches: Match[]): StandingsRow[] {
  if (rows.length === 1) return rows;

  const codes = new Set(rows.map((r) => r.code));
  const h2h = new Map(
    rows.map((r) => [
      r.code,
      computeH2H(r.code, new Set([...codes].filter((c) => c !== r.code)), matches),
    ]),
  );

  const sorted = [...rows].sort((a, b) => cmpH2H(h2h.get(a.code)!, h2h.get(b.code)!));
  const result: StandingsRow[] = [];
  let i = 0;
  while (i < sorted.length) {
    const ha = h2h.get(sorted[i].code)!;
    let j = i + 1;
    while (j < sorted.length && cmpH2H(h2h.get(sorted[j].code)!, ha) === 0) j++;
    const cluster = sorted.slice(i, j);

    if (cluster.length === 1) {
      result.push(cluster[0]);
    } else if (cluster.length < rows.length) {
      // Proper sub-cluster: Step 2 (re-apply H2H then overall)
      result.push(...sortSubcluster(cluster, matches));
    } else {
      // Entire cluster still tied after H2H (e.g. perfectly mirrored results) → Step 2d+
      result.push(...sortByOverall(cluster));
    }
    i = j;
  }
  return result;
}

function sortGroupTable(rows: StandingsRow[], matches: Match[]): StandingsRow[] {
  const byPoints = [...rows].sort((a, b) => b.points - a.points);
  const result: StandingsRow[] = [];
  let i = 0;
  while (i < byPoints.length) {
    let j = i + 1;
    while (j < byPoints.length && byPoints[j].points === byPoints[i].points) j++;
    const cluster = byPoints.slice(i, j);
    result.push(...(cluster.length === 1 ? cluster : sortTiedCluster(cluster, matches)));
    i = j;
  }
  return result;
}

// Groups standings rows by their "Grupo X" label, sorted A-L, with each
// group's rows sorted per Art. 13 (Pts → H2H → overall GD → overall GF).
// Pass the same `matches` array used by computeStandings for correct H2H data.
export function groupStandings(
  rows: StandingsRow[],
  matches: Match[] = APP_MATCHES,
): { group: string; rows: StandingsRow[] }[] {
  const byGroup = new Map<string, StandingsRow[]>();
  for (const row of rows) {
    const existing = byGroup.get(row.group);
    if (existing) existing.push(row);
    else byGroup.set(row.group, [row]);
  }

  return Array.from(byGroup.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, groupRows]) => ({ group, rows: sortGroupTable(groupRows, matches) }));
}

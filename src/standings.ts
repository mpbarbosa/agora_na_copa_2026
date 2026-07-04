import type { Match, StandingsRow } from "./types";
import { standings as seedStandings } from "./data/tournament";
import { APP_MATCHES } from "./appMatches";
import { fairPlayPointsForSide } from "./disciplinary";
import { localizeTeamName } from "./i18n/teamNames";

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
    fairPlayPoints: 0,
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
        // Localize the display name for the active UI locale (pt → unchanged).
        name: localizeTeamName(row.name, row.code),
      } satisfies StandingsRow,
    ]),
  );

  for (const match of matches) {
    // Only group-stage fixtures contribute teams to the group tables. Knockout
    // fixtures (now also in APP_MATCHES) carry placeholder sides with no group
    // ("Vencedor #74", "2º A") — adding them would spawn a spurious empty group.
    if (match.stageName !== "Group Stage") continue;
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
  // Fair-play points (Art. 13.2f) accumulated per team across the same counted matches.
  const fairPlay = new Map<string, number>();

  for (const match of matches) {
    if (!countsForStandings(match, groupByCode)) continue;

    const tallyA = tallies.get(match.teamA.code) ?? emptyTally();
    const tallyB = tallies.get(match.teamB.code) ?? emptyTally();
    addResult(tallyA, match.score.teamA, match.score.teamB);
    addResult(tallyB, match.score.teamB, match.score.teamA);
    tallies.set(match.teamA.code, tallyA);
    tallies.set(match.teamB.code, tallyB);

    fairPlay.set(
      match.teamA.code,
      (fairPlay.get(match.teamA.code) ?? 0) + fairPlayPointsForSide(match.id, "teamA"),
    );
    fairPlay.set(
      match.teamB.code,
      (fairPlay.get(match.teamB.code) ?? 0) + fairPlayPointsForSide(match.id, "teamB"),
    );
  }

  return canonicalSeedStandings.map((row) => {
    const tally = tallies.get(row.code);
    if (!tally) return row;

    return {
      ...row,
      ...tally,
      goalDifference: tally.goalsFor - tally.goalsAgainst,
      points: tally.won * POINTS_FOR_WIN + tally.drawn * POINTS_FOR_DRAW,
      fairPlayPoints: fairPlay.get(row.code) ?? 0,
      dataSource: "result",
    };
  });
}

// --- Qualification status (Art. 12.5) ---

export type QualificationStatus = "qualified" | "eliminated" | "contention";

// Returns true when teamA and teamB have a remaining (non-FINISHED) Group Stage
// match scheduled against each other.
function haveMutualRemainingMatch(
  codeA: string,
  codeB: string,
  allMatches: Match[],
): boolean {
  return allMatches.some(
    (m) =>
      m.stageName === "Group Stage" &&
      m.status !== "FINISHED" &&
      ((m.teamA.code === codeA && m.teamB.code === codeB) ||
        (m.teamA.code === codeB && m.teamB.code === codeA)),
  );
}

// Returns true when `team` cannot possibly finish top-2 in any remaining-match
// outcome. Enumerates all 3^n scenarios (win/draw/loss per remaining match).
// For a 4-team group this is at most 3^4 = 81 iterations — trivially fast.
function cannotPossiblyFinishTop2(
  team: StandingsRow,
  allRows: StandingsRow[],
  groupRemainingMatches: Match[],
): boolean {
  const n = groupRemainingMatches.length;
  const totalScenarios = 3 ** n;

  for (let scenario = 0; scenario < totalScenarios; scenario++) {
    const pts = new Map(allRows.map((r) => [r.code, r.points]));
    let s = scenario;

    for (const match of groupRemainingMatches) {
      const outcome = s % 3;
      s = Math.floor(s / 3);
      const a = match.teamA.code;
      const b = match.teamB.code;
      if (outcome === 0) pts.set(a, (pts.get(a) ?? 0) + 3);
      else if (outcome === 1) pts.set(b, (pts.get(b) ?? 0) + 3);
      else {
        pts.set(a, (pts.get(a) ?? 0) + 1);
        pts.set(b, (pts.get(b) ?? 0) + 1);
      }
    }

    const teamPts = pts.get(team.code) ?? 0;
    const rivalsAbove = allRows.filter(
      (r) => r.code !== team.code && (pts.get(r.code) ?? 0) > teamPts,
    ).length;

    if (rivalsAbove < 2) return false; // team can finish top-2 in this scenario
  }

  return true; // every scenario has ≥ 2 rivals above team
}

// Returns true when rivals A and B can SIMULTANEOUSLY both reach `targetPts`.
// When they play each other in a remaining match only one can win that game,
// so each scenario (A wins / B wins / draw) is tested separately.
function canPairReachTogether(
  A: StandingsRow,
  B: StandingsRow,
  targetPts: number,
  remaining: Map<string, number>,
  allMatches: Match[],
): boolean {
  if (!haveMutualRemainingMatch(A.code, B.code, allMatches)) {
    // No direct remaining match — they play different opponents and can
    // independently win all their games, so both reaching targetPts is possible.
    return true;
  }
  // Subtract the shared fixture from each team's remaining count to find their
  // "other" remaining matches (matches not against the rival).
  const aOther = (remaining.get(A.code) ?? 0) - 1;
  const bOther = (remaining.get(B.code) ?? 0) - 1;

  // A wins the direct match (+3 for A, +0 for B)
  if (A.points + 3 + aOther * 3 >= targetPts && B.points + 0 + bOther * 3 >= targetPts)
    return true;
  // B wins the direct match (+3 for B, +0 for A)
  if (B.points + 3 + bOther * 3 >= targetPts && A.points + 0 + aOther * 3 >= targetPts)
    return true;
  // Draw (+1 for each)
  if (A.points + 1 + aOther * 3 >= targetPts && B.points + 1 + bOther * 3 >= targetPts)
    return true;

  return false;
}

// Determines whether each team in a group has mathematically secured or been
// eliminated from a top-2 finish (i.e. guaranteed knockout-round qualification).
//
// "qualified"  – no two rivals can SIMULTANEOUSLY reach the team's current
//                points, accounting for head-to-head fixtures between rivals
//                (e.g. when two chasers still play each other, only one can win).
// "eliminated" – in every possible outcome of remaining matches, at least 2
//                rivals end up with strictly more points than the team →
//                top-2 is mathematically impossible, team is out.
// "contention" – outcome still undecided. Note: 3rd-place teams may still
//                advance as one of the 8 best thirds (Art. 12.5).
//
// sortedRows must already be in final group order (output of sortGroupTable).
function computeGroupQualification(
  sortedRows: StandingsRow[],
  allMatches: Match[],
): Map<string, QualificationStatus> {
  const codes = new Set(sortedRows.map((r) => r.code));

  // Remaining = non-FINISHED Group Stage matches for each team in this group
  const remaining = new Map<string, number>(sortedRows.map((r) => [r.code, 0]));
  for (const m of allMatches) {
    if (m.stageName !== "Group Stage" || m.status === "FINISHED") continue;
    if (codes.has(m.teamA.code)) remaining.set(m.teamA.code, remaining.get(m.teamA.code)! + 1);
    if (codes.has(m.teamB.code)) remaining.set(m.teamB.code, remaining.get(m.teamB.code)! + 1);
  }

  // When the group is fully played, use final sorted positions directly
  const totalRemaining = [...remaining.values()].reduce((a, b) => a + b, 0);
  if (totalRemaining === 0) {
    return new Map(
      sortedRows.map((row, i) => [
        row.code,
        i < 2 ? "qualified" : i === 3 ? "eliminated" : "contention",
      ]),
    );
  }

  // Pre-filter remaining matches for this group once (shared across all team checks)
  const groupRemainingMatches = allMatches.filter(
    (m) =>
      m.stageName === "Group Stage" &&
      m.status !== "FINISHED" &&
      codes.has(m.teamA.code) &&
      codes.has(m.teamB.code),
  );

  const result = new Map<string, QualificationStatus>();
  for (const row of sortedRows) {
    const rivals = sortedRows.filter((r) => r.code !== row.code);
    const myPts = row.points;

    // Rivals that can individually reach the team's current points
    const threats = rivals.filter(
      (r) => r.points + (remaining.get(r.code) ?? 0) * 3 >= myPts,
    );
    // Qualified: fewer than 2 rivals can reach my points, OR every pair of rivals
    // that can reach my points plays each other in a remaining fixture and
    // neither can reach my points without winning that mutual match — so they
    // cannot both simultaneously reach my points.
    const qualified =
      threats.length <= 1 ||
      !threats.some((a, ai) =>
        threats.some(
          (b, bi) => bi > ai && canPairReachTogether(a, b, myPts, remaining, allMatches),
        ),
      );

    // Eliminated: brute-force check — if every possible outcome of remaining
    // matches leaves at least 2 rivals with strictly more points, top-2 is gone.
    const eliminated =
      !qualified && cannotPossiblyFinishTop2(row, sortedRows, groupRemainingMatches);

    result.set(row.code, qualified ? "qualified" : eliminated ? "eliminated" : "contention");
  }

  return result;
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

// Art. 13 Step 2d-f: overall GD → overall GF → fair play (fewer disciplinary points).
// FIFA ranking (Step 3) remains omitted — no ranking data available.
function sortByOverall(rows: StandingsRow[]): StandingsRow[] {
  return [...rows].sort(
    (a, b) =>
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      b.fairPlayPoints - a.fairPlayPoints,
  );
}

// Ranks teams that share no head-to-head context (e.g. the best third-placed teams
// across different groups), by Art. 13 overall criteria: points → GD → GF → fair play.
// FIFA ranking (the final official tiebreaker) is omitted — no ranking data available.
export function compareThirdPlaceRanking(a: StandingsRow, b: StandingsRow): number {
  return (
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor ||
    b.fairPlayPoints - a.fairPlayPoints
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

// Returns a Portuguese explanation of why a top-2 team has not yet secured
// their knockout-round spot. Only meaningful when status === "contention" and
// the team is currently in position 1 or 2.
export function computeContentionNote(
  teamCode: string,
  sortedRows: StandingsRow[],
  allMatches: Match[],
): string {
  const codes = new Set(sortedRows.map((r) => r.code));
  const remaining = new Map<string, number>(sortedRows.map((r) => [r.code, 0]));

  for (const m of allMatches) {
    if (m.stageName !== "Group Stage" || m.status === "FINISHED") continue;
    if (codes.has(m.teamA.code))
      remaining.set(m.teamA.code, (remaining.get(m.teamA.code) ?? 0) + 1);
    if (codes.has(m.teamB.code))
      remaining.set(m.teamB.code, (remaining.get(m.teamB.code) ?? 0) + 1);
  }

  const team = sortedRows.find((r) => r.code === teamCode);
  if (!team) return "Classificação ainda não garantida.";

  const myPts = team.points;
  const pos = sortedRows.findIndex((r) => r.code === teamCode) + 1;
  const posLabel = pos === 1 ? "1ª colocação" : "2ª colocação";

  const threats = sortedRows
    .filter((r) => r.code !== teamCode)
    .map((r) => ({ name: r.name, max: r.points + (remaining.get(r.code) ?? 0) * 3 }))
    .filter((r) => r.max >= myPts)
    .sort((a, b) => b.max - a.max);

  if (threats.length === 0) {
    return `${team.name} já garantiu matematicamente a vaga no mata-mata.`;
  }

  const parts = threats.map((t) => `${t.name} (máx. ${t.max} pts)`);
  const threatText =
    parts.length === 1
      ? parts[0]
      : parts.slice(0, -1).join(", ") + " e " + parts[parts.length - 1];

  return (
    `Em ${posLabel} com ${myPts} pontos, mas ` +
    `${threatText} ${threats.length === 1 ? "ainda pode" : "ainda podem"} igualá-la. ` +
    `A vaga no mata-mata ainda não está matematicamente garantida.`
  );
}

// Returns a Portuguese explanation of why a team is mathematically qualified.
// Intended for tooltip text on the ✓ badge in the Grupos view.
export function computeQualificationNote(
  teamCode: string,
  sortedRows: StandingsRow[],
  allMatches: Match[],
): string {
  const codes = new Set(sortedRows.map((r) => r.code));
  const remaining = new Map<string, number>(sortedRows.map((r) => [r.code, 0]));

  for (const m of allMatches) {
    if (m.stageName !== "Group Stage" || m.status === "FINISHED") continue;
    if (codes.has(m.teamA.code))
      remaining.set(m.teamA.code, (remaining.get(m.teamA.code) ?? 0) + 1);
    if (codes.has(m.teamB.code))
      remaining.set(m.teamB.code, (remaining.get(m.teamB.code) ?? 0) + 1);
  }

  const team = sortedRows.find((r) => r.code === teamCode);
  if (!team) return "Classificado matematicamente para o mata-mata.";

  const myPts = team.points;
  const rivals = sortedRows.filter((r) => r.code !== teamCode);
  const totalRemaining = [...remaining.values()].reduce((a, b) => a + b, 0);

  if (totalRemaining === 0) {
    const pos = sortedRows.findIndex((r) => r.code === teamCode) + 1;
    return `Fase de grupos encerrada. ${team.name} terminou em ${pos}º lugar com ${myPts} pontos e avançou para o mata-mata.`;
  }

  const rivalMaxes = rivals
    .map((r) => ({ name: r.name, max: r.points + (remaining.get(r.code) ?? 0) * 3 }))
    .sort((a, b) => b.max - a.max);

  const canCatch = rivalMaxes.filter((r) => r.max >= myPts);
  const cannotCatch = rivalMaxes.filter((r) => r.max < myPts);

  if (canCatch.length === 0) {
    return `Com ${myPts} pontos, nenhuma seleção do grupo pode mais alcançar ${team.name}. Vaga no mata-mata garantida independentemente dos demais resultados.`;
  }

  // 2+ rivals can individually reach the team's points, but the team is still
  // qualified because every pair of chasers plays each other in a remaining
  // fixture — they cannot simultaneously both win that match.
  if (canCatch.length >= 2) {
    const chaserNames = canCatch.map((r) => r.name);
    const chaserText =
      chaserNames.length === 2
        ? `${chaserNames[0]} e ${chaserNames[1]}`
        : chaserNames.slice(0, -1).join(", ") + " e " + chaserNames[chaserNames.length - 1];
    const blockedNames = cannotCatch.map((r) => r.name);
    const blockedPart =
      blockedNames.length === 0
        ? ""
        : blockedNames.length === 1
          ? ` ${blockedNames[0]} já não tem mais como alcançar essa pontuação.`
          : ` ${blockedNames.join(" e ")} não têm mais como alcançar essa pontuação.`;
    return (
      `Com ${myPts} pontos, ${chaserText} ainda se enfrentam nos jogos restantes — ` +
      `apenas uma pode alcançar essa pontuação.${blockedPart} ` +
      `Vaga no mata-mata garantida matematicamente.`
    );
  }

  // Exactly 1 rival can still match or exceed the team's points
  const chaser = canCatch[0];
  const blockedNames = cannotCatch.map((r) => r.name);
  const blockedText =
    blockedNames.length === 1
      ? `${blockedNames[0]} já não tem mais como alcançar essa pontuação.`
      : `${blockedNames.join(" e ")} não têm mais como alcançar essa pontuação.`;

  return (
    `Com ${myPts} pontos, apenas ${chaser.name} ainda poderia igualá-la ` +
    `(máximo de ${chaser.max} pts). ${blockedText} ` +
    `Vaga no mata-mata garantida matematicamente.`
  );
}

// Returns a Portuguese explanation of why a team is mathematically eliminated.
// Intended for tooltip text on the ✕ badge in the Grupos view.
export function computeEliminationNote(
  teamCode: string,
  sortedRows: StandingsRow[],
  allMatches: Match[],
): string {
  const team = sortedRows.find((r) => r.code === teamCode);
  if (!team) return "Eliminada matematicamente da fase mata-mata.";

  const codes = new Set(sortedRows.map((r) => r.code));
  const remaining = new Map<string, number>(sortedRows.map((r) => [r.code, 0]));
  for (const m of allMatches) {
    if (m.stageName !== "Group Stage" || m.status === "FINISHED") continue;
    if (codes.has(m.teamA.code))
      remaining.set(m.teamA.code, (remaining.get(m.teamA.code) ?? 0) + 1);
    if (codes.has(m.teamB.code))
      remaining.set(m.teamB.code, (remaining.get(m.teamB.code) ?? 0) + 1);
  }

  const myPts = team.points;
  const myRem = remaining.get(teamCode) ?? 0;
  const myMax = myPts + myRem * 3;
  const totalRemaining = [...remaining.values()].reduce((a, b) => a + b, 0);

  if (totalRemaining === 0) {
    const pos = sortedRows.findIndex((r) => r.code === teamCode) + 1;
    return `Fase de grupos encerrada. ${team.name} terminou em ${pos}º lugar e foi eliminada.`;
  }

  const remPhrase =
    myRem === 0
      ? "sem mais jogos a disputar"
      : myRem === 1
        ? "mesmo vencendo o jogo restante"
        : `mesmo vencendo os ${myRem} jogos restantes`;

  // Rivals whose current points already exceed the team's theoretical max
  const lockedAbove = sortedRows
    .filter((r) => r.code !== teamCode && r.points > myMax)
    .map((r) => r.name);

  if (lockedAbove.length >= 2) {
    const locked =
      lockedAbove.length === 2
        ? `${lockedAbove[0]} e ${lockedAbove[1]}`
        : lockedAbove.slice(0, -1).join(", ") + " e " + lockedAbove[lockedAbove.length - 1];
    return (
      `Eliminada matematicamente. ${team.name}, ${remPhrase}, pode somar no máximo ${myMax} pontos. ` +
      `${locked} já ${lockedAbove.length === 1 ? "tem" : "têm"} mais pontos e garantem posições superiores.`
    );
  }

  if (lockedAbove.length === 1) {
    return (
      `Eliminada matematicamente. ${team.name}, ${remPhrase}, pode somar no máximo ${myMax} pontos. ` +
      `${lockedAbove[0]} já tem mais pontos (acima do alcançável) e ao menos mais um rival ` +
      `também terminará à frente, independentemente dos resultados restantes.`
    );
  }

  return (
    `Eliminada matematicamente. ${team.name}, ${remPhrase}, pode somar no máximo ${myMax} pontos. ` +
    `Ao menos dois rivais sempre terminarão com mais pontos, independentemente dos resultados restantes.`
  );
}

// One third-placed team in the cross-group "best thirds" ranking.
export interface RankedThird {
  row: StandingsRow;
  groupLetter: string; // "A".."L"
  // True for the 8 best-ranked thirds (the provisional knockout qualifiers).
  // Always provisional pre-allocation — third-place spots are never mathematically
  // secured until the group stage ends and FIFA fixes the group→slot table.
  qualifies: boolean;
}

// Ranks the third-placed team of every group by the Art. 13 overall criteria
// (points → GD → GF → fair play; see compareThirdPlaceRanking) and flags the best
// eight. Accepts the output of groupStandings so callers reuse one computation.
export function rankBestThirds(
  groups: { group: string; rows: StandingsRow[] }[],
): RankedThird[] {
  const thirds: { row: StandingsRow; groupLetter: string }[] = [];
  for (const { group, rows } of groups) {
    const letter = group.match(/Grupo ([A-L])/)?.[1];
    const third = rows[2];
    if (letter && third) thirds.push({ row: third, groupLetter: letter });
  }
  thirds.sort((a, b) => compareThirdPlaceRanking(a.row, b.row));
  return thirds.map((t, i) => ({ ...t, qualifies: i < 8 }));
}

// Groups standings rows by their "Grupo X" label, sorted A-L, with each
// group's rows sorted per Art. 13 (Pts → H2H → overall GD → overall GF).
// Pass the same `matches` array used by computeStandings for correct H2H data.
export function groupStandings(
  rows: StandingsRow[],
  matches: Match[] = APP_MATCHES,
): { group: string; rows: StandingsRow[]; qualification: Map<string, QualificationStatus> }[] {
  const byGroup = new Map<string, StandingsRow[]>();
  for (const row of rows) {
    const existing = byGroup.get(row.group);
    if (existing) existing.push(row);
    else byGroup.set(row.group, [row]);
  }

  return Array.from(byGroup.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, groupRows]) => {
      const sortedRows = sortGroupTable(groupRows, matches);
      return {
        group,
        rows: sortedRows,
        qualification: computeGroupQualification(sortedRows, matches),
      };
    });
}

// A group-position knockout slot resolved to the team currently holding it, with
// its qualification status. Used by BracketView and PartidasView so both project
// the same provisional R32 teams.
export interface ProvisionalSlot {
  team: {
    name: string;
    code: string;
    flagSvg: string;
    primaryColor: string;
    secondaryColor: string;
    group: string;
  };
  status: QualificationStatus;
}

// Map official R32 group-position slots ("1A","2B",…) to the team currently holding
// that spot, from live standings. Best-third combo slots ("3EHIJK") and winner/loser
// refs ("W74","RU101") are intentionally NOT resolved — their official allocation is
// only fixed once results come in, so those labels render verbatim rather than
// inventing a pairing (data accuracy is a hard requirement).
export function buildGroupPositionMap(
  matches: Match[] = APP_MATCHES,
): Map<string, ProvisionalSlot> {
  const rows = computeStandings(matches);
  const groups = groupStandings(rows, matches);
  const map = new Map<string, ProvisionalSlot>();

  for (const { group, rows: groupRows, qualification } of groups) {
    const letterMatch = group.match(/Grupo ([A-L])/);
    if (!letterMatch) continue;
    const letter = letterMatch[1];

    groupRows.slice(0, 2).forEach((row, idx) => {
      const status = qualification.get(row.code) ?? "contention";
      if (status === "eliminated") return;
      map.set(`${idx + 1}${letter}`, {
        team: {
          name: row.name,
          code: row.code,
          flagSvg: row.flagSvg,
          primaryColor: row.primaryColor,
          secondaryColor: row.secondaryColor,
          group: row.group,
        },
        status,
      });
    });
  }

  return map;
}

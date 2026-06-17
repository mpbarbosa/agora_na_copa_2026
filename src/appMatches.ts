import baseMatchesData from "./matches.json";
import { BBC_SCHEDULED_MATCHES } from "./data/bbcScheduledMatches";
import { FIFA_MATCH_VENUES } from "./data/fifaMatchVenues";
import { standings as seedStandings } from "./data/tournament";
import { resolvePlayerEntry } from "./data/playerRegistry";
import type { Match } from "./types";

interface SupplementalMatchSeed {
  teamA: string;
  teamB: string;
  kickoffTimestamp: string;
  status: Match["status"];
  stadiumName: string;
  city: string;
  score?: Match["score"];
}

const PT_MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const DEFAULT_SCHEDULED_STADIUM = "Estádio a confirmar";
const DEFAULT_SCHEDULED_CITY = "A CONFIRMAR";

const FIFA_SUPPLEMENTAL_MATCHES: SupplementalMatchSeed[] = [
  {
    teamA: "QAT",
    teamB: "SUI",
    kickoffTimestamp: "2026-06-13T16:00:00-03:00",
    status: "FINISHED",
    stadiumName: "Estádio da Baía de São Francisco",
    city: "ÁREA DA BAÍA DE SÃO FRANCISCO",
    score: { teamA: 1, teamB: 1 },
  },
  {
    teamA: "AUT",
    teamB: "JOR",
    kickoffTimestamp: "2026-06-17T01:00:00-03:00",
    status: "FINISHED",
    stadiumName: "Estádio da Baía de São Francisco",
    city: "ÁREA DA BAÍA DE SÃO FRANCISCO",
    score: { teamA: 3, teamB: 1 },
  },
];

const BASE_MATCHES = baseMatchesData as Match[];

const existingIds = new Set([
  ...BASE_MATCHES.map((match) => match.id),
  ...FIFA_SUPPLEMENTAL_MATCHES.map(
    ({ teamA, teamB }) => `${teamA.toLowerCase()}-${teamB.toLowerCase()}-2026`,
  ),
]);

const lineupByTeamCode = new Map<string, Match["teamA"]["lineup"]>();
for (const match of BASE_MATCHES) {
  for (const team of [match.teamA, match.teamB]) {
    if (!lineupByTeamCode.has(team.code) && team.lineup.length > 0) {
      lineupByTeamCode.set(team.code, team.lineup);
    }
  }
}

for (const [teamCode, lineup] of lineupByTeamCode) {
  lineupByTeamCode.set(
    teamCode,
    lineup.map((player) => {
      const entry = resolvePlayerEntry(teamCode, player.name, player.number, player.fifaId);
      if (!entry) return player;
      return {
        ...player,
        fifaId: entry.fifaId,
        fullName: player.fullName ?? entry.fullName,
        club: player.club ?? entry.club,
        pictureUrl: player.pictureUrl ?? entry.pictureUrl,
        socials: player.socials ?? entry.socials,
        dateOfBirth: player.dateOfBirth ?? entry.dateOfBirth,
        height: player.height ?? entry.height,
      };
    }),
  );
}

const teamByCode = new Map(
  seedStandings.map((row) => [
    row.code,
    {
      name: row.name,
      code: row.code,
      flagSvg: row.flagSvg,
      primaryColor: row.primaryColor,
      secondaryColor: row.secondaryColor,
      group: row.group,
    },
  ]),
);

const formatKickoffDate = (kickoffTimestamp: string) => {
  const [datePart] = kickoffTimestamp.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  return `${day} ${PT_MONTHS[month - 1]}, ${year}`;
};

const formatKickoffTime = (kickoffTimestamp: string) => kickoffTimestamp.slice(11, 16);

const buildTeamEntry = (teamCode: string): Match["teamA"] => {
  const team = teamByCode.get(teamCode);
  if (!team) {
    throw new Error(`Time ${teamCode} não encontrado no seed do torneio.`);
  }

  return {
    ...team,
    lineup: lineupByTeamCode.get(teamCode) ?? [],
  };
};

const buildSupplementalMatch = (
  seed: SupplementalMatchSeed,
): Match => {
  const { teamA: teamACode, teamB: teamBCode, kickoffTimestamp, status, score, stadiumName, city } =
    seed;
  const kickoffMs = new Date(kickoffTimestamp).getTime();

  return {
    id: `${teamACode.toLowerCase()}-${teamBCode.toLowerCase()}-2026`,
    teamA: buildTeamEntry(teamACode),
    teamB: buildTeamEntry(teamBCode),
    stadiumName,
    city,
    stageName: "Group Stage",
    kickoffTime: formatKickoffTime(kickoffTimestamp),
    kickoffDate: formatKickoffDate(kickoffTimestamp),
    kickoffTimestamp,
    status,
    score,
    countdownTargetSeconds: Math.max(0, Math.floor((kickoffMs - Date.now()) / 1000)),
    broadcasters: [],
  };
};

const buildScheduledMatch = (
  teamACode: string,
  teamBCode: string,
  kickoffTimestamp: string,
) =>
  buildSupplementalMatch({
    teamA: teamACode,
    teamB: teamBCode,
    kickoffTimestamp,
    status: "PRE_GAME",
    stadiumName: DEFAULT_SCHEDULED_STADIUM,
    city: DEFAULT_SCHEDULED_CITY,
  });

export const APP_MATCHES: Match[] = [
  ...BASE_MATCHES,
  ...FIFA_SUPPLEMENTAL_MATCHES.filter(
    ({ teamA, teamB }) => !existingIds.has(`${teamA.toLowerCase()}-${teamB.toLowerCase()}-2026`),
  ).map(buildSupplementalMatch),
  ...BBC_SCHEDULED_MATCHES.filter(
    ({ teamA, teamB }) => !existingIds.has(`${teamA.toLowerCase()}-${teamB.toLowerCase()}-2026`),
  ).map(({ teamA, teamB, kickoffTimestamp }) =>
    buildScheduledMatch(teamA, teamB, kickoffTimestamp),
  ),
].map((match) => {
  const officialVenue = FIFA_MATCH_VENUES[match.id];
  if (!officialVenue) {
    return match;
  }

  return {
    ...match,
    stadiumName: officialVenue.stadiumName.trim(),
    city: officialVenue.city.trim(),
  };
});

import baseMatchesData from "./matches.json";
import { FIFA_MATCH_VENUES } from "./data/fifaMatchVenues";
import { FIFA_SCHEDULED_MATCHES, type FifaScheduledMatchSeed } from "./data/fifaScheduledMatches";
import { standings as seedStandings } from "./data/tournament";
import { resolvePlayerEntry } from "./data/playerRegistry";
import { KNOCKOUT_MATCHES } from "./data/knockoutBracket";
import { humanizeSlot, KNOCKOUT_STAGE_NAMES } from "./utils/knockoutSlots";
import type { Match, KnockoutMatch, KnockoutTeamRef } from "./types";

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

const BASE_MATCHES = baseMatchesData as Match[];

const existingIds = new Set(BASE_MATCHES.map((match) => match.id));

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
        instagramPostUrl: player.instagramPostUrl ?? entry.instagramPostUrl,
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

const PT_WEEKDAYS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

const formatKickoffDate = (kickoffTimestamp: string) => {
  const [datePart] = kickoffTimestamp.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const weekday = PT_WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${day} ${PT_MONTHS[month - 1]} ${year} (${weekday})`;
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
  seed: FifaScheduledMatchSeed,
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


const NEUTRAL_TEAM_STYLE = { primaryColor: "#64748b", secondaryColor: "#94a3b8" };

// dateUtc ("…Z") → a Brasília (-03:00) timestamp string, so kickoffTime/kickoffDate
// render in local time consistently with the group-stage seeds (already -03:00).
const toBrasiliaTimestamp = (dateUtc: string): string => {
  const utc = new Date(dateUtc);
  const br = new Date(utc.getTime() - 3 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${br.getUTCFullYear()}-${p(br.getUTCMonth() + 1)}-${p(br.getUTCDate())}T${p(br.getUTCHours())}:${p(br.getUTCMinutes())}:00-03:00`;
};

// One knockout side: the real team when known (full flag/colors/lineup) — but with a
// blanked group so the fixture never associates with a group view — otherwise a
// neutral placeholder labelled with the official slot ("Vencedor #74", "2º A").
const buildKnockoutTeamEntry = (ref: KnockoutTeamRef | null, slot: string): Match["teamA"] => {
  if (ref) {
    const known = teamByCode.get(ref.code);
    if (known) return { ...known, group: "", lineup: lineupByTeamCode.get(ref.code) ?? [] };
    return { name: ref.name, code: ref.code, flagSvg: "", ...NEUTRAL_TEAM_STYLE, group: "", lineup: [] };
  }
  return { name: humanizeSlot(slot), code: slot, flagSvg: "", ...NEUTRAL_TEAM_STYLE, group: "", lineup: [] };
};

// Official knockout fixture → a PRE_GAME Match for the scheduled list: real date,
// venue and stage; TBD sides show the official slot label. Stable matchNumber-based
// id so a fixture updates in place once its teams resolve. stageName is intentionally
// NOT "Group Stage", so standings/group computations ignore these (see standings.ts).
const buildKnockoutMatch = (km: KnockoutMatch): Match => {
  const kickoffTimestamp = toBrasiliaTimestamp(km.dateUtc);
  const kickoffMs = new Date(km.dateUtc).getTime();
  return {
    id: `ko-${km.matchNumber}-2026`,
    teamA: buildKnockoutTeamEntry(km.teamA, km.slotA),
    teamB: buildKnockoutTeamEntry(km.teamB, km.slotB),
    stadiumName: km.stadium,
    city: km.city,
    stageName: KNOCKOUT_STAGE_NAMES[km.stage],
    kickoffTime: formatKickoffTime(kickoffTimestamp),
    kickoffDate: formatKickoffDate(kickoffTimestamp),
    kickoffTimestamp,
    status: "PRE_GAME",
    countdownTargetSeconds: Math.max(0, Math.floor((kickoffMs - Date.now()) / 1000)),
    broadcasters: [],
  };
};

export const APP_MATCHES: Match[] = [
  ...BASE_MATCHES,
  ...FIFA_SCHEDULED_MATCHES.filter(
    ({ teamA, teamB }) => !existingIds.has(`${teamA.toLowerCase()}-${teamB.toLowerCase()}-2026`),
  ).map(buildSupplementalMatch),
  ...KNOCKOUT_MATCHES.map(buildKnockoutMatch),
].map((match) => {
  // Normalize the display date for every match (including the static base
  // fixtures) so they all share the "29 Junho 2026 (segunda-feira)" format.
  const kickoffDate = formatKickoffDate(match.kickoffTimestamp);
  const officialVenue = FIFA_MATCH_VENUES[match.id];
  if (!officialVenue) {
    return { ...match, kickoffDate };
  }

  return {
    ...match,
    kickoffDate,
    stadiumName: officialVenue.stadiumName.trim(),
    city: officialVenue.city.trim(),
  };
});

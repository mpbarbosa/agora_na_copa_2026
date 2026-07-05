import baseMatchesData from "./matches.json";
import { FIFA_MATCH_VENUES } from "./data/fifaMatchVenues";
import { FIFA_SCHEDULED_MATCHES, type FifaScheduledMatchSeed } from "./data/fifaScheduledMatches";
import { standings as seedStandings } from "./data/tournament";
import { resolvePlayerEntry } from "./data/playerRegistry";
import { KNOCKOUT_MATCHES } from "./data/knockoutBracket";
import { KNOCKOUT_RESULTS, type KnockoutResultSeed } from "./data/knockoutResults";
import { humanizeSlot, KNOCKOUT_STAGE_NAMES } from "./utils/knockoutSlots";
import { decisiveSlot } from "./utils/matchResult";
import { getActiveLocale } from "./i18n/locale";
import { localizeTeamName } from "./i18n/teamNames";
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

const ES_MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const ES_WEEKDAYS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const EN_WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// pt-BR is the native format ("4 Julho 2026 (sábado)"); es keeps the same
// day-first shape with LATAM names ("4 Julio 2026 (sábado)"); en uses the US
// month-first order ("July 4, 2026 (Saturday)"). APP_MATCHES is built once at
// module load, so this reads the boot locale — correct for the per-locale
// subdomains, the primary delivery path.
const formatKickoffDate = (kickoffTimestamp: string) => {
  const [datePart] = kickoffTimestamp.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const weekdayIndex = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const locale = getActiveLocale();
  if (locale === "en") {
    return `${EN_MONTHS[month - 1]} ${day}, ${year} (${EN_WEEKDAYS[weekdayIndex]})`;
  }
  const es = locale === "es";
  const months = es ? ES_MONTHS : PT_MONTHS;
  const weekdays = es ? ES_WEEKDAYS : PT_WEEKDAYS;
  return `${day} ${months[month - 1]} ${year} (${weekdays[weekdayIndex]})`;
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

const KNOCKOUT_BY_NUMBER = new Map(KNOCKOUT_MATCHES.map((km) => [km.matchNumber, km]));

/**
 * Resolve a later-round slot to the concrete team once its feeder tie is decided in
 * KNOCKOUT_RESULTS: "W76" → the winner of #76, "RU101"/"L101" → its loser. Recurses so a
 * chain resolves (a QF's "W91" → #91's winner → that tie's own resolved slot). Returns null
 * while the feeder is undecided, drawn with no shootout tally, or the slot is a group/
 * best-third ref ("2A", "3ABCDF") — the fixture then keeps its "Vencedor #NN" placeholder.
 * Pure over its inputs so it is unit-tested; the winner side reuses `decisiveSlot`.
 */
export function resolveFeederSlot(
  slot: string,
  knockoutByNumber: Map<number, KnockoutMatch>,
  results: Record<number, KnockoutResultSeed>,
  seen: Set<number> = new Set(),
): KnockoutTeamRef | null {
  const parsed = /^(W|RU|L)(\d+)$/.exec(slot);
  if (!parsed) return null;
  const feederNumber = Number(parsed[2]);
  if (seen.has(feederNumber)) return null; // defensive: never loop on a malformed bracket
  seen.add(feederNumber);
  const feeder = knockoutByNumber.get(feederNumber);
  const result = results[feederNumber];
  if (!feeder || !result || result.status !== "FINISHED") return null;
  const winningSlot = decisiveSlot(result.score, result.penaltyScore);
  if (!winningSlot) return null; // level with no shootout tally — winner unknown, never guess
  const wantWinner = parsed[1] === "W";
  const targetSlot = wantWinner ? winningSlot : winningSlot === "A" ? "B" : "A";
  const directRef = targetSlot === "A" ? feeder.teamA : feeder.teamB;
  if (directRef) return directRef;
  // The target side is itself a feeder ref (a deeper round) — resolve it recursively.
  const nestedSlot = targetSlot === "A" ? feeder.slotA : feeder.slotB;
  return resolveFeederSlot(nestedSlot, knockoutByNumber, results, seen);
};

// Official knockout fixture → a Match for the scheduled list: real date, venue and stage.
// A side is the real team when the bracket already names it (R32 group qualifiers) or once
// its feeder tie is decided (resolveFeederSlot, e.g. "Vencedor #76" → Brasil the moment #76
// ends); otherwise it keeps the official slot label. Resolving here — not just in the bracket
// view — keeps the Ao Vivo / Partidas scoreboards consistent on a cold visit / fallback.
// Stable matchNumber-based id so a fixture updates in place once its teams resolve. stageName
// is intentionally NOT "Group Stage", so standings/group computations ignore these.
// A seeded result (KNOCKOUT_RESULTS) marks the fixture LIVE/FINISHED with its score; unseeded
// ties stay PRE_GAME.
const buildKnockoutMatch = (km: KnockoutMatch): Match => {
  const kickoffTimestamp = toBrasiliaTimestamp(km.dateUtc);
  const kickoffMs = new Date(km.dateUtc).getTime();
  const result = KNOCKOUT_RESULTS[km.matchNumber];
  const teamARef = km.teamA ?? resolveFeederSlot(km.slotA, KNOCKOUT_BY_NUMBER, KNOCKOUT_RESULTS);
  const teamBRef = km.teamB ?? resolveFeederSlot(km.slotB, KNOCKOUT_BY_NUMBER, KNOCKOUT_RESULTS);
  return {
    id: `ko-${km.matchNumber}-2026`,
    teamA: buildKnockoutTeamEntry(teamARef, km.slotA),
    teamB: buildKnockoutTeamEntry(teamBRef, km.slotB),
    stadiumName: km.stadium,
    city: km.city,
    stageName: KNOCKOUT_STAGE_NAMES[km.stage],
    kickoffTime: formatKickoffTime(kickoffTimestamp),
    kickoffDate: formatKickoffDate(kickoffTimestamp),
    kickoffTimestamp,
    status: result?.status ?? "PRE_GAME",
    score: result?.score,
    penaltyScore: result?.penaltyScore,
    matchTime: result?.matchTime,
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
  // Localize the display team names for the active UI locale (pt → unchanged;
  // es → "MARROCOS" becomes "MARRUECOS"). Codes stay the identity key.
  const teamA = { ...match.teamA, name: localizeTeamName(match.teamA.name, match.teamA.code) };
  const teamB = { ...match.teamB, name: localizeTeamName(match.teamB.name, match.teamB.code) };
  const officialVenue = FIFA_MATCH_VENUES[match.id];
  if (!officialVenue) {
    return { ...match, kickoffDate, teamA, teamB };
  }

  return {
    ...match,
    kickoffDate,
    teamA,
    teamB,
    stadiumName: officialVenue.stadiumName.trim(),
    city: officialVenue.city.trim(),
  };
});

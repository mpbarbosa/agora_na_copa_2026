// Shared, locale-aware kickoff time/date formatters.
//
// Two shapes of input are supported and MUST stay consistent with each other:
//  - Seed kickoff strings (`src/matches.json` / the FIFA schedule seeds) carry a
//    Brasília offset (e.g. "2026-06-15T16:00:00-03:00"), so the wall-clock parts
//    can be read straight off the string.
//  - FIFA's authoritative kickoff (`Date`) is a UTC instant (e.g.
//    "2026-07-06T01:00:00Z"); it must be converted into Brasília wall-clock time
//    before formatting. This is what surfaces a rescheduled kickoff
//    (`MatchStateEntry.kickoffOverride`) in the Ao Vivo scoreboard.
//
// Both paths render the same "16:00" + "15 Junho 2026 (segunda-feira)" strings
// so the display is identical regardless of where the kickoff came from.
import { getActiveLocale } from "../i18n/locale";

// Broadcast reference timezone — every kickoff is shown in Brasília time,
// matching the Brazilian-broadcast framing of the seed data.
const BROADCAST_TIME_ZONE = "America/Sao_Paulo";

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
// month-first order ("July 4, 2026 (Saturday)"). Reads the active locale, which
// is pt by default (so pt is unchanged).
export const formatKickoffDateFromParts = (
  year: number,
  month: number,
  day: number,
  weekdayIndex: number,
): string => {
  const locale = getActiveLocale();
  if (locale === "en") {
    return `${EN_MONTHS[month - 1]} ${day}, ${year} (${EN_WEEKDAYS[weekdayIndex]})`;
  }
  const es = locale === "es";
  const months = es ? ES_MONTHS : PT_MONTHS;
  const weekdays = es ? ES_WEEKDAYS : PT_WEEKDAYS;
  return `${day} ${months[month - 1]} ${year} (${weekdays[weekdayIndex]})`;
};

// Formats a seed kickoff string whose offset is already Brasília — the
// wall-clock date is read straight off the ISO string.
export const formatKickoffDate = (kickoffTimestamp: string): string => {
  const [datePart] = kickoffTimestamp.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const weekdayIndex = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return formatKickoffDateFromParts(year, month, day, weekdayIndex);
};

// Formats a seed kickoff string's time-of-day — the offset is Brasília, so the
// "HH:MM" can be sliced directly.
export const formatKickoffTime = (kickoffTimestamp: string): string =>
  kickoffTimestamp.slice(11, 16);

// Formats an arbitrary kickoff INSTANT (typically FIFA's UTC `Date`) into the
// same Brasília-local "HH:MM" + "day month year (weekday)" pair as the seed
// formatters. Returns null when the instant can't be parsed so callers keep the
// seed display. Used to surface FIFA's authoritative (e.g. rescheduled) kickoff.
export const formatKickoffFromInstant = (
  iso: string,
): { kickoffTime: string; kickoffDate: string } | null => {
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BROADCAST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";

  const year = Number(part("year"));
  const month = Number(part("month"));
  const day = Number(part("day"));
  // Intl can render midnight as "24" (hour12:false) on some engines; normalize.
  const hour = part("hour") === "24" ? "00" : part("hour");
  const minute = part("minute");

  const weekdayIndex = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return {
    kickoffTime: `${hour}:${minute}`,
    kickoffDate: formatKickoffDateFromParts(year, month, day, weekdayIndex),
  };
};

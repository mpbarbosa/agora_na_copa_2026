// Display-only pt→es localization of the 48 World Cup team names, keyed by the
// stable FIFA 3-letter code (never the pt name, which some views title-case or
// uppercase). The canonical team `name` stays pt everywhere in data and on the
// server (equality/identity is by `code`, never by name); DISPLAY sites on the
// Spanish client wrap the name with `localizeTeamName` so e.g. "MARROCOS" reads
// "MARRUECOS". Uppercase to match the pt seed style (`src/data/tournament.ts`).
//
// getActiveLocale() is pt on the server (no `window`), so wrapping a name is a
// no-op there — the single process keeps serving pt payloads unchanged.
import { getActiveLocale, type Locale } from "./locale";

// Only the codes whose Spanish spelling differs (or is worth confirming) need an
// entry; an unmapped code falls through to the pt name (graceful, never wrong).
const ES_TEAM_NAMES: Record<string, string> = {
  ALG: "ARGELIA",
  AUS: "AUSTRALIA",
  AUT: "AUSTRIA",
  BIH: "BOSNIA Y HERZEGOVINA",
  CIV: "COSTA DE MARFIL",
  COD: "RD DEL CONGO",
  COL: "COLOMBIA",
  CRO: "CROACIA",
  CUW: "CURAZAO",
  CZE: "CHEQUIA",
  ECU: "ECUADOR",
  EGY: "EGIPTO",
  FRA: "FRANCIA",
  GER: "ALEMANIA",
  GHA: "GHANA",
  HAI: "HAITÍ",
  IRN: "IRÁN",
  IRQ: "IRAK",
  JPN: "JAPÓN",
  KOR: "COREA DEL SUR",
  MAR: "MARRUECOS",
  NED: "PAÍSES BAJOS",
  NZL: "NUEVA ZELANDA",
  PAR: "PARAGUAY",
  RSA: "SUDÁFRICA",
  SCO: "ESCOCIA",
  SUI: "SUIZA",
  SWE: "SUECIA",
  TUN: "TÚNEZ",
  TUR: "TURQUÍA",
  URU: "URUGUAY",
  UZB: "UZBEKISTÁN",
};

/**
 * Localize a team's display name for the active UI locale. pt returns the name
 * unchanged; es maps by code, falling back to the pt name for any unmapped code
 * (placeholder knockout slots like "W74" have no country name and pass through).
 */
export const localizeTeamName = (
  name: string,
  code?: string | null,
  locale: Locale = getActiveLocale(),
): string => {
  if (locale !== "es" || !code) return name;
  return ES_TEAM_NAMES[code] ?? name;
};

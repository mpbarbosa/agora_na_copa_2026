// FIFA official group-stage match schedule.
// Kickoff timestamps sourced from the FIFA calendar API (same data previously
// aggregated by BBC, now read directly from the FIFA source).
// Venue data from fifaMatchVenues.ts (FIFA official assignments).
// Status defaults to PRE_GAME; the FIFA live-sync layer overwrites at runtime.

import { FIFA_MATCH_VENUES } from "./fifaMatchVenues";
import type { Match } from "../types";

export interface FifaScheduledMatchSeed {
  teamA: string;
  teamB: string;
  kickoffTimestamp: string;
  status: Match["status"];
  stadiumName: string;
  city: string;
  score?: Match["score"];
}

const v = (teamA: string, teamB: string): { stadiumName: string; city: string } =>
  FIFA_MATCH_VENUES[`${teamA.toLowerCase()}-${teamB.toLowerCase()}-2026`] ??
  { stadiumName: "A confirmar", city: "A confirmar" };

export const FIFA_SCHEDULED_MATCHES: FifaScheduledMatchSeed[] = [
  // ── Grupo A ───────────────────────────────────────────────────────────────
  { teamA: "CZE", teamB: "RSA", kickoffTimestamp: "2026-06-18T13:00:00-03:00", status: "FINISHED", score: { teamA: 1, teamB: 1 }, ...v("CZE", "RSA") },
  { teamA: "MEX", teamB: "KOR", kickoffTimestamp: "2026-06-18T22:00:00-03:00", status: "FINISHED", score: { teamA: 1, teamB: 0 }, ...v("MEX", "KOR") },
  { teamA: "CZE", teamB: "MEX", kickoffTimestamp: "2026-06-24T22:00:00-03:00", status: "FINISHED", score: { teamA: 0, teamB: 3 }, ...v("CZE", "MEX") },
  { teamA: "RSA", teamB: "KOR", kickoffTimestamp: "2026-06-24T22:00:00-03:00", status: "FINISHED", score: { teamA: 1, teamB: 0 }, ...v("RSA", "KOR") },

  // ── Grupo B ───────────────────────────────────────────────────────────────
  { teamA: "QAT", teamB: "SUI", kickoffTimestamp: "2026-06-13T16:00:00-03:00", status: "FINISHED", score: { teamA: 1, teamB: 1 }, ...v("QAT", "SUI") },
  { teamA: "SUI", teamB: "BIH", kickoffTimestamp: "2026-06-18T16:00:00-03:00", status: "FINISHED", score: { teamA: 4, teamB: 1 }, ...v("SUI", "BIH") },
  { teamA: "CAN", teamB: "QAT", kickoffTimestamp: "2026-06-18T19:00:00-03:00", status: "FINISHED", score: { teamA: 6, teamB: 0 }, ...v("CAN", "QAT") },
  { teamA: "BIH", teamB: "QAT", kickoffTimestamp: "2026-06-24T16:00:00-03:00", status: "FINISHED", score: { teamA: 3, teamB: 1 }, ...v("BIH", "QAT") },
  { teamA: "SUI", teamB: "CAN", kickoffTimestamp: "2026-06-24T16:00:00-03:00", status: "FINISHED", score: { teamA: 2, teamB: 1 }, ...v("SUI", "CAN") },

  // ── Grupo C ───────────────────────────────────────────────────────────────
  { teamA: "SCO", teamB: "MAR", kickoffTimestamp: "2026-06-19T19:00:00-03:00", status: "FINISHED", score: { teamA: 0, teamB: 1 }, ...v("SCO", "MAR") },
  { teamA: "BRA", teamB: "HAI", kickoffTimestamp: "2026-06-19T21:30:00-03:00", status: "FINISHED", score: { teamA: 3, teamB: 0 }, ...v("BRA", "HAI") },
  { teamA: "MAR", teamB: "HAI", kickoffTimestamp: "2026-06-24T19:00:00-03:00", status: "FINISHED", score: { teamA: 4, teamB: 2 }, ...v("MAR", "HAI") },
  { teamA: "SCO", teamB: "BRA", kickoffTimestamp: "2026-06-24T19:00:00-03:00", status: "FINISHED", score: { teamA: 0, teamB: 3 }, ...v("SCO", "BRA") },

  // ── Grupo D ───────────────────────────────────────────────────────────────
  { teamA: "USA", teamB: "AUS", kickoffTimestamp: "2026-06-19T16:00:00-03:00", status: "FINISHED", score: { teamA: 2, teamB: 0 }, ...v("USA", "AUS") },
  { teamA: "TUR", teamB: "PAR", kickoffTimestamp: "2026-06-20T00:00:00-03:00", status: "FINISHED", score: { teamA: 0, teamB: 1 }, ...v("TUR", "PAR") },
  { teamA: "PAR", teamB: "AUS", kickoffTimestamp: "2026-06-25T23:00:00-03:00", status: "FINISHED", score: { teamA: 0, teamB: 0 }, ...v("PAR", "AUS") },
  { teamA: "TUR", teamB: "USA", kickoffTimestamp: "2026-06-25T23:00:00-03:00", status: "FINISHED", score: { teamA: 3, teamB: 2 }, ...v("TUR", "USA") },

  // ── Grupo E ───────────────────────────────────────────────────────────────
  { teamA: "GER", teamB: "CIV", kickoffTimestamp: "2026-06-20T17:00:00-03:00", status: "FINISHED", score: { teamA: 2, teamB: 1 }, ...v("GER", "CIV") },
  { teamA: "ECU", teamB: "CUW", kickoffTimestamp: "2026-06-20T21:00:00-03:00", status: "FINISHED", score: { teamA: 0, teamB: 0 }, ...v("ECU", "CUW") },
  { teamA: "CUW", teamB: "CIV", kickoffTimestamp: "2026-06-25T17:00:00-03:00", status: "FINISHED", score: { teamA: 0, teamB: 2 }, ...v("CUW", "CIV") },
  { teamA: "ECU", teamB: "GER", kickoffTimestamp: "2026-06-25T17:00:00-03:00", status: "FINISHED", score: { teamA: 2, teamB: 1 }, ...v("ECU", "GER") },

  // ── Grupo F ───────────────────────────────────────────────────────────────
  { teamA: "NED", teamB: "SWE", kickoffTimestamp: "2026-06-20T14:00:00-03:00", status: "FINISHED", score: { teamA: 5, teamB: 1 }, ...v("NED", "SWE") },
  { teamA: "TUN", teamB: "JPN", kickoffTimestamp: "2026-06-21T01:00:00-03:00", status: "FINISHED", score: { teamA: 0, teamB: 4 }, ...v("TUN", "JPN") },
  { teamA: "JPN", teamB: "SWE", kickoffTimestamp: "2026-06-25T20:00:00-03:00", status: "FINISHED", score: { teamA: 1, teamB: 1 }, ...v("JPN", "SWE") },
  { teamA: "TUN", teamB: "NED", kickoffTimestamp: "2026-06-25T20:00:00-03:00", status: "FINISHED", score: { teamA: 1, teamB: 3 }, ...v("TUN", "NED") },

  // ── Grupo G ───────────────────────────────────────────────────────────────
  { teamA: "BEL", teamB: "IRN", kickoffTimestamp: "2026-06-21T16:00:00-03:00", status: "FINISHED", score: { teamA: 0, teamB: 0 }, ...v("BEL", "IRN") },
  { teamA: "NZL", teamB: "EGY", kickoffTimestamp: "2026-06-21T22:00:00-03:00", status: "FINISHED", score: { teamA: 1, teamB: 3 }, ...v("NZL", "EGY") },
  { teamA: "EGY", teamB: "IRN", kickoffTimestamp: "2026-06-27T00:00:00-03:00", status: "FINISHED", score: { teamA: 1, teamB: 1 }, ...v("EGY", "IRN") },
  { teamA: "NZL", teamB: "BEL", kickoffTimestamp: "2026-06-27T00:00:00-03:00", status: "FINISHED", score: { teamA: 1, teamB: 5 }, ...v("NZL", "BEL") },

  // ── Grupo H ───────────────────────────────────────────────────────────────
  { teamA: "ESP", teamB: "KSA", kickoffTimestamp: "2026-06-21T13:00:00-03:00", status: "FINISHED", score: { teamA: 4, teamB: 0 }, ...v("ESP", "KSA") },
  { teamA: "URU", teamB: "CPV", kickoffTimestamp: "2026-06-21T19:00:00-03:00", status: "FINISHED", score: { teamA: 2, teamB: 2 }, ...v("URU", "CPV") },
  { teamA: "CPV", teamB: "KSA", kickoffTimestamp: "2026-06-26T21:00:00-03:00", status: "PRE_GAME", ...v("CPV", "KSA") },
  { teamA: "URU", teamB: "ESP", kickoffTimestamp: "2026-06-26T21:00:00-03:00", status: "PRE_GAME", ...v("URU", "ESP") },

  // ── Grupo I ───────────────────────────────────────────────────────────────
  { teamA: "IRQ", teamB: "NOR", kickoffTimestamp: "2026-06-16T19:00:00-03:00", status: "FINISHED", score: { teamA: 1, teamB: 4 }, ...v("IRQ", "NOR") },
  { teamA: "FRA", teamB: "IRQ", kickoffTimestamp: "2026-06-22T18:00:00-03:00", status: "FINISHED", score: { teamA: 3, teamB: 0 }, ...v("FRA", "IRQ") },
  { teamA: "NOR", teamB: "SEN", kickoffTimestamp: "2026-06-22T21:00:00-03:00", status: "FINISHED", score: { teamA: 3, teamB: 2 }, ...v("NOR", "SEN") },
  { teamA: "NOR", teamB: "FRA", kickoffTimestamp: "2026-06-26T16:00:00-03:00", status: "FINISHED", score: { teamA: 1, teamB: 4 }, ...v("NOR", "FRA") },
  { teamA: "SEN", teamB: "IRQ", kickoffTimestamp: "2026-06-26T16:00:00-03:00", status: "FINISHED", score: { teamA: 5, teamB: 0 }, ...v("SEN", "IRQ") },

  // ── Grupo J ───────────────────────────────────────────────────────────────
  { teamA: "AUT", teamB: "JOR", kickoffTimestamp: "2026-06-17T01:00:00-03:00", status: "FINISHED", score: { teamA: 3, teamB: 1 }, ...v("AUT", "JOR") },
  { teamA: "ARG", teamB: "AUT", kickoffTimestamp: "2026-06-22T14:00:00-03:00", status: "FINISHED", score: { teamA: 2, teamB: 0 }, ...v("ARG", "AUT") },
  { teamA: "JOR", teamB: "ALG", kickoffTimestamp: "2026-06-23T00:00:00-03:00", status: "FINISHED", score: { teamA: 1, teamB: 2 }, ...v("JOR", "ALG") },
  { teamA: "ALG", teamB: "AUT", kickoffTimestamp: "2026-06-27T23:00:00-03:00", status: "PRE_GAME", ...v("ALG", "AUT") },
  { teamA: "JOR", teamB: "ARG", kickoffTimestamp: "2026-06-27T23:00:00-03:00", status: "PRE_GAME", ...v("JOR", "ARG") },

  // ── Grupo K ───────────────────────────────────────────────────────────────
  { teamA: "POR", teamB: "COD", kickoffTimestamp: "2026-06-17T14:00:00-03:00", status: "FINISHED", score: { teamA: 1, teamB: 1 }, ...v("POR", "COD") },
  { teamA: "UZB", teamB: "COL", kickoffTimestamp: "2026-06-17T23:00:00-03:00", status: "FINISHED", score: { teamA: 1, teamB: 3 }, ...v("UZB", "COL") },
  { teamA: "POR", teamB: "UZB", kickoffTimestamp: "2026-06-23T14:00:00-03:00", status: "FINISHED", score: { teamA: 5, teamB: 0 }, ...v("POR", "UZB") },
  { teamA: "COL", teamB: "COD", kickoffTimestamp: "2026-06-23T23:00:00-03:00", status: "FINISHED", score: { teamA: 1, teamB: 0 }, ...v("COL", "COD") },
  { teamA: "COL", teamB: "POR", kickoffTimestamp: "2026-06-27T20:30:00-03:00", status: "PRE_GAME", ...v("COL", "POR") },
  { teamA: "COD", teamB: "UZB", kickoffTimestamp: "2026-06-27T20:30:00-03:00", status: "PRE_GAME", ...v("COD", "UZB") },

  // ── Grupo L ───────────────────────────────────────────────────────────────
  { teamA: "ENG", teamB: "CRO", kickoffTimestamp: "2026-06-17T17:00:00-03:00", status: "FINISHED", score: { teamA: 4, teamB: 2 }, ...v("ENG", "CRO") },
  { teamA: "GHA", teamB: "PAN", kickoffTimestamp: "2026-06-17T20:00:00-03:00", status: "FINISHED", score: { teamA: 1, teamB: 0 }, ...v("GHA", "PAN") },
  { teamA: "ENG", teamB: "GHA", kickoffTimestamp: "2026-06-23T17:00:00-03:00", status: "FINISHED", score: { teamA: 0, teamB: 0 }, ...v("ENG", "GHA") },
  { teamA: "PAN", teamB: "CRO", kickoffTimestamp: "2026-06-23T20:00:00-03:00", status: "FINISHED", score: { teamA: 0, teamB: 1 }, ...v("PAN", "CRO") },
  { teamA: "CRO", teamB: "GHA", kickoffTimestamp: "2026-06-27T18:00:00-03:00", status: "PRE_GAME", ...v("CRO", "GHA") },
  { teamA: "PAN", teamB: "ENG", kickoffTimestamp: "2026-06-27T18:00:00-03:00", status: "PRE_GAME", ...v("PAN", "ENG") },
];

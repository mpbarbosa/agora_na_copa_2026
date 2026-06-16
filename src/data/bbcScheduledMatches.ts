export interface BbcScheduledMatchSeed {
  teamA: string;
  teamB: string;
  kickoffTimestamp: string;
}

export const BBC_SCHEDULED_MATCHES: BbcScheduledMatchSeed[] = [
  // Grupo A
  { teamA: "CZE", teamB: "RSA", kickoffTimestamp: "2026-06-18T13:00:00-03:00" },
  { teamA: "MEX", teamB: "KOR", kickoffTimestamp: "2026-06-18T22:00:00-03:00" },
  { teamA: "CZE", teamB: "MEX", kickoffTimestamp: "2026-06-24T22:00:00-03:00" },
  { teamA: "RSA", teamB: "KOR", kickoffTimestamp: "2026-06-24T22:00:00-03:00" },
  // Grupo B
  { teamA: "SUI", teamB: "BIH", kickoffTimestamp: "2026-06-18T16:00:00-03:00" },
  { teamA: "CAN", teamB: "QAT", kickoffTimestamp: "2026-06-18T19:00:00-03:00" },
  { teamA: "BIH", teamB: "QAT", kickoffTimestamp: "2026-06-24T16:00:00-03:00" },
  { teamA: "SUI", teamB: "CAN", kickoffTimestamp: "2026-06-24T16:00:00-03:00" },
  // Grupo C
  { teamA: "SCO", teamB: "MAR", kickoffTimestamp: "2026-06-19T19:00:00-03:00" },
  { teamA: "BRA", teamB: "HAI", kickoffTimestamp: "2026-06-19T21:30:00-03:00" },
  { teamA: "MAR", teamB: "HAI", kickoffTimestamp: "2026-06-24T19:00:00-03:00" },
  { teamA: "SCO", teamB: "BRA", kickoffTimestamp: "2026-06-24T19:00:00-03:00" },
  // Grupo D
  { teamA: "USA", teamB: "AUS", kickoffTimestamp: "2026-06-19T16:00:00-03:00" },
  { teamA: "TUR", teamB: "PAR", kickoffTimestamp: "2026-06-20T00:00:00-03:00" },
  { teamA: "PAR", teamB: "AUS", kickoffTimestamp: "2026-06-25T23:00:00-03:00" },
  { teamA: "TUR", teamB: "USA", kickoffTimestamp: "2026-06-25T23:00:00-03:00" },
  // Grupo E
  { teamA: "GER", teamB: "CIV", kickoffTimestamp: "2026-06-20T17:00:00-03:00" },
  { teamA: "ECU", teamB: "CUW", kickoffTimestamp: "2026-06-20T21:00:00-03:00" },
  { teamA: "CUW", teamB: "CIV", kickoffTimestamp: "2026-06-25T17:00:00-03:00" },
  { teamA: "ECU", teamB: "GER", kickoffTimestamp: "2026-06-25T17:00:00-03:00" },
  // Grupo F
  { teamA: "NED", teamB: "SWE", kickoffTimestamp: "2026-06-20T14:00:00-03:00" },
  { teamA: "TUN", teamB: "JPN", kickoffTimestamp: "2026-06-21T01:00:00-03:00" },
  { teamA: "JPN", teamB: "SWE", kickoffTimestamp: "2026-06-25T20:00:00-03:00" },
  { teamA: "TUN", teamB: "NED", kickoffTimestamp: "2026-06-25T20:00:00-03:00" },
  // Grupo G
  { teamA: "BEL", teamB: "IRN", kickoffTimestamp: "2026-06-21T16:00:00-03:00" },
  { teamA: "NZL", teamB: "EGY", kickoffTimestamp: "2026-06-21T22:00:00-03:00" },
  { teamA: "EGY", teamB: "IRN", kickoffTimestamp: "2026-06-27T00:00:00-03:00" },
  { teamA: "NZL", teamB: "BEL", kickoffTimestamp: "2026-06-27T00:00:00-03:00" },
  // Grupo H
  { teamA: "ESP", teamB: "KSA", kickoffTimestamp: "2026-06-21T13:00:00-03:00" },
  { teamA: "URU", teamB: "CPV", kickoffTimestamp: "2026-06-21T19:00:00-03:00" },
  { teamA: "CPV", teamB: "KSA", kickoffTimestamp: "2026-06-26T21:00:00-03:00" },
  { teamA: "URU", teamB: "ESP", kickoffTimestamp: "2026-06-26T21:00:00-03:00" },
  // Grupo I
  { teamA: "IRQ", teamB: "NOR", kickoffTimestamp: "2026-06-16T19:00:00-03:00" },
  { teamA: "FRA", teamB: "IRQ", kickoffTimestamp: "2026-06-22T18:00:00-03:00" },
  { teamA: "NOR", teamB: "SEN", kickoffTimestamp: "2026-06-22T21:00:00-03:00" },
  { teamA: "NOR", teamB: "FRA", kickoffTimestamp: "2026-06-26T16:00:00-03:00" },
  { teamA: "SEN", teamB: "IRQ", kickoffTimestamp: "2026-06-26T16:00:00-03:00" },
  // Grupo J
  { teamA: "AUT", teamB: "JOR", kickoffTimestamp: "2026-06-17T01:00:00-03:00" },
  { teamA: "ARG", teamB: "AUT", kickoffTimestamp: "2026-06-22T14:00:00-03:00" },
  { teamA: "JOR", teamB: "ALG", kickoffTimestamp: "2026-06-23T00:00:00-03:00" },
  { teamA: "ALG", teamB: "AUT", kickoffTimestamp: "2026-06-27T23:00:00-03:00" },
  { teamA: "JOR", teamB: "ARG", kickoffTimestamp: "2026-06-27T23:00:00-03:00" },
  // Grupo K
  { teamA: "POR", teamB: "COD", kickoffTimestamp: "2026-06-17T14:00:00-03:00" },
  { teamA: "UZB", teamB: "COL", kickoffTimestamp: "2026-06-17T23:00:00-03:00" },
  { teamA: "POR", teamB: "UZB", kickoffTimestamp: "2026-06-23T14:00:00-03:00" },
  { teamA: "COL", teamB: "COD", kickoffTimestamp: "2026-06-23T23:00:00-03:00" },
  { teamA: "COL", teamB: "POR", kickoffTimestamp: "2026-06-27T20:30:00-03:00" },
  { teamA: "COD", teamB: "UZB", kickoffTimestamp: "2026-06-27T20:30:00-03:00" },
  // Grupo L
  { teamA: "ENG", teamB: "CRO", kickoffTimestamp: "2026-06-17T17:00:00-03:00" },
  { teamA: "GHA", teamB: "PAN", kickoffTimestamp: "2026-06-17T20:00:00-03:00" },
  { teamA: "ENG", teamB: "GHA", kickoffTimestamp: "2026-06-23T17:00:00-03:00" },
  { teamA: "PAN", teamB: "CRO", kickoffTimestamp: "2026-06-23T20:00:00-03:00" },
  { teamA: "CRO", teamB: "GHA", kickoffTimestamp: "2026-06-27T18:00:00-03:00" },
  { teamA: "PAN", teamB: "ENG", kickoffTimestamp: "2026-06-27T18:00:00-03:00" },
];

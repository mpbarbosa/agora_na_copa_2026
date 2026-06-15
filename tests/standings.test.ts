import assert from "node:assert/strict";
import test from "node:test";

import matchesData from "../src/matches.json";
import { computeStandings, groupStandings } from "../src/standings";
import type { Match } from "../src/types";

test("computeStandings matches the official FIFA group composition", () => {
  const rows = computeStandings(matchesData as Match[]);
  const groups = new Map(groupStandings(rows).map(({ group, rows: groupRows }) => [group, groupRows]));

  assert.deepEqual(
    Array.from(groups.entries()).map(([group, groupRows]) => ({
      group,
      teamCodes: groupRows.map((row) => row.code).sort(),
    })),
    [
      { group: "Grupo A", teamCodes: ["CZE", "KOR", "MEX", "RSA"] },
      { group: "Grupo B", teamCodes: ["BIH", "CAN", "QAT", "SUI"] },
      { group: "Grupo C", teamCodes: ["BRA", "HAI", "MAR", "SCO"] },
      { group: "Grupo D", teamCodes: ["AUS", "PAR", "TUR", "USA"] },
      { group: "Grupo E", teamCodes: ["CIV", "CUW", "ECU", "GER"] },
      { group: "Grupo F", teamCodes: ["JPN", "NED", "SWE", "TUN"] },
      { group: "Grupo G", teamCodes: ["BEL", "EGY", "IRN", "NZL"] },
      { group: "Grupo H", teamCodes: ["CPV", "ESP", "KSA", "URU"] },
      { group: "Grupo I", teamCodes: ["FRA", "IRQ", "NOR", "SEN"] },
      { group: "Grupo J", teamCodes: ["ALG", "ARG", "AUT", "JOR"] },
      { group: "Grupo K", teamCodes: ["COD", "COL", "POR", "UZB"] },
      { group: "Grupo L", teamCodes: ["CRO", "ENG", "GHA", "PAN"] },
    ],
  );
});

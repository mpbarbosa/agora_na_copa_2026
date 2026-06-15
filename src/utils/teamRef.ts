import { getCanonicalSeedStandings } from "../standings";
import type { TeamRef } from "../types";

const TEAM_REFS_BY_CODE = new Map(
  getCanonicalSeedStandings().map((team) => [
    team.code,
    {
      name: team.name,
      code: team.code,
      flagSvg: team.flagSvg,
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
      group: team.group,
    } satisfies TeamRef,
  ]),
);

export function resolveTeamRefByCode(
  teamCode: string,
  fallback: Pick<TeamRef, "name" | "code" | "flagSvg">,
): TeamRef {
  return (
    TEAM_REFS_BY_CODE.get(teamCode.toUpperCase()) ?? {
      name: fallback.name,
      code: fallback.code,
      flagSvg: fallback.flagSvg,
      primaryColor: "#009c3b",
      secondaryColor: "#ffdf00",
    }
  );
}

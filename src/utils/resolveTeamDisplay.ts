import type { Match, TeamRef } from "../types";
import type { ProvisionalSlot, QualificationStatus } from "../standings";

// A knockout fixture's home/away slot, resolved for display. `prov` is non-null
// only when the slot is a group-position placeholder ("2A") that live standings
// currently project onto a concrete team — in which case `name`/`code`/`flagSvg`
// are that team's, and `prov` carries its qualification status (for a "prov."/✓
// badge). For group-stage fixtures, combo slots ("3ABCDF") and winner/loser refs
// ("W74"), the raw label is returned verbatim with `prov === null`.
export interface ResolvedTeamDisplay {
  name: string;
  code: string;
  flagSvg: string;
  ref: TeamRef;
  prov: QualificationStatus | null;
}

const buildTeamRef = (team: Match["teamA"] | Match["teamB"]): TeamRef => ({
  name: team.name,
  code: team.code,
  flagSvg: team.flagSvg,
  primaryColor: team.primaryColor,
  secondaryColor: team.secondaryColor,
  group: team.group,
});

// Project a knockout placeholder slot onto the team that currently holds it,
// using a group-position map from `buildGroupPositionMap`. Shared by every view
// that shows knockout fixtures (Chaveamento bracket, Partidas, Ao Vivo
// scoreboard + match selector) so they all resolve placeholders identically
// instead of some showing "2º A" / an empty flag while others show the team.
export function resolveTeamDisplay(
  match: Match,
  team: Match["teamA"] | Match["teamB"],
  groupPositionMap: Map<string, ProvisionalSlot>,
): ResolvedTeamDisplay {
  if (match.stageName !== "Group Stage") {
    const slot = groupPositionMap.get(team.code);
    if (slot) {
      const t = slot.team;
      const ref: TeamRef = {
        name: t.name,
        code: t.code,
        flagSvg: t.flagSvg,
        primaryColor: t.primaryColor,
        secondaryColor: t.secondaryColor,
        group: t.group,
      };
      return { name: t.name, code: t.code, flagSvg: t.flagSvg, ref, prov: slot.status };
    }
  }
  return { name: team.name, code: team.code, flagSvg: team.flagSvg, ref: buildTeamRef(team), prov: null };
}

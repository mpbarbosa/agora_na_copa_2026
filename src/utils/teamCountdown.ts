// Pure helpers for the followed-team countdown badge (TeamCountdownBadge) and the goal
// fireworks (GoalFireworks). Extracted from the former Brazil-only badge so the team-
// resolution, "still alive / has a next fixture" list, colour derivation and countdown
// formatting can be unit-tested without React. No side effects, no network — callers pass
// in `matches` (APP_MATCHES) and, where a knockout slot must resolve, a group-position map
// built via `buildGroupPositionMap` (src/standings.ts).
import type { Match } from "../types";
import type { ProvisionalSlot } from "../standings";

type FixtureSide = Match["teamA"];

export interface ResolvedSide {
  code: string;
  name: string;
  flagSvg: string;
  // True when this side only provisionally holds its slot — resolved from a group position
  // whose occupant isn't mathematically locked yet ("contention"). False for a confirmed
  // team OR a group leader already locked into the slot ("qualified").
  provisional: boolean;
}

export interface TeamMeta {
  code: string;
  name: string;
  flagSvg: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface TeamFocus {
  match: Match;
  // The followed team's resolved side (carries its live/upcoming identity).
  team: ResolvedSide;
  opponent: ResolvedSide;
  // True when the followed team or the opponent only provisionally holds its group slot —
  // the knockout confronto isn't locked yet. Surfaced so the badge never asserts an
  // unconfirmed pairing as certain (a hard data-accuracy rule).
  provisional: boolean;
}

// Resolve a fixture side to the team effectively occupying it. A confirmed side keeps its
// own identity; an unresolved R32 group slot ("1C","2F") resolves to the team currently
// holding that group position, mirroring how BracketView renders the bracket. A slot whose
// occupant is only in "contention" is flagged provisional; a "qualified" occupant is
// already locked in, so the pairing it implies is certain. Returns null for slots with no
// determined occupant yet (winner/best-third refs).
export function resolveSide(
  side: FixtureSide,
  groupPositions: Map<string, ProvisionalSlot>,
): ResolvedSide | null {
  const slot = groupPositions.get(side.code);
  if (slot) {
    const { code, name, flagSvg } = slot.team;
    return { code, name, flagSvg, provisional: slot.status !== "qualified" };
  }
  // A confirmed team carries a real flag; an undecided winner/best-third slot does not.
  if (side.flagSvg) {
    return { code: side.code, name: side.name, flagSvg: side.flagSvg, provisional: false };
  }
  return null;
}

// The followed team's most imminent live-or-upcoming fixture, resolving knockout slots from
// live standings so a bracket pairing (e.g. "1C" once the team tops its group) still
// surfaces. Returns null when the team has no live/upcoming resolvable fixture — i.e. it is
// out of the tournament (or between undecided knockout rounds), so the badge shows nothing.
export function findTeamFocus(
  matches: Match[],
  groupPositions: Map<string, ProvisionalSlot>,
  teamCode: string,
): TeamFocus | null {
  const fixtures = matches
    .map((match): TeamFocus | null => {
      const a = resolveSide(match.teamA, groupPositions);
      const b = resolveSide(match.teamB, groupPositions);
      const teamIsA = a?.code === teamCode;
      const teamIsB = b?.code === teamCode;
      if (!teamIsA && !teamIsB) return null;
      const team = (teamIsA ? a : b)!;
      const opponent = teamIsA ? b : a;
      if (!opponent) return null; // opponent slot still undecided — nothing to show
      return {
        match,
        team,
        opponent,
        provisional: team.provisional || opponent.provisional,
      };
    })
    .filter((f): f is TeamFocus => f !== null)
    .sort(
      (x, y) =>
        new Date(x.match.kickoffTimestamp).getTime() -
        new Date(y.match.kickoffTimestamp).getTime(),
    );
  return (
    fixtures.find((f) => f.match.status === "LIVE") ??
    fixtures.find((f) => f.match.status === "PRE_GAME") ??
    null
  );
}

// Every national team a supporter can currently follow: those that appear on a resolvable
// side of a LIVE or PRE_GAME fixture. A team with no live/upcoming fixture (eliminated, or
// its group games all played) drops off automatically — so the picker only ever offers
// teams that actually have something to count down to. Deduped by code, sorted by name.
export function listSelectableTeams(
  matches: Match[],
  groupPositions: Map<string, ProvisionalSlot>,
): ResolvedSide[] {
  const byCode = new Map<string, ResolvedSide>();
  for (const match of matches) {
    if (match.status !== "LIVE" && match.status !== "PRE_GAME") continue;
    for (const raw of [match.teamA, match.teamB]) {
      const side = resolveSide(raw, groupPositions);
      if (!side || byCode.has(side.code)) continue;
      byCode.set(side.code, side);
    }
  }
  return [...byCode.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR"),
  );
}

// Team code → display/colour metadata, harvested from the real (confirmed) sides in the
// fixture list. Placeholder knockout slots carry no flag/colours, so they're skipped. Used
// to colour the badge (stripe, glow, countdown accent) and the goal fireworks per team.
export function buildTeamMetaMap(matches: Match[]): Map<string, TeamMeta> {
  const byCode = new Map<string, TeamMeta>();
  for (const match of matches) {
    for (const side of [match.teamA, match.teamB]) {
      if (!side.flagSvg || !side.primaryColor || byCode.has(side.code)) continue;
      byCode.set(side.code, {
        code: side.code,
        name: side.name,
        flagSvg: side.flagSvg,
        primaryColor: side.primaryColor,
        secondaryColor: side.secondaryColor,
      });
    }
  }
  return byCode;
}

export function formatCountdown(totalSecs: number): string {
  const safe = Math.max(0, Math.floor(totalSecs));
  const d = Math.floor(safe / 86400);
  const h = Math.floor((safe % 86400) / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const hh = h.toString().padStart(2, "0");
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  if (d > 0) {
    return `${d.toString().padStart(2, "0")}d ${hh}h ${mm}m ${ss}s`;
  }
  return `${hh}h ${mm}m ${ss}s`;
}

// Parse a #rgb / #rrggbb hex into [r,g,b] bytes, or null when malformed. Defensive: team
// colours come from curated data, but a bad value must degrade to a fallback, not NaN.
function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// Hex → "rgba(r,g,b,a)" for the badge's coloured glow. Falls back to the given colour used
// opaque-ish when the hex can't be parsed.
export function hexToRgba(hex: string, alpha: number): string {
  const rgb = parseHex(hex) ?? [0, 0, 0];
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

// Hex → [r,g,b] normalised to 0..1 for the WebGL fireworks shader. Defaults to black on a
// bad value (the palette builder supplies real team colours, so this is a guard only).
export function hexToRgb01(hex: string): [number, number, number] {
  const rgb = parseHex(hex) ?? [0, 0, 0];
  return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
}

// Brazil defaults preserve the original palette when no team colours are supplied.
const BRAZIL_PRIMARY = "#009c3b";
const BRAZIL_SECONDARY = "#ffdf00";
const WARM_WHITE: [number, number, number] = [1.0, 1.0, 0.9];

// Build the 12-burst colour palette for the goal fireworks from a team's two colours,
// interleaving secondary / primary with a warm-white accent every third burst — the exact
// rhythm the original Brazil palette used (yellow, green, …, white at 4/7/10).
export function buildFireworksPalette(
  primaryColor?: string,
  secondaryColor?: string,
): [number, number, number][] {
  const primary = hexToRgb01(primaryColor || BRAZIL_PRIMARY);
  const secondary = hexToRgb01(secondaryColor || BRAZIL_SECONDARY);
  const cycle: [number, number, number][] = [secondary, primary, WARM_WHITE];
  return Array.from({ length: 12 }, (_, i) => cycle[i % 3]);
}

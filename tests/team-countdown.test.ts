import assert from "node:assert/strict";
import test from "node:test";

import type { Match } from "../src/types";
import type { ProvisionalSlot } from "../src/standings";
import {
  buildFireworksPalette,
  buildTeamMetaMap,
  findTeamFocus,
  formatCountdown,
  hexToRgb01,
  hexToRgba,
  listSelectableTeams,
} from "../src/utils/teamCountdown";

// Minimal fixture side — only the fields the pure helpers read. A placeholder knockout
// slot ("1C") carries no flagSvg/colours, mirroring the real APP_MATCHES shape.
function side(
  code: string,
  name: string,
  opts: { flag?: boolean } = {},
): Match["teamA"] {
  const real = opts.flag ?? true;
  return {
    code,
    name,
    flagSvg: real ? code.toLowerCase() : "",
    primaryColor: real ? "#112233" : "",
    secondaryColor: real ? "#445566" : "",
    group: "Grupo X",
    lineup: [],
  } as Match["teamA"];
}

function mkMatch(
  id: string,
  a: Match["teamA"],
  b: Match["teamA"],
  status: Match["status"],
  kickoff: string,
): Match {
  return {
    id,
    teamA: a,
    teamB: b,
    status,
    kickoffTimestamp: kickoff,
    kickoffDate: "01 Junho 2026 (segunda-feira)",
    kickoffTime: "16:00",
  } as unknown as Match;
}

const NO_SLOTS = new Map<string, ProvisionalSlot>();

test("formatCountdown renders days only when present and clamps negatives", () => {
  assert.equal(formatCountdown(2 * 86400 + 3 * 3600 + 4 * 60 + 5), "02d 03h 04m 05s");
  assert.equal(formatCountdown(3 * 3600 + 4 * 60 + 5), "03h 04m 05s");
  assert.equal(formatCountdown(-99), "00h 00m 00s");
});

test("hexToRgba / hexToRgb01 parse shorthand, full hex and bad input", () => {
  assert.equal(hexToRgba("#009c3b", 0.22), "rgba(0, 156, 59, 0.22)");
  assert.equal(hexToRgba("#fff", 1), "rgba(255, 255, 255, 1)");
  assert.equal(hexToRgba("not-a-color", 0.5), "rgba(0, 0, 0, 0.5)");
  assert.deepEqual(hexToRgb01("#ffffff"), [1, 1, 1]);
});

test("buildFireworksPalette has 12 entries cycling secondary/primary/white", () => {
  const palette = buildFireworksPalette("#000000", "#ffffff");
  assert.equal(palette.length, 12);
  assert.deepEqual(palette[0], [1, 1, 1]); // secondary
  assert.deepEqual(palette[1], [0, 0, 0]); // primary
  assert.deepEqual(palette[2], [1, 1, 0.9]); // warm-white accent
  assert.deepEqual(palette[3], palette[0]); // cycle repeats
  // Defaults (Brazil) when colours are absent.
  assert.equal(buildFireworksPalette().length, 12);
});

test("buildTeamMetaMap keeps real teams, skips placeholder slots, dedups", () => {
  const matches = [
    mkMatch("m1", side("BRA", "BRASIL"), side("MAR", "MARROCOS"), "FINISHED", "2026-06-01T16:00:00-03:00"),
    mkMatch("m2", side("BRA", "BRASIL"), side("1C", "Vencedor 1C", { flag: false }), "PRE_GAME", "2026-06-08T16:00:00-03:00"),
  ];
  const meta = buildTeamMetaMap(matches);
  assert.deepEqual([...meta.keys()].sort(), ["BRA", "MAR"]);
  assert.equal(meta.get("BRA")?.primaryColor, "#112233");
});

test("listSelectableTeams returns only live/upcoming sides, sorted, deduped", () => {
  const matches = [
    mkMatch("m1", side("BRA", "BRASIL"), side("MAR", "MARROCOS"), "FINISHED", "2026-06-01T16:00:00-03:00"),
    mkMatch("m2", side("ARG", "ARGENTINA"), side("BRA", "BRASIL"), "PRE_GAME", "2026-06-08T16:00:00-03:00"),
    mkMatch("m3", side("USA", "ESTADOS UNIDOS"), side("BRA", "BRASIL"), "LIVE", "2026-06-05T16:00:00-03:00"),
  ];
  const names = listSelectableTeams(matches, NO_SLOTS).map((s) => s.name);
  // ARG, BRA, USA appear (BRA once), sorted pt-BR; MAR excluded (only a FINISHED game).
  assert.deepEqual(names, ["ARGENTINA", "BRASIL", "ESTADOS UNIDOS"]);
});

test("findTeamFocus prefers LIVE, else earliest PRE_GAME, else null", () => {
  const upcoming = mkMatch("m2", side("BRA", "BRASIL"), side("ARG", "ARGENTINA"), "PRE_GAME", "2026-06-08T16:00:00-03:00");
  const later = mkMatch("m3", side("BRA", "BRASIL"), side("USA", "ESTADOS UNIDOS"), "PRE_GAME", "2026-06-12T16:00:00-03:00");
  const focus = findTeamFocus([later, upcoming], NO_SLOTS, "BRA");
  assert.equal(focus?.opponent?.code, "ARG"); // earliest upcoming

  const live = mkMatch("m1", side("BRA", "BRASIL"), side("MAR", "MARROCOS"), "LIVE", "2026-06-05T16:00:00-03:00");
  const liveFocus = findTeamFocus([later, upcoming, live], NO_SLOTS, "BRA");
  assert.equal(liveFocus?.opponent?.code, "MAR"); // LIVE wins over upcoming

  assert.equal(findTeamFocus([upcoming], NO_SLOTS, "GER"), null); // team not playing
});

test("findTeamFocus surfaces the fixture with a null opponent when only the opponent is undecided", () => {
  // BRA is confirmed into a knockout tie whose opponent is still the winner of an unplayed
  // match (a flagless "W73" ref) — the badge must still surface it and count down, with the
  // opponent shown as "to be defined", instead of falsely reporting "no next match".
  const undecided = mkMatch(
    "k1",
    side("BRA", "BRASIL"),
    side("W73", "Vencedor 73", { flag: false }),
    "PRE_GAME",
    "2026-07-01T16:00:00-03:00",
  );
  const focus = findTeamFocus([undecided], NO_SLOTS, "BRA");
  assert.equal(focus?.team.code, "BRA");
  assert.equal(focus?.opponent, null); // opponent to be defined
  assert.equal(focus?.provisional, true); // pairing not locked
  // Still null when the TEAM itself isn't in the fixture at all.
  assert.equal(findTeamFocus([undecided], NO_SLOTS, "GER"), null);
});

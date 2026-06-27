import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveTeamDisplay } from "../src/utils/resolveTeamDisplay";
import type { ProvisionalSlot, QualificationStatus } from "../src/standings";
import type { Match } from "../src/types";

// Minimal Match factory — resolveTeamDisplay only reads `stageName` and the
// slot's `name`/`code`/`flagSvg`/colors/group, so the lineups and scheduling
// fields are filler.
const makeTeam = (over: Partial<Match["teamA"]>): Match["teamA"] => ({
  name: "Placeholder",
  code: "2A",
  flagSvg: "",
  primaryColor: "#000000",
  secondaryColor: "#ffffff",
  group: "",
  lineup: [],
  ...over,
});

const makeMatch = (over: Partial<Match>): Match => ({
  id: "M1",
  teamA: makeTeam({}),
  teamB: makeTeam({ code: "1B" }),
  stadiumName: "Stadium",
  city: "City",
  stageName: "Round of 32",
  kickoffTime: "16:00",
  kickoffDate: "15 Junho, 2026",
  kickoffTimestamp: "2026-06-15T16:00:00-03:00",
  status: "PRE_GAME",
  countdownTargetSeconds: 0,
  broadcasters: [],
  ...over,
});

const slotFor = (
  code: string,
  name: string,
  status: QualificationStatus,
): ProvisionalSlot => ({
  team: {
    name,
    code,
    flagSvg: code.toLowerCase(),
    primaryColor: "#111111",
    secondaryColor: "#eeeeee",
    group: "Grupo A",
  },
  status,
});

test("group-stage fixtures return the team verbatim with no provisional status", () => {
  const team = makeTeam({ name: "Brasil", code: "BRA", flagSvg: "brazil", group: "Grupo C" });
  const match = makeMatch({ stageName: "Group Stage", teamA: team });
  // Even if the map happened to hold the same code, group-stage slots are never projected.
  const map = new Map<string, ProvisionalSlot>([["BRA", slotFor("ARG", "Argentina", "qualified")]]);

  const resolved = resolveTeamDisplay(match, team, map);

  assert.equal(resolved.name, "Brasil");
  assert.equal(resolved.code, "BRA");
  assert.equal(resolved.flagSvg, "brazil");
  assert.equal(resolved.prov, null);
  assert.deepEqual(resolved.ref, {
    name: "Brasil",
    code: "BRA",
    flagSvg: "brazil",
    primaryColor: "#000000",
    secondaryColor: "#ffffff",
    group: "Grupo C",
  });
});

test("knockout placeholder slot is projected onto the team that currently holds it", () => {
  const placeholder = makeTeam({ name: "2º A", code: "2A", flagSvg: "" });
  const match = makeMatch({ stageName: "Round of 32", teamA: placeholder });
  const map = new Map<string, ProvisionalSlot>([["2A", slotFor("MEX", "México", "contention")]]);

  const resolved = resolveTeamDisplay(match, placeholder, map);

  assert.equal(resolved.name, "México");
  assert.equal(resolved.code, "MEX");
  assert.equal(resolved.flagSvg, "mex");
  assert.equal(resolved.prov, "contention");
  // ref carries the projected team, not the raw placeholder.
  assert.equal(resolved.ref.code, "MEX");
  assert.equal(resolved.ref.group, "Grupo A");
});

test("a projected slot forwards its qualification status (qualified)", () => {
  const placeholder = makeTeam({ code: "1A" });
  const match = makeMatch({ stageName: "Round of 16", teamA: placeholder });
  const map = new Map<string, ProvisionalSlot>([["1A", slotFor("KOR", "Coreia do Sul", "qualified")]]);

  const resolved = resolveTeamDisplay(match, placeholder, map);

  assert.equal(resolved.code, "KOR");
  assert.equal(resolved.prov, "qualified");
});

test("knockout slots absent from the map (combo / winner refs) render verbatim", () => {
  const comboSlot = makeTeam({ name: "3º A/B/C/D/F", code: "3ABCDF", flagSvg: "" });
  const match = makeMatch({ stageName: "Round of 32", teamA: comboSlot });
  // Map only resolves concrete "1A"/"2B" slots, never combos or "W74"/"RU101".
  const map = new Map<string, ProvisionalSlot>([["1A", slotFor("MEX", "México", "qualified")]]);

  const resolved = resolveTeamDisplay(match, comboSlot, map);

  assert.equal(resolved.name, "3º A/B/C/D/F");
  assert.equal(resolved.code, "3ABCDF");
  assert.equal(resolved.prov, null);
  assert.equal(resolved.ref.code, "3ABCDF");
});

test("knockout fixture with no matching slot keeps the raw label (winner ref)", () => {
  const winnerRef = makeTeam({ name: "Vencedor 74", code: "W74", flagSvg: "" });
  const match = makeMatch({ stageName: "Quarter-final", teamA: winnerRef });
  const map = new Map<string, ProvisionalSlot>();

  const resolved = resolveTeamDisplay(match, winnerRef, map);

  assert.equal(resolved.code, "W74");
  assert.equal(resolved.prov, null);
});

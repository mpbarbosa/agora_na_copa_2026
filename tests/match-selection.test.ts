import { test } from "node:test";
import assert from "node:assert/strict";
import type { Match } from "../src/types";
import {
  getInitialMatchId,
  applySimulatedState,
  getMatchGroupLabel,
  getMatchStageLabel,
  getBroadcasterBadgeLabel,
  formatCountryNameForTooltip,
  type SimulatedMatchState,
} from "../src/utils/matchSelection";

const m = (over: Partial<Match>): Match => ({ id: "x", status: "PRE_GAME", ...over }) as unknown as Match;

test("getInitialMatchId prefers a live/suspended match", () => {
  const matches = [
    m({ id: "a", status: "PRE_GAME", kickoffTimestamp: "2026-06-11T18:00:00Z" }),
    m({ id: "b", status: "LIVE" }),
  ];
  assert.equal(getInitialMatchId(matches), "b");
});

test("getInitialMatchId picks the soonest upcoming match when none is live", () => {
  const matches = [
    m({ id: "late", status: "PRE_GAME", kickoffTimestamp: "2026-06-11T21:00:00Z" }),
    m({ id: "soon", status: "PRE_GAME", kickoffTimestamp: "2026-06-11T15:00:00Z" }),
  ];
  assert.equal(getInitialMatchId(matches), "soon");
});

test("getInitialMatchId falls back to the first match", () => {
  const matches = [m({ id: "only", status: "FINISHED" })];
  assert.equal(getInitialMatchId(matches), "only");
});

test("applySimulatedState is a no-op without a simulation, else overlays status/score/time", () => {
  const base = m({ id: "x", status: "PRE_GAME" });
  assert.equal(applySimulatedState(base, undefined), base);

  const sim: SimulatedMatchState = {
    status: "LIVE",
    score: { teamA: 2, teamB: 1 },
    matchTime: "63'",
    incidents: [],
    updatedAt: "2026-06-11T18:00:00Z",
  };
  const out = applySimulatedState(base, sim);
  assert.equal(out.status, "LIVE");
  assert.deepEqual(out.score, { teamA: 2, teamB: 1 });
  assert.equal(out.matchTime, "63'");
});

test("getMatchGroupLabel only for the group stage; getMatchStageLabel only for knockouts", () => {
  const group = m({ stageName: "Group Stage", teamA: { group: "G" }, teamB: { group: "G" } } as Partial<Match>);
  assert.equal(getMatchGroupLabel(group), "G");
  assert.equal(getMatchStageLabel(group), null);

  const knockout = m({ stageName: "Oitavas de Final" } as Partial<Match>);
  assert.equal(getMatchGroupLabel(knockout), null);
  assert.equal(getMatchStageLabel(knockout), "Oitavas de Final");
});

test("getBroadcasterBadgeLabel: 3-char alnum-only badge, dot-padded to 2 minimum", () => {
  assert.equal(getBroadcasterBadgeLabel("Globo"), "GLO");
  assert.equal(getBroadcasterBadgeLabel("CazéTV"), "CAZ");
  assert.equal(getBroadcasterBadgeLabel("X"), "X•");
});

test("formatCountryNameForTooltip title-cases, keeping pt-BR connectives lower", () => {
  assert.equal(formatCountryNameForTooltip("BRASIL"), "Brasil");
  assert.equal(formatCountryNameForTooltip("TRINIDAD E TOBAGO"), "Trinidad e Tobago");
  assert.equal(formatCountryNameForTooltip("COSTA DO MARFIM"), "Costa do Marfim");
});

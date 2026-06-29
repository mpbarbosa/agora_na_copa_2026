import { test } from "node:test";
import assert from "node:assert/strict";
import type { Match } from "../src/types";
import { finishedSideResult, matchPoints, ptLabel } from "../src/utils/matchResult";
import { KNOCKOUT_STAGE_NAMES } from "../src/utils/knockoutSlots";

// finishedSideResult only reads status/score/stageName, so a tiny partial is enough.
const m = (over: Partial<Match>): Match => ({ status: "FINISHED", ...over }) as unknown as Match;
const finished = (stageName: string, a: number, b: number): Match =>
  m({ stageName, score: { teamA: a, teamB: b } } as Partial<Match>);

test("matchPoints / ptLabel: 3-1-0 and pt-BR labels", () => {
  assert.deepEqual(matchPoints(2, 0), { a: 3, b: 0 });
  assert.deepEqual(matchPoints(1, 1), { a: 1, b: 1 });
  assert.equal(ptLabel(3), "+3 pts");
  assert.equal(ptLabel(1), "+1 pt");
  assert.equal(ptLabel(0), "0 pts");
});

test("group stage shows points for each side", () => {
  const win = finished("Group Stage", 3, 1);
  assert.deepEqual(finishedSideResult(win, "a"), { label: "+3 pts", tone: "win" });
  assert.deepEqual(finishedSideResult(win, "b"), { label: "0 pts", tone: "loss" });
  const draw = finished("Group Stage", 1, 1);
  assert.deepEqual(finishedSideResult(draw, "a"), { label: "+1 pt", tone: "draw" });
});

test("knockout round shows Classificado / Eliminado, never points", () => {
  const ko = finished(KNOCKOUT_STAGE_NAMES.R32, 0, 1); // South Africa 0 x 1 Canada
  assert.deepEqual(finishedSideResult(ko, "a"), { label: "Eliminado", tone: "loss" });
  assert.deepEqual(finishedSideResult(ko, "b"), { label: "Classificado", tone: "win" });
});

test("final and third-place play-off get their own labels", () => {
  const fin = finished(KNOCKOUT_STAGE_NAMES.F, 2, 1);
  assert.deepEqual(finishedSideResult(fin, "a"), { label: "Campeão", tone: "win" });
  assert.deepEqual(finishedSideResult(fin, "b"), { label: "Vice", tone: "loss" });
  const tp = finished(KNOCKOUT_STAGE_NAMES.TP, 0, 2);
  assert.deepEqual(finishedSideResult(tp, "a"), { label: "4º lugar", tone: "loss" });
  assert.deepEqual(finishedSideResult(tp, "b"), { label: "3º lugar", tone: "win" });
});

test("a drawn knockout score shows nothing (penalties not modeled), and so do non-finished/no-score", () => {
  assert.equal(finishedSideResult(finished(KNOCKOUT_STAGE_NAMES.R16, 1, 1), "a"), null);
  assert.equal(finishedSideResult(m({ status: "PRE_GAME" }), "a"), null);
  assert.equal(finishedSideResult(m({ status: "FINISHED", score: undefined }), "b"), null);
});

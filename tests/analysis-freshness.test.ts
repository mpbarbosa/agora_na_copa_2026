import { test } from "node:test";
import assert from "node:assert/strict";
import { isAnalysisUpToDate } from "../src/utils/analysisFreshness";

test("analysis authored after the last match is up to date", () => {
  // Match kicked off 2026-06-17 17:00Z; analysis stamped two hours later.
  assert.equal(
    isAnalysisUpToDate("2026-06-17T19:00:00.000Z", "2026-06-17T17:00:00.000Z"),
    true,
  );
});

test("analysis stamped exactly at kickoff counts as up to date (>=)", () => {
  assert.equal(
    isAnalysisUpToDate("2026-06-17T17:00:00.000Z", "2026-06-17T17:00:00.000Z"),
    true,
  );
});

test("analysis authored before the last match is outdated", () => {
  assert.equal(
    isAnalysisUpToDate("2026-06-14T20:00:00.000Z", "2026-06-17T17:00:00.000Z"),
    false,
  );
});

test("a team with no finished match yet is treated as up to date", () => {
  assert.equal(isAnalysisUpToDate("2026-06-10T12:00:00.000Z", null), true);
  assert.equal(isAnalysisUpToDate(null, null), true);
});

test("a played team whose analysis has no timestamp is outdated", () => {
  assert.equal(isAnalysisUpToDate(null, "2026-06-17T17:00:00.000Z"), false);
  assert.equal(isAnalysisUpToDate(undefined, "2026-06-17T17:00:00.000Z"), false);
});

test("invalid date strings are handled conservatively", () => {
  // Unparseable reference event ⇒ nothing to be behind ⇒ up to date.
  assert.equal(isAnalysisUpToDate("2026-06-17T17:00:00.000Z", "not-a-date"), true);
  // Valid event but unparseable stamp ⇒ outdated.
  assert.equal(isAnalysisUpToDate("not-a-date", "2026-06-17T17:00:00.000Z"), false);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Match } from "../src/types";
import {
  DEMO_MATCH_ID,
  getMatchCountdownSeconds,
  parseMinuteLabel,
  formatMinuteLabel,
  formatOverlayUpdatedAt,
  formatCountdown,
} from "../src/utils/matchClock";

const match = (over: Partial<Match>): Match => ({ id: "x", status: "PRE_GAME", ...over }) as unknown as Match;

test("formatCountdown pads h/m/s and adds a day segment past 24h", () => {
  assert.equal(formatCountdown(0), "00h 00m 00s");
  assert.equal(formatCountdown(3661), "01h 01m 01s");
  assert.equal(formatCountdown(86400), "01d 00h 00m 00s");
  assert.equal(formatCountdown(90061), "01d 01h 01m 01s");
});

test("getMatchCountdownSeconds honours the demo fixture and clamps at 0", () => {
  assert.equal(getMatchCountdownSeconds(match({ id: DEMO_MATCH_ID }), new Date(), 120), 120);
  assert.equal(getMatchCountdownSeconds(match({ id: DEMO_MATCH_ID }), new Date(), -5), 0);
});

test("getMatchCountdownSeconds is 0 for a non-PRE_GAME match", () => {
  assert.equal(getMatchCountdownSeconds(match({ status: "LIVE" }), new Date(), 0), 0);
});

test("getMatchCountdownSeconds counts down to a real kickoff, and falls back on NaN", () => {
  const now = new Date("2026-06-11T18:00:00Z");
  const kickoff = new Date("2026-06-11T18:01:40Z").toISOString(); // +100s
  assert.equal(getMatchCountdownSeconds(match({ kickoffTimestamp: kickoff }), now, 0), 100);
  assert.equal(
    getMatchCountdownSeconds(match({ kickoffTimestamp: "not-a-date", countdownTargetSeconds: 42 }), now, 0),
    42,
  );
});

test("parseMinuteLabel / formatMinuteLabel", () => {
  assert.equal(parseMinuteLabel("45'"), 45);
  assert.equal(parseMinuteLabel(""), 0);
  assert.equal(parseMinuteLabel(undefined), 0);
  assert.equal(formatMinuteLabel(45), "45'");
  assert.equal(formatMinuteLabel(0), "1'"); // floors to a 1' minimum
});

test("formatOverlayUpdatedAt routes to the right catalog key by value validity", () => {
  const t = (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key;
  assert.equal(formatOverlayUpdatedAt(undefined, t), "aoVivo.overlay.pending");
  assert.equal(formatOverlayUpdatedAt("not-a-date", t), "aoVivo.overlay.unavailable");
  assert.match(formatOverlayUpdatedAt("2026-06-11T18:00:00Z", t), /^aoVivo\.overlay\.updatedAt:/);
});

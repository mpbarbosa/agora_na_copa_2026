import { test } from "node:test";
import assert from "node:assert/strict";

import {
  formatKickoffDate,
  formatKickoffTime,
  formatKickoffFromInstant,
} from "../src/utils/kickoffFormat";
import { setActiveLocale } from "../src/i18n/locale";

test("formatKickoffFromInstant renders a UTC FIFA instant in Brasília time (pt)", () => {
  setActiveLocale("pt");
  // MEX×ENG rescheduled kickoff: 22:00 Brasília === 2026-07-06T01:00:00Z.
  const display = formatKickoffFromInstant("2026-07-06T01:00:00Z");
  assert.deepEqual(display, {
    kickoffTime: "22:00",
    kickoffDate: "5 Julho 2026 (domingo)",
  });
});

test("formatKickoffFromInstant matches the seed formatters for the same instant", () => {
  setActiveLocale("pt");
  // The seed carries a -03:00 offset; the FIFA instant is the same moment in Z.
  const seed = "2026-06-15T16:00:00-03:00";
  const fromInstant = formatKickoffFromInstant("2026-06-15T19:00:00Z");
  assert.deepEqual(fromInstant, {
    kickoffTime: formatKickoffTime(seed),
    kickoffDate: formatKickoffDate(seed),
  });
});

test("formatKickoffFromInstant honors the es and en locales", () => {
  setActiveLocale("es");
  assert.equal(
    formatKickoffFromInstant("2026-07-06T01:00:00Z")?.kickoffDate,
    "5 Julio 2026 (domingo)",
  );
  setActiveLocale("en");
  assert.equal(
    formatKickoffFromInstant("2026-07-06T01:00:00Z")?.kickoffDate,
    "July 5, 2026 (Sunday)",
  );
  setActiveLocale("pt");
});

test("formatKickoffFromInstant returns null for an unparseable instant", () => {
  assert.equal(formatKickoffFromInstant(""), null);
  assert.equal(formatKickoffFromInstant("not-a-date"), null);
});

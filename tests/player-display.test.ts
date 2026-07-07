import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toEnglishWikipediaUrl,
  getPlayerAge,
  formatBirthDate,
  buildTournamentStatCells,
  buildPlayerStatCells,
  getSocialUrl,
  socialPlatformLabel,
} from "../src/utils/playerDisplay";

// A tiny translate stub: echoes the key so assertions can prove which key was used.
const tEcho = (key: string) => `t:${key}`;

test("toEnglishWikipediaUrl rewrites the language subdomain to en", () => {
  assert.equal(
    toEnglishWikipediaUrl("https://pt.wikipedia.org/wiki/Jordan_Pickford"),
    "https://en.wikipedia.org/wiki/Jordan_Pickford",
  );
});

test("toEnglishWikipediaUrl leaves an already-English URL unchanged", () => {
  assert.equal(
    toEnglishWikipediaUrl("https://en.wikipedia.org/wiki/Youri_Tielemans"),
    "https://en.wikipedia.org/wiki/Youri_Tielemans",
  );
});

test("toEnglishWikipediaUrl preserves the path and percent-encoded title", () => {
  assert.equal(
    toEnglishWikipediaUrl("https://pt.wikipedia.org/wiki/Zeki_%C3%87elik"),
    "https://en.wikipedia.org/wiki/Zeki_%C3%87elik",
  );
});

test("toEnglishWikipediaUrl handles the mobile (.m) subdomain", () => {
  assert.equal(
    toEnglishWikipediaUrl("https://pt.m.wikipedia.org/wiki/Yvon_Mvogo"),
    "https://en.wikipedia.org/wiki/Yvon_Mvogo",
  );
});

test("toEnglishWikipediaUrl leaves non-wikipedia.org URLs unchanged", () => {
  assert.equal(
    toEnglishWikipediaUrl("https://commons.wikimedia.org/wiki/File:Foo.jpg"),
    "https://commons.wikimedia.org/wiki/File:Foo.jpg",
  );
});

test("getPlayerAge computes whole years from an injectable 'now'", () => {
  assert.equal(getPlayerAge("1990-06-15", Date.parse("2020-06-15T12:00:00Z")), 30);
  // The day before the 30th birthday is still 29.
  assert.equal(getPlayerAge("1990-06-15", Date.parse("2020-06-14T00:00:00Z")), 29);
});

test("formatBirthDate: pt fallback without t, localized month with t, no timezone shift", () => {
  assert.equal(formatBirthDate("1993-07-28"), "28 jul. 1993");
  assert.equal(formatBirthDate("1993-07-28", tEcho), "28 t:playerCard.month.jul 1993");
  // Day is taken verbatim from the string (no Date parse), so no off-by-one at UTC edges.
  assert.equal(formatBirthDate("2000-01-01"), "1 jan. 2000");
});

test("buildTournamentStatCells includes only rows with value > 0, empty when absent", () => {
  assert.deepEqual(buildTournamentStatCells(null, "stadium-dark"), []);
  const cells = buildTournamentStatCells({ goals: 2, yellowCards: 0, redCards: 1 }, "stadium-dark");
  assert.deepEqual(cells.map((c) => [c.label, c.value]), [["Gols", 2], ["Vermelhos", 1]]);
  assert.equal(cells[0].accent, "text-[#00e476]"); // dark-theme goal accent
});

test("buildPlayerStatCells lays out shirt/age/height then tournament cells, skipping absent fields", () => {
  const cells = buildPlayerStatCells(
    { number: 10, height: 185 }, // no dateOfBirth → age skipped
    { goals: 1, yellowCards: 0, redCards: 0 },
    "classic-light",
  );
  assert.deepEqual(cells.map((c) => [c.label, c.value]), [
    ["Camisa", 10],
    ["Altura", "185 cm"],
    ["Gols", 1],
  ]);
});

test("getSocialUrl: handle→base, full-URL passthrough, wikipedia→en, site verbatim", () => {
  assert.equal(getSocialUrl("instagram", "vinijr"), "https://www.instagram.com/vinijr");
  assert.equal(getSocialUrl("x", "handle"), "https://x.com/handle");
  assert.equal(getSocialUrl("instagram", "https://instagram.com/x"), "https://instagram.com/x");
  assert.equal(getSocialUrl("site", "https://foo.example/p"), "https://foo.example/p");
  assert.equal(
    getSocialUrl("wikipedia", "https://pt.wikipedia.org/wiki/Foo"),
    "https://en.wikipedia.org/wiki/Foo",
  );
});

test("socialPlatformLabel keeps brand names verbatim, localizes site/wikipedia with t", () => {
  assert.equal(socialPlatformLabel("instagram"), "Instagram");
  assert.equal(socialPlatformLabel("wikipedia"), "Wikipédia");
  assert.equal(socialPlatformLabel("instagram", tEcho), "Instagram"); // brand not translated
  assert.equal(socialPlatformLabel("site", tEcho), "t:playerCard.social.site");
  assert.equal(socialPlatformLabel("wikipedia", tEcho), "t:playerCard.social.wikipedia");
});

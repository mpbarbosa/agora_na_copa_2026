import assert from "node:assert/strict";
import test from "node:test";

import { getInstagramHighlights } from "../src/data/instagramHighlights";
import { isSafeInstagramUrl } from "../src/utils/instagram";

test("getInstagramHighlights returns the players with a highlight", () => {
  const highlights = getInstagramHighlights();
  assert.ok(highlights.length > 0, "expected at least one Instagram highlight");
});

test("every highlight carries a safe Instagram permalink", () => {
  for (const highlight of getInstagramHighlights()) {
    assert.ok(
      isSafeInstagramUrl(highlight.instagramPostUrl),
      `unsafe permalink for ${highlight.name}: ${highlight.instagramPostUrl}`,
    );
  }
});

test("every highlight resolves identity, team name and flag", () => {
  for (const highlight of getInstagramHighlights()) {
    assert.ok(highlight.fifaId, "missing fifaId");
    assert.ok(highlight.name, "missing name");
    assert.ok(highlight.teamCode, "missing teamCode");
    assert.ok(highlight.teamName, `missing teamName for ${highlight.name}`);
    assert.ok(highlight.flagSvg, `missing flagSvg for ${highlight.name}`);
  }
});

test("highlights are unique per player", () => {
  const ids = getInstagramHighlights().map((h) => h.fifaId);
  assert.equal(ids.length, new Set(ids).size, "duplicate fifaId in highlights");
});

test("isSafeInstagramUrl rejects non-instagram origins", () => {
  assert.equal(isSafeInstagramUrl("https://www.instagram.com/reel/abc/"), true);
  assert.equal(isSafeInstagramUrl("https://evil.example.com/instagram.com/x"), false);
  assert.equal(isSafeInstagramUrl("http://www.instagram.com/reel/abc/"), false);
});

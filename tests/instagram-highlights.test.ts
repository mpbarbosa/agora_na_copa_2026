import assert from "node:assert/strict";
import test from "node:test";

import { getInstagramHighlights } from "../src/data/instagramHighlights";
import {
  isSafeInstagramUrl,
  resolveInstagramPostUrls,
  toInstagramEmbedUrl,
} from "../src/utils/instagram";

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

test("resolveInstagramPostUrls prefers the list over the singular fallback", () => {
  assert.deepEqual(
    resolveInstagramPostUrls(
      ["https://www.instagram.com/p/a/", "https://www.instagram.com/p/b/"],
      "https://www.instagram.com/p/single/",
    ),
    ["https://www.instagram.com/p/a/", "https://www.instagram.com/p/b/"],
  );
});

test("resolveInstagramPostUrls falls back to the singular when the list is absent or empty", () => {
  const single = "https://www.instagram.com/p/single/";
  assert.deepEqual(resolveInstagramPostUrls(undefined, single), [single]);
  assert.deepEqual(resolveInstagramPostUrls([], single), [single]);
});

test("resolveInstagramPostUrls drops unsafe urls and de-dupes, preserving order", () => {
  assert.deepEqual(
    resolveInstagramPostUrls(
      [
        "https://www.instagram.com/p/a/",
        "https://evil.example.com/x",
        "https://www.instagram.com/p/a/",
        "https://www.instagram.com/p/b/",
      ],
      undefined,
    ),
    ["https://www.instagram.com/p/a/", "https://www.instagram.com/p/b/"],
  );
});

test("resolveInstagramPostUrls returns an empty list when nothing is safe", () => {
  assert.deepEqual(resolveInstagramPostUrls(["https://evil.example.com/x"], undefined), []);
  assert.deepEqual(resolveInstagramPostUrls(undefined, "http://www.instagram.com/p/a/"), []);
  assert.deepEqual(resolveInstagramPostUrls(undefined, undefined), []);
});

test("toInstagramEmbedUrl appends /embed/ and strips query, hash and trailing slash", () => {
  assert.equal(
    toInstagramEmbedUrl("https://www.instagram.com/p/DaME26jDuIC/"),
    "https://www.instagram.com/p/DaME26jDuIC/embed/",
  );
  assert.equal(
    toInstagramEmbedUrl("https://www.instagram.com/p/DaME26jDuIC/?utm_source=ig_web_copy_link&igsh=x"),
    "https://www.instagram.com/p/DaME26jDuIC/embed/",
  );
  assert.equal(
    toInstagramEmbedUrl("https://www.instagram.com/reel/AbC123/#frag"),
    "https://www.instagram.com/reel/AbC123/embed/",
  );
});

test("toInstagramEmbedUrl rejects unsafe or bare-origin urls", () => {
  assert.equal(toInstagramEmbedUrl("https://evil.example.com/p/x/"), null);
  assert.equal(toInstagramEmbedUrl("http://www.instagram.com/p/x/"), null);
  assert.equal(toInstagramEmbedUrl("https://www.instagram.com/"), null);
});

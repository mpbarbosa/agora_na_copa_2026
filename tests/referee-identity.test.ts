import assert from "node:assert/strict";
import test from "node:test";

import { normalizeRefereeName, resolveRefereeInstagram } from "../src/utils/refereeIdentity";

test("normalizeRefereeName lowercases, strips accents and collapses whitespace", () => {
  assert.equal(normalizeRefereeName("Katia Itzel García"), "katia itzel garcia");
  assert.equal(normalizeRefereeName("  Adham   Makhadmeh  "), "adham makhadmeh");
  assert.equal(normalizeRefereeName("MÜLLER"), "muller");
});

test("resolveRefereeInstagram matches the curated key exactly", () => {
  const urls = resolveRefereeInstagram({ name: "Katia Itzel Garcia", country: "MEX" });
  assert.ok(urls.length >= 1);
  assert.ok(urls[0].startsWith("https://www.instagram.com/"));
});

test("resolveRefereeInstagram tolerates FIFA's extra surname parts", () => {
  // FIFA may publish a longer official name; the shorter curated key is contained in it.
  const urls = resolveRefereeInstagram({ name: "Katia Itzel Garcia Villalpando", country: "MEX" });
  assert.ok(urls.length >= 1);
});

test("resolveRefereeInstagram tolerates accents in the live name", () => {
  const urls = resolveRefereeInstagram({ name: "Katia Itzel García" });
  assert.ok(urls.length >= 1);
});

test("resolveRefereeInstagram returns [] for an unknown or missing referee", () => {
  assert.deepEqual(resolveRefereeInstagram({ name: "Someone Else" }), []);
  assert.deepEqual(resolveRefereeInstagram({ name: "" }), []);
  assert.deepEqual(resolveRefereeInstagram(undefined), []);
});

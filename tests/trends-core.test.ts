import assert from "node:assert/strict";
import test from "node:test";

import {
  GOOGLE_TRENDS_BATCH_URL,
  buildGoogleTrendsRequestBody,
  formatTrafficPtBr,
  parseGoogleTrendsBatch,
} from "../trends-core";

// A trimmed-down sample shaped like the real batchexecute response: a `)]}'`
// prefix, then a row ["wrb.fr","i0OFE","<json string>"] whose JSON is
// [null, [ entry, entry ... ]] with entry[0]=title and entry[6]=volume.
const sampleEntries = [
  ["misantropia", null, "BR", [1781923200], null, null, 2000000, null, 1000, ["misantropia", "defesa civil"]],
  ["brasil x haiti", null, "BR", [1781910000], null, null, 500000, null, 1000, ["brasil", "haiti"]],
  ["londrina x athletic", null, "BR", [1781900000], null, null, 20000, null, 1, ["londrina"]],
  ["", null, "BR", [0], null, null, 5000, null, 1, []], // empty title → skipped
];
const SAMPLE = ")]}'\n\n" + JSON.stringify([
  ["wrb.fr", "i0OFE", JSON.stringify([null, sampleEntries])],
]);

test("buildGoogleTrendsRequestBody encodes geo and hours into the RPC payload", () => {
  const body = buildGoogleTrendsRequestBody("BR", 24);
  assert.ok(body.startsWith("f.req="));
  const decoded = decodeURIComponent(body.slice("f.req=".length));
  assert.ok(decoded.includes("i0OFE"));
  assert.ok(decoded.includes('\\"BR\\"') || decoded.includes('"BR"'));
  assert.ok(decoded.includes("24"));
});

test("GOOGLE_TRENDS_BATCH_URL targets the trending RPC", () => {
  assert.ok(GOOGLE_TRENDS_BATCH_URL.includes("batchexecute"));
  assert.ok(GOOGLE_TRENDS_BATCH_URL.includes("i0OFE"));
});

test("formatTrafficPtBr renders Google's pt-BR volume style", () => {
  assert.equal(formatTrafficPtBr(2000000), "2 mi+");
  assert.equal(formatTrafficPtBr(500000), "500 mil+");
  assert.equal(formatTrafficPtBr(20000), "20 mil+");
  assert.equal(formatTrafficPtBr(200), "200+");
  assert.equal(formatTrafficPtBr(0), null);
  assert.equal(formatTrafficPtBr(undefined), null);
});

test("parseGoogleTrendsBatch extracts ranked topics with formatted volume", () => {
  const topics = parseGoogleTrendsBatch(SAMPLE);
  assert.equal(topics.length, 3); // empty-title entry skipped
  assert.deepEqual(topics[0], {
    title: "misantropia",
    traffic: "2 mi+",
    pictureUrl: null,
    news: null,
  });
  assert.equal(topics[1].title, "brasil x haiti");
  assert.equal(topics[1].traffic, "500 mil+");
  assert.equal(topics[2].traffic, "20 mil+");
});

test("parseGoogleTrendsBatch honours the limit and feed order", () => {
  const topics = parseGoogleTrendsBatch(SAMPLE, 1);
  assert.equal(topics.length, 1);
  assert.equal(topics[0].title, "misantropia");
});

test("parseGoogleTrendsBatch returns [] for empty or malformed input", () => {
  assert.deepEqual(parseGoogleTrendsBatch(""), []);
  assert.deepEqual(parseGoogleTrendsBatch(")]}'\n[]"), []);
  assert.deepEqual(parseGoogleTrendsBatch("not json at all"), []);
  // Defensive against non-string input at runtime (e.g. a failed fetch body).
  assert.deepEqual(parseGoogleTrendsBatch(null as unknown as string), []);
});

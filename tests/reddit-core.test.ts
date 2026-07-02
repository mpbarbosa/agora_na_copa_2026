import assert from "node:assert/strict";
import test from "node:test";

import {
  REDDIT_TOKEN_URL,
  REDDIT_OAUTH_BASE,
  buildRedditTokenRequest,
  parseRedditToken,
  redditPostIdFromUrl,
  buildRedditInfoUrl,
  mergeRedditListing,
} from "../reddit-core";
import type { RedditPost } from "../src/types";

const SEEDS: RedditPost[] = [
  {
    id: "1ukm48k",
    url: "https://www.reddit.com/r/ModaBrasil/comments/1ukm48k/o_que/",
    subreddit: "r/ModaBrasil",
    title: "Título de fallback",
    teamCode: "BRA",
  },
  {
    id: "abc123",
    url: "https://www.reddit.com/r/futebol/comments/abc123/outro/",
    subreddit: "r/futebol",
    title: "Outro fallback",
  },
];

test("buildRedditTokenRequest encodes Basic auth + client_credentials grant", () => {
  const req = buildRedditTokenRequest("myid", "mysecret");
  assert.ok(req);
  assert.equal(req!.url, REDDIT_TOKEN_URL);
  assert.equal(req!.method, "POST");
  assert.equal(req!.body, "grant_type=client_credentials");
  const expected = "Basic " + Buffer.from("myid:mysecret").toString("base64");
  assert.equal(req!.headers.Authorization, expected);
  assert.ok(req!.headers["User-Agent"].length > 0);
});

test("buildRedditTokenRequest returns null when a credential is missing", () => {
  assert.equal(buildRedditTokenRequest(undefined, "s"), null);
  assert.equal(buildRedditTokenRequest("id", undefined), null);
  assert.equal(buildRedditTokenRequest("", ""), null);
});

test("parseRedditToken extracts the access token and expiry", () => {
  assert.deepEqual(parseRedditToken({ access_token: "tok", expires_in: 86400 }), {
    accessToken: "tok",
    expiresInSec: 86400,
  });
  // Missing expires_in defaults, but a missing/empty token is rejected.
  assert.equal(parseRedditToken({ access_token: "tok" })?.expiresInSec, 3600);
  assert.equal(parseRedditToken({ access_token: "" }), null);
  assert.equal(parseRedditToken({}), null);
  assert.equal(parseRedditToken(null), null);
});

test("redditPostIdFromUrl pulls the base-36 id from a permalink", () => {
  assert.equal(
    redditPostIdFromUrl("https://www.reddit.com/r/ModaBrasil/comments/1ukm48k/o_que/"),
    "1ukm48k",
  );
  assert.equal(redditPostIdFromUrl("https://www.reddit.com/r/x/comments/abc123"), "abc123");
  assert.equal(redditPostIdFromUrl("https://www.reddit.com/r/x/"), null);
});

test("buildRedditInfoUrl joins ids as t3_ fullnames", () => {
  const url = buildRedditInfoUrl(["1ukm48k", "abc123"]);
  assert.ok(url);
  assert.ok(url!.startsWith(`${REDDIT_OAUTH_BASE}/api/info?id=`));
  assert.equal(decodeURIComponent(url!.split("id=")[1]), "t3_1ukm48k,t3_abc123");
  assert.equal(buildRedditInfoUrl([]), null);
  assert.equal(buildRedditInfoUrl(["", ""]), null);
});

test("mergeRedditListing overlays live fields onto matching seeds", () => {
  const listing = {
    data: {
      children: [
        {
          data: {
            id: "1ukm48k",
            title: "Título real do post",
            subreddit_name_prefixed: "r/ModaBrasil",
            author: "torcedor_real",
            score: 1234,
            num_comments: 56,
          },
        },
      ],
    },
  };
  const merged = mergeRedditListing(SEEDS, listing);
  assert.equal(merged.length, 2);
  const first = merged[0];
  assert.equal(first.title, "Título real do post"); // live title wins
  assert.equal(first.teamCode, "BRA"); // seed identity preserved
  assert.equal(first.url, SEEDS[0].url); // canonical url preserved
  assert.equal(first.author, "torcedor_real");
  assert.equal(first.score, 1234);
  assert.equal(first.numComments, 56);
  // Second seed absent from the listing → unchanged, no live fields.
  assert.equal(merged[1].title, "Outro fallback");
  assert.equal(merged[1].author, undefined);
  assert.equal(merged[1].score, undefined);
});

test("mergeRedditListing keeps the fallback title when live title is blank", () => {
  const listing = { data: { children: [{ data: { id: "1ukm48k", title: "   " } }] } };
  const merged = mergeRedditListing(SEEDS, listing);
  assert.equal(merged[0].title, "Título de fallback");
});

test("mergeRedditListing drops [deleted] authors", () => {
  const listing = {
    data: { children: [{ data: { id: "1ukm48k", author: "[deleted]", score: 5 } }] },
  };
  const merged = mergeRedditListing(SEEDS, listing);
  assert.equal(merged[0].author, undefined);
  assert.equal(merged[0].score, 5);
});

test("mergeRedditListing returns seeds unchanged on malformed input", () => {
  assert.deepEqual(mergeRedditListing(SEEDS, null), SEEDS);
  assert.deepEqual(mergeRedditListing(SEEDS, { data: {} }), SEEDS);
  assert.deepEqual(mergeRedditListing(SEEDS, "nope"), SEEDS);
});

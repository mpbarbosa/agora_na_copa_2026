// Pure logic for the "Repercussão no Reddit" feed (curated posts enriched with
// live data from the Reddit API).
//
// Reddit shut down free unauthenticated API access in 2023, so the feed reads
// the OAuth2 endpoints: an app-only (client_credentials) token from
// www.reddit.com, then GET oauth.reddit.com/api/info to hydrate the curated
// permalinks. The endpoint that performs the network calls lives in server.ts;
// this module only builds the requests and transforms the responses, so it can
// be unit-tested independently (tests/reddit-core.test.ts).

import type { RedditPost } from "./src/types";

export const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
export const REDDIT_OAUTH_BASE = "https://oauth.reddit.com";

/** A descriptive User-Agent is mandatory — Reddit 429s generic/absent ones. */
export const REDDIT_USER_AGENT =
  "web:agora-na-copa-2026:1.0 (by /u/mpbarbosa; +https://copa2026.mpbarbosa.com)";

export interface RedditTokenRequest {
  url: string;
  method: "POST";
  headers: Record<string, string>;
  body: string;
}

/**
 * Builds the app-only OAuth token request (grant_type=client_credentials) with
 * HTTP Basic auth over `clientId:clientSecret`. Returns null when either
 * credential is missing so the caller degrades to the fallback shape rather than
 * sending a malformed request.
 */
export const buildRedditTokenRequest = (
  clientId: string | undefined,
  clientSecret: string | undefined,
): RedditTokenRequest | null => {
  if (!clientId || !clientSecret) return null;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return {
    url: REDDIT_TOKEN_URL,
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": REDDIT_USER_AGENT,
    },
    body: "grant_type=client_credentials",
  };
};

export interface RedditToken {
  accessToken: string;
  /** Seconds until expiry, as reported by Reddit (typically 86400). */
  expiresInSec: number;
}

/** Parses the token response; returns null on any missing/ill-typed field. */
export const parseRedditToken = (json: unknown): RedditToken | null => {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;
  const token = obj.access_token;
  if (typeof token !== "string" || !token) return null;
  const expires = typeof obj.expires_in === "number" ? obj.expires_in : 3600;
  return { accessToken: token, expiresInSec: expires };
};

/**
 * Extracts the base-36 post id from a Reddit permalink
 * (…/comments/<id>/…). Returns null when the URL has no comments segment.
 */
export const redditPostIdFromUrl = (url: string): string | null => {
  if (typeof url !== "string") return null;
  const match = url.match(/\/comments\/([a-z0-9]+)/i);
  return match ? match[1] : null;
};

/**
 * Builds the oauth.reddit.com/api/info URL that hydrates several posts in one
 * call. Reddit "fullnames" for links are `t3_<id>`. Returns null for an empty
 * id list.
 */
export const buildRedditInfoUrl = (ids: string[]): string | null => {
  const clean = ids.filter((id) => typeof id === "string" && id.length > 0);
  if (clean.length === 0) return null;
  const names = clean.map((id) => `t3_${id}`).join(",");
  return `${REDDIT_OAUTH_BASE}/api/info?id=${encodeURIComponent(names)}`;
};

/**
 * Enriches curated seeds with the live listing from /api/info, keyed by post id.
 * Curated fields (teamCode, canonical url, and the fallback title/subreddit)
 * always win for identity; live fields (real title, author, score, comments)
 * layer on top. Posts absent from the listing keep their seed values, so a
 * partial Reddit outage degrades per-post rather than dropping the whole feed.
 * Order follows the curated seed, not Reddit's response order. Resilient:
 * returns the seeds unchanged on malformed input rather than throwing.
 */
export const mergeRedditListing = (
  seeds: RedditPost[],
  listingJson: unknown,
): RedditPost[] => {
  const liveById = new Map<string, Record<string, unknown>>();
  try {
    const children = (listingJson as { data?: { children?: unknown[] } })?.data?.children;
    if (Array.isArray(children)) {
      for (const child of children) {
        const data = (child as { data?: Record<string, unknown> })?.data;
        if (data && typeof data.id === "string") liveById.set(data.id, data);
      }
    }
  } catch {
    return seeds;
  }

  return seeds.map((seed) => {
    const live = liveById.get(seed.id);
    if (!live) return seed;
    const title = typeof live.title === "string" && live.title.trim() ? live.title.trim() : seed.title;
    const subredditPrefixed =
      typeof live.subreddit_name_prefixed === "string" ? live.subreddit_name_prefixed : seed.subreddit;
    const author = typeof live.author === "string" && live.author !== "[deleted]" ? live.author : undefined;
    const score = typeof live.score === "number" ? live.score : undefined;
    const numComments = typeof live.num_comments === "number" ? live.num_comments : undefined;
    return {
      ...seed,
      title,
      subreddit: subredditPrefixed,
      ...(author ? { author } : {}),
      ...(score !== undefined ? { score } : {}),
      ...(numComments !== undefined ? { numComments } : {}),
    };
  });
};

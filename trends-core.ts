// Pure logic for Google Trends "Trending now" (last 24h) data.
//
// IMPORTANT: this reads Google's internal `batchexecute` RPC (rpcid i0OFE) that
// powers https://trends.google.com/trending — the same dataset the UI exports to
// CSV. The older `/trending/rss` feed returns a different, much smaller and
// differently-ranked "Daily Search Trends" set, so it is NOT used.
//
// Extracted from server.ts so it can be unit-tested independently
// (tests/trends-core.test.ts). The endpoint that performs the POST lives in
// server.ts; this module only builds the request and transforms the response.

import type { GoogleTrendTopic } from "./src/types";

const TRENDS_RPC_ID = "i0OFE";

export const GOOGLE_TRENDS_BATCH_URL =
  "https://trends.google.com/_/TrendsUi/data/batchexecute" +
  "?rpcids=" + TRENDS_RPC_ID + "&source-path=%2Ftrending&hl=pt-BR";

// Builds the urlencoded POST body for the trending-now RPC.
// `hours` = trailing window (24 = last 24 hours); `geo` = country code.
export const buildGoogleTrendsRequestBody = (geo = "BR", hours = 24): string => {
  const innerArgs = JSON.stringify([null, null, geo, 0, "", hours, 1]);
  const fReq = JSON.stringify([[[TRENDS_RPC_ID, innerArgs]]]);
  return "f.req=" + encodeURIComponent(fReq);
};

// Formats a raw search-volume count into Google's pt-BR style ("2 mi+",
// "500 mil+", "200+"). Returns null for missing/zero volume.
export const formatTrafficPtBr = (volume: unknown): string | null => {
  if (typeof volume !== "number" || !Number.isFinite(volume) || volume <= 0) {
    return null;
  }
  const trim = (n: number) => Number(n.toFixed(1)).toLocaleString("pt-BR");
  if (volume >= 1_000_000) return `${trim(volume / 1_000_000)} mi+`;
  if (volume >= 1_000) return `${trim(volume / 1_000)} mil+`;
  return `${volume}+`;
};

/**
 * Parses the `batchexecute` response into trending topics. The response is a
 * `)]}'`-prefixed JSON array; the relevant row is `["wrb.fr","i0OFE","<json>"]`
 * whose third element is itself a JSON string of `[null,[ entry, entry, ... ]]`.
 * Each entry: [title, , geo, [startTs], , , volume, , growth, [relatedQueries], ...].
 *
 * Resilient to shape changes: returns [] rather than throwing on bad input.
 * Returns at most `limit` topics in Google's ranking order.
 */
export const parseGoogleTrendsBatch = (
  raw: string,
  limit = 12,
): GoogleTrendTopic[] => {
  if (typeof raw !== "string" || !raw.includes(TRENDS_RPC_ID)) {
    return [];
  }

  let entries: unknown[];
  try {
    const body = raw.replace(/^\)\]\}'\s*/, "");
    const outer = JSON.parse(body) as unknown[];
    const row = (outer as unknown[][]).find(
      (r) => Array.isArray(r) && r[1] === TRENDS_RPC_ID && typeof r[2] === "string",
    );
    if (!row) return [];
    const inner = JSON.parse(row[2] as string) as unknown[];
    entries = Array.isArray(inner[1]) ? (inner[1] as unknown[]) : [];
  } catch {
    return [];
  }

  const topics: GoogleTrendTopic[] = [];
  for (const entry of entries) {
    if (!Array.isArray(entry)) continue;
    const title = entry[0];
    if (typeof title !== "string" || !title.trim()) continue;
    topics.push({
      title: title.trim(),
      traffic: formatTrafficPtBr(entry[6]),
      pictureUrl: null,
      news: null,
    });
    if (topics.length >= limit) break;
  }

  return topics;
};

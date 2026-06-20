// Pure parsing logic for the Google Trends "Daily Search Trends" RSS feed.
// Extracted from server.ts so it can be unit-tested independently (see
// tests/trends-core.test.ts). The endpoint that fetches the feed lives in
// server.ts; this module only transforms the raw XML string into topics.

import type { GoogleTrendNewsItem, GoogleTrendTopic } from "./src/types";

export const buildGoogleTrendsRssUrl = (geo = "BR"): string =>
  `https://trends.google.com/trending/rss?geo=${encodeURIComponent(geo)}`;

const XML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
};

const decodeXml = (value: string): string =>
  value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(amp|lt|gt|quot|apos|#39);/g, (match) => XML_ENTITIES[match] ?? match)
    .trim();

const firstMatch = (block: string, tag: string): string | null => {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? decodeXml(match[1]) : null;
};

const parseFirstNewsItem = (itemBlock: string): GoogleTrendNewsItem | null => {
  const newsBlock = itemBlock.match(/<ht:news_item>([\s\S]*?)<\/ht:news_item>/);
  if (!newsBlock) return null;

  const title = firstMatch(newsBlock[1], "ht:news_item_title");
  const url = firstMatch(newsBlock[1], "ht:news_item_url");
  if (!title || !url) return null;

  return { title, url, source: firstMatch(newsBlock[1], "ht:news_item_source") };
};

/**
 * Parses the Google Trends RSS XML into a list of trending topics. Resilient to
 * missing optional fields; skips items without a usable title. Returns at most
 * `limit` topics in feed order (Google already ranks them by recency/volume).
 */
export const parseGoogleTrendsRss = (
  xml: string,
  limit = 12,
): GoogleTrendTopic[] => {
  if (typeof xml !== "string" || !xml.includes("<item>")) {
    return [];
  }

  const topics: GoogleTrendTopic[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = firstMatch(block, "title");
    if (!title) continue;

    topics.push({
      title,
      traffic: firstMatch(block, "ht:approx_traffic"),
      pictureUrl: firstMatch(block, "ht:picture"),
      news: parseFirstNewsItem(block),
    });

    if (topics.length >= limit) break;
  }

  return topics;
};

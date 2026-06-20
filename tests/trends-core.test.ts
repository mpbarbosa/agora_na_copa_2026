import assert from "node:assert/strict";
import test from "node:test";

import { buildGoogleTrendsRssUrl, parseGoogleTrendsRss } from "../trends-core";

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<rss xmlns:ht="https://trends.google.com/trending/rss" version="2.0">
  <channel>
    <title>Daily Search Trends</title>
    <item>
      <title>donyell malen</title>
      <ht:approx_traffic>200+</ht:approx_traffic>
      <link>https://trends.google.com/trending/rss?geo=BR</link>
      <ht:picture>https://example.com/malen.jpg</ht:picture>
      <ht:picture_source>de Volkskrant</ht:picture_source>
      <ht:news_item>
        <ht:news_item_title>Koeman stelt Brobbey op &amp; Malen valt af</ht:news_item_title>
        <ht:news_item_url>https://news.example.com/malen</ht:news_item_url>
        <ht:news_item_source>Sporza</ht:news_item_source>
      </ht:news_item>
    </item>
    <item>
      <title>países baixos</title>
      <ht:approx_traffic>1000+</ht:approx_traffic>
      <description/>
      <ht:news_item>
        <ht:news_item_title>Por que a Holanda é chamada de Países Baixos?</ht:news_item_title>
        <ht:news_item_url>https://news.example.com/paises-baixos</ht:news_item_url>
        <ht:news_item_source>UOL</ht:news_item_source>
      </ht:news_item>
    </item>
    <item>
      <title>topico sem noticia</title>
      <ht:approx_traffic>500+</ht:approx_traffic>
    </item>
  </channel>
</rss>`;

test("buildGoogleTrendsRssUrl defaults to Brazil and encodes geo", () => {
  assert.equal(
    buildGoogleTrendsRssUrl(),
    "https://trends.google.com/trending/rss?geo=BR",
  );
  assert.equal(
    buildGoogleTrendsRssUrl("US"),
    "https://trends.google.com/trending/rss?geo=US",
  );
});

test("parseGoogleTrendsRss extracts title, traffic, picture and first news item", () => {
  const topics = parseGoogleTrendsRss(SAMPLE_RSS);
  assert.equal(topics.length, 3);

  const [first] = topics;
  assert.equal(first.title, "donyell malen");
  assert.equal(first.traffic, "200+");
  assert.equal(first.pictureUrl, "https://example.com/malen.jpg");
  assert.deepEqual(first.news, {
    title: "Koeman stelt Brobbey op & Malen valt af", // XML entity decoded
    url: "https://news.example.com/malen",
    source: "Sporza",
  });
});

test("parseGoogleTrendsRss tolerates items without optional fields", () => {
  const topics = parseGoogleTrendsRss(SAMPLE_RSS);
  const last = topics[2];
  assert.equal(last.title, "topico sem noticia");
  assert.equal(last.traffic, "500+");
  assert.equal(last.pictureUrl, null);
  assert.equal(last.news, null);
});

test("parseGoogleTrendsRss honours the limit and feed order", () => {
  const topics = parseGoogleTrendsRss(SAMPLE_RSS, 2);
  assert.equal(topics.length, 2);
  assert.equal(topics[0].title, "donyell malen");
  assert.equal(topics[1].title, "países baixos");
});

test("parseGoogleTrendsRss returns [] for empty or malformed input", () => {
  assert.deepEqual(parseGoogleTrendsRss(""), []);
  assert.deepEqual(parseGoogleTrendsRss("<rss></rss>"), []);
  // Defensive against non-string input at runtime (e.g. a failed fetch body).
  assert.deepEqual(parseGoogleTrendsRss(null as unknown as string), []);
});

import assert from "node:assert/strict";
import test from "node:test";

import { parseSummary, buildTrafficDashboard } from "../traffic-report-core";

// A trimmed-but-representative snapshot in the exact format scripts/traffic-report.sh
// emits (see traffic-reports/summary-*.txt).
const SNAP_A = `Agora na Copa 26 — traffic baseline (Phase 0)
Generated: 2026-07-03T22:00:00+00:00
Source:    /var/log/nginx/agora-na-copa.access.log* (400000 log lines)

== Totals ==
Requests:       400000
Unique IPs:     2000
Date range:     03/Jul/2026:00:03:01  ->  24/Jun/2026:23:59:58

== Top 20 requested paths ==
 169000 /api/team-lineups
   1436 /api/player-stats/BRA/Atacante%20Teste
    900 /api/team-view/BRA

== HTTP status codes ==
 390000 200
   3000 404
    400 502

== Top 20 referrers ==
 399308 "-"
  76937 "https://copa2026.mpbarbosa.com/"
     14 rt=0.000

== Top countries ==
Geo source: /var/lib/GeoIP/GeoLite2-Country.mmdb
-- by unique visitor (top 20) --
   1190 Brazil
    856 United States
-- by request volume (top 20) --
 340327 Brazil
 119072 United States

== Requests by hour of day ==
  34522 00
  60679 01

== Requests by day ==
  69136 01/Jul/2026
  21811 02/Jul/2026

== Bot / crawler share ==
Bot-ish hits:   800 of 400000

== Suspect / synthetic paths (e2e test fixtures) ==
Suspect hits:   2900 of 400000
-- by source (count · ip · status · user-agent) --
   1647 177.60.79.191 404 agora-na-copa-2026/1.0
`;

const SNAP_B = SNAP_A.replace("Generated: 2026-07-03T22:00:00+00:00", "Generated: 2026-07-03T22:10:00+00:00").replace(
  "Requests:       400000",
  "Requests:       401000",
);

test("parseSummary extracts totals, geo, hour buckets and suspect sources", () => {
  const snap = parseSummary(SNAP_A, "summary-a.txt");
  assert.ok(snap);
  assert.equal(snap!.requests, 400000);
  assert.equal(snap!.uniqueIps, 2000);
  assert.equal(snap!.logLines, 400000);
  assert.equal(snap!.generatedMs, Date.parse("2026-07-03T22:00:00+00:00"));
  assert.equal(snap!.bots, 800);
  assert.equal(snap!.suspect, 2900);
  assert.equal(snap!.byHour["01"], 60679);
  assert.deepEqual(snap!.countriesByVisitor[0], { label: "Brazil", count: 1190 });
  assert.deepEqual(snap!.countriesByVolume[0], { label: "Brazil", count: 340327 });
  // Per-source IPs ARE parsed at the raw layer (they are dropped only in the projection).
  assert.equal(snap!.suspectSources[0].ip, "177.60.79.191");
});

test("parseSummary returns null when the Generated timestamp is missing/unparseable", () => {
  assert.equal(parseSummary("no header here", "x.txt"), null);
  assert.equal(parseSummary("Generated: not-a-date\n== Totals ==\n", "x.txt"), null);
});

test("buildTrafficDashboard derives the timeline, window rate and public latest", () => {
  const res = buildTrafficDashboard(
    [
      { file: "summary-b.txt", text: SNAP_B },
      { file: "summary-a.txt", text: SNAP_A }, // out of order on purpose
    ],
    "2026-07-03T22:10:05Z",
  );
  assert.equal(res.source, "traffic-log");
  assert.equal(res.snapshotCount, 2);
  // Sorted oldest-first by generated time.
  assert.equal(res.timeline[0].requests, 400000);
  assert.equal(res.timeline[1].requests, 401000);
  // First point has no rate; second = 1000 requests / 10 min = 100/min.
  assert.equal(res.timeline[0].ratePerMin, null);
  assert.equal(res.timeline[1].ratePerMin, 100);
  // Per-country cumulative counts (by volume) are carried into the timeline so the
  // client can derive a per-country requests/min series for the country filter.
  assert.equal(res.timeline[0].countries.Brazil, 340327);
  // Window rate across the whole span is the same here (single 10-min gap).
  assert.equal(res.windowRatePerMin, 100);
  // latest = the newer snapshot (B).
  assert.equal(res.latest!.file, "summary-b.txt");
});

test("buildTrafficDashboard projection drops IPs, synthetic paths and referrer noise", () => {
  const res = buildTrafficDashboard([{ file: "summary-a.txt", text: SNAP_A }], "2026-07-03T22:00:05Z");
  const latest = res.latest!;
  // No suspectSources / IP field leaks into the public shape.
  assert.equal((latest as unknown as Record<string, unknown>).suspectSources, undefined);
  // Synthetic e2e fixture path filtered out of top paths.
  assert.ok(!latest.topPaths.some((r) => /Atacante%20Teste/.test(r.label)));
  assert.ok(latest.topPaths.some((r) => r.label === "/api/team-lineups"));
  // Referrer "-" and rt=… noise dropped, surrounding quotes stripped.
  assert.ok(!latest.referrers.some((r) => r.label === '"-"' || /^rt=/.test(r.label)));
  assert.equal(latest.referrers[0].label, "https://copa2026.mpbarbosa.com/");
});

test("buildTrafficDashboard returns the fallback shape with no parseable snapshots", () => {
  const res = buildTrafficDashboard([{ file: "bad.txt", text: "junk" }], "2026-07-03T22:00:05Z");
  assert.equal(res.source, "fallback");
  assert.equal(res.snapshotCount, 0);
  assert.equal(res.latest, null);
  assert.deepEqual(res.timeline, []);
});

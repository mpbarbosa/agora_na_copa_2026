// traffic-report-core.ts — pure parser for the Phase 0 traffic snapshots in
// ./traffic-reports/summary-*.txt (produced by scripts/traffic-report.sh on the
// prod host and committed to the repo). Extracted from scripts/traffic-dashboard.mjs
// so the "Tráfego" tab of the Dashboard page can consume the same data through
// /api/traffic-dashboard, and so the parsing is independently unit-testable
// (tests/traffic-report-core.test.ts). No I/O — server.ts reads the files and
// hands the text in.
//
// The reports are cumulative totals over the whole nginx log window, so the
// requests/uniqueIps series are rising cumulative lines; the per-snapshot deltas
// (derived here) approximate the request rate between snapshots.
import type {
  TrafficCountRow,
  TrafficDashboardResponse,
  TrafficSnapshotLatest,
  TrafficTimelinePoint,
} from "./src/types";

// ── Parsing ────────────────────────────────────────────────────────────────

/** Split a summary file into `== Section ==` blocks keyed by their title. */
function splitSections(text: string): Record<string, string[]> {
  const sections: Record<string, string[]> = {};
  let current = "__head__";
  sections[current] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^==\s*(.+?)\s*==$/);
    if (m) {
      current = m[1];
      sections[current] = [];
    } else {
      sections[current].push(line);
    }
  }
  return sections;
}

/** Parse the "  <count> <label…>" rows common to most sections into [{label,count}]. */
function parseCountRows(lines: string[]): TrafficCountRow[] {
  const rows: TrafficCountRow[] = [];
  for (const raw of lines) {
    const m = raw.match(/^\s*(\d+)\s+(.+?)\s*$/);
    if (m) rows.push({ label: m[2], count: Number(m[1]) });
  }
  return rows;
}

interface GeoSection {
  geoSource: string | null;
  byVisitor: TrafficCountRow[];
  byVolume: TrafficCountRow[];
}

/**
 * Parse a geo section ("Top countries" / "Top cities") — one section holding a
 * "Geo source:" line plus two labelled sub-blocks ("by unique visitor" / "by
 * request volume") — into structured buckets. Country-level reports render the
 * city section as a hint with no numeric rows, so both buckets come back empty.
 */
function parseGeoSection(lines: string[] | undefined): GeoSection {
  const byVisitor: TrafficCountRow[] = [];
  const byVolume: TrafficCountRow[] = [];
  let bucket: TrafficCountRow[] | null = null;
  let geoSource: string | null = null;
  for (const line of lines || []) {
    if (/Geo source:/.test(line)) geoSource = line.replace(/.*Geo source:\s*/, "").trim();
    else if (/by unique visitor/.test(line)) bucket = byVisitor;
    else if (/by request volume/.test(line)) bucket = byVolume;
    else {
      const m = line.match(/^\s*(\d+)\s+(.+?)\s*$/);
      if (m && bucket) bucket.push({ label: m[2], count: Number(m[1]) });
    }
  }
  return { geoSource, byVisitor, byVolume };
}

/** A faithfully-parsed snapshot — includes the per-source IP breakdown, which the
 * public projection (buildTrafficDashboard) drops. */
export interface RawTrafficSnapshot {
  file: string;
  generated: string | null;
  generatedMs: number | null;
  logLines: number | null;
  requests: number | null;
  uniqueIps: number | null;
  dateRange: string | null;
  geoSource: string | null;
  topPaths: TrafficCountRow[];
  statusCodes: TrafficCountRow[];
  referrers: TrafficCountRow[];
  countriesByVisitor: TrafficCountRow[];
  countriesByVolume: TrafficCountRow[];
  citiesByVisitor: TrafficCountRow[];
  citiesByVolume: TrafficCountRow[];
  byHour: Record<string, number>;
  byDay: TrafficCountRow[];
  bots: number | null;
  suspect: number | null;
  /** Per-source (ip · status · ua) breakdown of synthetic hits. Never exposed publicly. */
  suspectSources: { count: number; ip: string; status: string; ua: string }[];
}

/** Parse one `summary-<stamp>.txt` into a RawTrafficSnapshot, or null when the
 * header lacks a parseable `Generated:` timestamp (unusable for the time series). */
export function parseSummary(text: string, file: string): RawTrafficSnapshot | null {
  const s = splitSections(text);
  const head = (s["__head__"] || []).join("\n");
  const totals = (s["Totals"] || []).join("\n");

  const grab = (re: RegExp, src = head): string | null => {
    const m = src.match(re);
    return m ? m[1].trim() : null;
  };

  const generated = grab(/Generated:\s*(\S+)/);
  const generatedMs = generated ? Date.parse(generated) : NaN;
  if (!generated || Number.isNaN(generatedMs)) return null;

  const logLines = Number(grab(/\((\d+)\s+log lines\)/)) || null;
  const requests = Number(grab(/Requests:\s*(\d+)/, totals)) || null;
  const uniqueIps = Number(grab(/Unique IPs:\s*(\d+)/, totals)) || null;
  const dateRange = grab(/Date range:\s*(.+)/, totals);

  const countries = parseGeoSection(s["Top countries"]);
  const cities = parseGeoSection(s["Top cities"]);
  const geoSource = countries.geoSource || cities.geoSource;

  const bots = Number(grab(/Bot-ish hits:\s*(\d+)/, (s["Bot / crawler share"] || []).join("\n")));
  const suspectLines = s["Suspect / synthetic paths (e2e test fixtures)"] || [];
  const suspect = Number(grab(/Suspect hits:\s*(\d+)/, suspectLines.join("\n")));

  // Newer reports break the synthetic traffic down by source: "count ip status ua".
  const suspectSources: RawTrafficSnapshot["suspectSources"] = [];
  for (const line of suspectLines) {
    const m = line.match(/^\s*(\d+)\s+(\d{1,3}(?:\.\d{1,3}){3})\s+(\S+)\s+(.+?)\s*$/);
    if (m) suspectSources.push({ count: Number(m[1]), ip: m[2], status: m[3], ua: m[4] });
  }

  // Hour-of-day rows are "count HH"; keep them keyed 00..23.
  const byHour: Record<string, number> = {};
  for (const { label, count } of parseCountRows(s["Requests by hour of day"] || [])) {
    if (/^\d{2}$/.test(label)) byHour[label] = count;
  }

  return {
    file,
    generated,
    generatedMs,
    logLines,
    requests,
    uniqueIps,
    dateRange,
    geoSource,
    topPaths: parseCountRows(s["Top 20 requested paths"] || []),
    statusCodes: parseCountRows(s["HTTP status codes"] || []),
    referrers: parseCountRows(s["Top 20 referrers"] || []),
    countriesByVisitor: countries.byVisitor,
    countriesByVolume: countries.byVolume,
    citiesByVisitor: cities.byVisitor,
    citiesByVolume: cities.byVolume,
    byHour,
    byDay: parseCountRows(s["Requests by day"] || []),
    bots: Number.isFinite(bots) ? bots : null,
    suspect: Number.isFinite(suspect) ? suspect : null,
    suspectSources,
  };
}

// ── Public projection ────────────────────────────────────────────────────────

// e2e-synthetic / infra fixtures we filter out of the "top paths" for a cleaner read.
const SYNTHETIC = /Atacante%20Teste|Goleiro%20Teste|Abdulilah%20Alamri|Clube%20Teste/;

/** Project a raw snapshot to the public shape — drops the per-source IP breakdown,
 * strips synthetic paths from top paths, and cleans referrer noise ("-", rt=… ). */
function projectLatest(snap: RawTrafficSnapshot): TrafficSnapshotLatest {
  return {
    file: snap.file,
    generated: snap.generated,
    requests: snap.requests,
    uniqueIps: snap.uniqueIps,
    logLines: snap.logLines,
    dateRange: snap.dateRange,
    geoSource: snap.geoSource,
    bots: snap.bots,
    suspect: snap.suspect,
    topPaths: snap.topPaths.filter((r) => !SYNTHETIC.test(r.label)),
    statusCodes: snap.statusCodes,
    referrers: snap.referrers
      .filter((r) => r.label !== '"-"' && !/^rt=/.test(r.label))
      .map((r) => ({ ...r, label: r.label.replace(/^"|"$/g, "") })),
    countriesByVisitor: snap.countriesByVisitor,
    countriesByVolume: snap.countriesByVolume,
    citiesByVisitor: snap.citiesByVisitor,
    citiesByVolume: snap.citiesByVolume,
    byHour: snap.byHour,
    byDay: snap.byDay,
  };
}

/**
 * Parse every committed summary file into the public `/api/traffic-dashboard`
 * payload: a cross-snapshot timeline (cumulative requests/IPs + derived rate)
 * plus the latest snapshot projected for public display. `files` is the raw
 * `{ file, text }` list read by the caller. Unparseable files are skipped.
 * With zero parseable snapshots this returns the `"fallback"` shape.
 */
export function buildTrafficDashboard(
  files: { file: string; text: string }[],
  updatedAt: string,
): TrafficDashboardResponse {
  const snaps = files
    .map(({ file, text }) => parseSummary(text, file))
    .filter((s): s is RawTrafficSnapshot => s !== null)
    .sort((a, b) => (a.generatedMs as number) - (b.generatedMs as number));

  if (snaps.length === 0) {
    return {
      source: "fallback",
      note: "Nenhum instantâneo de tráfego disponível.",
      updatedAt,
      snapshotCount: 0,
      windowRatePerMin: null,
      timeline: [],
      latest: null,
    };
  }

  const timeline: TrafficTimelinePoint[] = snaps.map((snap, i) => {
    let ratePerMin: number | null = null;
    if (i > 0) {
      const prev = snaps[i - 1];
      const dReq = (snap.requests || 0) - (prev.requests || 0);
      const dMin = ((snap.generatedMs as number) - (prev.generatedMs as number)) / 60000;
      if (dMin > 0) ratePerMin = Math.max(0, Math.round(dReq / dMin));
    }
    const countries: Record<string, number> = {};
    for (const row of snap.countriesByVolume) countries[row.label] = row.count;
    return {
      t: snap.generatedMs as number,
      requests: snap.requests || 0,
      uniqueIps: snap.uniqueIps || 0,
      ratePerMin,
      countries,
    };
  });

  const first = snaps[0];
  const latest = snaps[snaps.length - 1];
  const windowMin = ((latest.generatedMs as number) - (first.generatedMs as number)) / 60000;
  const windowRatePerMin =
    windowMin > 0 ? Math.round(((latest.requests || 0) - (first.requests || 0)) / windowMin) : null;

  return {
    source: "traffic-log",
    note: `Baseado em ${snaps.length} instantâneo${snaps.length === 1 ? "" : "s"} do log de acesso da produção.`,
    updatedAt,
    snapshotCount: snaps.length,
    windowRatePerMin,
    timeline,
    latest: projectLatest(latest),
  };
}

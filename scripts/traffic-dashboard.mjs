#!/usr/bin/env node
//
// traffic-dashboard.mjs — a local, dependency-free dashboard for the Phase 0
// traffic snapshots in ./traffic-reports/summary-*.txt (produced by
// scripts/traffic-report.sh on the prod host and committed here).
//
// It parses every committed `summary-<stamp>.txt`, reconstructs a time series
// across snapshots, and serves an interactive HTML dashboard with inline
// SVG/CSS charts (no charting lib — per this repo's "dashboard charts stay
// custom" convention). Node built-ins only; nothing to install.
//
// Usage:
//   node scripts/traffic-dashboard.mjs            # serve on http://localhost:4317
//   PORT=8080 node scripts/traffic-dashboard.mjs  # pick a port
//   node scripts/traffic-dashboard.mjs ./traffic-reports   # custom report dir
//
// Routes:
//   GET /            HTML dashboard (re-parses the report dir on each load)
//   GET /api/data    the parsed dataset as JSON
//
// The reports are cumulative totals over the whole nginx log window, so the
// "requests over time" curve is a rising cumulative line; the per-snapshot
// deltas (derived here) approximate the request rate between snapshots.

import { createServer } from "node:http";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, basename } from "node:path";

const PORT = Number(process.env.PORT) || 4317;
const REPORT_DIR = resolve(process.argv[2] || "traffic-reports");

// ── Parsing ────────────────────────────────────────────────────────────────

// Split a summary file into `== Section ==` blocks keyed by their title.
function splitSections(text) {
  const sections = {};
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

// Parse the "  <count> <label…>" rows common to most sections into [{label,count}].
function parseCountRows(lines) {
  const rows = [];
  for (const raw of lines) {
    const m = raw.match(/^\s*(\d+)\s+(.+?)\s*$/);
    if (m) rows.push({ label: m[2], count: Number(m[1]) });
  }
  return rows;
}

function parseSummary(text, file) {
  const s = splitSections(text);
  const head = (s["__head__"] || []).join("\n");
  const totals = (s["Totals"] || []).join("\n");

  const grab = (re, src = head) => {
    const m = src.match(re);
    return m ? m[1].trim() : null;
  };

  const generated = grab(/Generated:\s*(\S+)/);
  const logLines = Number(grab(/\((\d+)\s+log lines\)/)) || null;
  const requests = Number(grab(/Requests:\s*(\d+)/, totals)) || null;
  const uniqueIps = Number(grab(/Unique IPs:\s*(\d+)/, totals)) || null;
  const dateRange = grab(/Date range:\s*(.+)/, totals);

  // Top countries has two labelled sub-blocks in one section.
  const countryLines = s["Top countries"] || [];
  const byVisitor = [];
  const byVolume = [];
  let bucket = null;
  let geoSource = null;
  for (const line of countryLines) {
    if (/Geo source:/.test(line)) geoSource = line.replace(/.*Geo source:\s*/, "").trim();
    else if (/by unique visitor/.test(line)) bucket = byVisitor;
    else if (/by request volume/.test(line)) bucket = byVolume;
    else {
      const m = line.match(/^\s*(\d+)\s+(.+?)\s*$/);
      if (m && bucket) bucket.push({ label: m[2], count: Number(m[1]) });
    }
  }

  const bots = Number(grab(/Bot-ish hits:\s*(\d+)/, (s["Bot / crawler share"] || []).join("\n")));
  const suspectLines = s["Suspect / synthetic paths (e2e test fixtures)"] || [];
  const suspect = Number(grab(/Suspect hits:\s*(\d+)/, suspectLines.join("\n")));

  // Newer reports break the synthetic traffic down by source: "count ip status ua".
  const suspectSources = [];
  for (const line of suspectLines) {
    const m = line.match(/^\s*(\d+)\s+(\d{1,3}(?:\.\d{1,3}){3})\s+(\S+)\s+(.+?)\s*$/);
    if (m) suspectSources.push({ count: Number(m[1]), ip: m[2], status: m[3], ua: m[4] });
  }

  // Newer reports also embed a "Delta vs. previous snapshot" section with the
  // top per-path movers already computed on the host: "path prev cur delta d/min".
  const movers = [];
  for (const line of s["Delta vs. previous snapshot"] || []) {
    const m = line.match(/^(\S+)\s+(\d+)\s+(\d+)\s+([+-]?\d+)\s+([+-]?[\d.]+)\s*$/);
    if (m && m[1] !== "path") {
      movers.push({ path: m[1], prev: Number(m[2]), cur: Number(m[3]), delta: Number(m[4]), perMin: Number(m[5]) });
    }
  }

  // Hour-of-day rows are "count HH"; keep them keyed 00..23.
  const byHour = {};
  for (const { label, count } of parseCountRows(s["Requests by hour of day"] || [])) {
    if (/^\d{2}$/.test(label)) byHour[label] = count;
  }

  return {
    file: basename(file),
    generated,
    generatedMs: generated ? Date.parse(generated) : null,
    logLines,
    requests,
    uniqueIps,
    dateRange,
    geoSource,
    topPaths: parseCountRows(s["Top 20 requested paths"] || []),
    statusCodes: parseCountRows(s["HTTP status codes"] || []),
    referrers: parseCountRows(s["Top 20 referrers"] || []),
    countriesByVisitor: byVisitor,
    countriesByVolume: byVolume,
    byHour,
    byDay: parseCountRows(s["Requests by day"] || []),
    bots: Number.isFinite(bots) ? bots : null,
    suspect: Number.isFinite(suspect) ? suspect : null,
    suspectSources,
    movers,
  };
}

function loadReports(dir) {
  let files;
  try {
    files = readdirSync(dir).filter((f) => /^summary-.*\.txt$/.test(f));
  } catch (err) {
    return { error: `Cannot read report dir ${dir}: ${err.message}`, snapshots: [] };
  }
  const snapshots = files
    .map((f) => {
      const full = join(dir, f);
      try {
        return parseSummary(readFileSync(full, "utf8"), full);
      } catch (err) {
        return { file: f, parseError: err.message };
      }
    })
    .filter((s) => s.generatedMs) // drop unparseable
    .sort((a, b) => a.generatedMs - b.generatedMs);
  return { dir, snapshots };
}

// ── Chart helpers (inline SVG, self-contained) ──────────────────────────────

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const fmt = (n) => (n == null ? "—" : n.toLocaleString("en-US"));

// Categorical palette (accessible, works on the dark surface below).
const PALETTE = ["#38bdf8", "#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#fb7185", "#60a5fa", "#f59e0b"];

const STATUS_COLORS = {
  "2xx": "#34d399",
  "3xx": "#60a5fa",
  "4xx": "#fbbf24",
  "5xx": "#fb7185",
  other: "#94a3b8",
};

function statusClass(code) {
  const n = Number(code);
  if (n >= 200 && n < 300) return "2xx";
  if (n >= 300 && n < 400) return "3xx";
  if (n >= 400 && n < 500) return "4xx";
  if (n >= 500 && n < 600) return "5xx";
  return "other";
}

// Human-readable reason phrase + one-line meaning for the HTTP status codes we
// actually see in nginx access logs (used for the status-chip tooltips).
const STATUS_TEXT = {
  200: "OK — request succeeded and the response body was returned.",
  201: "Created — request succeeded and a new resource was created.",
  204: "No Content — request succeeded but there is no body to return.",
  206: "Partial Content — a byte-range of the resource was returned (resumable/streamed download).",
  301: "Moved Permanently — the resource has a new permanent URL; clients should update.",
  302: "Found — temporary redirect to another URL.",
  304: "Not Modified — the client's cached copy is still fresh; no body sent.",
  307: "Temporary Redirect — like 302 but the method must not change.",
  308: "Permanent Redirect — like 301 but the method must not change.",
  400: "Bad Request — the server could not understand the request (malformed syntax).",
  401: "Unauthorized — authentication is required or has failed.",
  403: "Forbidden — the server understood the request but refuses to authorize it.",
  404: "Not Found — the requested path does not exist on the server.",
  405: "Method Not Allowed — the HTTP method is not supported for this resource.",
  408: "Request Timeout — the client took too long to send the request.",
  409: "Conflict — the request conflicts with the current state of the resource.",
  410: "Gone — the resource used to exist but has been permanently removed.",
  413: "Payload Too Large — the request body exceeds the server's limit.",
  414: "URI Too Long — the requested URL is longer than the server will accept.",
  429: "Too Many Requests — the client is being rate-limited.",
  444: "No Response (nginx) — nginx closed the connection without a response (often bot/abuse blocking).",
  499: "Client Closed Request (nginx) — the client disconnected before the server replied.",
  500: "Internal Server Error — the server hit an unexpected condition.",
  501: "Not Implemented — the server does not support the functionality required.",
  502: "Bad Gateway — the upstream (app) server returned an invalid response.",
  503: "Service Unavailable — the server is overloaded or down for maintenance.",
  504: "Gateway Timeout — the upstream (app) server did not respond in time.",
};

const CLASS_TEXT = {
  "2xx": "Success — the request was received, understood and accepted.",
  "3xx": "Redirection — further action is needed to complete the request.",
  "4xx": "Client error — the request looks wrong (bad path, auth, method…).",
  "5xx": "Server error — the server failed to fulfil a valid request.",
  other: "Non-standard or informational status.",
};

// Describe a status code (or class label like "4xx") for a tooltip.
function statusDescription(code) {
  if (CLASS_TEXT[code]) return `${code} — ${CLASS_TEXT[code]}`;
  const n = Number(code);
  if (Number.isFinite(n) && STATUS_TEXT[n]) return `${n} — ${STATUS_TEXT[n]}`;
  return `${code} — ${CLASS_TEXT[statusClass(code)]}`;
}

// Horizontal bar list — good for ranked categorical data (paths, countries).
function barList(rows, { max = 12, color = PALETTE[0], unit = "" } = {}) {
  const top = rows.slice(0, max);
  const peak = Math.max(1, ...top.map((r) => r.count));
  return `<div class="bars">${top
    .map((r) => {
      const pct = (r.count / peak) * 100;
      const c = typeof color === "function" ? color(r) : color;
      return `<div class="bar-row" title="${esc(r.label)}: ${fmt(r.count)}">
        <span class="bar-label">${esc(r.label)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${pct.toFixed(1)}%;background:${c}"></span></span>
        <span class="bar-val">${fmt(r.count)}${unit}</span>
      </div>`;
    })
    .join("")}</div>`;
}

// Multi-series line chart over snapshot timestamps.
function lineChart(series, { width = 720, height = 260 } = {}) {
  const pad = { l: 56, r: 16, t: 16, b: 34 };
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const allX = series[0]?.points.map((p) => p.x) || [];
  if (allX.length < 2) return `<p class="muted">Need at least two snapshots to plot a trend.</p>`;
  const xMin = Math.min(...allX);
  const xMax = Math.max(...allX);
  const yMax = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.y)));
  const sx = (x) => pad.l + ((x - xMin) / (xMax - xMin || 1)) * iw;
  const sy = (y) => pad.t + ih - (y / yMax) * ih;

  const yticks = 4;
  const grid = Array.from({ length: yticks + 1 }, (_, i) => {
    const y = (yMax / yticks) * i;
    return `<line x1="${pad.l}" y1="${sy(y).toFixed(1)}" x2="${width - pad.r}" y2="${sy(y).toFixed(1)}" class="grid"/>
      <text x="${pad.l - 8}" y="${(sy(y) + 4).toFixed(1)}" class="axis" text-anchor="end">${fmt(Math.round(y))}</text>`;
  }).join("");

  const xLabels = [0, Math.floor((allX.length - 1) / 2), allX.length - 1]
    .map((i) => {
      const x = allX[i];
      const d = new Date(x);
      const lbl = `${String(d.getUTCMonth() + 1).padStart(2, "0")}/${String(d.getUTCDate()).padStart(2, "0")} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
      return `<text x="${sx(x).toFixed(1)}" y="${height - 10}" class="axis" text-anchor="middle">${lbl}</text>`;
    })
    .join("");

  const lines = series
    .map((s, i) => {
      const c = PALETTE[i % PALETTE.length];
      const d = s.points.map((p, j) => `${j ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
      const dots = s.points
        .map((p) => `<circle cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="2.5" fill="${c}"><title>${esc(s.name)}: ${fmt(p.y)}</title></circle>`)
        .join("");
      return `<path d="${d}" fill="none" stroke="${c}" stroke-width="2"/>${dots}`;
    })
    .join("");

  const legend = series
    .map((s, i) => `<span class="lg"><span class="sw" style="background:${PALETTE[i % PALETTE.length]}"></span>${esc(s.name)}</span>`)
    .join("");

  return `<div class="legend">${legend}</div>
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" class="chart">${grid}${lines}${xLabels}</svg>`;
}

// Vertical bar chart keyed 00..23 for the hour-of-day histogram.
function hourChart(byHour, { width = 720, height = 220 } = {}) {
  const pad = { l: 44, r: 12, t: 12, b: 26 };
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const vals = hours.map((h) => byHour[h] || 0);
  const yMax = Math.max(1, ...vals);
  const bw = iw / 24;
  const sy = (y) => pad.t + ih - (y / yMax) * ih;
  const bars = vals
    .map((v, i) => {
      const x = pad.l + i * bw + bw * 0.12;
      const w = bw * 0.76;
      const y = sy(v);
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${(pad.t + ih - y).toFixed(1)}" fill="${PALETTE[0]}" rx="2"><title>${hours[i]}h: ${fmt(v)}</title></rect>`;
    })
    .join("");
  const labels = hours
    .filter((_, i) => i % 3 === 0)
    .map((h, k) => {
      const i = k * 3;
      return `<text x="${(pad.l + i * bw + bw / 2).toFixed(1)}" y="${height - 8}" class="axis" text-anchor="middle">${h}</text>`;
    })
    .join("");
  const yticks = [0, yMax / 2, yMax]
    .map((y) => `<text x="${pad.l - 6}" y="${(sy(y) + 4).toFixed(1)}" class="axis" text-anchor="end">${fmt(Math.round(y))}</text>`)
    .join("");
  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" class="chart">${bars}${labels}${yticks}</svg>`;
}

// ── Page ─────────────────────────────────────────────────────────────────────

function renderPage(data) {
  if (data.error || !data.snapshots.length) {
    return `<!doctype html><meta charset="utf-8"><title>Traffic dashboard</title>
      <body style="font-family:system-ui;background:#0f172a;color:#e2e8f0;padding:40px">
      <h1>No traffic snapshots found</h1>
      <p>${esc(data.error || `No parseable summary-*.txt files in ${REPORT_DIR}`)}</p></body>`;
  }

  const snaps = data.snapshots;
  const latest = snaps[snaps.length - 1];
  const first = snaps[0];

  // Time series: cumulative requests + unique IPs across snapshots.
  const reqSeries = { name: "Requests (cumulative)", points: snaps.map((s) => ({ x: s.generatedMs, y: s.requests || 0 })) };
  const ipSeries = { name: "Unique IPs (cumulative)", points: snaps.map((s) => ({ x: s.generatedMs, y: s.uniqueIps || 0 })) };

  // Per-snapshot request rate (delta / minutes elapsed) — the real "how busy now".
  const rateSeries = { name: "Requests / min (between snapshots)", points: [] };
  for (let i = 1; i < snaps.length; i++) {
    const dReq = (snaps[i].requests || 0) - (snaps[i - 1].requests || 0);
    const dMin = (snaps[i].generatedMs - snaps[i - 1].generatedMs) / 60000;
    if (dMin > 0) rateSeries.points.push({ x: snaps[i].generatedMs, y: Math.max(0, Math.round(dReq / dMin)) });
  }

  // Status codes: aggregate the latest snapshot by class for a clean summary.
  const statusByClass = {};
  for (const r of latest.statusCodes) {
    const cls = statusClass(r.label);
    statusByClass[cls] = (statusByClass[cls] || 0) + r.count;
  }
  const statusRows = Object.entries(statusByClass)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
  const statusTotal = statusRows.reduce((a, r) => a + r.count, 0) || 1;

  // Filter e2e-synthetic + infra paths out of the "top paths" for a cleaner read,
  // but keep the raw list available too.
  const SYNTHETIC = /Atacante%20Teste|Goleiro%20Teste|Abdulilah%20Alamri|Clube%20Teste/;
  const realPaths = latest.topPaths.filter((r) => !SYNTHETIC.test(r.label));

  const botPct = latest.requests ? ((latest.bots || 0) / latest.requests) * 100 : 0;
  const suspectPct = latest.requests ? ((latest.suspect || 0) / latest.requests) * 100 : 0;

  const windowReqs = (latest.requests || 0) - (first.requests || 0);
  const windowMin = (latest.generatedMs - first.generatedMs) / 60000;
  const windowRate = windowMin > 0 ? Math.round(windowReqs / windowMin) : null;

  const statTile = (label, value, sub = "") =>
    `<div class="tile"><div class="tile-val">${value}</div><div class="tile-label">${esc(label)}</div>${sub ? `<div class="tile-sub">${esc(sub)}</div>` : ""}</div>`;

  const card = (title, body, sub = "") =>
    `<section class="card"><h2>${esc(title)}${sub ? `<span class="card-sub">${esc(sub)}</span>` : ""}</h2>${body}</section>`;

  const referrerRows = latest.referrers
    .filter((r) => r.label !== '"-"' && !/^rt=/.test(r.label))
    .map((r) => ({ ...r, label: r.label.replace(/^"|"$/g, "") }));

  const statusDetail = latest.statusCodes
    .slice()
    .sort((a, b) => b.count - a.count)
    .map((r) => `<span class="chip" style="border-color:${STATUS_COLORS[statusClass(r.label)]}" title="${esc(statusDescription(r.label))}">${esc(r.label)} · ${fmt(r.count)}</span>`)
    .join("");

  // Per-path movers (host-computed delta vs. the previous snapshot).
  const moverRows = latest.movers
    .filter((m) => m.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 12);
  const moversBody = moverRows.length
    ? `<table><thead><tr><th>Path</th><th class="n">Now</th><th class="n">Δ</th><th class="n">/min</th></tr></thead><tbody>${moverRows
        .map(
          (m) =>
            `<tr><td>${esc(m.path)}</td><td class="n">${fmt(m.cur)}</td><td class="n">${m.delta > 0 ? "+" : ""}${fmt(
              m.delta
            )}</td><td class="n">${m.perMin.toFixed(1)}</td></tr>`
        )
        .join("")}</tbody></table>`
    : `<p class="muted">No per-snapshot delta in this report.</p>`;

  // Synthetic-traffic sources (e2e fixtures / 404 probes) by IP.
  const suspectBody = latest.suspectSources.length
    ? `<table><thead><tr><th>Source IP</th><th>Status</th><th>User-agent</th><th class="n">Hits</th></tr></thead><tbody>${latest.suspectSources
        .slice(0, 10)
        .map(
          (r) =>
            `<tr><td>${esc(r.ip)}</td><td><span class="chip" style="border-color:${STATUS_COLORS[statusClass(
              r.status
            )]}" title="${esc(statusDescription(r.status))}">${esc(r.status)}</span></td><td>${esc(
              r.ua
            )}</td><td class="n">${fmt(r.count)}</td></tr>`
        )
        .join("")}</tbody></table>`
    : `<p class="muted">No per-source breakdown in this report.</p>`;

  const genLocal = new Date(latest.generatedMs).toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Agora na Copa 26 — Traffic Dashboard</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    background:#0b1220; color:#e2e8f0; line-height:1.45; }
  header { padding:22px 24px; border-bottom:1px solid #1e293b;
    background:linear-gradient(180deg,#111c33,#0b1220); }
  header h1 { margin:0; font-size:20px; letter-spacing:.3px; }
  header .meta { color:#94a3b8; font-size:13px; margin-top:4px; }
  main { max-width:1200px; margin:0 auto; padding:20px 16px 60px; }
  .tiles { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-bottom:20px; }
  .tile { background:#111c33; border:1px solid #1e293b; border-radius:12px; padding:14px 16px; }
  .tile-val { font-size:26px; font-weight:700; font-variant-numeric:tabular-nums; }
  .tile-label { color:#94a3b8; font-size:12px; text-transform:uppercase; letter-spacing:.5px; margin-top:2px; }
  .tile-sub { color:#64748b; font-size:12px; margin-top:4px; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  @media (max-width:820px){ .grid2 { grid-template-columns:1fr; } }
  .card { background:#111c33; border:1px solid #1e293b; border-radius:14px; padding:16px 18px; margin-bottom:16px; overflow:hidden; }
  .card h2 { margin:0 0 12px; font-size:14px; text-transform:uppercase; letter-spacing:.6px; color:#cbd5e1;
    display:flex; justify-content:space-between; align-items:baseline; gap:10px; }
  .card-sub { font-size:11px; color:#64748b; text-transform:none; letter-spacing:0; font-weight:400; }
  .chart { width:100%; height:auto; display:block; }
  .grid { stroke:#1e293b; stroke-width:1; }
  .axis { fill:#64748b; font-size:11px; font-family:ui-monospace,monospace; }
  .legend { display:flex; flex-wrap:wrap; gap:14px; margin-bottom:6px; font-size:12px; color:#cbd5e1; }
  .lg { display:inline-flex; align-items:center; gap:6px; }
  .sw { width:12px; height:12px; border-radius:3px; display:inline-block; }
  .bars { display:flex; flex-direction:column; gap:7px; }
  .bar-row { display:grid; grid-template-columns:minmax(0,1fr) 130px auto; align-items:center; gap:10px; font-size:13px; }
  .bar-label { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#cbd5e1; font-family:ui-monospace,monospace; }
  .bar-track { background:#1e293b; border-radius:5px; height:14px; overflow:hidden; }
  .bar-fill { display:block; height:100%; border-radius:5px; }
  .bar-val { font-variant-numeric:tabular-nums; color:#e2e8f0; text-align:right; min-width:64px; }
  .statusbar { display:flex; height:22px; border-radius:6px; overflow:hidden; margin-bottom:10px; }
  .statusbar span { display:block; }
  .chips { display:flex; flex-wrap:wrap; gap:6px; }
  .chip { border:1px solid #334155; border-radius:999px; padding:2px 9px; font-size:12px; font-family:ui-monospace,monospace; color:#e2e8f0; }
  .muted { color:#64748b; font-size:13px; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  td,th { text-align:left; padding:5px 8px; border-bottom:1px solid #1e293b; }
  td.n,th.n { text-align:right; font-variant-numeric:tabular-nums; font-family:ui-monospace,monospace; }
  a { color:#38bdf8; text-decoration:none; }
  footer { color:#475569; font-size:12px; text-align:center; padding:20px; }
</style></head>
<body>
<header>
  <h1>⚽ Agora na Copa 26 — Traffic Dashboard</h1>
  <div class="meta">${snaps.length} snapshots · latest <strong>${esc(genLocal)}</strong> · source ${esc(latest.geoSource ? "geo: " + latest.geoSource : "nginx access log")} · <a href="/api/data">JSON</a></div>
</header>
<main>
  <div class="tiles">
    ${statTile("Total requests", fmt(latest.requests), "cumulative in log window")}
    ${statTile("Unique IPs", fmt(latest.uniqueIps))}
    ${statTile("Avg req/min", windowRate == null ? "—" : fmt(windowRate), "across snapshot window")}
    ${statTile("Bot-ish share", botPct.toFixed(1) + "%", fmt(latest.bots) + " hits")}
    ${statTile("Synthetic (e2e)", suspectPct.toFixed(1) + "%", fmt(latest.suspect) + " hits")}
    ${statTile("Log lines", fmt(latest.logLines))}
  </div>

  ${card("Cumulative traffic over snapshots", lineChart([reqSeries, ipSeries]))}

  ${card("Request rate (derived per-snapshot)", rateSeries.points.length ? lineChart([rateSeries]) : `<p class="muted">Need ≥2 snapshots.</p>`, "requests/min between consecutive snapshots")}

  <div class="grid2">
    ${card(
      "Top paths",
      barList(realPaths, { max: 12, color: PALETTE[0] }),
      "e2e-synthetic paths excluded"
    )}
    ${card(
      "Requests by hour of day (UTC)",
      hourChart(latest.byHour)
    )}
  </div>

  ${card(
    "HTTP status codes",
    `<div class="statusbar">${statusRows
      .map((r) => `<span style="width:${((r.count / statusTotal) * 100).toFixed(2)}%;background:${STATUS_COLORS[r.label]}" title="${esc(statusDescription(r.label))} (${fmt(r.count)})"></span>`)
      .join("")}</div>
     <div class="chips">${statusDetail}</div>`
  )}

  <div class="grid2">
    ${card(
      "Top countries (unique visitors)",
      latest.countriesByVisitor.length
        ? barList(latest.countriesByVisitor, { max: 10, color: (r) => (/Brazil/.test(r.label) ? PALETTE[4] : PALETTE[1]) })
        : `<p class="muted">No geo data in this snapshot.</p>`
    )}
    ${card(
      "Top countries (request volume)",
      latest.countriesByVolume.length
        ? barList(latest.countriesByVolume, { max: 10, color: (r) => (/Brazil/.test(r.label) ? PALETTE[4] : PALETTE[6]) })
        : `<p class="muted">No geo data in this snapshot.</p>`
    )}
  </div>

  <div class="grid2">
    ${card(
      "Requests by day",
      barList(
        latest.byDay.slice().sort((a, b) => Date.parse(a.label.replace(/(\d+)\/(\w+)\/(\d+)/, "$2 $1 $3")) - Date.parse(b.label.replace(/(\d+)\/(\w+)\/(\d+)/, "$2 $1 $3"))),
        { max: 20, color: PALETTE[6] }
      )
    )}
    ${card(
      "Top referrers",
      referrerRows.length
        ? `<table><thead><tr><th>Referrer</th><th class="n">Hits</th></tr></thead><tbody>${referrerRows
            .slice(0, 12)
            .map((r) => `<tr><td>${esc(r.label)}</td><td class="n">${fmt(r.count)}</td></tr>`)
            .join("")}</tbody></table>`
        : `<p class="muted">Only direct/unknown referrers.</p>`
    )}
  </div>

  <div class="grid2">
    ${card("Top movers since last snapshot", moversBody, latest.movers.length ? "host-computed Δ · per-minute rate" : "")}
    ${card("Synthetic traffic sources", suspectBody, "e2e fixtures · 404/499 probes")}
  </div>

  ${card(
    "Snapshot history",
    `<table><thead><tr><th>Generated (UTC)</th><th class="n">Requests</th><th class="n">Δ</th><th class="n">Unique IPs</th><th class="n">Bots</th></tr></thead><tbody>${snaps
      .slice()
      .reverse()
      .map((s, i, arr) => {
        const prev = arr[i + 1];
        const d = prev ? (s.requests || 0) - (prev.requests || 0) : null;
        return `<tr><td>${esc(new Date(s.generatedMs).toISOString().replace("T", " ").replace(/\.\d+Z$/, ""))}</td><td class="n">${fmt(s.requests)}</td><td class="n">${d == null ? "—" : "+" + fmt(d)}</td><td class="n">${fmt(s.uniqueIps)}</td><td class="n">${fmt(s.bots)}</td></tr>`;
      })
      .join("")}</tbody></table>`
  )}
</main>
<footer>Parsed from ${esc(REPORT_DIR)} · reloads on refresh · charts are dependency-free inline SVG</footer>
</body></html>`;
}

// ── Server ─────────────────────────────────────────────────────────────────

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/data") {
    const data = loadReports(REPORT_DIR);
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data, null, 2));
    return;
  }
  if (url.pathname === "/" || url.pathname === "/index.html") {
    const data = loadReports(REPORT_DIR);
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(renderPage(data));
    return;
  }
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, () => {
  let n = 0;
  try {
    n = readdirSync(REPORT_DIR).filter((f) => /^summary-.*\.txt$/.test(f)).length;
  } catch {}
  console.log(`Traffic dashboard → http://localhost:${PORT}`);
  console.log(`Reading ${n} snapshot(s) from ${REPORT_DIR}`);
  console.log(`JSON API   → http://localhost:${PORT}/api/data`);
});

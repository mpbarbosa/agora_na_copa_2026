import { Fragment, type ReactNode } from "react";
import { getActiveLocale, localeToIntlTag, useT } from "../../i18n";

/**
 * Presentational, dependency-free chart primitives for the Dashboard, built from plain
 * SVG/CSS so they inherit the project's glassmorphism look and theme ternaries (no chart
 * library, which also keeps the prod bundle / esbuild externals untouched). Each takes
 * already-aggregated data from `src/dashboardStats.ts`.
 */

type Theme = "classic-light" | "stadium-dark";

/** Brand-leaning categorical palettes (light / dark), reused across the multi-series charts. */
export const SERIES_PALETTE: Record<Theme, string[]> = {
  "classic-light": ["#009c3b", "#0033a0", "#db1730", "#f5a623", "#7b2ff7", "#0e7c86"],
  "stadium-dark": ["#00e476", "#4f8cff", "#ff5c7a", "#ffc94d", "#b57bff", "#36d0de"],
};

const accent = (theme: Theme) => (theme === "classic-light" ? "#009c3b" : "#00e476");

interface CardProps {
  theme: Theme;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  /** Optional control (e.g. a filter) shown at the top-right of the card header. */
  headerAction?: ReactNode;
}

/** The shared glass panel every chart sits in — Anton title + JetBrains-mono subtitle. */
export function ChartCard({ theme, title, subtitle, children, className, headerAction }: CardProps) {
  const isLight = theme === "classic-light";
  const cardClasses = isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#121414] border-white/10";
  const headingClasses = isLight ? "text-slate-900" : "text-white";
  const subtleClasses = isLight ? "text-slate-500" : "text-slate-400";
  return (
    <section className={`rounded-3xl border p-5 ${cardClasses} ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={`font-anton text-lg uppercase tracking-wide ${headingClasses}`}>{title}</h3>
          {subtitle && (
            <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${subtleClasses}`}>
              {subtitle}
            </p>
          )}
        </div>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

interface StatCardProps {
  theme: Theme;
  label: string;
  value: string | number;
  hint?: string;
  /** Optional override accent for the value (defaults to the brand green). */
  accentColor?: string;
}

/** A single headline KPI tile: big mono number, small uppercase label. */
export function StatCard({ theme, label, value, hint, accentColor }: StatCardProps) {
  const isLight = theme === "classic-light";
  const cardClasses = isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#121414] border-white/10";
  const labelClasses = isLight ? "text-slate-500" : "text-slate-400";
  const hintClasses = isLight ? "text-slate-400" : "text-slate-500";
  return (
    <div className={`rounded-2xl border p-4 ${cardClasses}`}>
      <p className={`font-mono text-[10px] uppercase tracking-wider ${labelClasses}`}>{label}</p>
      <p
        className="mt-1 font-anton text-3xl md:text-4xl leading-none tabular-nums"
        style={{ color: accentColor ?? accent(theme) }}
      >
        {value}
      </p>
      {hint && (
        <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${hintClasses}`}>{hint}</p>
      )}
    </div>
  );
}

export interface HorizontalBarDatum {
  label: string;
  value: number;
  /** Optional per-bar colour; falls back to the brand accent. */
  color?: string;
  /** Optional secondary text shown right of the label (e.g. a confederation code). */
  sublabel?: string;
}

interface HorizontalBarsProps {
  theme: Theme;
  data: HorizontalBarDatum[];
}

/** Horizontal bars sized to the max value; label left, filled track, value right. */
export function HorizontalBars({ theme, data }: HorizontalBarsProps) {
  const isLight = theme === "classic-light";
  const max = Math.max(1, ...data.map((d) => d.value));
  const trackClasses = isLight ? "bg-slate-100" : "bg-white/5";
  const labelClasses = isLight ? "text-slate-700" : "text-slate-200";
  const subClasses = isLight ? "text-slate-400" : "text-slate-500";
  const valueClasses = isLight ? "text-slate-900" : "text-white";
  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <div className="w-28 shrink-0 truncate text-right">
            <span className={`font-archivo text-xs ${labelClasses}`}>{d.label}</span>
            {d.sublabel && (
              <span className={`ml-1 font-mono text-[9px] uppercase ${subClasses}`}>{d.sublabel}</span>
            )}
          </div>
          <div className={`relative h-3 flex-1 overflow-hidden rounded-full ${trackClasses}`}>
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color ?? accent(theme) }}
            />
          </div>
          <span className={`w-7 shrink-0 text-right font-mono text-xs tabular-nums ${valueClasses}`}>
            {d.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export interface GroupedBarRow {
  label: string;
  sublabel?: string;
  /** One entry per phase/series, aligned to the `legend` order. */
  bars: { value: number; color: string }[];
}

interface GroupedBarsProps {
  theme: Theme;
  data: GroupedBarRow[];
  /** Series legend (phase name + colour), in the same order as each row's `bars`. */
  legend: { label: string; color: string }[];
}

/**
 * Grouped horizontal bars: each category (row) holds several thin bars — one per series
 * (e.g. tournament phase) — sharing one global scale so phases compare across rows. A
 * colour legend names the series. Used for the continent × phase funnel.
 */
export function GroupedBars({ theme, data, legend }: GroupedBarsProps) {
  const isLight = theme === "classic-light";
  const max = Math.max(1, ...data.flatMap((d) => d.bars.map((b) => b.value)));
  const trackClasses = isLight ? "bg-slate-100" : "bg-white/5";
  const labelClasses = isLight ? "text-slate-700" : "text-slate-200";
  const subClasses = isLight ? "text-slate-400" : "text-slate-500";
  const valueClasses = isLight ? "text-slate-900" : "text-white";
  const legendClasses = isLight ? "text-slate-600" : "text-slate-300";
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {legend.map((l) => (
          <li key={l.label} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: l.color }} />
            <span className={`font-mono text-[10px] uppercase tracking-wider ${legendClasses}`}>
              {l.label}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3">
        {data.map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <div className="w-28 shrink-0 truncate text-right">
              <span className={`font-archivo text-xs ${labelClasses}`}>{row.label}</span>
              {row.sublabel && (
                <span className={`ml-1 font-mono text-[9px] uppercase ${subClasses}`}>{row.sublabel}</span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              {row.bars.map((bar, i) => (
                <div key={legend[i]?.label ?? i} className="flex items-center gap-2">
                  <div className={`relative h-2.5 flex-1 overflow-hidden rounded-full ${trackClasses}`}>
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
                      style={{ width: `${(bar.value / max) * 100}%`, backgroundColor: bar.color }}
                    />
                  </div>
                  <span className={`w-7 shrink-0 text-right font-mono text-xs tabular-nums ${valueClasses}`}>
                    {bar.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface VerticalBarDatum {
  label: string;
  value: number;
}

interface VerticalBarsProps {
  theme: Theme;
  data: VerticalBarDatum[];
  color?: string;
}

/** Compact column chart for many small categories (e.g. the 12 groups). */
export function VerticalBars({ theme, data, color }: VerticalBarsProps) {
  const isLight = theme === "classic-light";
  const max = Math.max(1, ...data.map((d) => d.value));
  const trackClasses = isLight ? "bg-slate-100" : "bg-white/5";
  const labelClasses = isLight ? "text-slate-500" : "text-slate-400";
  const valueClasses = isLight ? "text-slate-700" : "text-slate-200";
  return (
    <div className="flex items-end justify-between gap-1.5" style={{ height: 160 }}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <span className={`font-mono text-[10px] tabular-nums ${valueClasses}`}>{d.value}</span>
          <div className={`flex w-full flex-1 items-end overflow-hidden rounded-md ${trackClasses}`}>
            <div
              className="w-full rounded-md transition-[height] duration-700 ease-out"
              style={{ height: `${(d.value / max) * 100}%`, backgroundColor: color ?? accent(theme) }}
            />
          </div>
          <span className={`font-mono text-[10px] uppercase ${labelClasses}`}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export interface LinePoint {
  /** X value (here: epoch-ms of a traffic snapshot). */
  x: number;
  y: number;
}

export interface LineSeries {
  name: string;
  points: LinePoint[];
  color?: string;
}

interface LineChartProps {
  theme: Theme;
  series: LineSeries[];
  /** Formats a Y value for the axis ticks + point tooltips (defaults to pt-BR integer). */
  formatValue?: (n: number) => string;
  /** Formats an X value for the (3) axis labels (defaults to a UTC dd/MM HH:mm stamp). */
  formatX?: (x: number) => string;
}

const fmtInt = (n: number): string => new Intl.NumberFormat(localeToIntlTag(getActiveLocale())).format(n);
const defaultXLabel = (x: number): string => {
  const d = new Date(x);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

/**
 * Dependency-free multi-series SVG line chart with a shared Y axis. Used by the
 * "Tráfego" tab for the cumulative-requests and request-rate time series; feed it
 * one series at a time to keep the axis readable. Needs ≥2 points to draw a trend.
 */
export function LineChart({ theme, series, formatValue = (n) => fmtInt(n), formatX = defaultXLabel }: LineChartProps) {
  const t = useT();
  const isLight = theme === "classic-light";
  const gridColor = isLight ? "#e2e8f0" : "#334155";
  const tickTextColor = isLight ? "#64748b" : "#94a3b8";
  const palette = SERIES_PALETTE[theme];

  const W = 720;
  const H = 260;
  const pad = { l: 56, r: 16, t: 16, b: 34 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  const allX = series[0]?.points.map((p) => p.x) ?? [];
  if (allX.length < 2) {
    const mutedClasses = isLight ? "text-slate-500" : "text-slate-400";
    return (
      <p className={`py-10 text-center font-mono text-xs uppercase tracking-wider ${mutedClasses}`}>
        {t("dashboard.lineChartNeedTwoPoints")}
      </p>
    );
  }

  const xMin = Math.min(...allX);
  const xMax = Math.max(...allX);
  const yMax = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.y)));
  const sx = (x: number) => pad.l + ((x - xMin) / (xMax - xMin || 1)) * iw;
  const sy = (y: number) => pad.t + ih - (y / yMax) * ih;

  const yTicks = 4;
  const yLines = Array.from({ length: yTicks + 1 }, (_, i) => (yMax / yTicks) * i);
  const xLabelIdx = [0, Math.floor((allX.length - 1) / 2), allX.length - 1];

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s, i) => (
          <span key={s.name} className={`inline-flex items-center gap-1.5 font-mono text-[11px] ${tickTextColor === "#64748b" ? "text-slate-600" : "text-slate-300"}`}>
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color ?? palette[i % palette.length] }} />
            {s.name}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="w-full" role="img" aria-label={series.map((s) => s.name).join(", ")}>
        {yLines.map((y) => (
          <g key={`y${y}`}>
            <line x1={pad.l} y1={sy(y)} x2={W - pad.r} y2={sy(y)} stroke={gridColor} strokeWidth={1} />
            <text x={pad.l - 8} y={sy(y) + 4} textAnchor="end" fontSize={11} fill={tickTextColor} fontFamily="monospace">
              {formatValue(Math.round(y))}
            </text>
          </g>
        ))}
        {series.map((s, i) => {
          const c = s.color ?? palette[i % palette.length];
          const d = s.points.map((p, j) => `${j ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
          return (
            <g key={s.name}>
              <path d={d} fill="none" stroke={c} strokeWidth={2} />
              {s.points.map((p) => (
                <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={2.5} fill={c}>
                  <title>{`${s.name}: ${formatValue(p.y)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
        {xLabelIdx.map((idx) => (
          <text key={`x${idx}`} x={sx(allX[idx])} y={H - 10} textAnchor="middle" fontSize={11} fill={tickTextColor} fontFamily="monospace">
            {formatX(allX[idx])}
          </text>
        ))}
      </svg>
    </div>
  );
}

export interface ScatterDatum {
  x: number;
  y: number;
}

interface ScatterPlotProps {
  theme: Theme;
  data: ScatterDatum[];
  /** Upper bound of the x axis; the series max is used when larger. */
  xMax?: number;
  xLabel: string;
  yLabel: string;
  /** Dashed reference lines on the x axis (e.g. half-time / full-time), with captions. */
  xMarkers?: { x: number; label: string }[];
  color?: string;
}

/**
 * Dependency-free SVG scatter plot. A fixed 640×260 viewBox scales responsively; data
 * coordinates map into the padded plot area. Dots are translucent so overlaps read as
 * density. X ticks every 15 units, Y ticks at whole numbers up to the series max.
 */
export function ScatterPlot({
  theme,
  data,
  xMax,
  xLabel,
  yLabel,
  xMarkers = [],
  color,
}: ScatterPlotProps) {
  const t = useT();
  const isLight = theme === "classic-light";
  const axisColor = isLight ? "#cbd5e1" : "#334155";
  const tickTextColor = isLight ? "#64748b" : "#94a3b8";
  const markerColor = isLight ? "#94a3b8" : "#64748b";
  const dotColor = color ?? accent(theme);

  const W = 640;
  const H = 260;
  const m = { top: 14, right: 16, bottom: 30, left: 30 };
  const plotW = W - m.left - m.right;
  const plotH = H - m.top - m.bottom;

  const dataXMax = data.reduce((max, d) => Math.max(max, d.x), 0);
  const xTop = Math.max(xMax ?? 0, dataXMax, 1);
  const yTop = Math.max(1, ...data.map((d) => d.y));

  const px = (x: number) => m.left + (x / xTop) * plotW;
  const py = (y: number) => m.top + plotH - (y / yTop) * plotH;

  const xTicks: number[] = [];
  for (let t = 0; t <= xTop; t += 15) xTicks.push(t);
  const yTicks = Array.from({ length: yTop + 1 }, (_, i) => i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t("dashboard.scatterAria", { yLabel, xLabel })}>
      {/* Y gridlines + ticks */}
      {yTicks.map((t) => (
        <g key={`y${t}`}>
          <line x1={m.left} y1={py(t)} x2={W - m.right} y2={py(t)} stroke={axisColor} strokeWidth={0.5} opacity={t === 0 ? 1 : 0.4} />
          <text x={m.left - 6} y={py(t) + 3} textAnchor="end" fontSize={10} fill={tickTextColor} fontFamily="monospace">
            {t}
          </text>
        </g>
      ))}
      {/* X ticks */}
      {xTicks.map((t) => (
        <g key={`x${t}`}>
          <line x1={px(t)} y1={m.top + plotH} x2={px(t)} y2={m.top + plotH + 4} stroke={axisColor} strokeWidth={0.5} />
          <text x={px(t)} y={m.top + plotH + 16} textAnchor="middle" fontSize={10} fill={tickTextColor} fontFamily="monospace">
            {t}
          </text>
        </g>
      ))}
      {/* Reference markers (half-time / full-time) */}
      {xMarkers.map((mk) => (
        <g key={`mk${mk.x}`}>
          <line x1={px(mk.x)} y1={m.top} x2={px(mk.x)} y2={m.top + plotH} stroke={markerColor} strokeWidth={0.75} strokeDasharray="3 3" />
          <text x={px(mk.x)} y={m.top + 9} textAnchor="middle" fontSize={9} fill={markerColor} fontFamily="monospace">
            {mk.label}
          </text>
        </g>
      ))}
      {/* Data points */}
      {data.map((d) => (
        <circle key={`${d.x}-${d.y}`} cx={px(d.x)} cy={py(d.y)} r={4} fill={dotColor} opacity={0.7} />
      ))}
      {/* Axis captions */}
      <text x={m.left + plotW / 2} y={H - 1} textAnchor="middle" fontSize={9} fill={tickTextColor} fontFamily="monospace" letterSpacing="0.08em">
        {xLabel.toUpperCase()}
      </text>
      <text transform={`rotate(-90 9 ${m.top + plotH / 2})`} x={9} y={m.top + plotH / 2} textAnchor="middle" fontSize={9} fill={tickTextColor} fontFamily="monospace" letterSpacing="0.08em">
        {yLabel.toUpperCase()}
      </text>
    </svg>
  );
}

export interface HeatMapRow {
  /** Row label (e.g. a group letter). */
  label: string;
  /** One value per column, aligned to `columns`. */
  cells: number[];
  /** Optional precomputed row total; falls back to summing `cells`. */
  total?: number;
}

interface HeatMapProps {
  theme: Theme;
  /** Column headers, left to right. */
  columns: string[];
  rows: HeatMapRow[];
  /** Value of the hottest cell, driving the colour scale (≥1). */
  maxCell: number;
  /** Small caption over the row-label column, e.g. "Grupo". */
  rowHeader?: string;
  /** Render the right-hand per-row total column (default true). */
  showTotals?: boolean;
  /** Cell tooltip text; defaults to "label · column · value". */
  formatCellTitle?: (rowLabel: string, column: string, value: number) => string;
}

/**
 * Dependency-free heat-map: a CSS grid of cells shaded by a single-hue (brand green)
 * sequential ramp — alpha scales with each cell's share of `maxCell`, so darker = more.
 * Zero cells fall back to the track colour; the count sits inside each non-empty cell
 * with intensity-aware contrast. A compact "menos → mais" swatch legend anchors the
 * scale. Used for the Dashboard "goals by group × 15-min interval".
 */
export function HeatMap({
  theme,
  columns,
  rows,
  maxCell,
  rowHeader = "",
  showTotals = true,
  formatCellTitle = (label, column, value) => `${label} · ${column} · ${value}`,
}: HeatMapProps) {
  const t = useT();
  const isLight = theme === "classic-light";
  const rgb = isLight ? "0,156,59" : "0,228,118";
  const trackColor = isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)";
  const headClasses = isLight ? "text-slate-500" : "text-slate-400";
  const labelClasses = isLight ? "text-slate-700" : "text-slate-200";
  const totalClasses = isLight ? "text-slate-900" : "text-white";
  const denom = Math.max(1, maxCell);
  const templateCols = `2rem repeat(${columns.length}, minmax(0, 1fr))${showTotals ? " 2rem" : ""}`;

  const cellStyle = (v: number) => {
    if (v <= 0) return { backgroundColor: trackColor, color: "transparent" };
    const intensity = v / denom;
    const alpha = 0.16 + 0.84 * intensity;
    const text = isLight
      ? intensity >= 0.5
        ? "#ffffff"
        : "#0f172a"
      : intensity >= 0.45
        ? "#04231a"
        : "#cbd5e1";
    return { backgroundColor: `rgba(${rgb},${alpha.toFixed(3)})`, color: text };
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid items-center gap-1" style={{ gridTemplateColumns: templateCols }}>
        {/* Header row */}
        <span className={`font-mono text-[9px] uppercase tracking-wider ${headClasses}`}>{rowHeader}</span>
        {columns.map((c) => (
          <span key={c} className={`text-center font-mono text-[9px] uppercase tracking-wider ${headClasses}`}>
            {c}
          </span>
        ))}
        {showTotals && (
          <span className={`text-center font-mono text-[9px] uppercase tracking-wider ${headClasses}`}>Σ</span>
        )}

        {/* Data rows */}
        {rows.map((row) => (
          <Fragment key={row.label}>
            <span className={`pr-1 text-right font-archivo text-xs ${labelClasses}`}>{row.label}</span>
            {row.cells.map((v, i) => (
              <div
                key={columns[i] ?? i}
                title={formatCellTitle(row.label, columns[i] ?? "", v)}
                className="flex h-9 items-center justify-center rounded font-mono text-[10px] tabular-nums transition-colors"
                style={cellStyle(v)}
              >
                {v || ""}
              </div>
            ))}
            {showTotals && (
              <span className={`text-center font-mono text-[10px] tabular-nums ${totalClasses}`}>
                {row.total ?? row.cells.reduce((s, n) => s + n, 0)}
              </span>
            )}
          </Fragment>
        ))}
      </div>

      {/* Scale legend */}
      <div className={`flex items-center gap-1.5 self-end font-mono text-[9px] uppercase tracking-wider ${headClasses}`}>
        <span>{t("dashboard.heatmapLegendLess")}</span>
        {[0.12, 0.35, 0.58, 0.81, 1].map((step) => (
          <span
            key={step}
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: `rgba(${rgb},${(0.16 + 0.84 * step).toFixed(3)})` }}
          />
        ))}
        <span>{t("dashboard.heatmapLegendMore")}</span>
      </div>
    </div>
  );
}

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutProps {
  theme: Theme;
  segments: DonutSegment[];
  centerValue: string | number;
  centerLabel: string;
}

/**
 * SVG donut: a radius-15.915 circle has circumference ~100, so each segment's
 * stroke-dasharray maps straight to its percentage of the total. Segments are laid
 * head-to-tail via a running negative dashoffset. A legend lists value + share.
 */
export function Donut({ theme, segments, centerValue, centerLabel }: DonutProps) {
  const isLight = theme === "classic-light";
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const trackColor = isLight ? "#eef2f1" : "#23282a";
  const centerValueClasses = isLight ? "text-slate-900" : "text-white";
  const centerLabelClasses = isLight ? "text-slate-500" : "text-slate-400";
  const legendLabelClasses = isLight ? "text-slate-600" : "text-slate-300";
  const legendValueClasses = isLight ? "text-slate-900" : "text-white";

  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <circle cx="18" cy="18" r="15.915" fill="none" stroke={trackColor} strokeWidth="3.6" />
          {total > 0 &&
            segments.map((s) => {
              const pct = (s.value / total) * 100;
              const circle = (
                <circle
                  key={s.label}
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke={s.color}
                  strokeWidth="3.6"
                  strokeDasharray={`${pct} ${100 - pct}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += pct;
              return circle;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-anton text-2xl leading-none tabular-nums ${centerValueClasses}`}>
            {centerValue}
          </span>
          <span className={`font-mono text-[9px] uppercase tracking-wider ${centerLabelClasses}`}>
            {centerLabel}
          </span>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className={`font-archivo text-xs ${legendLabelClasses}`}>{s.label}</span>
            <span className={`font-mono text-xs tabular-nums ${legendValueClasses}`}>{s.value}</span>
            <span className="font-mono text-[10px] tabular-nums text-slate-400">
              {total > 0 ? `${Math.round((s.value / total) * 100)}%` : "0%"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

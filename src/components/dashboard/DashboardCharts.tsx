import type { ReactNode } from "react";

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
}

/** The shared glass panel every chart sits in — Anton title + JetBrains-mono subtitle. */
export function ChartCard({ theme, title, subtitle, children, className }: CardProps) {
  const isLight = theme === "classic-light";
  const cardClasses = isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#121414] border-white/10";
  const headingClasses = isLight ? "text-slate-900" : "text-white";
  const subtleClasses = isLight ? "text-slate-500" : "text-slate-400";
  return (
    <section className={`rounded-3xl border p-5 ${cardClasses} ${className ?? ""}`}>
      <h3 className={`font-anton text-lg uppercase tracking-wide ${headingClasses}`}>{title}</h3>
      {subtitle && (
        <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${subtleClasses}`}>
          {subtitle}
        </p>
      )}
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

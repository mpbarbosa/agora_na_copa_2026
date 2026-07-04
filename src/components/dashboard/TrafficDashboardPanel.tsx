import { useEffect, useMemo, useState } from "react";
import type { TrafficCountRow, TrafficDashboardResponse, TrafficSnapshotLatest } from "../../types";
import { ChartCard, LineChart, StatCard, SERIES_PALETTE, type LineSeries } from "./DashboardCharts";

interface TrafficDashboardPanelProps {
  theme: "classic-light" | "stadium-dark";
}

const ptInt = new Intl.NumberFormat("pt-BR");
const fmt = (n: number | null | undefined): string => (n == null ? "—" : ptInt.format(n));

// HTTP status classes → colour + pt-BR meaning, aggregated for the status bar.
const STATUS_CLASS_COLOR: Record<string, string> = {
  "2xx": "#22c55e",
  "3xx": "#3b82f6",
  "4xx": "#f59e0b",
  "5xx": "#ef4444",
  other: "#94a3b8",
};
const STATUS_CLASS_LABEL: Record<string, string> = {
  "2xx": "Sucesso (2xx)",
  "3xx": "Redirecionamento (3xx)",
  "4xx": "Erro do cliente (4xx)",
  "5xx": "Erro do servidor (5xx)",
  other: "Outros",
};
const statusClass = (code: string): string => {
  const n = Number(code);
  if (n >= 200 && n < 300) return "2xx";
  if (n >= 300 && n < 400) return "3xx";
  if (n >= 400 && n < 500) return "4xx";
  if (n >= 500 && n < 600) return "5xx";
  return "other";
};

/** Compact horizontal bar list sized to the max value — handles long path labels
 * (truncated with a hover title) and 6-figure counts, which the generic
 * HorizontalBars primitive is too narrow for. */
function BarList({
  theme,
  rows,
  max = 12,
  color,
}: {
  theme: "classic-light" | "stadium-dark";
  rows: TrafficCountRow[];
  max?: number;
  color?: string | ((row: TrafficCountRow) => string);
}) {
  const isLight = theme === "classic-light";
  const shown = rows.slice(0, max);
  const top = Math.max(1, ...shown.map((r) => r.count));
  const trackClasses = isLight ? "bg-slate-100" : "bg-white/5";
  const labelClasses = isLight ? "text-slate-700" : "text-slate-200";
  const valueClasses = isLight ? "text-slate-900" : "text-white";
  const base = SERIES_PALETTE[theme][1];
  if (shown.length === 0) {
    return (
      <p className={`py-6 text-center font-mono text-xs uppercase tracking-wider ${isLight ? "text-slate-400" : "text-slate-500"}`}>
        Sem dados neste instantâneo
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {shown.map((r) => (
        <div key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <div className="min-w-0">
            <div className={`truncate font-mono text-[11px] ${labelClasses}`} title={r.label}>
              {r.label}
            </div>
            <div className={`mt-0.5 h-2 overflow-hidden rounded-full ${trackClasses}`}>
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{
                  width: `${(r.count / top) * 100}%`,
                  backgroundColor: typeof color === "function" ? color(r) : color ?? base,
                }}
              />
            </div>
          </div>
          <span className={`shrink-0 pl-1 text-right font-mono text-[11px] tabular-nums ${valueClasses}`}>
            {fmt(r.count)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Hour-of-day histogram (00..23, UTC) — 24 slim columns, ticks at 0/6/12/18/23. */
function HourBars({ theme, byHour }: { theme: "classic-light" | "stadium-dark"; byHour: Record<string, number> }) {
  const isLight = theme === "classic-light";
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const values = hours.map((h) => byHour[h] ?? 0);
  const top = Math.max(1, ...values);
  const trackClasses = isLight ? "bg-slate-100" : "bg-white/5";
  const labelClasses = isLight ? "text-slate-500" : "text-slate-400";
  const fill = SERIES_PALETTE[theme][0];
  return (
    <div>
      <div className="flex items-end justify-between gap-[3px]" style={{ height: 140 }}>
        {hours.map((h, i) => (
          <div key={h} className="flex flex-1 items-end" style={{ height: "100%" }} title={`${h}h · ${fmt(values[i])} req`}>
            <div className={`w-full overflow-hidden rounded-t-sm ${trackClasses}`} style={{ height: "100%", display: "flex", alignItems: "flex-end" }}>
              <div className="w-full rounded-t-sm transition-[height] duration-700 ease-out" style={{ height: `${(values[i] / top) * 100}%`, backgroundColor: fill }} />
            </div>
          </div>
        ))}
      </div>
      <div className={`mt-1 flex justify-between font-mono text-[9px] uppercase ${labelClasses}`}>
        {["00", "06", "12", "18", "23"].map((h) => (
          <span key={h}>{h}h</span>
        ))}
      </div>
    </div>
  );
}

/** Stacked status-code bar (aggregated by class) + per-class chips. */
function StatusCodes({ theme, statusCodes }: { theme: "classic-light" | "stadium-dark"; statusCodes: TrafficCountRow[] }) {
  const isLight = theme === "classic-light";
  const byClass = new Map<string, number>();
  for (const r of statusCodes) {
    const cls = statusClass(r.label);
    byClass.set(cls, (byClass.get(cls) ?? 0) + r.count);
  }
  const rows = [...byClass.entries()].map(([cls, count]) => ({ cls, count })).sort((a, b) => b.count - a.count);
  const total = rows.reduce((sum, r) => sum + r.count, 0) || 1;
  const chipClasses = isLight ? "border-slate-200 text-slate-700" : "border-white/15 text-slate-200";
  return (
    <div>
      <div className="flex h-5 w-full overflow-hidden rounded-md">
        {rows.map((r) => (
          <div
            key={r.cls}
            style={{ width: `${(r.count / total) * 100}%`, backgroundColor: STATUS_CLASS_COLOR[r.cls] }}
            title={`${STATUS_CLASS_LABEL[r.cls]} · ${fmt(r.count)}`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {rows.map((r) => (
          <span key={r.cls} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] ${chipClasses}`}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_CLASS_COLOR[r.cls] }} />
            {STATUS_CLASS_LABEL[r.cls]} · {fmt(r.count)}
          </span>
        ))}
      </div>
    </div>
  );
}

// Order the "DD/Mon/YYYY" day rows chronologically for the by-day chart.
const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};
const dayKey = (label: string): number => {
  const m = label.match(/(\d+)\/(\w+)\/(\d+)/);
  if (!m) return 0;
  return Date.UTC(Number(m[3]), MONTHS[m[2]] ?? 0, Number(m[1]));
};

/**
 * "Tráfego" tab of the Dashboard page. Fetches /api/traffic-dashboard — the
 * committed nginx access-log snapshots parsed by traffic-report-core — and renders
 * the ops overview (traffic over time, request rate, top paths, hour/day buckets,
 * status codes, and country/city geography). Aggregate only: no visitor IPs. Shows
 * a friendly notice while loading or when no snapshots are available.
 */
export function TrafficDashboardPanel({ theme }: TrafficDashboardPanelProps) {
  const isLight = theme === "classic-light";
  const mutedClasses = isLight ? "text-slate-500" : "text-slate-400";
  const [data, setData] = useState<TrafficDashboardResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/traffic-dashboard")
      .then((res) => (res.ok ? (res.json() as Promise<TrafficDashboardResponse>) : null))
      .then((payload) => {
        if (cancelled) return;
        if (payload) setData(payload);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const palette = SERIES_PALETTE[theme];
  const brazilColor = (row: TrafficCountRow) => (/Brazil|Brasil/i.test(row.label) ? palette[0] : palette[1]);

  const series = useMemo(() => {
    if (!data) return { requests: [] as LineSeries[], rate: [] as LineSeries[] };
    const requests: LineSeries = {
      name: "Requisições (acumulado)",
      color: palette[1],
      points: data.timeline.map((p) => ({ x: p.t, y: p.requests })),
    };
    const ratePts = data.timeline.filter((p) => p.ratePerMin != null);
    const rate: LineSeries = {
      name: "Requisições/min",
      color: palette[2],
      points: ratePts.map((p) => ({ x: p.t, y: p.ratePerMin as number })),
    };
    return { requests: [requests], rate: [rate] };
    // palette is stable per theme
  }, [data, palette]);

  if (failed) {
    return (
      <p className={`mt-8 py-16 text-center font-mono text-xs uppercase tracking-wider ${mutedClasses}`}>
        Não foi possível carregar o painel de tráfego
      </p>
    );
  }

  if (!data) {
    return (
      <p className={`mt-8 py-16 text-center font-mono text-xs uppercase tracking-wider ${mutedClasses}`}>
        Carregando dados de tráfego…
      </p>
    );
  }

  if (!data.latest || data.snapshotCount === 0) {
    return (
      <p className={`mt-8 py-16 text-center font-mono text-xs uppercase tracking-wider ${mutedClasses}`}>
        Nenhum instantâneo de tráfego disponível ainda
      </p>
    );
  }

  const latest: TrafficSnapshotLatest = data.latest;
  const botPct = latest.requests ? ((latest.bots ?? 0) / latest.requests) * 100 : 0;
  const suspectPct = latest.requests ? ((latest.suspect ?? 0) / latest.requests) * 100 : 0;
  const genLabel = latest.generated
    ? new Date(latest.generated).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "—";
  const hasCities = latest.citiesByVisitor.length > 0 || latest.citiesByVolume.length > 0;

  return (
    <div className="mt-4">
      <p className={`mb-4 font-mono text-[11px] uppercase tracking-wider ${mutedClasses}`}>
        {data.snapshotCount} instantâneo{data.snapshotCount === 1 ? "" : "s"} · atualizado em {genLabel}
        {latest.geoSource ? " · geo: GeoLite2" : ""}
      </p>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard theme={theme} label="Requisições" value={fmt(latest.requests)} hint="na janela do log" />
        <StatCard theme={theme} label="IPs únicos" value={fmt(latest.uniqueIps)} />
        <StatCard theme={theme} label="Média req/min" value={fmt(data.windowRatePerMin)} hint="na janela" />
        <StatCard theme={theme} label="Bots" value={`${botPct.toFixed(1).replace(".", ",")}%`} hint={`${fmt(latest.bots)} hits`} accentColor="#f59e0b" />
        <StatCard theme={theme} label="Sintético (e2e)" value={`${suspectPct.toFixed(1).replace(".", ",")}%`} hint={`${fmt(latest.suspect)} hits`} accentColor="#94a3b8" />
        <StatCard theme={theme} label="Linhas de log" value={fmt(latest.logLines)} />
      </div>

      {/* Time series */}
      <div className="mt-4">
        <ChartCard theme={theme} title="Tráfego acumulado" subtitle="requisições acumuladas na janela do log · por instantâneo">
          <LineChart theme={theme} series={series.requests} />
        </ChartCard>
      </div>
      <div className="mt-4">
        <ChartCard theme={theme} title="Ritmo de requisições" subtitle="requisições/min entre instantâneos consecutivos">
          <LineChart theme={theme} series={series.rate} />
        </ChartCard>
      </div>

      {/* Paths + hours */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard theme={theme} title="Rotas mais acessadas" subtitle="rotas sintéticas de e2e excluídas">
          <BarList theme={theme} rows={latest.topPaths} max={12} color={palette[1]} />
        </ChartCard>
        <ChartCard theme={theme} title="Requisições por hora (UTC)" subtitle="distribuição ao longo do dia">
          <HourBars theme={theme} byHour={latest.byHour} />
        </ChartCard>
      </div>

      {/* Status codes */}
      <div className="mt-4">
        <ChartCard theme={theme} title="Códigos de status HTTP" subtitle="agrupados por classe">
          <StatusCodes theme={theme} statusCodes={latest.statusCodes} />
        </ChartCard>
      </div>

      {/* Countries */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard theme={theme} title="Países (visitantes únicos)" subtitle="top 10 por IP único">
          <BarList theme={theme} rows={latest.countriesByVisitor} max={10} color={brazilColor} />
        </ChartCard>
        <ChartCard theme={theme} title="Países (volume de requisições)" subtitle="top 10 por requisições">
          <BarList theme={theme} rows={latest.countriesByVolume} max={10} color={brazilColor} />
        </ChartCard>
      </div>

      {/* Cities */}
      {hasCities && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard theme={theme} title="Cidades (visitantes únicos)" subtitle="menos precisas que país · bucket (unknown) esperado">
            <BarList theme={theme} rows={latest.citiesByVisitor} max={10} color={brazilColor} />
          </ChartCard>
          <ChartCard theme={theme} title="Cidades (volume de requisições)" subtitle="menos precisas que país · bucket (unknown) esperado">
            <BarList theme={theme} rows={latest.citiesByVolume} max={10} color={brazilColor} />
          </ChartCard>
        </div>
      )}

      {/* By day + referrers */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard theme={theme} title="Requisições por dia" subtitle="cada dia da janela do log">
          <BarList
            theme={theme}
            rows={latest.byDay.slice().sort((a, b) => dayKey(a.label) - dayKey(b.label))}
            max={20}
            color={palette[3]}
          />
        </ChartCard>
        <ChartCard theme={theme} title="Principais referenciadores" subtitle="origem do tráfego">
          <BarList theme={theme} rows={latest.referrers} max={12} color={palette[4]} />
        </ChartCard>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import type { Match } from "../types";
import { computeStandings } from "../standings";
import { formatAnalysisTimestamp } from "../utils/dateFormat";
import {
  continentByPhase,
  goalScorerTeams,
  goalsByGroup,
  goalsByGroupAndInterval,
  goalsByMinute,
  goalsByPhase,
  matchStatusBreakdown,
  topScoringTeams,
  tournamentTotals,
  type MatchStatusKey,
} from "../dashboardStats";
import {
  ChartCard,
  Donut,
  GroupedBars,
  HeatMap,
  HorizontalBars,
  ScatterPlot,
  StatCard,
  VerticalBars,
  type DonutSegment,
} from "./dashboard/DashboardCharts";
import { TrafficDashboardPanel } from "./dashboard/TrafficDashboardPanel";

type DashboardTab = "panorama" | "trafego";

const DASHBOARD_TABS: { id: DashboardTab; label: string }[] = [
  { id: "panorama", label: "Panorama" },
  { id: "trafego", label: "Tráfego" },
];

interface DashboardViewProps {
  theme: "classic-light" | "stadium-dark";
  matches: Match[];
}

const STATUS_COLORS: Record<"classic-light" | "stadium-dark", Record<MatchStatusKey, string>> = {
  "classic-light": { finished: "#009c3b", live: "#db1730", upcoming: "#94a3b8" },
  "stadium-dark": { finished: "#00e476", live: "#ff5c7a", upcoming: "#64748b" },
};

// Phase series for the continent funnel: group stage → Round of 32 → Round of 16.
const PHASE_COLORS: Record<
  "classic-light" | "stadium-dark",
  { groupStage: string; roundOf32: string; roundOf16: string }
> = {
  "classic-light": { groupStage: "#0033a0", roundOf32: "#009c3b", roundOf16: "#e8730c" },
  "stadium-dark": { groupStage: "#4f8cff", roundOf32: "#00e476", roundOf16: "#ffa94d" },
};

const integer = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

/**
 * "Dashboard" tab — a tournament overview built from the live `matches` state and the
 * reconciled group standings. KPI tiles up top, then four charts: teams per continent,
 * goals per group, matches by situation (donut), and the top-scoring sides. All maths
 * lives in the pure `dashboardStats` module; the charts are dependency-free SVG/CSS.
 */
export function DashboardView({ theme, matches }: DashboardViewProps) {
  const isLight = theme === "classic-light";
  const headingClasses = isLight ? "text-slate-900" : "text-white";
  const mutedClasses = isLight ? "text-slate-600" : "text-slate-300";

  const [tab, setTab] = useState<DashboardTab>("panorama");

  const {
    totals,
    continents,
    continentTotals,
    groupGoals,
    statusSegments,
    topTeams,
    phaseGoals,
    phaseGoalsTotal,
  } = useMemo(() => {
    const standings = computeStandings(matches);
    const phaseColors = PHASE_COLORS[theme];
    const statusColors = STATUS_COLORS[theme];
    const statusData = matchStatusBreakdown(matches);
    const phased = continentByPhase();
    const phaseSeries = goalsByPhase(standings);
    const phaseGoalColor: Record<string, string> = {
      "Fase de grupos": phaseColors.groupStage,
      "16-avos": phaseColors.roundOf32,
      Oitavas: phaseColors.roundOf16,
    };
    return {
      totals: tournamentTotals(matches, standings),
      continents: phased.map((c) => ({
        label: c.continent,
        sublabel: c.confederation,
        bars: [
          { value: c.groupStage, color: phaseColors.groupStage },
          { value: c.roundOf32, color: phaseColors.roundOf32 },
          { value: c.roundOf16, color: phaseColors.roundOf16 },
        ],
      })),
      continentTotals: {
        groupStage: phased.reduce((s, c) => s + c.groupStage, 0),
        roundOf32: phased.reduce((s, c) => s + c.roundOf32, 0),
        roundOf16: phased.reduce((s, c) => s + c.roundOf16, 0),
      },
      groupGoals: goalsByGroup(standings).map((g) => ({ label: g.group, value: g.goals })),
      statusSegments: statusData.map<DonutSegment>((s) => ({
        label: s.label,
        value: s.value,
        color: statusColors[s.key],
      })),
      topTeams: topScoringTeams(standings, 8).map((t) => ({
        label: t.name,
        value: t.goalsFor,
        color: t.primaryColor,
      })),
      phaseGoals: phaseSeries.map((p) => ({
        label: p.phase,
        value: p.goals,
        color: phaseGoalColor[p.phase],
        sublabel: `${p.played} ${p.played === 1 ? "jogo" : "jogos"}`,
      })),
      phaseGoalsTotal: phaseSeries.reduce((sum, p) => sum + p.goals, 0),
    };
  }, [matches, theme]);

  const goalsPerMatch = totals.groupGoalsPerMatch
    ? totals.groupGoalsPerMatch.toFixed(2).replace(".", ",")
    : "—";

  // Freshness of this build against the tournament. `latestKickoff` is the most recent
  // kickoff among matches already played or under way; `lastUpdated` renders it as an
  // "Atualizado em …" line. The build is "Desatualizado" when a match has kicked off after
  // this version shipped (build time from the Vite `define`) — i.e. results exist that a
  // stale static bundle would not carry.
  const { lastUpdated, upToDate } = useMemo(() => {
    const latestKickoff = matches
      .filter((m) => m.status === "FINISHED" || m.status === "LIVE" || m.status === "SUSPENDED")
      .reduce<string | null>((acc, m) => {
        const ts = m.kickoffTimestamp;
        return ts && (!acc || ts > acc) ? ts : acc;
      }, null);
    const buildTime = new Date(__BUILD_TIME__).getTime();
    return {
      lastUpdated: formatAnalysisTimestamp(latestKickoff),
      upToDate:
        !latestKickoff || Number.isNaN(buildTime)
          ? true
          : buildTime >= new Date(latestKickoff).getTime(),
    };
  }, [matches]);

  // "Gols por minuto" national-team filter ("" = all teams). The scatter is independent of
  // the theme/matches memo above, so it recomputes only when the selected team changes.
  const [goalsTeam, setGoalsTeam] = useState("");
  const goalScorerTeamOptions = useMemo(() => goalScorerTeams(), []);

  // Goal heat-map (group × 15-min interval). Static over `goalTimeline.json` + APP_MATCHES,
  // so it is computed once, independent of the theme/matches memo above.
  const goalHeatmap = useMemo(() => goalsByGroupAndInterval(), []);
  const { goalScatter, scatterTotal, goalsTeamName } = useMemo(() => {
    const series = goalsByMinute(goalsTeam || null);
    return {
      goalScatter: series.map((d) => ({ x: d.minute, y: d.goals })),
      scatterTotal: series.reduce((sum, d) => sum + d.goals, 0),
      goalsTeamName: goalScorerTeamOptions.find((t) => t.code === goalsTeam)?.name ?? null,
    };
  }, [goalsTeam, goalScorerTeamOptions]);

  return (
    <div className="max-w-7xl mx-auto px-4 mt-8" id="dashboard-view">
      <div>
        <h2
          className={`font-anton text-2xl md:text-3xl uppercase tracking-wider ${headingClasses}`}
          id="dashboard-title"
        >
          Dashboard
        </h2>
        <p className={`mt-1 font-mono text-[11px] uppercase tracking-wider ${mutedClasses}`}>
          {tab === "panorama"
            ? "Panorama da Copa do Mundo FIFA 2026 em números"
            : "Bastidores da audiência do site em números"}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {lastUpdated && (
            <span
              className={`font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}
              id="dashboard-last-updated"
            >
              {lastUpdated}
            </span>
          )}
          <span
            data-testid="dashboard-freshness"
            data-fresh={upToDate ? "true" : "false"}
            title={
              upToDate
                ? "O painel reflete a última partida disputada"
                : "Uma partida foi disputada após a publicação deste painel"
            }
            className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
              upToDate
                ? isLight
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : isLight
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-amber-400/30 bg-amber-400/10 text-amber-300"
            }`}
          >
            ● {upToDate ? "Atualizado" : "Desatualizado"}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-2" role="tablist" aria-label="Seções do dashboard">
        {DASHBOARD_TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              id={`dashboard-tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider transition ${
                active
                  ? isLight
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-white/80 bg-white text-slate-900"
                  : isLight
                    ? "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    : "border-white/10 bg-[#1a1d1d] text-slate-300 hover:border-white/25"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "trafego" && <TrafficDashboardPanel theme={theme} />}

      {tab === "panorama" && (
        <>
      {/* KPI tiles */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard theme={theme} label="Seleções" value={integer(totals.teams)} hint="6 continentes" />
        <StatCard theme={theme} label="Sedes" value={integer(totals.stadiums)} hint="3 países" />
        <StatCard
          theme={theme}
          label="Jogos encerrados"
          value={integer(totals.matchesFinished)}
          hint={`de ${integer(totals.matchesTotal)}`}
        />
        <StatCard
          theme={theme}
          label="Ao vivo"
          value={integer(totals.matchesLive)}
          hint="agora"
          accentColor={STATUS_COLORS[theme].live}
        />
        <StatCard
          theme={theme}
          label="Agendados"
          value={integer(totals.matchesUpcoming)}
          hint="a disputar"
          accentColor={STATUS_COLORS[theme].upcoming}
        />
        <StatCard
          theme={theme}
          label="Gols (grupos)"
          value={integer(totals.groupGoals)}
          hint={`${goalsPerMatch} por jogo`}
        />
      </div>

      {/* Charts */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          theme={theme}
          title="Seleções por continente"
          subtitle={`por fase · ${continentTotals.groupStage} grupos → ${continentTotals.roundOf32} 16-avos → ${continentTotals.roundOf16} oitavas`}
        >
          <GroupedBars
            theme={theme}
            data={continents}
            legend={[
              { label: "Fase de grupos", color: PHASE_COLORS[theme].groupStage },
              { label: "16-avos", color: PHASE_COLORS[theme].roundOf32 },
              { label: "Oitavas", color: PHASE_COLORS[theme].roundOf16 },
            ]}
          />
        </ChartCard>

        <ChartCard
          theme={theme}
          title="Partidas por situação"
          subtitle="todo o torneio · grupos + mata-mata"
        >
          <Donut
            theme={theme}
            segments={statusSegments}
            centerValue={integer(totals.matchesTotal)}
            centerLabel="jogos"
          />
        </ChartCard>

        <ChartCard
          theme={theme}
          title="Gols por grupo"
          subtitle="fase de grupos · gols marcados"
        >
          <VerticalBars theme={theme} data={groupGoals} />
        </ChartCard>

        <ChartCard
          theme={theme}
          title="Artilharia das seleções"
          subtitle="fase de grupos · 8 maiores ataques"
        >
          <HorizontalBars theme={theme} data={topTeams} />
        </ChartCard>
      </div>

      {/* Goals by phase — full width */}
      <div className="mt-4">
        <ChartCard
          theme={theme}
          title="Gols por fase"
          subtitle={`gols marcados por fase · grupos + mata-mata · ${integer(phaseGoalsTotal)} gols`}
        >
          <HorizontalBars theme={theme} data={phaseGoals} />
        </ChartCard>
      </div>

      {/* Goals by minute — full width, filterable by national team */}
      <div className="mt-4">
        <ChartCard
          theme={theme}
          title="Gols por minuto"
          subtitle={
            goalsTeamName
              ? `${goalsTeamName} · ${scatterTotal} ${scatterTotal === 1 ? "gol" : "gols"} · minuto do jogo × nº de gols`
              : `todos os jogos encerrados · ${scatterTotal} gols · minuto do jogo × nº de gols`
          }
          headerAction={
            <select
              id="dashboard-goals-team-filter"
              aria-label="Filtrar gols por minuto por seleção"
              value={goalsTeam}
              onChange={(event) => setGoalsTeam(event.target.value)}
              className={`rounded-lg border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider outline-none transition focus-visible:ring-2 focus-visible:ring-sky-400 ${
                isLight
                  ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  : "border-white/10 bg-[#1a1d1d] text-slate-200 hover:border-white/20"
              }`}
            >
              <option value="">Todas as seleções</option>
              {goalScorerTeamOptions.map((team) => (
                <option key={team.code} value={team.code}>
                  {team.name} ({team.goals})
                </option>
              ))}
            </select>
          }
        >
          {goalScatter.length === 0 ? (
            <p className={`py-10 text-center font-mono text-xs uppercase tracking-wider ${mutedClasses}`}>
              Sem gols registrados para esta seleção
            </p>
          ) : (
          <ScatterPlot
            theme={theme}
            data={goalScatter}
            xMax={90}
            xLabel="minuto"
            yLabel="gols"
            xMarkers={[
              { x: 45, label: "intervalo" },
              { x: 90, label: "90'" },
            ]}
          />
          )}
        </ChartCard>
      </div>

      {/* Goals heat-map — group × 15-min interval, full width */}
      <div className="mt-4">
        <ChartCard
          theme={theme}
          title="Mapa de calor dos gols"
          subtitle={`gols por grupo da seleção × intervalo de 15 min · ${integer(goalHeatmap.total)} gols`}
        >
          <HeatMap
            theme={theme}
            columns={goalHeatmap.intervals}
            rows={goalHeatmap.rows.map((r) => ({ label: r.group, cells: r.cells, total: r.total }))}
            maxCell={goalHeatmap.maxCell}
            rowHeader="Grupo"
            formatCellTitle={(group, interval, value) =>
              `Grupo ${group} · ${interval} min · ${value} ${value === 1 ? "gol" : "gols"}`
            }
          />
        </ChartCard>
      </div>
        </>
      )}
    </div>
  );
}

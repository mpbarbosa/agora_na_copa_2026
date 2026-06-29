import { useMemo } from "react";
import type { Match } from "../types";
import { computeStandings } from "../standings";
import {
  continentBreakdown,
  goalsByGroup,
  matchStatusBreakdown,
  topScoringTeams,
  tournamentTotals,
  type MatchStatusKey,
} from "../dashboardStats";
import {
  ChartCard,
  Donut,
  HorizontalBars,
  SERIES_PALETTE,
  StatCard,
  VerticalBars,
  type DonutSegment,
} from "./dashboard/DashboardCharts";

interface DashboardViewProps {
  theme: "classic-light" | "stadium-dark";
  matches: Match[];
}

const STATUS_COLORS: Record<"classic-light" | "stadium-dark", Record<MatchStatusKey, string>> = {
  "classic-light": { finished: "#009c3b", live: "#db1730", upcoming: "#94a3b8" },
  "stadium-dark": { finished: "#00e476", live: "#ff5c7a", upcoming: "#64748b" },
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

  const {
    totals,
    continents,
    groupGoals,
    statusSegments,
    topTeams,
  } = useMemo(() => {
    const standings = computeStandings(matches);
    const palette = SERIES_PALETTE[theme];
    const statusColors = STATUS_COLORS[theme];
    const statusData = matchStatusBreakdown(matches);
    return {
      totals: tournamentTotals(matches, standings),
      continents: continentBreakdown().map((c, i) => ({
        label: c.continent,
        value: c.count,
        sublabel: c.confederation,
        color: palette[i % palette.length],
      })),
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
    };
  }, [matches, theme]);

  const goalsPerMatch = totals.groupGoalsPerMatch
    ? totals.groupGoalsPerMatch.toFixed(2).replace(".", ",")
    : "—";

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
          Panorama da Copa do Mundo FIFA 2026 em números
        </p>
      </div>

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
          subtitle="48 classificadas · por confederação"
        >
          <HorizontalBars theme={theme} data={continents} />
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
    </div>
  );
}

// Dashboard catalog — the "Dashboard" tab (Panorama + Tráfego panels), its KPI
// tiles, chart titles/subtitles, freshness badge and the dependency-free chart
// primitives' empty/aria copy. Keys are prefixed `dashboard.`. pt is the complete
// reference; es is LATAM football/ops voice.
import type { CatalogModule } from "./types";

export const dashboardCatalog: CatalogModule = {
  pt: {
    // Header
    "dashboard.title": "Dashboard",
    "dashboard.subtitlePanorama": "Panorama da Copa do Mundo FIFA 2026 em números",
    "dashboard.subtitleTrafego": "Bastidores da audiência do site em números",

    // Freshness badge
    "dashboard.freshnessTitleUpToDate": "O painel reflete a última partida disputada",
    "dashboard.freshnessTitleStale": "Uma partida foi disputada após a publicação deste painel",
    "dashboard.freshUpToDate": "Atualizado",
    "dashboard.freshStale": "Desatualizado",

    // Tabs
    "dashboard.tabsAriaLabel": "Seções do dashboard",
    "dashboard.tabPanorama": "Panorama",
    "dashboard.tabTrafego": "Tráfego",

    // KPI tiles
    "dashboard.kpiTeams": "Seleções",
    "dashboard.kpiTeamsHint": "6 continentes",
    "dashboard.kpiStadiums": "Sedes",
    "dashboard.kpiStadiumsHint": "3 países",
    "dashboard.kpiMatchesFinished": "Jogos encerrados",
    "dashboard.kpiMatchesFinishedHint": "de {total}",
    "dashboard.kpiLive": "Ao vivo",
    "dashboard.kpiLiveHint": "agora",
    "dashboard.kpiUpcoming": "Agendados",
    "dashboard.kpiUpcomingHint": "a disputar",
    "dashboard.kpiGoals": "Gols",
    "dashboard.kpiGoalsHint": "{value} por jogo",

    // Legend / phase labels
    "dashboard.phaseGroupStage": "Fase de grupos",
    "dashboard.phaseRoundOf32": "16-avos",
    "dashboard.phaseRoundOf16": "Oitavas",
    "dashboard.phaseRoundOf8": "Quartas",
    "dashboard.phaseRoundOf4": "Semis",
    "dashboard.phaseFinal": "Final",
    "dashboard.phaseChampion": "Campeão",
    "dashboard.phaseFilterAll": "Todas as fases",
    "dashboard.phaseFilterLabel": "Filtrar por fase",

    // Chart: continents
    "dashboard.chartContinentsTitle": "Seleções por continente",
    "dashboard.chartContinentsByStage": "por fase",

    // Chart: matches by status
    "dashboard.chartStatusTitle": "Partidas por situação",
    "dashboard.chartStatusSubtitle": "todo o torneio · grupos + mata-mata",
    "dashboard.donutCenterLabel": "jogos",

    // Chart: goals by group
    "dashboard.chartGroupGoalsTitle": "Gols por grupo",
    "dashboard.chartGroupGoalsSubtitle": "fase de grupos · gols marcados",

    // Chart: top scorers
    "dashboard.chartTopTeamsTitle": "Artilharia das seleções",
    "dashboard.chartTopTeamsSubtitle": "todo o torneio · grupos + mata-mata · 8 maiores ataques",

    // Chart: goals by phase
    "dashboard.chartPhaseGoalsTitle": "Gols por fase",
    "dashboard.chartPhaseGoalsSubtitle":
      "gols marcados por fase · grupos + mata-mata · {total} gols",
    "dashboard.phaseGameSingular": "{count} jogo",
    "dashboard.phaseGamePlural": "{count} jogos",

    // Chart: goals by minute
    "dashboard.chartGoalsByMinuteTitle": "Gols por minuto",
    "dashboard.chartGoalsByMinuteSubtitleTeam":
      "{team} · {count} {goals} · minuto do jogo × nº de gols",
    "dashboard.chartGoalsByMinuteSubtitleAll":
      "todos os jogos encerrados · {count} gols · minuto do jogo × nº de gols",
    "dashboard.goalSingular": "gol",
    "dashboard.goalPlural": "gols",
    "dashboard.goalsTeamFilterAria": "Filtrar gols por minuto por seleção",
    "dashboard.goalsTeamFilterAll": "Todas as seleções",
    "dashboard.goalsTeamFilterOption": "{name} ({goals})",
    "dashboard.goalsByMinuteEmpty": "Sem gols registrados para esta seleção",
    "dashboard.axisMinute": "minuto",
    "dashboard.axisGoals": "gols",
    "dashboard.markerHalfTime": "intervalo",

    // Chart: goals heat-map
    "dashboard.chartHeatmapTitle": "Mapa de calor dos gols",
    "dashboard.chartHeatmapSubtitle":
      "gols por grupo da seleção × intervalo de 15 min · {total} gols",
    "dashboard.heatmapRowHeader": "Grupo",
    "dashboard.heatmapCellSingular": "Grupo {group} · {interval} min · {value} gol",
    "dashboard.heatmapCellPlural": "Grupo {group} · {interval} min · {value} gols",

    // Chart primitives (shared)
    "dashboard.lineChartNeedTwoPoints":
      "São necessários ao menos dois instantâneos para traçar a tendência",
    "dashboard.scatterAria": "{yLabel} por {xLabel}",
    "dashboard.heatmapLegendLess": "menos",
    "dashboard.heatmapLegendMore": "mais",

    // Traffic panel — status classes
    "dashboard.statusSuccess": "Sucesso (2xx)",
    "dashboard.statusRedirect": "Redirecionamento (3xx)",
    "dashboard.statusClientError": "Erro do cliente (4xx)",
    "dashboard.statusServerError": "Erro do servidor (5xx)",
    "dashboard.statusOther": "Outros",

    // Traffic panel — empty/loading states
    "dashboard.trafficEmptySnapshot": "Sem dados neste instantâneo",
    "dashboard.trafficLoadFailed": "Não foi possível carregar o painel de tráfego",
    "dashboard.trafficLoading": "Carregando dados de tráfego…",
    "dashboard.trafficNoSnapshots": "Nenhum instantâneo de tráfego disponível ainda",

    // Traffic panel — summary line
    "dashboard.trafficSummarySingular": "{count} instantâneo · atualizado em {when}",
    "dashboard.trafficSummaryPlural": "{count} instantâneos · atualizado em {when}",
    "dashboard.trafficGeoSuffix": " · geo: GeoLite2",

    // Traffic panel — KPI tiles
    "dashboard.trafficKpiRequests": "Requisições",
    "dashboard.trafficKpiRequestsHint": "na janela do log",
    "dashboard.trafficKpiUniqueIps": "IPs únicos",
    "dashboard.trafficKpiAvgRate": "Média req/min",
    "dashboard.trafficKpiAvgRateHint": "na janela",
    "dashboard.trafficKpiBots": "Bots",
    "dashboard.trafficKpiBotsHint": "{count} hits",
    "dashboard.trafficKpiSynthetic": "Sintético (e2e)",
    "dashboard.trafficKpiSyntheticHint": "{count} hits",
    "dashboard.trafficKpiSelfClient": "Auto-cliente",
    "dashboard.trafficKpiSelfClientHint": "{pct}% do log bruto (excluído)",
    "dashboard.trafficKpiLogLines": "Linhas de log",

    // Traffic panel — chart titles/subtitles
    "dashboard.trafficCumulativeTitle": "Tráfego acumulado",
    "dashboard.trafficCumulativeSubtitle":
      "requisições acumuladas na janela do log · por instantâneo",
    "dashboard.trafficRateTitle": "Ritmo de requisições",
    "dashboard.trafficRateSubtitle": "requisições/min entre instantâneos consecutivos",
    "dashboard.trafficRateStartAria": "Data inicial do ritmo de requisições",
    "dashboard.trafficRateEndAria": "Data final do ritmo de requisições",
    "dashboard.trafficRateCountryAria": "Filtrar o ritmo de requisições por país",
    "dashboard.trafficRateCountryAll": "Todos os países",
    "dashboard.trafficTopPathsTitle": "Rotas mais acessadas",
    "dashboard.trafficTopPathsSubtitle": "rotas sintéticas de e2e e de monitoramento excluídas",
    "dashboard.trafficByHourTitle": "Requisições por hora (UTC)",
    "dashboard.trafficByHourSubtitle": "distribuição ao longo do dia",
    "dashboard.trafficStatusCodesTitle": "Códigos de status HTTP",
    "dashboard.trafficStatusCodesSubtitle": "agrupados por classe",
    "dashboard.trafficCountriesVisitorsTitle": "Países (visitantes únicos)",
    "dashboard.trafficCountriesVisitorsSubtitle": "top 10 por IP único",
    "dashboard.trafficCountriesVolumeTitle": "Países (volume de requisições)",
    "dashboard.trafficCountriesVolumeSubtitle": "top 10 por requisições",
    "dashboard.trafficCitiesVisitorsTitle": "Cidades (visitantes únicos)",
    "dashboard.trafficCitiesSubtitle": "menos precisas que país · bucket (unknown) esperado",
    "dashboard.trafficCitiesVolumeTitle": "Cidades (volume de requisições)",
    "dashboard.trafficByDayTitle": "Requisições por dia",
    "dashboard.trafficByDaySubtitle": "cada dia da janela do log",
    "dashboard.trafficUniqueIpsByDayTitle": "Visitantes únicos por dia",
    "dashboard.trafficUniqueIpsByDaySubtitle": "IPs distintos por dia na janela do log",
    "dashboard.trafficReferrersTitle": "Principais referenciadores",
    "dashboard.trafficReferrersSubtitle": "origem do tráfego",

    // Traffic panel — series names + hour tooltip
    "dashboard.trafficSeriesRequests": "Requisições (acumulado)",
    "dashboard.trafficSeriesRate": "Requisições/min",
    "dashboard.trafficHourTooltip": "{hour}h · {count} req",
  },
  es: {
    // Header
    "dashboard.title": "Dashboard",
    "dashboard.subtitlePanorama": "Panorama del Mundial FIFA 2026 en números",
    "dashboard.subtitleTrafego": "El detrás de escena de la audiencia del sitio en números",

    // Freshness badge
    "dashboard.freshnessTitleUpToDate": "El panel refleja el último partido disputado",
    "dashboard.freshnessTitleStale": "Se disputó un partido después de la publicación de este panel",
    "dashboard.freshUpToDate": "Actualizado",
    "dashboard.freshStale": "Desactualizado",

    // Tabs
    "dashboard.tabsAriaLabel": "Secciones del dashboard",
    "dashboard.tabPanorama": "Panorama",
    "dashboard.tabTrafego": "Tráfico",

    // KPI tiles
    "dashboard.kpiTeams": "Selecciones",
    "dashboard.kpiTeamsHint": "6 continentes",
    "dashboard.kpiStadiums": "Sedes",
    "dashboard.kpiStadiumsHint": "3 países",
    "dashboard.kpiMatchesFinished": "Partidos finalizados",
    "dashboard.kpiMatchesFinishedHint": "de {total}",
    "dashboard.kpiLive": "En vivo",
    "dashboard.kpiLiveHint": "ahora",
    "dashboard.kpiUpcoming": "Programados",
    "dashboard.kpiUpcomingHint": "por disputar",
    "dashboard.kpiGoals": "Goles",
    "dashboard.kpiGoalsHint": "{value} por partido",

    // Legend / phase labels
    "dashboard.phaseGroupStage": "Fase de grupos",
    "dashboard.phaseRoundOf32": "16-avos",
    "dashboard.phaseRoundOf16": "Octavos",
    "dashboard.phaseRoundOf8": "Cuartos",
    "dashboard.phaseRoundOf4": "Semis",
    "dashboard.phaseFinal": "Final",
    "dashboard.phaseChampion": "Campeón",
    "dashboard.phaseFilterAll": "Todas las fases",
    "dashboard.phaseFilterLabel": "Filtrar por fase",

    // Chart: continents
    "dashboard.chartContinentsTitle": "Selecciones por continente",
    "dashboard.chartContinentsByStage": "por fase",

    // Chart: matches by status
    "dashboard.chartStatusTitle": "Partidos por situación",
    "dashboard.chartStatusSubtitle": "todo el torneo · grupos + eliminatorias",
    "dashboard.donutCenterLabel": "partidos",

    // Chart: goals by group
    "dashboard.chartGroupGoalsTitle": "Goles por grupo",
    "dashboard.chartGroupGoalsSubtitle": "fase de grupos · goles marcados",

    // Chart: top scorers
    "dashboard.chartTopTeamsTitle": "Artillería de las selecciones",
    "dashboard.chartTopTeamsSubtitle": "todo el torneo · grupos + eliminatorias · 8 mejores ataques",

    // Chart: goals by phase
    "dashboard.chartPhaseGoalsTitle": "Goles por fase",
    "dashboard.chartPhaseGoalsSubtitle":
      "goles marcados por fase · grupos + eliminatorias · {total} goles",
    "dashboard.phaseGameSingular": "{count} partido",
    "dashboard.phaseGamePlural": "{count} partidos",

    // Chart: goals by minute
    "dashboard.chartGoalsByMinuteTitle": "Goles por minuto",
    "dashboard.chartGoalsByMinuteSubtitleTeam":
      "{team} · {count} {goals} · minuto del partido × nº de goles",
    "dashboard.chartGoalsByMinuteSubtitleAll":
      "todos los partidos finalizados · {count} goles · minuto del partido × nº de goles",
    "dashboard.goalSingular": "gol",
    "dashboard.goalPlural": "goles",
    "dashboard.goalsTeamFilterAria": "Filtrar goles por minuto por selección",
    "dashboard.goalsTeamFilterAll": "Todas las selecciones",
    "dashboard.goalsTeamFilterOption": "{name} ({goals})",
    "dashboard.goalsByMinuteEmpty": "Sin goles registrados para esta selección",
    "dashboard.axisMinute": "minuto",
    "dashboard.axisGoals": "goles",
    "dashboard.markerHalfTime": "entretiempo",

    // Chart: goals heat-map
    "dashboard.chartHeatmapTitle": "Mapa de calor de los goles",
    "dashboard.chartHeatmapSubtitle":
      "goles por grupo de la selección × intervalo de 15 min · {total} goles",
    "dashboard.heatmapRowHeader": "Grupo",
    "dashboard.heatmapCellSingular": "Grupo {group} · {interval} min · {value} gol",
    "dashboard.heatmapCellPlural": "Grupo {group} · {interval} min · {value} goles",

    // Chart primitives (shared)
    "dashboard.lineChartNeedTwoPoints":
      "Se necesitan al menos dos instantáneas para trazar la tendencia",
    "dashboard.scatterAria": "{yLabel} por {xLabel}",
    "dashboard.heatmapLegendLess": "menos",
    "dashboard.heatmapLegendMore": "más",

    // Traffic panel — status classes
    "dashboard.statusSuccess": "Éxito (2xx)",
    "dashboard.statusRedirect": "Redirección (3xx)",
    "dashboard.statusClientError": "Error del cliente (4xx)",
    "dashboard.statusServerError": "Error del servidor (5xx)",
    "dashboard.statusOther": "Otros",

    // Traffic panel — empty/loading states
    "dashboard.trafficEmptySnapshot": "Sin datos en esta instantánea",
    "dashboard.trafficLoadFailed": "No se pudo cargar el panel de tráfico",
    "dashboard.trafficLoading": "Cargando datos de tráfico…",
    "dashboard.trafficNoSnapshots": "Aún no hay ninguna instantánea de tráfico disponible",

    // Traffic panel — summary line
    "dashboard.trafficSummarySingular": "{count} instantánea · actualizado en {when}",
    "dashboard.trafficSummaryPlural": "{count} instantáneas · actualizado en {when}",
    "dashboard.trafficGeoSuffix": " · geo: GeoLite2",

    // Traffic panel — KPI tiles
    "dashboard.trafficKpiRequests": "Solicitudes",
    "dashboard.trafficKpiRequestsHint": "en la ventana del log",
    "dashboard.trafficKpiUniqueIps": "IPs únicas",
    "dashboard.trafficKpiAvgRate": "Media sol/min",
    "dashboard.trafficKpiAvgRateHint": "en la ventana",
    "dashboard.trafficKpiBots": "Bots",
    "dashboard.trafficKpiBotsHint": "{count} hits",
    "dashboard.trafficKpiSynthetic": "Sintético (e2e)",
    "dashboard.trafficKpiSyntheticHint": "{count} hits",
    "dashboard.trafficKpiSelfClient": "Auto-cliente",
    "dashboard.trafficKpiSelfClientHint": "{pct}% del log en bruto (excluido)",
    "dashboard.trafficKpiLogLines": "Líneas de log",

    // Traffic panel — chart titles/subtitles
    "dashboard.trafficCumulativeTitle": "Tráfico acumulado",
    "dashboard.trafficCumulativeSubtitle":
      "solicitudes acumuladas en la ventana del log · por instantánea",
    "dashboard.trafficRateTitle": "Ritmo de solicitudes",
    "dashboard.trafficRateSubtitle": "solicitudes/min entre instantáneas consecutivas",
    "dashboard.trafficRateStartAria": "Fecha inicial del ritmo de solicitudes",
    "dashboard.trafficRateEndAria": "Fecha final del ritmo de solicitudes",
    "dashboard.trafficRateCountryAria": "Filtrar el ritmo de solicitudes por país",
    "dashboard.trafficRateCountryAll": "Todos los países",
    "dashboard.trafficTopPathsTitle": "Rutas más accedidas",
    "dashboard.trafficTopPathsSubtitle": "rutas sintéticas de e2e y de monitoreo excluidas",
    "dashboard.trafficByHourTitle": "Solicitudes por hora (UTC)",
    "dashboard.trafficByHourSubtitle": "distribución a lo largo del día",
    "dashboard.trafficStatusCodesTitle": "Códigos de estado HTTP",
    "dashboard.trafficStatusCodesSubtitle": "agrupados por clase",
    "dashboard.trafficCountriesVisitorsTitle": "Países (visitantes únicos)",
    "dashboard.trafficCountriesVisitorsSubtitle": "top 10 por IP única",
    "dashboard.trafficCountriesVolumeTitle": "Países (volumen de solicitudes)",
    "dashboard.trafficCountriesVolumeSubtitle": "top 10 por solicitudes",
    "dashboard.trafficCitiesVisitorsTitle": "Ciudades (visitantes únicos)",
    "dashboard.trafficCitiesSubtitle": "menos precisas que país · bucket (unknown) esperado",
    "dashboard.trafficCitiesVolumeTitle": "Ciudades (volumen de solicitudes)",
    "dashboard.trafficByDayTitle": "Solicitudes por día",
    "dashboard.trafficByDaySubtitle": "cada día de la ventana del log",
    "dashboard.trafficUniqueIpsByDayTitle": "Visitantes únicos por día",
    "dashboard.trafficUniqueIpsByDaySubtitle": "IPs distintas por día en la ventana del log",
    "dashboard.trafficReferrersTitle": "Principales referenciadores",
    "dashboard.trafficReferrersSubtitle": "origen del tráfico",

    // Traffic panel — series names + hour tooltip
    "dashboard.trafficSeriesRequests": "Solicitudes (acumulado)",
    "dashboard.trafficSeriesRate": "Solicitudes/min",
    "dashboard.trafficHourTooltip": "{hour}h · {count} sol",
  },
  en: {
    // Header
    "dashboard.title": "Dashboard",
    "dashboard.subtitlePanorama": "The FIFA World Cup 2026 by the numbers",
    "dashboard.subtitleTrafego": "Behind the scenes of the site's audience by the numbers",

    // Freshness badge
    "dashboard.freshnessTitleUpToDate": "The panel reflects the last match played",
    "dashboard.freshnessTitleStale": "A match was played after this panel was published",
    "dashboard.freshUpToDate": "Up to date",
    "dashboard.freshStale": "Out of date",

    // Tabs
    "dashboard.tabsAriaLabel": "Dashboard sections",
    "dashboard.tabPanorama": "Overview",
    "dashboard.tabTrafego": "Traffic",

    // KPI tiles
    "dashboard.kpiTeams": "Teams",
    "dashboard.kpiTeamsHint": "6 continents",
    "dashboard.kpiStadiums": "Host cities",
    "dashboard.kpiStadiumsHint": "3 countries",
    "dashboard.kpiMatchesFinished": "Matches finished",
    "dashboard.kpiMatchesFinishedHint": "of {total}",
    "dashboard.kpiLive": "Live",
    "dashboard.kpiLiveHint": "now",
    "dashboard.kpiUpcoming": "Scheduled",
    "dashboard.kpiUpcomingHint": "to be played",
    "dashboard.kpiGoals": "Goals",
    "dashboard.kpiGoalsHint": "{value} per match",

    // Legend / phase labels
    "dashboard.phaseGroupStage": "Group Stage",
    "dashboard.phaseRoundOf32": "Round of 32",
    "dashboard.phaseRoundOf16": "Round of 16",
    "dashboard.phaseRoundOf8": "Round of 8",
    "dashboard.phaseRoundOf4": "Round of 4",
    "dashboard.phaseFinal": "Final",
    "dashboard.phaseChampion": "Champion",
    "dashboard.phaseFilterAll": "All rounds",
    "dashboard.phaseFilterLabel": "Filter by round",

    // Chart: continents
    "dashboard.chartContinentsTitle": "Teams by continent",
    "dashboard.chartContinentsByStage": "by stage",

    // Chart: matches by status
    "dashboard.chartStatusTitle": "Matches by status",
    "dashboard.chartStatusSubtitle": "whole tournament · groups + knockout",
    "dashboard.donutCenterLabel": "matches",

    // Chart: goals by group
    "dashboard.chartGroupGoalsTitle": "Goals by group",
    "dashboard.chartGroupGoalsSubtitle": "group stage · goals scored",

    // Chart: top scorers
    "dashboard.chartTopTeamsTitle": "Team scoring leaders",
    "dashboard.chartTopTeamsSubtitle": "whole tournament · groups + knockout · 8 highest-scoring attacks",

    // Chart: goals by phase
    "dashboard.chartPhaseGoalsTitle": "Goals by stage",
    "dashboard.chartPhaseGoalsSubtitle":
      "goals scored by stage · groups + knockout · {total} goals",
    "dashboard.phaseGameSingular": "{count} match",
    "dashboard.phaseGamePlural": "{count} matches",

    // Chart: goals by minute
    "dashboard.chartGoalsByMinuteTitle": "Goals by minute",
    "dashboard.chartGoalsByMinuteSubtitleTeam":
      "{team} · {count} {goals} · match minute × number of goals",
    "dashboard.chartGoalsByMinuteSubtitleAll":
      "all finished matches · {count} goals · match minute × number of goals",
    "dashboard.goalSingular": "goal",
    "dashboard.goalPlural": "goals",
    "dashboard.goalsTeamFilterAria": "Filter goals by minute by team",
    "dashboard.goalsTeamFilterAll": "All teams",
    "dashboard.goalsTeamFilterOption": "{name} ({goals})",
    "dashboard.goalsByMinuteEmpty": "No goals recorded for this team",
    "dashboard.axisMinute": "minute",
    "dashboard.axisGoals": "goals",
    "dashboard.markerHalfTime": "halftime",

    // Chart: goals heat-map
    "dashboard.chartHeatmapTitle": "Goals heat map",
    "dashboard.chartHeatmapSubtitle":
      "goals by team group × 15-min interval · {total} goals",
    "dashboard.heatmapRowHeader": "Group",
    "dashboard.heatmapCellSingular": "Group {group} · {interval} min · {value} goal",
    "dashboard.heatmapCellPlural": "Group {group} · {interval} min · {value} goals",

    // Chart primitives (shared)
    "dashboard.lineChartNeedTwoPoints":
      "At least two snapshots are needed to plot the trend",
    "dashboard.scatterAria": "{yLabel} by {xLabel}",
    "dashboard.heatmapLegendLess": "less",
    "dashboard.heatmapLegendMore": "more",

    // Traffic panel — status classes
    "dashboard.statusSuccess": "Success (2xx)",
    "dashboard.statusRedirect": "Redirect (3xx)",
    "dashboard.statusClientError": "Client error (4xx)",
    "dashboard.statusServerError": "Server error (5xx)",
    "dashboard.statusOther": "Other",

    // Traffic panel — empty/loading states
    "dashboard.trafficEmptySnapshot": "No data in this snapshot",
    "dashboard.trafficLoadFailed": "Could not load the traffic panel",
    "dashboard.trafficLoading": "Loading traffic data…",
    "dashboard.trafficNoSnapshots": "No traffic snapshots available yet",

    // Traffic panel — summary line
    "dashboard.trafficSummarySingular": "{count} snapshot · updated {when}",
    "dashboard.trafficSummaryPlural": "{count} snapshots · updated {when}",
    "dashboard.trafficGeoSuffix": " · geo: GeoLite2",

    // Traffic panel — KPI tiles
    "dashboard.trafficKpiRequests": "Requests",
    "dashboard.trafficKpiRequestsHint": "in the log window",
    "dashboard.trafficKpiUniqueIps": "Unique IPs",
    "dashboard.trafficKpiAvgRate": "Avg req/min",
    "dashboard.trafficKpiAvgRateHint": "in the window",
    "dashboard.trafficKpiBots": "Bots",
    "dashboard.trafficKpiBotsHint": "{count} hits",
    "dashboard.trafficKpiSynthetic": "Synthetic (e2e)",
    "dashboard.trafficKpiSyntheticHint": "{count} hits",
    "dashboard.trafficKpiSelfClient": "Self-client",
    "dashboard.trafficKpiSelfClientHint": "{pct}% of raw log (excluded)",
    "dashboard.trafficKpiLogLines": "Log lines",

    // Traffic panel — chart titles/subtitles
    "dashboard.trafficCumulativeTitle": "Cumulative traffic",
    "dashboard.trafficCumulativeSubtitle":
      "cumulative requests in the log window · per snapshot",
    "dashboard.trafficRateTitle": "Request rate",
    "dashboard.trafficRateSubtitle": "requests/min between consecutive snapshots",
    "dashboard.trafficRateStartAria": "Request-rate start date",
    "dashboard.trafficRateEndAria": "Request-rate end date",
    "dashboard.trafficRateCountryAria": "Filter request rate by country",
    "dashboard.trafficRateCountryAll": "All countries",
    "dashboard.trafficTopPathsTitle": "Most accessed routes",
    "dashboard.trafficTopPathsSubtitle": "synthetic e2e and monitoring routes excluded",
    "dashboard.trafficByHourTitle": "Requests by hour (UTC)",
    "dashboard.trafficByHourSubtitle": "distribution across the day",
    "dashboard.trafficStatusCodesTitle": "HTTP status codes",
    "dashboard.trafficStatusCodesSubtitle": "grouped by class",
    "dashboard.trafficCountriesVisitorsTitle": "Countries (unique visitors)",
    "dashboard.trafficCountriesVisitorsSubtitle": "top 10 by unique IP",
    "dashboard.trafficCountriesVolumeTitle": "Countries (request volume)",
    "dashboard.trafficCountriesVolumeSubtitle": "top 10 by requests",
    "dashboard.trafficCitiesVisitorsTitle": "Cities (unique visitors)",
    "dashboard.trafficCitiesSubtitle": "less precise than country · (unknown) bucket expected",
    "dashboard.trafficCitiesVolumeTitle": "Cities (request volume)",
    "dashboard.trafficByDayTitle": "Requests by day",
    "dashboard.trafficByDaySubtitle": "each day of the log window",
    "dashboard.trafficUniqueIpsByDayTitle": "Unique visitors per day",
    "dashboard.trafficUniqueIpsByDaySubtitle": "distinct IPs per day in the log window",
    "dashboard.trafficReferrersTitle": "Top referrers",
    "dashboard.trafficReferrersSubtitle": "traffic source",

    // Traffic panel — series names + hour tooltip
    "dashboard.trafficSeriesRequests": "Requests (cumulative)",
    "dashboard.trafficSeriesRate": "Requests/min",
    "dashboard.trafficHourTooltip": "{hour}h · {count} req",
  },
};

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
    "dashboard.kpiGroupGoals": "Gols (grupos)",
    "dashboard.kpiGroupGoalsHint": "{value} por jogo",

    // Legend / phase labels
    "dashboard.phaseGroupStage": "Fase de grupos",
    "dashboard.phaseRoundOf32": "16-avos",
    "dashboard.phaseRoundOf16": "Oitavas",

    // Chart: continents
    "dashboard.chartContinentsTitle": "Seleções por continente",
    "dashboard.chartContinentsSubtitle":
      "por fase · {groupStage} grupos → {roundOf32} 16-avos → {roundOf16} oitavas",

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
    "dashboard.trafficKpiLogLines": "Linhas de log",

    // Traffic panel — chart titles/subtitles
    "dashboard.trafficCumulativeTitle": "Tráfego acumulado",
    "dashboard.trafficCumulativeSubtitle":
      "requisições acumuladas na janela do log · por instantâneo",
    "dashboard.trafficRateTitle": "Ritmo de requisições",
    "dashboard.trafficRateSubtitle": "requisições/min entre instantâneos consecutivos",
    "dashboard.trafficTopPathsTitle": "Rotas mais acessadas",
    "dashboard.trafficTopPathsSubtitle": "rotas sintéticas de e2e excluídas",
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
    "dashboard.kpiGroupGoals": "Goles (grupos)",
    "dashboard.kpiGroupGoalsHint": "{value} por partido",

    // Legend / phase labels
    "dashboard.phaseGroupStage": "Fase de grupos",
    "dashboard.phaseRoundOf32": "16-avos",
    "dashboard.phaseRoundOf16": "Octavos",

    // Chart: continents
    "dashboard.chartContinentsTitle": "Selecciones por continente",
    "dashboard.chartContinentsSubtitle":
      "por fase · {groupStage} grupos → {roundOf32} 16-avos → {roundOf16} octavos",

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
    "dashboard.trafficKpiLogLines": "Líneas de log",

    // Traffic panel — chart titles/subtitles
    "dashboard.trafficCumulativeTitle": "Tráfico acumulado",
    "dashboard.trafficCumulativeSubtitle":
      "solicitudes acumuladas en la ventana del log · por instantánea",
    "dashboard.trafficRateTitle": "Ritmo de solicitudes",
    "dashboard.trafficRateSubtitle": "solicitudes/min entre instantáneas consecutivas",
    "dashboard.trafficTopPathsTitle": "Rutas más accedidas",
    "dashboard.trafficTopPathsSubtitle": "rutas sintéticas de e2e excluidas",
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
    "dashboard.trafficReferrersTitle": "Principales referenciadores",
    "dashboard.trafficReferrersSubtitle": "origen del tráfico",

    // Traffic panel — series names + hour tooltip
    "dashboard.trafficSeriesRequests": "Solicitudes (acumulado)",
    "dashboard.trafficSeriesRate": "Solicitudes/min",
    "dashboard.trafficHourTooltip": "{hour}h · {count} sol",
  },
};

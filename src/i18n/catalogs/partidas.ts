// Partidas view catalog — the "Partidas" tab: status/filter labels, the compact
// scoreboard center display, phase headers and count copy. Keys are prefixed
// `partidas.`. pt is the complete reference; es is LATAM football voice.
import type { CatalogModule } from "./types";

export const partidasCatalog: CatalogModule = {
  pt: {
    // Header
    "partidas.title": "Partidas",
    "partidas.subtitle":
      "Lista compacta inspirada no placar da BBC para navegar a agenda sem poluição visual.",

    // Filter tabs (label + short label shown per date section)
    "partidas.filterScheduled": "Agendadas",
    "partidas.filterScheduledShort": "Agenda",
    "partidas.filterLive": "Ao vivo",
    "partidas.filterLiveShort": "Ao vivo",
    "partidas.filterFinished": "Encerradas",
    "partidas.filterFinishedShort": "Resultados",

    // Count copy (jogo/jogos)
    "partidas.matchCountSingular": "{count} jogo",
    "partidas.matchCountPlural": "{count} jogos",

    // Phase header
    "partidas.groupStagePhase": "Fase de Grupos",
    "partidas.hiddenHintSingular": " oculto",
    "partidas.hiddenHintPlural": " ocultos",

    // Status strip — compact label
    "partidas.statusCompact.PRE_GAME": "Agenda",
    "partidas.statusCompact.LIVE": "Ao vivo",
    "partidas.statusCompact.SUSPENDED": "Paralisado",
    "partidas.statusCompact.FINISHED": "FT",

    // Status — accessible (aria) label
    "partidas.statusAccessible.PRE_GAME": "Agendada",
    "partidas.statusAccessible.LIVE": "Ao vivo",
    "partidas.statusAccessible.SUSPENDED": "Jogo paralisado",
    "partidas.statusAccessible.FINISHED": "Encerrada",

    // Center scoreboard display
    "partidas.kickoff": "Kickoff",
    "partidas.penalties": "Pên. {teamA} x {teamB}",
    "partidas.fullTimeLong": "Final",
    "partidas.inPlay": "Em jogo",
    "partidas.suspended": "Paralisado",

    // Provisional-team badge
    "partidas.qualifiedProvisional": "Classificado (provisório)",
    "partidas.provAbbrev": "prov.",

    // Empty state
    "partidas.emptyState": "Nenhuma partida nesta faixa no momento.",
  },
  es: {
    // Header
    "partidas.title": "Partidos",
    "partidas.subtitle":
      "Lista compacta inspirada en el marcador de la BBC para navegar la agenda sin ruido visual.",

    // Filter tabs
    "partidas.filterScheduled": "Programados",
    "partidas.filterScheduledShort": "Agenda",
    "partidas.filterLive": "En vivo",
    "partidas.filterLiveShort": "En vivo",
    "partidas.filterFinished": "Finalizados",
    "partidas.filterFinishedShort": "Resultados",

    // Count copy (partido/partidos)
    "partidas.matchCountSingular": "{count} partido",
    "partidas.matchCountPlural": "{count} partidos",

    // Phase header
    "partidas.groupStagePhase": "Fase de Grupos",
    "partidas.hiddenHintSingular": " oculto",
    "partidas.hiddenHintPlural": " ocultos",

    // Status strip — compact label
    "partidas.statusCompact.PRE_GAME": "Agenda",
    "partidas.statusCompact.LIVE": "En vivo",
    "partidas.statusCompact.SUSPENDED": "Detenido",
    "partidas.statusCompact.FINISHED": "FT",

    // Status — accessible (aria) label
    "partidas.statusAccessible.PRE_GAME": "Programado",
    "partidas.statusAccessible.LIVE": "En vivo",
    "partidas.statusAccessible.SUSPENDED": "Partido detenido",
    "partidas.statusAccessible.FINISHED": "Finalizado",

    // Center scoreboard display
    "partidas.kickoff": "Inicio",
    "partidas.penalties": "Pen. {teamA} x {teamB}",
    "partidas.fullTimeLong": "Final",
    "partidas.inPlay": "En juego",
    "partidas.suspended": "Detenido",

    // Provisional-team badge
    "partidas.qualifiedProvisional": "Clasificado (provisional)",
    "partidas.provAbbrev": "prov.",

    // Empty state
    "partidas.emptyState": "No hay partidos en esta franja por ahora.",
  },
  en: {
    // Header
    "partidas.title": "Matches",
    "partidas.subtitle":
      "Compact list inspired by the BBC scoreboard to browse the schedule without visual clutter.",

    // Filter tabs (label + short label shown per date section)
    "partidas.filterScheduled": "Scheduled",
    "partidas.filterScheduledShort": "Schedule",
    "partidas.filterLive": "Live",
    "partidas.filterLiveShort": "Live",
    "partidas.filterFinished": "Finished",
    "partidas.filterFinishedShort": "Results",

    // Count copy (match/matches)
    "partidas.matchCountSingular": "{count} match",
    "partidas.matchCountPlural": "{count} matches",

    // Phase header
    "partidas.groupStagePhase": "Group Stage",
    "partidas.hiddenHintSingular": " hidden",
    "partidas.hiddenHintPlural": " hidden",

    // Status strip — compact label
    "partidas.statusCompact.PRE_GAME": "Schedule",
    "partidas.statusCompact.LIVE": "Live",
    "partidas.statusCompact.SUSPENDED": "Stopped",
    "partidas.statusCompact.FINISHED": "FT",

    // Status — accessible (aria) label
    "partidas.statusAccessible.PRE_GAME": "Scheduled",
    "partidas.statusAccessible.LIVE": "Live",
    "partidas.statusAccessible.SUSPENDED": "Match stopped",
    "partidas.statusAccessible.FINISHED": "Finished",

    // Center scoreboard display
    "partidas.kickoff": "Kickoff",
    "partidas.penalties": "Pens. {teamA} x {teamB}",
    "partidas.fullTimeLong": "Full Time",
    "partidas.inPlay": "In play",
    "partidas.suspended": "Stopped",

    // Provisional-team badge
    "partidas.qualifiedProvisional": "Qualified (provisional)",
    "partidas.provAbbrev": "prov.",

    // Empty state
    "partidas.emptyState": "No matches in this range right now.",
  },
};

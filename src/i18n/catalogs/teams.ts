// Teams catalog: the "Seleções" view (TeamsView) — the grid of all 48 teams
// grouped by group with qualified/eliminated badges. Keys are dotted by surface
// (`teams.*`). Keep broadcast voice in both languages.
import type { CatalogModule } from "./types";

export const teamsCatalog: CatalogModule = {
  pt: {
    "teams.title": "Seleções",
    "teams.subtitle":
      "Todas as 48 seleções da Copa com acesso direto ao painel completo de cada equipe",
    "teams.legendQualified": "✓ Na disputa",
    "teams.legendQualifiedDesc": "mostra a fase que a seleção alcançou",
    "teams.legendEliminated": "✕ Eliminada",
    "teams.legendEliminatedDesc": "mostra a fase em que caiu",
    "teams.groupTeamCount": "{count} seleções",
    "teams.teamStatsOne": "{code} • {points} pt • {played} {jogos}",
    "teams.teamStatsMany": "{code} • {points} pts • {played} {jogos}",
    "teams.gameSingular": "jogo",
    "teams.gamePlural": "jogos",
    "teams.qualifiedBadge": "Classificada",
    "teams.qualifiedTitle": "Classificada para o mata-mata",
    "teams.eliminatedBadge": "Eliminada",
    "teams.eliminatedTitle": "Sem chances de classificação para o mata-mata",
  },
  es: {
    "teams.title": "Selecciones",
    "teams.subtitle":
      "Todas las 48 selecciones del Mundial con acceso directo al panel completo de cada equipo",
    "teams.legendQualified": "✓ En disputa",
    "teams.legendQualifiedDesc": "muestra la fase que alcanzó la selección",
    "teams.legendEliminated": "✕ Eliminada",
    "teams.legendEliminatedDesc": "muestra la fase en que cayó",
    "teams.groupTeamCount": "{count} selecciones",
    "teams.teamStatsOne": "{code} • {points} pt • {played} {jogos}",
    "teams.teamStatsMany": "{code} • {points} pts • {played} {jogos}",
    "teams.gameSingular": "partido",
    "teams.gamePlural": "partidos",
    "teams.qualifiedBadge": "Clasificada",
    "teams.qualifiedTitle": "Clasificada a la fase eliminatoria",
    "teams.eliminatedBadge": "Eliminada",
    "teams.eliminatedTitle": "Sin chances de clasificación a la fase eliminatoria",
  },
  en: {
    "teams.title": "Teams",
    "teams.subtitle":
      "All 48 World Cup teams with direct access to each squad's full panel",
    "teams.legendQualified": "✓ Still in it",
    "teams.legendQualifiedDesc": "shows the round the team reached",
    "teams.legendEliminated": "✕ Eliminated",
    "teams.legendEliminatedDesc": "shows the round they exited",
    "teams.groupTeamCount": "{count} teams",
    "teams.teamStatsOne": "{code} • {points} pt • {played} {jogos}",
    "teams.teamStatsMany": "{code} • {points} pts • {played} {jogos}",
    "teams.gameSingular": "match",
    "teams.gamePlural": "matches",
    "teams.qualifiedBadge": "Qualified",
    "teams.qualifiedTitle": "Qualified for the knockout round",
    "teams.eliminatedBadge": "Eliminated",
    "teams.eliminatedTitle": "No chance of qualifying for the knockout round",
  },
};

// Teams catalog: the "Seleções" view (TeamsView) — the grid of all 48 teams
// grouped by group with qualified/eliminated badges. Keys are dotted by surface
// (`teams.*`). Keep broadcast voice in both languages.
import type { CatalogModule } from "./types";

export const teamsCatalog: CatalogModule = {
  pt: {
    "teams.title": "Seleções",
    "teams.subtitle":
      "Todas as 48 seleções da Copa com acesso direto ao painel completo de cada equipe",
    "teams.legendQualified": "✓ Classificada",
    "teams.legendQualifiedDesc": "vaga garantida no mata-mata",
    "teams.legendEliminated": "✕ Eliminada",
    "teams.legendEliminatedDesc": "sem chances de classificação",
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
    "teams.legendQualified": "✓ Clasificada",
    "teams.legendQualifiedDesc": "cupo asegurado en los octavos",
    "teams.legendEliminated": "✕ Eliminada",
    "teams.legendEliminatedDesc": "sin chances de clasificación",
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
};

// Jogadores catalog: the "Jogadores" view (JogadoresView) — the sticker-album
// grid of every squad grouped by group, with name/team/stars filters and the
// per-player overlay card. Keys are dotted by surface (`jogadores.*`).
// Keep broadcast voice in both languages.
import type { CatalogModule } from "./types";

export const jogadoresCatalog: CatalogModule = {
  pt: {
    "jogadores.title": "Jogadores",
    "jogadores.viewProfileOf": "Ver perfil de {name}",
    "jogadores.legendBadge": "Lenda",
    "jogadores.instagramVerified": "Instagram verificado",
    "jogadores.teamPlayerCount": "{group} · {count} jogadores",
    "jogadores.viewLineupOf": "Ver escalação de {name}",
    "jogadores.searchPlaceholder": "Buscar jogador...",
    "jogadores.searchAriaLabel": "Buscar jogador por nome",
    "jogadores.clearSearch": "Limpar busca",
    "jogadores.teamFilterLabel": "Seleção",
    "jogadores.filterByTeam": "Filtrar por seleção",
    "jogadores.allTeams": "Todas as seleções",
    "jogadores.starsFilter": "★ Craques da Copa",
    "jogadores.starsFilterTitle": "Mostrar só os craques da Copa",
    "jogadores.clearAllFilters": "Ver todas ×",
    "jogadores.subtitleFiltered": "{count} atleta{plural} encontrado{plural}",
    "jogadores.subtitleAll": "{teams} seleções · {players} atletas",
    "jogadores.emptyTitle": "Nenhum jogador encontrado",
    "jogadores.emptyHint": "Tente outro nome ou seleção",
    "jogadores.detailPosition": "Posição",
    "jogadores.detailBirth": "Nascimento",
  },
  es: {
    "jogadores.title": "Jugadores",
    "jogadores.viewProfileOf": "Ver perfil de {name}",
    "jogadores.legendBadge": "Leyenda",
    "jogadores.instagramVerified": "Instagram verificado",
    "jogadores.teamPlayerCount": "{group} · {count} jugadores",
    "jogadores.viewLineupOf": "Ver alineación de {name}",
    "jogadores.searchPlaceholder": "Buscar jugador...",
    "jogadores.searchAriaLabel": "Buscar jugador por nombre",
    "jogadores.clearSearch": "Limpiar búsqueda",
    "jogadores.teamFilterLabel": "Selección",
    "jogadores.filterByTeam": "Filtrar por selección",
    "jogadores.allTeams": "Todas las selecciones",
    "jogadores.starsFilter": "★ Cracks del Mundial",
    "jogadores.starsFilterTitle": "Mostrar solo los cracks del Mundial",
    "jogadores.clearAllFilters": "Ver todas ×",
    "jogadores.subtitleFiltered": "{count} atleta{plural} encontrado{plural}",
    "jogadores.subtitleAll": "{teams} selecciones · {players} atletas",
    "jogadores.emptyTitle": "Ningún jugador encontrado",
    "jogadores.emptyHint": "Prueba con otro nombre o selección",
    "jogadores.detailPosition": "Posición",
    "jogadores.detailBirth": "Nacimiento",
  },
};

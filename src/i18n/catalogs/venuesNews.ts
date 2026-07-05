// Venues + News catalog — the "Estádios" (VenueMapView) and "Notícias" (NewsView)
// tabs: headings, subtitles, legends, stat labels, filter labels and empty
// states. Keys are prefixed `venuesNews.`. pt is the complete reference; es is
// LATAM football voice.
import type { CatalogModule } from "./types";

export const venuesNewsCatalog: CatalogModule = {
  pt: {
    // Country labels
    "venuesNews.country.USA": "Estados Unidos",
    "venuesNews.country.MEX": "México",
    "venuesNews.country.CAN": "Canadá",

    // VenueMapView — header
    "venuesNews.venues.title": "Estádios da Copa",
    "venuesNews.venues.subtitle":
      "16 sedes • mapa real com OpenStreetMap • exploração por cidade anfitriã",

    // VenueMapView — map panel
    "venuesNews.venues.mapTitle": "Rotas do Mundial",
    "venuesNews.venues.mapHint":
      "Navegue pelo mapa, aplique zoom e toque em um marcador para abrir a sede",
    "venuesNews.venues.mapDescription":
      "Explore as 16 sedes em escala real, com zoom livre entre Canadá, Estados Unidos e México.",

    // VenueMapView — mobile list
    "venuesNews.venues.matchCount": "{count} jogos",

    // VenueMapView — detail panel
    "venuesNews.venues.selectedVenue": "Sede selecionada",
    "venuesNews.venues.highlightedMatches": "{count} partidas em destaque",
    "venuesNews.venues.capacity": "Capacidade",
    "venuesNews.venues.inauguration": "Inauguração",
    "venuesNews.venues.arenaXRay": "Raio-X da arena",
    "venuesNews.venues.matchesHere": "Jogos nesta sede",
    "venuesNews.venues.matchesHereHint":
      "Cruzamento com as partidas em destaque do app",
    "venuesNews.venues.noMatches":
      "Esta arena ainda não recebeu nenhuma das partidas em destaque da página.",

    // NewsView — header
    "venuesNews.news.title": "Central de Notícias",
    "venuesNews.news.subtitle":
      "Atualizações sobre sedes, ingressos, seleções e bastidores do Mundial",
    "venuesNews.news.highlightsCount": "{count} destaques em foco",

    // NewsView — filters
    "venuesNews.news.filterAll": "Todas",
    "venuesNews.news.filterVenues": "Sedes",
    "venuesNews.news.filterTickets": "Ingressos",
    "venuesNews.news.filterTeams": "Equipes",
    "venuesNews.news.filterGeneral": "Geral",
  },
  es: {
    // Country labels
    "venuesNews.country.USA": "Estados Unidos",
    "venuesNews.country.MEX": "México",
    "venuesNews.country.CAN": "Canadá",

    // VenueMapView — header
    "venuesNews.venues.title": "Estadios del Mundial",
    "venuesNews.venues.subtitle":
      "16 sedes • mapa real con OpenStreetMap • exploración por ciudad anfitriona",

    // VenueMapView — map panel
    "venuesNews.venues.mapTitle": "Rutas del Mundial",
    "venuesNews.venues.mapHint":
      "Navega por el mapa, aplica zoom y toca un marcador para abrir la sede",
    "venuesNews.venues.mapDescription":
      "Explora las 16 sedes a escala real, con zoom libre entre Canadá, Estados Unidos y México.",

    // VenueMapView — mobile list
    "venuesNews.venues.matchCount": "{count} partidos",

    // VenueMapView — detail panel
    "venuesNews.venues.selectedVenue": "Sede seleccionada",
    "venuesNews.venues.highlightedMatches": "{count} partidos destacados",
    "venuesNews.venues.capacity": "Capacidad",
    "venuesNews.venues.inauguration": "Inauguración",
    "venuesNews.venues.arenaXRay": "Radiografía del estadio",
    "venuesNews.venues.matchesHere": "Partidos en este estadio",
    "venuesNews.venues.matchesHereHint":
      "Cruce con los partidos destacados de la app",
    "venuesNews.venues.noMatches":
      "Este estadio aún no ha recibido ninguno de los partidos destacados de la página.",

    // NewsView — header
    "venuesNews.news.title": "Central de Noticias",
    "venuesNews.news.subtitle":
      "Novedades sobre sedes, entradas, selecciones y entretelones del Mundial",
    "venuesNews.news.highlightsCount": "{count} destacados en foco",

    // NewsView — filters
    "venuesNews.news.filterAll": "Todas",
    "venuesNews.news.filterVenues": "Sedes",
    "venuesNews.news.filterTickets": "Entradas",
    "venuesNews.news.filterTeams": "Equipos",
    "venuesNews.news.filterGeneral": "General",
  },
  en: {
    // Country labels
    "venuesNews.country.USA": "United States",
    "venuesNews.country.MEX": "Mexico",
    "venuesNews.country.CAN": "Canada",

    // VenueMapView — header
    "venuesNews.venues.title": "World Cup Stadiums",
    "venuesNews.venues.subtitle":
      "16 venues • real OpenStreetMap map • explore by host city",

    // VenueMapView — map panel
    "venuesNews.venues.mapTitle": "World Cup Routes",
    "venuesNews.venues.mapHint":
      "Pan the map, zoom in, and tap a marker to open the venue",
    "venuesNews.venues.mapDescription":
      "Explore all 16 venues at real scale, with free zoom across Canada, the United States, and Mexico.",

    // VenueMapView — mobile list
    "venuesNews.venues.matchCount": "{count} matches",

    // VenueMapView — detail panel
    "venuesNews.venues.selectedVenue": "Selected venue",
    "venuesNews.venues.highlightedMatches": "{count} featured matches",
    "venuesNews.venues.capacity": "Capacity",
    "venuesNews.venues.inauguration": "Opened",
    "venuesNews.venues.arenaXRay": "Arena X-ray",
    "venuesNews.venues.matchesHere": "Matches at this venue",
    "venuesNews.venues.matchesHereHint":
      "Cross-referenced with the app's featured matches",
    "venuesNews.venues.noMatches":
      "This arena hasn't hosted any of the page's featured matches yet.",

    // NewsView — header
    "venuesNews.news.title": "News Hub",
    "venuesNews.news.subtitle":
      "Updates on venues, tickets, teams, and behind-the-scenes World Cup stories",
    "venuesNews.news.highlightsCount": "{count} highlights in focus",

    // NewsView — filters
    "venuesNews.news.filterAll": "All",
    "venuesNews.news.filterVenues": "Venues",
    "venuesNews.news.filterTickets": "Tickets",
    "venuesNews.news.filterTeams": "Teams",
    "venuesNews.news.filterGeneral": "General",
  },
};

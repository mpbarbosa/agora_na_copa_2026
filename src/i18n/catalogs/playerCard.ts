// Player / coach / referee overlay-card catalog — the modal detail cards opened
// from lineups, the Ao Vivo scoreboard, and the players grid. Keys are dotted by
// surface (`playerCard.*`). Portuguese is the reference; Spanish is LATAM
// football voice (gols→goles, técnico→DT, árbitro→árbitro, jogos→partidos).
import type { CatalogModule } from "./types";

export const playerCardCatalog: CatalogModule = {
  pt: {
    // Shared chrome
    "playerCard.close": "Fechar",
    "playerCard.openInstagram": "Abrir no Instagram",
    "playerCard.instagramHighlightOne": "Destaque no Instagram",
    "playerCard.instagramHighlightMany": "Destaques no Instagram",

    // Player stat / detail labels (buildPlayerStatCells / buildTournamentStatCells)
    "playerCard.stat.shirt": "Camisa",
    "playerCard.stat.age": "Idade",
    "playerCard.stat.height": "Altura",
    "playerCard.stat.goals": "Gols",
    "playerCard.stat.yellows": "Amarelos",
    "playerCard.stat.reds": "Vermelhos",

    // Social platform labels
    "playerCard.social.site": "Site oficial",
    "playerCard.social.wikipedia": "Wikipédia",
    "playerCard.social.followers": "seguidores",

    // Birth-date month abbreviations (formatBirthDate)
    "playerCard.month.jan": "jan.",
    "playerCard.month.feb": "fev.",
    "playerCard.month.mar": "mar.",
    "playerCard.month.apr": "abr.",
    "playerCard.month.may": "mai.",
    "playerCard.month.jun": "jun.",
    "playerCard.month.jul": "jul.",
    "playerCard.month.aug": "ago.",
    "playerCard.month.sep": "set.",
    "playerCard.month.oct": "out.",
    "playerCard.month.nov": "nov.",
    "playerCard.month.dec": "dez.",

    // Player overlay card
    "playerCard.photoAlt": "Foto de {name}",
    "playerCard.signatureAlt": "Assinatura de {name}",
    "playerCard.zoomedPhotoAlt": "Foto ampliada de {name}",
    "playerCard.eyebrow": "Card completo do jogador",
    "playerCard.openTeamPanel": "Abrir painel completo de {team}",
    "playerCard.openFullPhoto": "Abrir foto em tamanho real",
    "playerCard.officialSocials": "Redes oficiais",
    "playerCard.webSearch": "Pesquisar na web",
    "playerCard.news": "Notícias",

    // Coach card
    "playerCard.coachEyebrow": "Card do treinador",
    "playerCard.coachRole": "Técnico",
    "playerCard.coachRoleTeam": "Técnico • {team}",
    "playerCard.coachGames": "Jogos",
    "playerCard.coachWins": "Vitórias",
    "playerCard.coachDraws": "Empates",
    "playerCard.coachLosses": "Derrotas",
    "playerCard.coachGoals": "Gols (pró / contra)",
    "playerCard.coachGoalDiff": "Saldo",
    "playerCard.coachPhotoCredit": "Foto:",

    // Referee card
    "playerCard.refereeEyebrow": "Card do árbitro",
    "playerCard.refereeRole": "Árbitro(a)",
    "playerCard.refereeRoleCountry": "Árbitro(a) • {country}",
    "playerCard.refereeBlurb": "Árbitro(a) principal designado(a) pela FIFA para a partida.",
  },
  es: {
    // Shared chrome
    "playerCard.close": "Cerrar",
    "playerCard.openInstagram": "Abrir en Instagram",
    "playerCard.instagramHighlightOne": "Destacado en Instagram",
    "playerCard.instagramHighlightMany": "Destacados en Instagram",

    // Player stat / detail labels
    "playerCard.stat.shirt": "Número",
    "playerCard.stat.age": "Edad",
    "playerCard.stat.height": "Altura",
    "playerCard.stat.goals": "Goles",
    "playerCard.stat.yellows": "Amarillas",
    "playerCard.stat.reds": "Rojas",

    // Social platform labels
    "playerCard.social.site": "Sitio oficial",
    "playerCard.social.wikipedia": "Wikipedia",
    "playerCard.social.followers": "seguidores",

    // Birth-date month abbreviations
    "playerCard.month.jan": "ene.",
    "playerCard.month.feb": "feb.",
    "playerCard.month.mar": "mar.",
    "playerCard.month.apr": "abr.",
    "playerCard.month.may": "may.",
    "playerCard.month.jun": "jun.",
    "playerCard.month.jul": "jul.",
    "playerCard.month.aug": "ago.",
    "playerCard.month.sep": "sep.",
    "playerCard.month.oct": "oct.",
    "playerCard.month.nov": "nov.",
    "playerCard.month.dec": "dic.",

    // Player overlay card
    "playerCard.photoAlt": "Foto de {name}",
    "playerCard.signatureAlt": "Firma de {name}",
    "playerCard.zoomedPhotoAlt": "Foto ampliada de {name}",
    "playerCard.eyebrow": "Ficha completa del jugador",
    "playerCard.openTeamPanel": "Abrir el panel completo de {team}",
    "playerCard.openFullPhoto": "Abrir foto en tamaño real",
    "playerCard.officialSocials": "Redes oficiales",
    "playerCard.webSearch": "Buscar en la web",
    "playerCard.news": "Noticias",

    // Coach card
    "playerCard.coachEyebrow": "Ficha del DT",
    "playerCard.coachRole": "DT",
    "playerCard.coachRoleTeam": "DT • {team}",
    "playerCard.coachGames": "Partidos",
    "playerCard.coachWins": "Victorias",
    "playerCard.coachDraws": "Empates",
    "playerCard.coachLosses": "Derrotas",
    "playerCard.coachGoals": "Goles (a favor / en contra)",
    "playerCard.coachGoalDiff": "Diferencia",
    "playerCard.coachPhotoCredit": "Foto:",

    // Referee card
    "playerCard.refereeEyebrow": "Ficha del árbitro",
    "playerCard.refereeRole": "Árbitro(a)",
    "playerCard.refereeRoleCountry": "Árbitro(a) • {country}",
    "playerCard.refereeBlurb": "Árbitro(a) principal designado(a) por la FIFA para el partido.",
  },
};

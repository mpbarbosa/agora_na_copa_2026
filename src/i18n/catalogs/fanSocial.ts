// Fan Zone + Redes Sociais catalog — the "Fan Zone" tab (trivia quiz, penalty
// shootout minigame, match predictor) and the "Redes Sociais" tab (FIFA profile
// card, Google Trends, social feed, comments, trending hashtags). Keys are
// prefixed `fanSocial.`. pt is the complete reference; es is LATAM football voice.
import type { CatalogModule } from "./types";

export const fanSocialCatalog: CatalogModule = {
  pt: {
    // FanZoneView — header
    "fanSocial.fanZoneTitle": "Fan Zone",
    "fanSocial.fanZoneSubtitle":
      "Quiz da torcida, disputa de pênaltis e palpite simulado das partidas",
    "fanSocial.fanZoneScopeNote": "Palpite 100% simulado • sem IA externa",

    // Trivia panel
    "fanSocial.triviaTitle": "Quiz da torcida",
    "fanSocial.triviaWarmup": "Aquecendo o quiz",
    "fanSocial.triviaProgress": "Pergunta {current} de {total}",
    "fanSocial.triviaScore": "Placar: {score}",
    "fanSocial.triviaLoading": "Carregando perguntas do aquecimento da torcida...",
    "fanSocial.triviaError": "Não foi possível carregar o quiz agora. Tente atualizar a Fan Zone.",
    "fanSocial.triviaCorrect": "Resposta certa",
    "fanSocial.triviaWrong": "Não foi dessa vez",
    "fanSocial.triviaRestart": "Reiniciar quiz",
    "fanSocial.triviaNext": "Próxima pergunta",

    // Penalty panel
    "fanSocial.penaltyTitle": "Disputa de pênaltis",
    "fanSocial.penaltySubtitle": "Escolha o canto e veja para onde o goleiro mergulha",
    "fanSocial.penaltyReset": "Reiniciar disputa",
    "fanSocial.penaltyShots": "Batidas",
    "fanSocial.penaltyGoals": "Gols",
    "fanSocial.penaltySaves": "Defesas",
    "fanSocial.penaltyExplainer":
      "O goleiro alterna leitura de cantos em um padrão pseudoaleatório para manter a brincadeira rápida e consistente entre as rodadas.",
    "fanSocial.penaltyOptionLeft": "Canto esquerdo",
    "fanSocial.penaltyOptionCenter": "No meio",
    "fanSocial.penaltyOptionRight": "Canto direito",
    "fanSocial.penaltyLastResult": "Resultado da última cobrança",
    "fanSocial.penaltyGoalConfirmed": "Gol confirmado",
    "fanSocial.penaltyKeeperSaved": "Goleiro defendeu",
    "fanSocial.penaltyResultShotPrefix": "Você bateu em",
    "fanSocial.penaltyResultKeeperMid": "e o goleiro caiu em",
    "fanSocial.penaltyResultSuffix": ".",
    "fanSocial.penaltyDirLeft": "esquerda",
    "fanSocial.penaltyDirCenter": "centro",
    "fanSocial.penaltyDirRight": "direita",
    "fanSocial.penaltyEmpty": "Faça a primeira cobrança para abrir o placar da Fan Zone.",

    // Predictor panel
    "fanSocial.predictorTitle": "Palpite da partida",
    "fanSocial.predictorSubtitle":
      "Escolha duas seleções e gere um prognóstico a partir da campanha atual delas.",
    "fanSocial.predictorSimulated": "Simulado",
    "fanSocial.predictorHome": "Mandante",
    "fanSocial.predictorAway": "Visitante",
    "fanSocial.predictorSelect": "Selecione…",
    "fanSocial.predictorNotesPlaceholder": "Opcional: seu pitaco (lesões, clima, fator casa…)",
    "fanSocial.predictorSameTeams": "Escolha duas seleções diferentes.",
    "fanSocial.predictorGenerating": "Gerando…",
    "fanSocial.predictorGenerate": "Gerar palpite",
    "fanSocial.predictorSimulatedBadge": "Palpite simulado",
    "fanSocial.predictorError": "Não foi possível gerar o palpite agora. Tente novamente.",

    // SocialMediasView — header
    "fanSocial.socialTitle": "Redes Sociais",
    "fanSocial.socialSubtitle":
      "Mundo na Copa • feed social com filtros, curtidas e comentários em tempo real",
    "fanSocial.socialMultiview": "Multiview ao vivo",

    // FIFA profile card
    "fanSocial.fifaCardLabel": "Card oficial da Copa do Mundo FIFA",
    "fanSocial.fifaProfileLabel": "Perfil oficial da Copa do Mundo FIFA no Instagram",
    "fanSocial.fifaOfficialProfile": "@fifaworldcup • Perfil oficial",
    "fanSocial.fifaFollowBlurb":
      "Siga a conta oficial da Copa do Mundo FIFA 2026 e acompanhe tudo do Mundial em primeira mão.",
    "fanSocial.fifaFollow": "Seguir",

    // Player Instagram highlights feed
    "fanSocial.igHighlightsSubtitle":
      "Os melhores momentos dos craques da Copa, direto do Instagram",
    "fanSocial.igHighlightsAria": "Destaques de jogadores no Instagram",

    // Google Trends card
    "fanSocial.trendsLabel": "Buscas em alta no Google",
    "fanSocial.trendsTitle": "Em alta no Google",
    "fanSocial.trendsSportsOnly": "Só esportes",
    "fanSocial.trendsSource": "Google Trends • Brasil",
    "fanSocial.trendsLoading": "Carregando buscas em alta…",
    "fanSocial.trendsEmpty": "Nenhuma busca de esportes em alta agora.",
    "fanSocial.trendsSearches": "{traffic} buscas",

    // Filters
    "fanSocial.filterAll": "Tudo",
    "fanSocial.filterPhotos": "Fotos",
    "fanSocial.filterNews": "Notícias",
    "fanSocial.filterOfficial": "Oficial",
    "fanSocial.filtersLabel": "Filtrar publicações",

    // Category badges
    "fanSocial.categoryPhoto": "Foto",
    "fanSocial.categoryNews": "Notícia",
    "fanSocial.categoryOfficial": "Oficial",

    // Feed
    "fanSocial.feedLabel": "Feed social",
    "fanSocial.feedEmptyPrefix": "Nenhuma publicação para esse filtro agora. Tente outra tag ou volte para ",
    "fanSocial.feedEmptyAll": "Tudo",
    "fanSocial.feedEmptySuffix": ".",
    "fanSocial.postOfficialAccount": "Conta oficial",
    "fanSocial.commentsEmpty": "Seja o primeiro a comentar essa publicação.",
    "fanSocial.commentPlaceholder": "Manda a real…",
    "fanSocial.commentSubmit": "Enviar comentário",

    // Trending sidebar
    "fanSocial.trendingTitle": "Tendências",
    "fanSocial.trendingHint": "Toque numa hashtag para filtrar o feed",
    "fanSocial.postCountSingular": "post",
    "fanSocial.postCountPlural": "posts",
  },
  es: {
    // FanZoneView — header
    "fanSocial.fanZoneTitle": "Fan Zone",
    "fanSocial.fanZoneSubtitle":
      "Quiz de la hinchada, tanda de penales y pronóstico simulado de los partidos",
    "fanSocial.fanZoneScopeNote": "Pronóstico 100% simulado • sin IA externa",

    // Trivia panel
    "fanSocial.triviaTitle": "Quiz de la hinchada",
    "fanSocial.triviaWarmup": "Calentando el quiz",
    "fanSocial.triviaProgress": "Pregunta {current} de {total}",
    "fanSocial.triviaScore": "Puntaje: {score}",
    "fanSocial.triviaLoading": "Cargando preguntas del calentamiento de la hinchada...",
    "fanSocial.triviaError": "No se pudo cargar el quiz por ahora. Intenta actualizar la Fan Zone.",
    "fanSocial.triviaCorrect": "¡Acertaste!",
    "fanSocial.triviaWrong": "No fue esta vez",
    "fanSocial.triviaRestart": "Reiniciar quiz",
    "fanSocial.triviaNext": "Siguiente pregunta",

    // Penalty panel
    "fanSocial.penaltyTitle": "Tanda de penales",
    "fanSocial.penaltySubtitle": "Elige el palo y mira hacia dónde se lanza el arquero",
    "fanSocial.penaltyReset": "Reiniciar tanda",
    "fanSocial.penaltyShots": "Remates",
    "fanSocial.penaltyGoals": "Goles",
    "fanSocial.penaltySaves": "Atajadas",
    "fanSocial.penaltyExplainer":
      "El arquero alterna la lectura de los palos con un patrón pseudoaleatorio para mantener el juego rápido y consistente entre rondas.",
    "fanSocial.penaltyOptionLeft": "Palo izquierdo",
    "fanSocial.penaltyOptionCenter": "Al medio",
    "fanSocial.penaltyOptionRight": "Palo derecho",
    "fanSocial.penaltyLastResult": "Resultado del último remate",
    "fanSocial.penaltyGoalConfirmed": "Gol confirmado",
    "fanSocial.penaltyKeeperSaved": "El arquero atajó",
    "fanSocial.penaltyResultShotPrefix": "Pateaste a",
    "fanSocial.penaltyResultKeeperMid": "y el arquero se lanzó a",
    "fanSocial.penaltyResultSuffix": ".",
    "fanSocial.penaltyDirLeft": "la izquierda",
    "fanSocial.penaltyDirCenter": "el medio",
    "fanSocial.penaltyDirRight": "la derecha",
    "fanSocial.penaltyEmpty": "Patea el primer penal para abrir el marcador de la Fan Zone.",

    // Predictor panel
    "fanSocial.predictorTitle": "Pronóstico del partido",
    "fanSocial.predictorSubtitle":
      "Elige dos selecciones y genera un pronóstico a partir de su campaña actual.",
    "fanSocial.predictorSimulated": "Simulado",
    "fanSocial.predictorHome": "Local",
    "fanSocial.predictorAway": "Visitante",
    "fanSocial.predictorSelect": "Selecciona…",
    "fanSocial.predictorNotesPlaceholder": "Opcional: tu comentario (lesiones, clima, factor cancha…)",
    "fanSocial.predictorSameTeams": "Elige dos selecciones diferentes.",
    "fanSocial.predictorGenerating": "Generando…",
    "fanSocial.predictorGenerate": "Generar pronóstico",
    "fanSocial.predictorSimulatedBadge": "Pronóstico simulado",
    "fanSocial.predictorError": "No se pudo generar el pronóstico por ahora. Intenta de nuevo.",

    // SocialMediasView — header
    "fanSocial.socialTitle": "Redes Sociales",
    "fanSocial.socialSubtitle":
      "El mundo en el Mundial • feed social con filtros, me gusta y comentarios en tiempo real",
    "fanSocial.socialMultiview": "Multiview en vivo",

    // FIFA profile card
    "fanSocial.fifaCardLabel": "Tarjeta oficial de la Copa Mundial de la FIFA",
    "fanSocial.fifaProfileLabel": "Perfil oficial de la Copa Mundial de la FIFA en Instagram",
    "fanSocial.fifaOfficialProfile": "@fifaworldcup • Perfil oficial",
    "fanSocial.fifaFollowBlurb":
      "Sigue la cuenta oficial de la Copa Mundial de la FIFA 2026 y acompaña todo el Mundial de primera mano.",
    "fanSocial.fifaFollow": "Seguir",

    // Player Instagram highlights feed
    "fanSocial.igHighlightsSubtitle":
      "Los mejores momentos de las estrellas del Mundial, directo desde Instagram",
    "fanSocial.igHighlightsAria": "Destacados de jugadores en Instagram",

    // Google Trends card
    "fanSocial.trendsLabel": "Búsquedas populares en Google",
    "fanSocial.trendsTitle": "Tendencia en Google",
    "fanSocial.trendsSportsOnly": "Solo deportes",
    "fanSocial.trendsSource": "Google Trends • Brasil",
    "fanSocial.trendsLoading": "Cargando búsquedas populares…",
    "fanSocial.trendsEmpty": "No hay búsquedas de deportes populares ahora.",
    "fanSocial.trendsSearches": "{traffic} búsquedas",

    // Filters
    "fanSocial.filterAll": "Todo",
    "fanSocial.filterPhotos": "Fotos",
    "fanSocial.filterNews": "Noticias",
    "fanSocial.filterOfficial": "Oficial",
    "fanSocial.filtersLabel": "Filtrar publicaciones",

    // Category badges
    "fanSocial.categoryPhoto": "Foto",
    "fanSocial.categoryNews": "Noticia",
    "fanSocial.categoryOfficial": "Oficial",

    // Feed
    "fanSocial.feedLabel": "Feed social",
    "fanSocial.feedEmptyPrefix": "No hay publicaciones para este filtro ahora. Prueba otra etiqueta o vuelve a ",
    "fanSocial.feedEmptyAll": "Todo",
    "fanSocial.feedEmptySuffix": ".",
    "fanSocial.postOfficialAccount": "Cuenta oficial",
    "fanSocial.commentsEmpty": "Sé el primero en comentar esta publicación.",
    "fanSocial.commentPlaceholder": "Dilo sin filtro…",
    "fanSocial.commentSubmit": "Enviar comentario",

    // Trending sidebar
    "fanSocial.trendingTitle": "Tendencias",
    "fanSocial.trendingHint": "Toca un hashtag para filtrar el feed",
    "fanSocial.postCountSingular": "post",
    "fanSocial.postCountPlural": "posts",
  },
  en: {
    // FanZoneView — header
    "fanSocial.fanZoneTitle": "Fan Zone",
    "fanSocial.fanZoneSubtitle":
      "Fan trivia quiz, penalty shootout and simulated match predictions",
    "fanSocial.fanZoneScopeNote": "100% simulated prediction • no external AI",

    // Trivia panel
    "fanSocial.triviaTitle": "Fan trivia quiz",
    "fanSocial.triviaWarmup": "Warming up the quiz",
    "fanSocial.triviaProgress": "Question {current} of {total}",
    "fanSocial.triviaScore": "Score: {score}",
    "fanSocial.triviaLoading": "Loading fan warm-up questions...",
    "fanSocial.triviaError": "Couldn't load the quiz right now. Try refreshing the Fan Zone.",
    "fanSocial.triviaCorrect": "Correct answer",
    "fanSocial.triviaWrong": "Not this time",
    "fanSocial.triviaRestart": "Restart quiz",
    "fanSocial.triviaNext": "Next question",

    // Penalty panel
    "fanSocial.penaltyTitle": "Penalty shootout",
    "fanSocial.penaltySubtitle": "Pick your corner and see which way the keeper dives",
    "fanSocial.penaltyReset": "Restart shootout",
    "fanSocial.penaltyShots": "Shots",
    "fanSocial.penaltyGoals": "Goals",
    "fanSocial.penaltySaves": "Saves",
    "fanSocial.penaltyExplainer":
      "The keeper alternates corner reads in a pseudo-random pattern to keep the game fast and consistent between rounds.",
    "fanSocial.penaltyOptionLeft": "Left corner",
    "fanSocial.penaltyOptionCenter": "Down the middle",
    "fanSocial.penaltyOptionRight": "Right corner",
    "fanSocial.penaltyLastResult": "Result of the last kick",
    "fanSocial.penaltyGoalConfirmed": "Goal confirmed",
    "fanSocial.penaltyKeeperSaved": "Keeper saved it",
    "fanSocial.penaltyResultShotPrefix": "You shot to the",
    "fanSocial.penaltyResultKeeperMid": "and the keeper dove to the",
    "fanSocial.penaltyResultSuffix": ".",
    "fanSocial.penaltyDirLeft": "left",
    "fanSocial.penaltyDirCenter": "center",
    "fanSocial.penaltyDirRight": "right",
    "fanSocial.penaltyEmpty": "Take the first kick to open the Fan Zone scoreboard.",

    // Predictor panel
    "fanSocial.predictorTitle": "Match prediction",
    "fanSocial.predictorSubtitle":
      "Pick two teams and generate a forecast from their current campaign.",
    "fanSocial.predictorSimulated": "Simulated",
    "fanSocial.predictorHome": "Home",
    "fanSocial.predictorAway": "Away",
    "fanSocial.predictorSelect": "Select…",
    "fanSocial.predictorNotesPlaceholder": "Optional: your take (injuries, weather, home advantage…)",
    "fanSocial.predictorSameTeams": "Pick two different teams.",
    "fanSocial.predictorGenerating": "Generating…",
    "fanSocial.predictorGenerate": "Generate prediction",
    "fanSocial.predictorSimulatedBadge": "Simulated prediction",
    "fanSocial.predictorError": "Couldn't generate the prediction right now. Try again.",

    // SocialMediasView — header
    "fanSocial.socialTitle": "Social",
    "fanSocial.socialSubtitle":
      "The world at the World Cup • social feed with filters, likes and real-time comments",
    "fanSocial.socialMultiview": "Live multiview",

    // FIFA profile card
    "fanSocial.fifaCardLabel": "Official FIFA World Cup card",
    "fanSocial.fifaProfileLabel": "Official FIFA World Cup profile on Instagram",
    "fanSocial.fifaOfficialProfile": "@fifaworldcup • Official profile",
    "fanSocial.fifaFollowBlurb":
      "Follow the official FIFA World Cup 2026 account and catch everything from the World Cup firsthand.",
    "fanSocial.fifaFollow": "Follow",

    // Player Instagram highlights feed
    "fanSocial.igHighlightsSubtitle":
      "The best moments from the World Cup's stars, straight from Instagram",
    "fanSocial.igHighlightsAria": "Player highlights on Instagram",

    // Google Trends card
    "fanSocial.trendsLabel": "Trending searches on Google",
    "fanSocial.trendsTitle": "Trending on Google",
    "fanSocial.trendsSportsOnly": "Sports only",
    "fanSocial.trendsSource": "Google Trends • Brazil",
    "fanSocial.trendsLoading": "Loading trending searches…",
    "fanSocial.trendsEmpty": "No trending sports searches right now.",
    "fanSocial.trendsSearches": "{traffic} searches",

    // Filters
    "fanSocial.filterAll": "All",
    "fanSocial.filterPhotos": "Photos",
    "fanSocial.filterNews": "News",
    "fanSocial.filterOfficial": "Official",
    "fanSocial.filtersLabel": "Filter posts",

    // Category badges
    "fanSocial.categoryPhoto": "Photo",
    "fanSocial.categoryNews": "News",
    "fanSocial.categoryOfficial": "Official",

    // Feed
    "fanSocial.feedLabel": "Social feed",
    "fanSocial.feedEmptyPrefix": "No posts for this filter right now. Try another tag or go back to ",
    "fanSocial.feedEmptyAll": "All",
    "fanSocial.feedEmptySuffix": ".",
    "fanSocial.postOfficialAccount": "Official account",
    "fanSocial.commentsEmpty": "Be the first to comment on this post.",
    "fanSocial.commentPlaceholder": "Keep it real…",
    "fanSocial.commentSubmit": "Send comment",

    // Trending sidebar
    "fanSocial.trendingTitle": "Trending",
    "fanSocial.trendingHint": "Tap a hashtag to filter the feed",
    "fanSocial.postCountSingular": "post",
    "fanSocial.postCountPlural": "posts",
  },
};

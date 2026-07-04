// Tours catalog: user-facing popover copy for the driver.js onboarding /
// feature-discovery walkthroughs (featureTour.ts, tipTours.ts, messiTour.ts).
// These are non-component hooks, so the strings resolve at call time via the
// pure translate() + getActiveLocale() pair rather than useT. Keys are dotted
// under `tours.`. Keep the broadcast voice in both languages.
import type { CatalogModule } from "./types";

export const toursCatalog: CatalogModule = {
  pt: {
    // featureTour.ts — TOUR_STEPS
    "tours.feature.welcome.title": "Bem-vindo ao Agora na Copa 26 ⚽",
    "tours.feature.welcome.description":
      "Um tour rápido pelas principais áreas do app — leva menos de 30 segundos.",
    "tours.feature.aoVivo.title": "Ao Vivo",
    "tours.feature.aoVivo.description":
      "Placar, onde assistir (Globo, SporTV, CazéTV, FIFA+) e as escalações de cada jogo.",
    "tours.feature.jogadores.title": "Jogadores",
    "tours.feature.jogadores.description":
      "Busque qualquer jogador e abra o perfil completo tocando no nome.",
    "tours.feature.lideres.title": "Líderes",
    "tours.feature.lideres.description":
      "Artilheiros, cartões e as estatísticas que decidem o Mundial.",
    "tours.feature.chaveamento.title": "Mata-mata",
    "tours.feature.chaveamento.description": "Acompanhe o caminho do mata-mata até a final.",
    "tours.feature.social.title": "Redes Sociais",
    "tours.feature.social.description": "Tendências e o feed social da Copa, num só lugar.",
    "tours.feature.theme.title": "Tema claro ou escuro",
    "tours.feature.theme.description": "Toque aqui para alternar o visual quando quiser.",

    // messiTour.ts
    "tours.messi.step1.title": "Conheça o maior craque ⭐",
    "tours.messi.step1.description":
      'Lionel Messi é a estrela da Copa. Vamos abrir o card dele — tudo começa na aba Jogadores. Toque em "Próximo".',
    "tours.messi.step2.title": "Lionel Messi",
    "tours.messi.step2.description":
      'Aqui está o Messi entre os jogadores. Toque em "Próximo" para abrir o card completo.',
    "tours.messi.step3.title": "Card completo do Messi ✓",
    "tours.messi.step3.description":
      "Pronto! Estatísticas, análise e redes oficiais — é assim que você abre o card de qualquer jogador.",

    // tipTours.ts — team lineup tour
    "tours.teamLineup.step1.title": "Veja o elenco de cada seleção 🌎",
    "tours.teamLineup.step1.description":
      'Todas as 48 seleções têm uma página completa. Tudo começa na aba Seleções — toque em "Próximo".',
    "tours.teamLineup.step2.title": "Toque na bandeira",
    "tours.teamLineup.step2.description":
      "Toque no escudo da seleção para abrir o elenco completo. Vamos abrir o Brasil.",
    "tours.teamLineup.step3.title": "Elenco completo ✓",
    "tours.teamLineup.step3.description":
      "Pronto! Escalação titular, comissão técnica e histórico de jogos — é assim que você abre qualquer seleção.",

    // tipTours.ts — best thirds tour
    "tours.bestThirds.step1.title": "8 dos 12 terceiros avançam 🧮",
    "tours.bestThirds.step1.description":
      'Nem todo 3º colocado está fora — e dá para ver quem passa. Vamos achar essa tabela: abra a aba Grupos no "Próximo".',
    "tours.bestThirds.step2.title": "Role até o fim da página ⬇️",
    "tours.bestThirds.step2.description":
      'A seção "Melhores 3º colocados" fica no rodapé desta página, logo abaixo das 12 chaves. Toque em "Próximo" que eu te levo até lá.',
    "tours.bestThirds.step3.title": "Achou: Melhores 3º colocados ✓",
    "tours.bestThirds.step3.description":
      "É aqui. Os 12 terceiros colocados são ranqueados por pontos, saldo, gols e fair play. A linha verde marca o corte: os 8 de cima avançam ao mata-mata.",

    // tipTours.ts — bracket tour
    "tours.bracket.step1.title": "O caminho até a final 🏆",
    "tours.bracket.step1.description":
      'Acompanhe todo o mata-mata, dos 16 avos à decisão, na aba Mata-mata — toque em "Próximo".',
    "tours.bracket.step2.title": "Mata-mata da Copa",
    "tours.bracket.step2.description":
      "A cada fase, o cruzamento se monta com os classificados — incluindo as vagas dos 8 melhores terceiros colocados.",

    // tipTours.ts — bracket feeder tour
    "tours.bracketFeeder.step1.title": "Quem decide o adversário? 🔍",
    "tours.bracketFeeder.step1.description":
      'No Mata-mata, cada confronto nasce de dois jogos da fase anterior — e dá para ver quais. Abra a aba Mata-mata no "Próximo".',
    "tours.bracketFeeder.step2.title": "Aponte para um jogo das Oitavas",
    "tours.bracketFeeder.step2.description":
      'Passe o mouse (ou toque, no celular) num confronto das Oitavas. No "Próximo" eu faço isso por você.',
    "tours.bracketFeeder.step3.title": "Os 2 jogos das 16 avos ✓",
    "tours.bracketFeeder.step3.description":
      "Prontinho! As 16 avos acendem os dois jogos que decidem quem chega a este confronto — destacados e lado a lado. O resto da coluna some para focar no caminho.",

    // tipTours.ts — group history tour
    "tours.groupHistory.step1.title": "Todos os jogos do grupo 📅",
    "tours.groupHistory.step1.description":
      'Resultados e próximos jogos de cada chave ficam no card do grupo. Abra a aba Grupos no "Próximo".',
    "tours.groupHistory.step2.title": "Histórico de jogos",
    "tours.groupHistory.step2.description":
      'Cada grupo tem uma seção "Histórico de jogos". Toque em "Próximo" que eu abro para você.',
    "tours.groupHistory.step3.title": "Resultados e próximos jogos ✓",
    "tours.groupHistory.step3.description":
      "Pronto! Os jogos já disputados aparecem com o placar e os próximos com o horário — em ordem, sem sair da tabela.",

    // tipTours.ts — full bracket tour
    "tours.fullBracket.step1.title": "Toda a chave numa tela só 🏆",
    "tours.fullBracket.step1.description":
      'Dá para ver o mata-mata inteiro como um pôster, dos 16 avos à final. Abra a aba Mata-mata no "Próximo".',
    "tours.fullBracket.step2.title": 'Ative a "Chave completa"',
    "tours.fullBracket.step2.description":
      'Este botão troca as colunas pela chave completa — a tabela simétrica com todas as seleções e a taça no centro. No "Próximo" eu ativo para você.',
    "tours.fullBracket.step3.title": "A chave completa ✓",
    "tours.fullBracket.step3.description":
      "Pronto! As seleções convergem das laterais até a taça no centro: as bandeiras acesas mostram quem avançou e as caixas vazias esperam os próximos jogos. No celular, gire a tela para o modo horizontal.",
  },
  es: {
    // featureTour.ts — TOUR_STEPS
    "tours.feature.welcome.title": "Bienvenido a Agora na Copa 26 ⚽",
    "tours.feature.welcome.description":
      "Un recorrido rápido por las principales áreas de la app — toma menos de 30 segundos.",
    "tours.feature.aoVivo.title": "En Vivo",
    "tours.feature.aoVivo.description":
      "Marcador, dónde ver (Globo, SporTV, CazéTV, FIFA+) y las alineaciones de cada partido.",
    "tours.feature.jogadores.title": "Jugadores",
    "tours.feature.jogadores.description":
      "Busca cualquier jugador y abre el perfil completo tocando en el nombre.",
    "tours.feature.lideres.title": "Líderes",
    "tours.feature.lideres.description":
      "Goleadores, tarjetas y las estadísticas que deciden el Mundial.",
    "tours.feature.chaveamento.title": "Eliminatorias",
    "tours.feature.chaveamento.description":
      "Sigue el camino de las eliminatorias hasta la final.",
    "tours.feature.social.title": "Redes Sociales",
    "tours.feature.social.description": "Tendencias y el feed social del Mundial, en un solo lugar.",
    "tours.feature.theme.title": "Tema claro u oscuro",
    "tours.feature.theme.description": "Toca aquí para alternar el aspecto cuando quieras.",

    // messiTour.ts
    "tours.messi.step1.title": "Conoce al mayor crack ⭐",
    "tours.messi.step1.description":
      'Lionel Messi es la estrella del Mundial. Vamos a abrir su tarjeta — todo empieza en la pestaña Jugadores. Toca en "Siguiente".',
    "tours.messi.step2.title": "Lionel Messi",
    "tours.messi.step2.description":
      'Aquí está Messi entre los jugadores. Toca en "Siguiente" para abrir la tarjeta completa.',
    "tours.messi.step3.title": "Tarjeta completa de Messi ✓",
    "tours.messi.step3.description":
      "¡Listo! Estadísticas, análisis y redes oficiales — así es como abres la tarjeta de cualquier jugador.",

    // tipTours.ts — team lineup tour
    "tours.teamLineup.step1.title": "Mira la plantilla de cada selección 🌎",
    "tours.teamLineup.step1.description":
      'Las 48 selecciones tienen una página completa. Todo empieza en la pestaña Selecciones — toca en "Siguiente".',
    "tours.teamLineup.step2.title": "Toca la bandera",
    "tours.teamLineup.step2.description":
      "Toca el escudo de la selección para abrir la plantilla completa. Vamos a abrir Brasil.",
    "tours.teamLineup.step3.title": "Plantilla completa ✓",
    "tours.teamLineup.step3.description":
      "¡Listo! Alineación titular, cuerpo técnico e historial de partidos — así es como abres cualquier selección.",

    // tipTours.ts — best thirds tour
    "tours.bestThirds.step1.title": "8 de los 12 terceros avanzan 🧮",
    "tours.bestThirds.step1.description":
      'No todo 3º puesto queda fuera — y puedes ver quién pasa. Vamos a encontrar esa tabla: abre la pestaña Grupos en "Siguiente".',
    "tours.bestThirds.step2.title": "Desplázate hasta el final de la página ⬇️",
    "tours.bestThirds.step2.description":
      'La sección "Mejores 3º puestos" está al pie de esta página, justo debajo de las 12 llaves. Toca en "Siguiente" que te llevo hasta allí.',
    "tours.bestThirds.step3.title": "Encontrado: Mejores 3º puestos ✓",
    "tours.bestThirds.step3.description":
      "Es aquí. Los 12 terceros puestos se clasifican por puntos, diferencia, goles y fair play. La línea verde marca el corte: los 8 de arriba avanzan a las eliminatorias.",

    // tipTours.ts — bracket tour
    "tours.bracket.step1.title": "El camino hasta la final 🏆",
    "tours.bracket.step1.description":
      'Sigue todas las eliminatorias, de los dieciseisavos a la final, en la pestaña Eliminatorias — toca en "Siguiente".',
    "tours.bracket.step2.title": "Eliminatorias del Mundial",
    "tours.bracket.step2.description":
      "En cada fase, el cruce se arma con los clasificados — incluyendo los cupos de los 8 mejores terceros puestos.",

    // tipTours.ts — bracket feeder tour
    "tours.bracketFeeder.step1.title": "¿Quién decide al rival? 🔍",
    "tours.bracketFeeder.step1.description":
      'En las Eliminatorias, cada duelo nace de dos partidos de la fase anterior — y puedes ver cuáles. Abre la pestaña Eliminatorias en "Siguiente".',
    "tours.bracketFeeder.step2.title": "Apunta a un partido de los Octavos",
    "tours.bracketFeeder.step2.description":
      'Pasa el mouse (o toca, en el celular) sobre un duelo de los Octavos. En "Siguiente" lo hago por ti.',
    "tours.bracketFeeder.step3.title": "Los 2 partidos de los dieciseisavos ✓",
    "tours.bracketFeeder.step3.description":
      "¡Listo! Los dieciseisavos encienden los dos partidos que deciden quién llega a este duelo — destacados y lado a lado. El resto de la columna desaparece para enfocar el camino.",

    // tipTours.ts — group history tour
    "tours.groupHistory.step1.title": "Todos los partidos del grupo 📅",
    "tours.groupHistory.step1.description":
      'Resultados y próximos partidos de cada llave están en la tarjeta del grupo. Abre la pestaña Grupos en "Siguiente".',
    "tours.groupHistory.step2.title": "Historial de partidos",
    "tours.groupHistory.step2.description":
      'Cada grupo tiene una sección "Historial de partidos". Toca en "Siguiente" que la abro por ti.',
    "tours.groupHistory.step3.title": "Resultados y próximos partidos ✓",
    "tours.groupHistory.step3.description":
      "¡Listo! Los partidos ya jugados aparecen con el marcador y los próximos con el horario — en orden, sin salir de la tabla.",

    // tipTours.ts — full bracket tour
    "tours.fullBracket.step1.title": "Toda la llave en una sola pantalla 🏆",
    "tours.fullBracket.step1.description":
      'Puedes ver todas las eliminatorias como un póster, de los dieciseisavos a la final. Abre la pestaña Eliminatorias en "Siguiente".',
    "tours.fullBracket.step2.title": 'Activa la "Llave completa"',
    "tours.fullBracket.step2.description":
      'Este botón cambia las columnas por la llave completa — la tabla simétrica con todas las selecciones y la copa en el centro. En "Siguiente" la activo por ti.',
    "tours.fullBracket.step3.title": "La llave completa ✓",
    "tours.fullBracket.step3.description":
      "¡Listo! Las selecciones convergen desde los lados hasta la copa en el centro: las banderas encendidas muestran quién avanzó y las casillas vacías esperan los próximos partidos. En el celular, gira la pantalla al modo horizontal.",
  },
};

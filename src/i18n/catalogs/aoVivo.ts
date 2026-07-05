// "Ao Vivo" view catalog (MatchDetailView): scoreboard, match selector,
// broadcast guide, live-incident feed, clock/simulation drawer, and tabs.
// Keys are dotted `aoVivo.*`. pt is the reference; es is LATAM broadcast voice.
import type { CatalogModule } from "./types";

export const aoVivoCatalog: CatalogModule = {
  pt: {
    // Header match-selector group labels
    "aoVivo.group.finished": "Jogos concluídos: ",
    "aoVivo.group.live": "Jogos atuais: ",
    "aoVivo.group.upcoming": "Próximos jogos: ",

    // Incident feed badges (GOL / AM / VM / SUB / LANCE)
    "aoVivo.incident.goal": "GOL",
    "aoVivo.incident.yellow": "AM",
    "aoVivo.incident.red": "VM",
    "aoVivo.incident.sub": "SUB",
    "aoVivo.incident.play": "LANCE",

    // Incident text fragments (rebuilt around the highlighted player name)
    "aoVivo.incidentText.scoredSuffix": " marcou.",
    "aoVivo.incidentText.yellowSuffix": " recebeu amarelo.",
    "aoVivo.incidentText.redSuffix": " foi expulso.",
    "aoVivo.incidentText.subOut": "Sai ",
    "aoVivo.incidentText.subIn": ", entra ",

    // Simulated-incident texts (local demo simulator)
    "aoVivo.sim.goalGeneric":
      "Gol da simulação para {teamName}. A tabela do grupo foi recalculada na hora.",
    "aoVivo.sim.yellowGeneric": "Cartão amarelo para {teamName} na pressão da simulação.",
    "aoVivo.sim.redGeneric": "Cartão vermelho para {teamName} em lance recriado localmente.",
    "aoVivo.sim.subGeneric": "Substituição simulada para {teamName}.",
    "aoVivo.sim.whistle": "Apito simulado em {teamName}.",
    "aoVivo.sim.comment": "Atualização local para {teamName}.",

    // Overlay source/updated line
    "aoVivo.overlay.pending": "Atualização pendente",
    "aoVivo.overlay.unavailable": "Atualização indisponível",
    "aoVivo.overlay.updatedAt": "Atualizado {time}",
    "aoVivo.overlay.sourceSimulation": "Simulação local",
    "aoVivo.overlay.sourceOfficial": "Oficial",
    "aoVivo.overlay.sourceFallback": "Fallback local",

    // Status line
    "aoVivo.status.live": "AO VIVO",
    "aoVivo.status.liveWithTime": "AO VIVO • {time}",
    "aoVivo.status.suspended": "PARALISADO",
    "aoVivo.status.finished": "ENCERRADO",
    "aoVivo.status.preGame": "PRÉ-JOGO",
    "aoVivo.status.officialFifaTitle": "Status oficial da partida segundo a FIFA",

    // Simultaneous-live alert + toggle
    "aoVivo.simultaneous.liveNow": "{count} jogos ao vivo agora",
    "aoVivo.simultaneous.tapToSwitch": "Partidas simultâneas — toque para alternar:",
    "aoVivo.simultaneous.bothAria": "Ver os dois jogos ao vivo lado a lado",
    "aoVivo.simultaneous.both": "Os dois",
    "aoVivo.simultaneous.matchAria": "Ver {teamA} x {teamB}",

    // Match-selector chips (tooltips / aria)
    "aoVivo.selector.matchTooltip": "{teamA} x {teamB}",
    "aoVivo.selector.prevIn": "Ver jogos anteriores em {label}",
    "aoVivo.selector.nextIn": "Ver próximos jogos em {label}",

    // Clock / simulation config drawer
    "aoVivo.config.title": "CONFIGUREM O CRONÔMETRO MOCK",
    "aoVivo.config.close": "Fechar [X]",
    "aoVivo.config.narrationStatus": "Status da narração",
    "aoVivo.config.browserSupport": "Suporte do navegador",
    "aoVivo.config.available": "Disponível",
    "aoVivo.config.unavailable": "Indisponível",
    "aoVivo.config.voiceEngine": "Motor de voz (CDN)",
    "aoVivo.config.loaded": "Carregado",
    "aoVivo.config.loading": "Carregando…",
    "aoVivo.config.dash": "—",
    "aoVivo.config.selectedVoice": "Voz selecionada",
    "aoVivo.config.loadingVoice": "carregando voz…",
    "aoVivo.config.voiceOnDevice": " · no aparelho",
    "aoVivo.config.voiceOnNetwork": " · da rede",
    "aoVivo.config.narration": "Narração",
    "aoVivo.config.enabled": "Ativada",
    "aoVivo.config.disabled": "Desativada",
    "aoVivo.config.voiceLabel": "Voz (escolha uma que fale no seu aparelho)",
    "aoVivo.config.voiceAuto": "Automática (recomendada)",
    "aoVivo.config.voiceNetworkSuffix": " · rede",
    "aoVivo.config.testVoiceStarting": "iniciando…",
    "aoVivo.config.testVoiceTitle": "Falar uma frase de teste agora (teste direto do dispositivo)",
    "aoVivo.config.testVoice": "Testar voz",
    "aoVivo.config.kickoffLabel": "Horário Principal de Entrada:",
    "aoVivo.config.kickoffPlaceholder": "Exemplo: 16:00",
    "aoVivo.config.remainingLabel": "Tempo Restante (Segundos):",
    "aoVivo.config.convertedPreview": "Previsão convertida: {value}",
    "aoVivo.config.simulatorTitle": "Simulador de placar e disciplina",
    "aoVivo.config.simulatorDesc":
      "Use o duelo Brasil x Marrocos para validar o cronômetro demo e ver o Grupos reagir a gols e cartões em tempo real.",
    "aoVivo.config.resetDemo": "Resetar demo local",
    "aoVivo.config.startLive": "Iniciar ao vivo",
    "aoVivo.config.goal": "Gol {code}",
    "aoVivo.config.yellow": "Amarelo {code}",
    "aoVivo.config.red": "Vermelho {code}",
    "aoVivo.config.finishMatch": "Encerrar jogo",
    "aoVivo.config.applyToMatch": "Aplicar ao Jogo",

    // Scoreboard
    "aoVivo.scoreboard.penaltyTitle": "Resultado da disputa por pênaltis",
    "aoVivo.scoreboard.penaltyLabel": "Pênaltis {a}",
    "aoVivo.scoreboard.advancesOnPenalties": "{name} avança nos pênaltis",
    "aoVivo.scoreboard.openGroupTable": "Abrir tabela do {group}",
    "aoVivo.scoreboard.stadiumLocalTimeTitle": "Hora local no estádio",
    "aoVivo.scoreboard.localTime": "Horário local",
    "aoVivo.scoreboard.countdown": "Faltam:",
    "aoVivo.scoreboard.brasiliaTime": "HORÁRIO DE BRASÍLIA",
    "aoVivo.scoreboard.fifaMatchPage": "Página oficial da FIFA para esta partida",
    "aoVivo.scoreboard.simultaneousOne": "Atenção: outro jogo no mesmo horário",
    "aoVivo.scoreboard.simultaneousMany": "Atenção: outros jogos no mesmo horário",
    "aoVivo.scoreboard.simultaneousTitle":
      "{teamA} x {teamB} — começa no mesmo horário",
    "aoVivo.scoreboard.simultaneousAria":
      "Ver {teamA} contra {teamB}, que começa no mesmo horário",

    // Tabs
    "aoVivo.tab.broadcast": "Onde Assistir",
    "aoVivo.tab.lineup": "Escalação",
    "aoVivo.tab.postGame": "Pós-jogo",
    "aoVivo.tab.preGame": "Pré-jogo",
    "aoVivo.tab.instagram": "Instagram",

    // Broadcast guide
    "aoVivo.broadcast.title": "Onde ver o jogo",
    "aoVivo.broadcast.loadingNote": "Carregando dados oficiais da FIFA...",
    "aoVivo.broadcast.videoAria": "Assistir no YouTube: {title}",
    "aoVivo.broadcast.countryLabel": "País de transmissão",
    "aoVivo.broadcast.noneForCountry":
      "Nenhuma transmissão oficial listada para este país.",

    // Incident panel
    "aoVivo.incidents.title": "Lances do jogo",
    "aoVivo.incidents.feedSimulation": "Feed da simulação local",
    "aoVivo.incidents.feedOfficial": "Feed oficial da FIFA",
    "aoVivo.incidents.feedWaiting": "Aguardando lances oficiais da FIFA",
    "aoVivo.incidents.clickHint": "Clique no nome destacado para abrir o card do jogador",
    "aoVivo.incidents.empty": "Sem lances oficiais registrados pela FIFA ate agora.",
    "aoVivo.incidents.listenPlay": "Ouvir o lance",

    // Finished-match bar
    "aoVivo.finished.label": "Jogos concluídos:",
    "aoVivo.finished.prev": "Ver jogos concluídos anteriores",
    "aoVivo.finished.next": "Ver próximos jogos concluídos",

    // Analysis + Instagram tabs
    "aoVivo.analysis.highlights": "Destaques da partida",
    "aoVivo.analysis.preview": "Prévia da partida",
    "aoVivo.analysis.highlightsLabel": "Destaques",
    "aoVivo.analysis.previewLabel": "Prévia",
    "aoVivo.instagram.title": "No Instagram",
    "aoVivo.instagram.open": "Abrir no Instagram",

    // Lineup tab
    "aoVivo.lineup.title": "CENTRAL TÁTICA E DISTRIBUIÇÃO ESPACIAL",
    "aoVivo.lineup.desc":
      "Posicionamento estratégico planejado para o confronto oficial de São Paulo / Nova Iorque 2026.",

    // Incident player overlay
    "aoVivo.overlayCard.position": "Posição",
    "aoVivo.overlayCard.birth": "Nascimento",
    "aoVivo.overlayCard.currentClub": "Clube atual",
    "aoVivo.overlayCard.matchContext": "Contexto da partida",
    "aoVivo.overlayCard.matchContextValue":
      "{teamName} x {opponentName}: {playerName} aparece no radar dos lances da partida.",
  },
  es: {
    // Header match-selector group labels
    "aoVivo.group.finished": "Partidos finalizados: ",
    "aoVivo.group.live": "Partidos actuales: ",
    "aoVivo.group.upcoming": "Próximos partidos: ",

    // Incident feed badges
    "aoVivo.incident.goal": "GOL",
    "aoVivo.incident.yellow": "AM",
    "aoVivo.incident.red": "RJ",
    "aoVivo.incident.sub": "CAM",
    "aoVivo.incident.play": "JUGADA",

    // Incident text fragments
    "aoVivo.incidentText.scoredSuffix": " marcó.",
    "aoVivo.incidentText.yellowSuffix": " recibió amarilla.",
    "aoVivo.incidentText.redSuffix": " fue expulsado.",
    "aoVivo.incidentText.subOut": "Sale ",
    "aoVivo.incidentText.subIn": ", entra ",

    // Simulated-incident texts
    "aoVivo.sim.goalGeneric":
      "Gol de la simulación para {teamName}. La tabla del grupo se recalculó al instante.",
    "aoVivo.sim.yellowGeneric": "Tarjeta amarilla para {teamName} en la presión de la simulación.",
    "aoVivo.sim.redGeneric": "Tarjeta roja para {teamName} en una jugada recreada localmente.",
    "aoVivo.sim.subGeneric": "Cambio simulado para {teamName}.",
    "aoVivo.sim.whistle": "Silbato simulado en {teamName}.",
    "aoVivo.sim.comment": "Actualización local para {teamName}.",

    // Overlay source/updated line
    "aoVivo.overlay.pending": "Actualización pendiente",
    "aoVivo.overlay.unavailable": "Actualización no disponible",
    "aoVivo.overlay.updatedAt": "Actualizado {time}",
    "aoVivo.overlay.sourceSimulation": "Simulación local",
    "aoVivo.overlay.sourceOfficial": "Oficial",
    "aoVivo.overlay.sourceFallback": "Respaldo local",

    // Status line
    "aoVivo.status.live": "EN VIVO",
    "aoVivo.status.liveWithTime": "EN VIVO • {time}",
    "aoVivo.status.suspended": "SUSPENDIDO",
    "aoVivo.status.finished": "FINALIZADO",
    "aoVivo.status.preGame": "PREVIA",
    "aoVivo.status.officialFifaTitle": "Estado oficial del partido según la FIFA",

    // Simultaneous-live alert + toggle
    "aoVivo.simultaneous.liveNow": "{count} partidos en vivo ahora",
    "aoVivo.simultaneous.tapToSwitch": "Partidos simultáneos — toca para alternar:",
    "aoVivo.simultaneous.bothAria": "Ver los dos partidos en vivo lado a lado",
    "aoVivo.simultaneous.both": "Los dos",
    "aoVivo.simultaneous.matchAria": "Ver {teamA} x {teamB}",

    // Match-selector chips
    "aoVivo.selector.matchTooltip": "{teamA} x {teamB}",
    "aoVivo.selector.prevIn": "Ver partidos anteriores en {label}",
    "aoVivo.selector.nextIn": "Ver próximos partidos en {label}",

    // Clock / simulation config drawer
    "aoVivo.config.title": "CONFIGUREN EL CRONÓMETRO MOCK",
    "aoVivo.config.close": "Cerrar [X]",
    "aoVivo.config.narrationStatus": "Estado de la narración",
    "aoVivo.config.browserSupport": "Soporte del navegador",
    "aoVivo.config.available": "Disponible",
    "aoVivo.config.unavailable": "No disponible",
    "aoVivo.config.voiceEngine": "Motor de voz (CDN)",
    "aoVivo.config.loaded": "Cargado",
    "aoVivo.config.loading": "Cargando…",
    "aoVivo.config.dash": "—",
    "aoVivo.config.selectedVoice": "Voz seleccionada",
    "aoVivo.config.loadingVoice": "cargando voz…",
    "aoVivo.config.voiceOnDevice": " · en el dispositivo",
    "aoVivo.config.voiceOnNetwork": " · de la red",
    "aoVivo.config.narration": "Narración",
    "aoVivo.config.enabled": "Activada",
    "aoVivo.config.disabled": "Desactivada",
    "aoVivo.config.voiceLabel": "Voz (elige una que suene en tu dispositivo)",
    "aoVivo.config.voiceAuto": "Automática (recomendada)",
    "aoVivo.config.voiceNetworkSuffix": " · red",
    "aoVivo.config.testVoiceStarting": "iniciando…",
    "aoVivo.config.testVoiceTitle": "Decir una frase de prueba ahora (prueba directa del dispositivo)",
    "aoVivo.config.testVoice": "Probar voz",
    "aoVivo.config.kickoffLabel": "Horario Principal de Inicio:",
    "aoVivo.config.kickoffPlaceholder": "Ejemplo: 16:00",
    "aoVivo.config.remainingLabel": "Tiempo Restante (Segundos):",
    "aoVivo.config.convertedPreview": "Previsión convertida: {value}",
    "aoVivo.config.simulatorTitle": "Simulador de marcador y disciplina",
    "aoVivo.config.simulatorDesc":
      "Usa el duelo Brasil x Marruecos para validar el cronómetro demo y ver a Grupos reaccionar a goles y tarjetas en tiempo real.",
    "aoVivo.config.resetDemo": "Reiniciar demo local",
    "aoVivo.config.startLive": "Iniciar en vivo",
    "aoVivo.config.goal": "Gol {code}",
    "aoVivo.config.yellow": "Amarilla {code}",
    "aoVivo.config.red": "Roja {code}",
    "aoVivo.config.finishMatch": "Finalizar partido",
    "aoVivo.config.applyToMatch": "Aplicar al Partido",

    // Scoreboard
    "aoVivo.scoreboard.penaltyTitle": "Resultado de la definición por penales",
    "aoVivo.scoreboard.penaltyLabel": "Penales {a}",
    "aoVivo.scoreboard.advancesOnPenalties": "{name} avanza en los penales",
    "aoVivo.scoreboard.openGroupTable": "Abrir tabla del {group}",
    "aoVivo.scoreboard.stadiumLocalTimeTitle": "Hora local en el estadio",
    "aoVivo.scoreboard.localTime": "Hora local",
    "aoVivo.scoreboard.countdown": "Faltan:",
    "aoVivo.scoreboard.brasiliaTime": "HORA DE BRASILIA",
    "aoVivo.scoreboard.fifaMatchPage": "Página oficial de la FIFA para este partido",
    "aoVivo.scoreboard.simultaneousOne": "Atención: otro partido a la misma hora",
    "aoVivo.scoreboard.simultaneousMany": "Atención: otros partidos a la misma hora",
    "aoVivo.scoreboard.simultaneousTitle":
      "{teamA} x {teamB} — comienza a la misma hora",
    "aoVivo.scoreboard.simultaneousAria":
      "Ver {teamA} contra {teamB}, que comienza a la misma hora",

    // Tabs
    "aoVivo.tab.broadcast": "Dónde Ver",
    "aoVivo.tab.lineup": "Alineación",
    "aoVivo.tab.postGame": "Pospartido",
    "aoVivo.tab.preGame": "Previa",
    "aoVivo.tab.instagram": "Instagram",

    // Broadcast guide
    "aoVivo.broadcast.title": "Dónde ver el partido",
    "aoVivo.broadcast.loadingNote": "Cargando datos oficiales de la FIFA...",
    "aoVivo.broadcast.videoAria": "Ver en YouTube: {title}",
    "aoVivo.broadcast.countryLabel": "País de transmisión",
    "aoVivo.broadcast.noneForCountry":
      "Sin transmisión oficial listada para este país.",

    // Incident panel
    "aoVivo.incidents.title": "Jugadas del partido",
    "aoVivo.incidents.feedSimulation": "Feed de la simulación local",
    "aoVivo.incidents.feedOfficial": "Feed oficial de la FIFA",
    "aoVivo.incidents.feedWaiting": "Esperando jugadas oficiales de la FIFA",
    "aoVivo.incidents.clickHint": "Toca el nombre destacado para abrir la ficha del jugador",
    "aoVivo.incidents.empty": "Sin jugadas oficiales registradas por la FIFA hasta ahora.",
    "aoVivo.incidents.listenPlay": "Escuchar la jugada",

    // Finished-match bar
    "aoVivo.finished.label": "Partidos finalizados:",
    "aoVivo.finished.prev": "Ver partidos finalizados anteriores",
    "aoVivo.finished.next": "Ver próximos partidos finalizados",

    // Analysis + Instagram tabs
    "aoVivo.analysis.highlights": "Lo más destacado del partido",
    "aoVivo.analysis.preview": "Previa del partido",
    "aoVivo.analysis.highlightsLabel": "Destacados",
    "aoVivo.analysis.previewLabel": "Previa",
    "aoVivo.instagram.title": "En Instagram",
    "aoVivo.instagram.open": "Abrir en Instagram",

    // Lineup tab
    "aoVivo.lineup.title": "CENTRAL TÁCTICA Y DISTRIBUCIÓN ESPACIAL",
    "aoVivo.lineup.desc":
      "Posicionamiento estratégico planificado para el enfrentamiento oficial de São Paulo / Nueva York 2026.",

    // Incident player overlay
    "aoVivo.overlayCard.position": "Posición",
    "aoVivo.overlayCard.birth": "Nacimiento",
    "aoVivo.overlayCard.currentClub": "Club actual",
    "aoVivo.overlayCard.matchContext": "Contexto del partido",
    "aoVivo.overlayCard.matchContextValue":
      "{teamName} x {opponentName}: {playerName} aparece en el radar de las jugadas del partido.",
  },
  en: {
    // Header match-selector group labels
    "aoVivo.group.finished": "Finished matches: ",
    "aoVivo.group.live": "Current matches: ",
    "aoVivo.group.upcoming": "Upcoming matches: ",

    // Incident feed badges (GOAL / YC / RC / SUB / PLAY)
    "aoVivo.incident.goal": "GOAL",
    "aoVivo.incident.yellow": "YC",
    "aoVivo.incident.red": "RC",
    "aoVivo.incident.sub": "SUB",
    "aoVivo.incident.play": "PLAY",

    // Incident text fragments (rebuilt around the highlighted player name)
    "aoVivo.incidentText.scoredSuffix": " scored.",
    "aoVivo.incidentText.yellowSuffix": " picked up a yellow.",
    "aoVivo.incidentText.redSuffix": " was sent off.",
    "aoVivo.incidentText.subOut": "Off ",
    "aoVivo.incidentText.subIn": ", on ",

    // Simulated-incident texts (local demo simulator)
    "aoVivo.sim.goalGeneric":
      "Simulation goal for {teamName}. The group table was recalculated instantly.",
    "aoVivo.sim.yellowGeneric": "Yellow card for {teamName} in the simulation pressure.",
    "aoVivo.sim.redGeneric": "Red card for {teamName} on a locally recreated play.",
    "aoVivo.sim.subGeneric": "Simulated substitution for {teamName}.",
    "aoVivo.sim.whistle": "Simulated whistle on {teamName}.",
    "aoVivo.sim.comment": "Local update for {teamName}.",

    // Overlay source/updated line
    "aoVivo.overlay.pending": "Update pending",
    "aoVivo.overlay.unavailable": "Update unavailable",
    "aoVivo.overlay.updatedAt": "Updated {time}",
    "aoVivo.overlay.sourceSimulation": "Local simulation",
    "aoVivo.overlay.sourceOfficial": "Official",
    "aoVivo.overlay.sourceFallback": "Local fallback",

    // Status line
    "aoVivo.status.live": "LIVE",
    "aoVivo.status.liveWithTime": "LIVE • {time}",
    "aoVivo.status.suspended": "SUSPENDED",
    "aoVivo.status.finished": "FINAL",
    "aoVivo.status.preGame": "PREGAME",
    "aoVivo.status.officialFifaTitle": "Official match status per FIFA",

    // Simultaneous-live alert + toggle
    "aoVivo.simultaneous.liveNow": "{count} matches live now",
    "aoVivo.simultaneous.tapToSwitch": "Simultaneous matches — tap to switch:",
    "aoVivo.simultaneous.bothAria": "See both live matches side by side",
    "aoVivo.simultaneous.both": "Both",
    "aoVivo.simultaneous.matchAria": "See {teamA} vs {teamB}",

    // Match-selector chips (tooltips / aria)
    "aoVivo.selector.matchTooltip": "{teamA} vs {teamB}",
    "aoVivo.selector.prevIn": "See earlier matches in {label}",
    "aoVivo.selector.nextIn": "See upcoming matches in {label}",

    // Clock / simulation config drawer
    "aoVivo.config.title": "SET UP THE MOCK CLOCK",
    "aoVivo.config.close": "Close [X]",
    "aoVivo.config.narrationStatus": "Narration status",
    "aoVivo.config.browserSupport": "Browser support",
    "aoVivo.config.available": "Available",
    "aoVivo.config.unavailable": "Unavailable",
    "aoVivo.config.voiceEngine": "Voice engine (CDN)",
    "aoVivo.config.loaded": "Loaded",
    "aoVivo.config.loading": "Loading…",
    "aoVivo.config.dash": "—",
    "aoVivo.config.selectedVoice": "Selected voice",
    "aoVivo.config.loadingVoice": "loading voice…",
    "aoVivo.config.voiceOnDevice": " · on device",
    "aoVivo.config.voiceOnNetwork": " · from network",
    "aoVivo.config.narration": "Narration",
    "aoVivo.config.enabled": "Enabled",
    "aoVivo.config.disabled": "Disabled",
    "aoVivo.config.voiceLabel": "Voice (pick one that speaks on your device)",
    "aoVivo.config.voiceAuto": "Automatic (recommended)",
    "aoVivo.config.voiceNetworkSuffix": " · network",
    "aoVivo.config.testVoiceStarting": "starting…",
    "aoVivo.config.testVoiceTitle": "Speak a test phrase now (direct device test)",
    "aoVivo.config.testVoice": "Test voice",
    "aoVivo.config.kickoffLabel": "Main Kickoff Time:",
    "aoVivo.config.kickoffPlaceholder": "Example: 16:00",
    "aoVivo.config.remainingLabel": "Time Remaining (Seconds):",
    "aoVivo.config.convertedPreview": "Converted preview: {value}",
    "aoVivo.config.simulatorTitle": "Score and discipline simulator",
    "aoVivo.config.simulatorDesc":
      "Use the Brazil vs Morocco clash to validate the demo clock and watch Groups react to goals and cards in real time.",
    "aoVivo.config.resetDemo": "Reset local demo",
    "aoVivo.config.startLive": "Start live",
    "aoVivo.config.goal": "Goal {code}",
    "aoVivo.config.yellow": "Yellow {code}",
    "aoVivo.config.red": "Red {code}",
    "aoVivo.config.finishMatch": "End match",
    "aoVivo.config.applyToMatch": "Apply to Match",

    // Scoreboard
    "aoVivo.scoreboard.penaltyTitle": "Penalty shootout result",
    "aoVivo.scoreboard.penaltyLabel": "Penalties {a}",
    "aoVivo.scoreboard.advancesOnPenalties": "{name} advances on penalties",
    "aoVivo.scoreboard.openGroupTable": "Open {group} table",
    "aoVivo.scoreboard.stadiumLocalTimeTitle": "Local time at the stadium",
    "aoVivo.scoreboard.localTime": "Local time",
    "aoVivo.scoreboard.countdown": "Kickoff in:",
    "aoVivo.scoreboard.brasiliaTime": "BRASÍLIA TIME",
    "aoVivo.scoreboard.fifaMatchPage": "Official FIFA page for this match",
    "aoVivo.scoreboard.simultaneousOne": "Heads up: another match at the same time",
    "aoVivo.scoreboard.simultaneousMany": "Heads up: other matches at the same time",
    "aoVivo.scoreboard.simultaneousTitle":
      "{teamA} vs {teamB} — kicks off at the same time",
    "aoVivo.scoreboard.simultaneousAria":
      "See {teamA} vs {teamB}, which kicks off at the same time",

    // Tabs
    "aoVivo.tab.broadcast": "Where to Watch",
    "aoVivo.tab.lineup": "Lineup",
    "aoVivo.tab.postGame": "Postgame",
    "aoVivo.tab.preGame": "Pregame",
    "aoVivo.tab.instagram": "Instagram",

    // Broadcast guide
    "aoVivo.broadcast.title": "Where to watch the match",
    "aoVivo.broadcast.loadingNote": "Loading official FIFA data...",
    "aoVivo.broadcast.videoAria": "Watch on YouTube: {title}",
    "aoVivo.broadcast.countryLabel": "Broadcast country",
    "aoVivo.broadcast.noneForCountry":
      "No official broadcast listed for this country.",

    // Incident panel
    "aoVivo.incidents.title": "Match highlights",
    "aoVivo.incidents.feedSimulation": "Local simulation feed",
    "aoVivo.incidents.feedOfficial": "Official FIFA feed",
    "aoVivo.incidents.feedWaiting": "Waiting for official FIFA plays",
    "aoVivo.incidents.clickHint": "Click the highlighted name to open the player card",
    "aoVivo.incidents.empty": "No official plays recorded by FIFA so far.",
    "aoVivo.incidents.listenPlay": "Listen to the play",

    // Finished-match bar
    "aoVivo.finished.label": "Finished matches:",
    "aoVivo.finished.prev": "See earlier finished matches",
    "aoVivo.finished.next": "See later finished matches",

    // Analysis + Instagram tabs
    "aoVivo.analysis.highlights": "Match highlights",
    "aoVivo.analysis.preview": "Match preview",
    "aoVivo.analysis.highlightsLabel": "Highlights",
    "aoVivo.analysis.previewLabel": "Preview",
    "aoVivo.instagram.title": "On Instagram",
    "aoVivo.instagram.open": "Open on Instagram",

    // Lineup tab
    "aoVivo.lineup.title": "TACTICAL HUB AND SPATIAL LAYOUT",
    "aoVivo.lineup.desc":
      "Strategic positioning planned for the official São Paulo / New York 2026 clash.",

    // Incident player overlay
    "aoVivo.overlayCard.position": "Position",
    "aoVivo.overlayCard.birth": "Born",
    "aoVivo.overlayCard.currentClub": "Current club",
    "aoVivo.overlayCard.matchContext": "Match context",
    "aoVivo.overlayCard.matchContextValue":
      "{teamName} vs {opponentName}: {playerName} shows up on the radar of the match's key plays.",
  },
};

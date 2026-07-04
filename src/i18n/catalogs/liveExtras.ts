// Live-extras catalog: the live-match chat panel (MatchChatPanel), the
// simultaneous live-match cards (SimultaneousLiveMatches), and the narration
// mute/unmute control (MatchSpeechToggle). Keys are dotted under `liveExtras.`.
// Keep broadcast voice in both languages.
import type { CatalogModule } from "./types";

export const liveExtrasCatalog: CatalogModule = {
  pt: {
    // MatchChatPanel
    "liveExtras.chat.heading": "Resenha ao vivo",
    "liveExtras.chat.liveBadge": "Ao vivo",
    "liveExtras.chat.subtitle":
      "Bate-papo anônimo só durante a partida — as mensagens somem quando o jogo acaba.",
    "liveExtras.chat.empty": "Seja o primeiro a mandar a real sobre o jogo.",
    "liveExtras.chat.nicknamePlaceholder": "Seu apelido",
    "liveExtras.chat.nicknameAria": "Apelido",
    "liveExtras.chat.messagePlaceholder": "Manda a real…",
    "liveExtras.chat.messageAria": "Mensagem",
    "liveExtras.chat.sendAria": "Enviar mensagem",
    "liveExtras.chat.closed": "O chat abre quando a partida começa. Volte no apito inicial!",

    // SimultaneousLiveMatches
    "liveExtras.live.liveWithTime": "AO VIVO • {time}",
    "liveExtras.live.live": "AO VIVO",
    "liveExtras.live.suspended": "PARALISADO",
    "liveExtras.live.finished": "ENCERRADO",
    "liveExtras.live.whereToWatch": "Onde assistir",
    "liveExtras.live.incidents": "Lances",

    // MatchSpeechToggle
    "liveExtras.speech.disable": "Desativar a narração dos lances",
    "liveExtras.speech.enable": "Ativar a narração dos lances",
  },
  es: {
    // MatchChatPanel
    "liveExtras.chat.heading": "Charla en vivo",
    "liveExtras.chat.liveBadge": "En vivo",
    "liveExtras.chat.subtitle":
      "Chat anónimo solo durante el partido — los mensajes desaparecen cuando termina el juego.",
    "liveExtras.chat.empty": "Sé el primero en decir lo tuyo sobre el partido.",
    "liveExtras.chat.nicknamePlaceholder": "Tu apodo",
    "liveExtras.chat.nicknameAria": "Apodo",
    "liveExtras.chat.messagePlaceholder": "Escribe un mensaje…",
    "liveExtras.chat.messageAria": "Mensaje",
    "liveExtras.chat.sendAria": "Enviar mensaje",
    "liveExtras.chat.closed": "El chat se abre cuando comienza el partido. ¡Vuelve en el pitazo inicial!",

    // SimultaneousLiveMatches
    "liveExtras.live.liveWithTime": "EN VIVO • {time}",
    "liveExtras.live.live": "EN VIVO",
    "liveExtras.live.suspended": "DETENIDO",
    "liveExtras.live.finished": "FINALIZADO",
    "liveExtras.live.whereToWatch": "Dónde ver",
    "liveExtras.live.incidents": "Jugadas",

    // MatchSpeechToggle
    "liveExtras.speech.disable": "Desactivar la narración de las jugadas",
    "liveExtras.speech.enable": "Activar la narración de las jugadas",
  },
};

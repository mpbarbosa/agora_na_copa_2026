// Banners catalog: small site-chrome components — the Pix donation block,
// LGPD cookie-consent banner, share button, online-count badge and the
// version-check timer. Keys are dotted under `banners.`. Keep broadcast voice
// in both languages.
import type { CatalogModule } from "./types";

export const bannersCatalog: CatalogModule = {
  pt: {
    // DonationPix
    "banners.pix.pixPrefix": "Pix:",
    "banners.pix.copyKeyAria": "Copiar chave Pix",
    "banners.pix.copied": "Copiado",
    "banners.pix.copy": "Copiar",
    "banners.pix.blurb":
      "Escaneie o QR no app do seu banco ou copie a chave Pix. Toda contribuição ajuda a manter o projeto no ar.",
    "banners.pix.keyLabel": "Chave Pix · {keyType}",
    "banners.pix.brcodeCopied": "Pix Copia e Cola copiado",
    "banners.pix.brcodeCopy": "Copiar Pix Copia e Cola",

    // CookieConsentBanner
    "banners.cookie.ariaLabel": "Aviso de cookies",
    "banners.cookie.textBefore":
      "Usamos cookies para medir audiência e exibir anúncios, ajudando a manter o site no ar. Ao aceitar, você concorda com o uso de cookies. Veja a",
    "banners.cookie.privacyPolicy": "Política de Privacidade",
    "banners.cookie.essential": "Apenas essenciais",
    "banners.cookie.accept": "Aceitar",

    // ShareButton
    "banners.share.shareTitle": "Compartilhar",
    "banners.share.shareAria": "Compartilhar o app",
    "banners.share.linkCopied": "Link copiado!",
    "banners.shareTitle": "Agora na Copa 26",
    "banners.shareText":
      "Acompanhe a Copa do Mundo FIFA 2026 ao vivo: onde assistir, escalações, grupos e chaveamento.",

    // OnlineCountBadge
    "banners.online.titleOne": "{count} fã online agora",
    "banners.online.titleMany": "{count} fãs online agora",

    // VersionCheckTimer
    "banners.version.updateTitle": "Nova versão disponível — recarregue para atualizar",
    "banners.version.newVersion": "nova versão",
    "banners.version.lastCheckAt": "última verificação às {time}",
    "banners.version.awaitingFirst": "aguardando a primeira verificação",
    "banners.version.nextCheckTitle": "Próxima verificação de nova versão em {countdown} • {last}",
    "banners.version.timerAria": "Tempo até a próxima verificação de nova versão",
    "banners.version.updateNow": "Atualizar agora",
    "banners.version.checkNow": "Verificar atualização agora",
    "banners.version.updateNowAria": "Atualizar para a nova versão agora",

    // AdSlot
    "banners.ads.label": "Publicidade",

    // TeamCountdownBadge (followed-team next-match countdown)
    "banners.teamCountdown.next": "Próximo jogo",
    "banners.teamCountdown.live": "{team} ao vivo",
    "banners.teamCountdown.onPitch": "Em campo",
    "banners.teamCountdown.probable": "Confronto provável",
    "banners.teamCountdown.opponentTbd": "Adversário a definir",
    "banners.teamCountdown.change": "Trocar seleção",
    "banners.teamCountdown.choose": "Escolha sua seleção",
    "banners.teamCountdown.chooseHint": "Acompanhe o próximo jogo da sua seleção",
    "banners.teamCountdown.noNextMatch": "Sem próximo jogo",
    "banners.teamCountdown.noNextMatchHint": "Escolha outra seleção para acompanhar",
    "banners.teamCountdown.selectAria": "Escolha a seleção para acompanhar",
    "banners.teamCountdown.closeAria": "Fechar o acompanhamento da seleção",
    "banners.teamCountdown.countdownAria": "Faltam {time} para o próximo jogo",
  },
  es: {
    // DonationPix
    "banners.pix.pixPrefix": "Pix:",
    "banners.pix.copyKeyAria": "Copiar clave Pix",
    "banners.pix.copied": "Copiado",
    "banners.pix.copy": "Copiar",
    "banners.pix.blurb":
      "Escanea el QR en la app de tu banco o copia la clave Pix. Cada contribución ayuda a mantener el proyecto en línea.",
    "banners.pix.keyLabel": "Clave Pix · {keyType}",
    "banners.pix.brcodeCopied": "Pix Copia y Pega copiado",
    "banners.pix.brcodeCopy": "Copiar Pix Copia y Pega",

    // CookieConsentBanner
    "banners.cookie.ariaLabel": "Aviso de cookies",
    "banners.cookie.textBefore":
      "Usamos cookies para medir la audiencia y mostrar anuncios, ayudando a mantener el sitio en línea. Al aceptar, aceptas el uso de cookies. Consulta la",
    "banners.cookie.privacyPolicy": "Política de Privacidad",
    "banners.cookie.essential": "Solo esenciales",
    "banners.cookie.accept": "Aceptar",

    // ShareButton
    "banners.share.shareTitle": "Compartir",
    "banners.share.shareAria": "Compartir la app",
    "banners.share.linkCopied": "¡Enlace copiado!",
    "banners.shareTitle": "Ahora en el Mundial 26",
    "banners.shareText":
      "Sigue la Copa Mundial de la FIFA 2026 en vivo: dónde ver, alineaciones, grupos y llave.",

    // OnlineCountBadge
    "banners.online.titleOne": "{count} fan en línea ahora",
    "banners.online.titleMany": "{count} fans en línea ahora",

    // VersionCheckTimer
    "banners.version.updateTitle": "Nueva versión disponible — recarga para actualizar",
    "banners.version.newVersion": "nueva versión",
    "banners.version.lastCheckAt": "última verificación a las {time}",
    "banners.version.awaitingFirst": "esperando la primera verificación",
    "banners.version.nextCheckTitle": "Próxima verificación de nueva versión en {countdown} • {last}",
    "banners.version.timerAria": "Tiempo hasta la próxima verificación de nueva versión",
    "banners.version.updateNow": "Actualizar ahora",
    "banners.version.checkNow": "Verificar actualización ahora",
    "banners.version.updateNowAria": "Actualizar a la nueva versión ahora",

    // AdSlot
    "banners.ads.label": "Publicidad",

    // TeamCountdownBadge (followed-team next-match countdown)
    "banners.teamCountdown.next": "Próximo partido",
    "banners.teamCountdown.live": "{team} en vivo",
    "banners.teamCountdown.onPitch": "En cancha",
    "banners.teamCountdown.probable": "Cruce probable",
    "banners.teamCountdown.opponentTbd": "Rival por definir",
    "banners.teamCountdown.change": "Cambiar selección",
    "banners.teamCountdown.choose": "Elige tu selección",
    "banners.teamCountdown.chooseHint": "Sigue el próximo partido de tu selección",
    "banners.teamCountdown.noNextMatch": "Sin próximo partido",
    "banners.teamCountdown.noNextMatchHint": "Elige otra selección para seguir",
    "banners.teamCountdown.selectAria": "Elige la selección a seguir",
    "banners.teamCountdown.closeAria": "Cerrar el seguimiento de la selección",
    "banners.teamCountdown.countdownAria": "Faltan {time} para el próximo partido",
  },
  en: {
    // DonationPix
    "banners.pix.pixPrefix": "Pix:",
    "banners.pix.copyKeyAria": "Copy Pix key",
    "banners.pix.copied": "Copied",
    "banners.pix.copy": "Copy",
    "banners.pix.blurb":
      "Scan the QR code in your bank app or copy the Pix key. Every contribution helps keep the project online.",
    "banners.pix.keyLabel": "Pix key · {keyType}",
    "banners.pix.brcodeCopied": "Pix Copy and Paste copied",
    "banners.pix.brcodeCopy": "Copy Pix Copy and Paste",

    // CookieConsentBanner
    "banners.cookie.ariaLabel": "Cookie notice",
    "banners.cookie.textBefore":
      "We use cookies to measure audience and show ads, helping keep the site online. By accepting, you agree to the use of cookies. See our",
    "banners.cookie.privacyPolicy": "Privacy Policy",
    "banners.cookie.essential": "Essential only",
    "banners.cookie.accept": "Accept",

    // ShareButton
    "banners.share.shareTitle": "Share",
    "banners.share.shareAria": "Share the app",
    "banners.share.linkCopied": "Link copied!",
    "banners.shareTitle": "Now at the World Cup 26",
    "banners.shareText":
      "Follow the FIFA World Cup 2026 live: where to watch, lineups, groups and bracket.",

    // OnlineCountBadge
    "banners.online.titleOne": "{count} fan online now",
    "banners.online.titleMany": "{count} fans online now",

    // VersionCheckTimer
    "banners.version.updateTitle": "New version available — reload to update",
    "banners.version.newVersion": "new version",
    "banners.version.lastCheckAt": "last checked at {time}",
    "banners.version.awaitingFirst": "awaiting the first check",
    "banners.version.nextCheckTitle": "Next new-version check in {countdown} • {last}",
    "banners.version.timerAria": "Time until the next new-version check",
    "banners.version.updateNow": "Update now",
    "banners.version.checkNow": "Check for update now",
    "banners.version.updateNowAria": "Update to the new version now",

    // AdSlot
    "banners.ads.label": "Advertisement",

    // TeamCountdownBadge (followed-team next-match countdown)
    "banners.teamCountdown.next": "Next match",
    "banners.teamCountdown.live": "{team} live",
    "banners.teamCountdown.onPitch": "On the pitch",
    "banners.teamCountdown.probable": "Likely matchup",
    "banners.teamCountdown.opponentTbd": "Opponent TBD",
    "banners.teamCountdown.change": "Change team",
    "banners.teamCountdown.choose": "Choose your team",
    "banners.teamCountdown.chooseHint": "Follow your team's next match",
    "banners.teamCountdown.noNextMatch": "No next match",
    "banners.teamCountdown.noNextMatchHint": "Choose another team to follow",
    "banners.teamCountdown.selectAria": "Choose the team to follow",
    "banners.teamCountdown.closeAria": "Close the team tracker",
    "banners.teamCountdown.countdownAria": "{time} left until the next match",
  },
};

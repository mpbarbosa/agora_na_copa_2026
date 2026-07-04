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

    // OnlineCountBadge
    "banners.online.titleOne": "{count} fã online agora",
    "banners.online.titleMany": "{count} fãs online agora",
    "banners.online.label": "online",

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

    // OnlineCountBadge
    "banners.online.titleOne": "{count} fan en línea ahora",
    "banners.online.titleMany": "{count} fans en línea ahora",
    "banners.online.label": "en línea",

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
  },
};

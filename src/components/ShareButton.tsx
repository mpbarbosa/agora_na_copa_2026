import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { SITE_URL } from "../config";
import { trackEvent } from "../analytics";
import { useT } from "../i18n";

interface Props {
  theme: "classic-light" | "stadium-dark";
}

const SHARE_DATA = {
  url: SITE_URL,
};

/**
 * Share button. Uses the Web Share API (native share sheet → WhatsApp, Instagram,
 * X…) on supporting devices, and falls back to copy-to-clipboard with a brief
 * "Link copiado!" confirmation. Reports a GA4 `share` event (consent-gated).
 */
export function ShareButton({ theme }: Props) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const isDark = theme !== "classic-light";
  const accent = isDark ? "text-[#00e476]" : "text-[#007a2e]";

  const handleShare = async () => {
    const sharePayload = {
      title: t("banners.shareTitle"),
      text: t("banners.shareText"),
      url: SHARE_DATA.url,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(sharePayload);
        trackEvent("share", { method: "web_share", content_type: "app" });
      } catch {
        /* user dismissed the share sheet — no-op */
      }
      return;
    }
    // Fallback: copy the link.
    try {
      await navigator.clipboard.writeText(SHARE_DATA.url);
      setCopied(true);
      trackEvent("share", { method: "clipboard", content_type: "app" });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable (insecure context / denied) */
    }
  };

  return (
    <button
      type="button"
      id="btn-share"
      onClick={handleShare}
      title={t("banners.share.shareTitle")}
      aria-label={t("banners.share.shareAria")}
      className="relative p-2 rounded-lg bg-[#1e2020]/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition"
    >
      {copied ? <Check size={14} className={accent} /> : <Share2 size={14} className={accent} />}
      {copied && (
        <span
          role="status"
          className="absolute right-0 top-full z-50 mt-1 whitespace-nowrap rounded-md bg-[#009c3b] px-2 py-1 text-[10px] font-bold text-white shadow-lg"
        >
          {t("banners.share.linkCopied")}
        </span>
      )}
    </button>
  );
}

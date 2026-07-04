import { useEffect } from "react";
import { ADSENSE_PUBLISHER_ID, ADSENSE_AD_SLOT, isAdSenseConfigured } from "../config";
import { useConsent } from "../consent";
import { useT } from "../i18n";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface Props {
  theme: "classic-light" | "stadium-dark";
  slot?: string;
}

/**
 * A single responsive AdSense unit. Renders nothing unless BOTH a real publisher
 * id is configured (isAdSenseConfigured) AND the visitor accepted ads cookies
 * (consent === "all"). This keeps the placeholder build script-free (no console
 * noise, no LGPD violation). Mirrors the dynamic <script> injection used for the
 * Instagram embed in SocialMediasView.
 */
export function AdSlot({ theme, slot = ADSENSE_AD_SLOT }: Props) {
  const t = useT();
  const { consent } = useConsent();
  const adsEnabled = isAdSenseConfigured() && consent === "all";

  useEffect(() => {
    if (!adsEnabled) return;

    // Load the AdSense library once.
    if (!document.querySelector('script[data-adsense="1"]')) {
      const script = document.createElement("script");
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.setAttribute("data-adsense", "1");
      document.head.appendChild(script);
    }

    // Request a fill for this unit (queued until the library is ready).
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* library not ready yet — it processes queued units on load */
    }
  }, [adsEnabled]);

  if (!adsEnabled) return null;

  const isDark = theme !== "classic-light";
  return (
    <div
      className={`mx-auto my-6 w-full max-w-5xl overflow-hidden rounded-xl border px-2 ${
        isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"
      }`}
      id="adsense-slot"
      aria-label={t("banners.ads.label")}
    >
      <p
        className={`pt-1 text-center font-mono text-[10px] uppercase tracking-wider ${
          isDark ? "text-slate-500" : "text-slate-400"
        }`}
      >
        {t("banners.ads.label")}
      </p>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_PUBLISHER_ID}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

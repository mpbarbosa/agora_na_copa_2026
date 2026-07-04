import { useConsent } from "../consent";
import { useT } from "../i18n";

interface Props {
  theme: "classic-light" | "stadium-dark";
}

/**
 * LGPD cookie-consent banner. Shown until the visitor makes a choice (persisted
 * in localStorage via useConsent). "Aceitar" unlocks analytics/ads cookies;
 * "Apenas essenciais" keeps them off. Links to the full privacy policy.
 */
export function CookieConsentBanner({ theme }: Props) {
  const t = useT();
  const { consent, choose } = useConsent();
  if (consent !== null) return null;

  const isDark = theme !== "classic-light";
  const wrap = isDark
    ? "bg-[#121414]/95 border-white/10 text-slate-100"
    : "bg-white/95 border-slate-200 text-slate-900";
  const muted = isDark ? "text-slate-400" : "text-slate-600";
  const accept = isDark
    ? "bg-[#00e476] text-[#06281a] hover:bg-[#33ff9a]"
    : "bg-[#009c3b] text-white hover:bg-[#007a2e]";
  const essential = isDark
    ? "border-white/20 text-slate-200 hover:bg-white/10"
    : "border-slate-300 text-slate-700 hover:bg-slate-50";
  const link = isDark ? "text-[#00e476] hover:text-white" : "text-[#009c3b] hover:text-[#007a2e]";

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur ${wrap}`}
      id="cookie-consent-banner"
      role="dialog"
      aria-label={t("banners.cookie.ariaLabel")}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-xs leading-snug ${muted}`}>
          {t("banners.cookie.textBefore")}{" "}
          <a
            href="/privacidade.html"
            target="_blank"
            rel="noopener noreferrer"
            className={`font-semibold underline underline-offset-2 ${link}`}
          >
            {t("banners.cookie.privacyPolicy")}
          </a>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            id="btn-consent-essential"
            onClick={() => choose("essential")}
            className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${essential}`}
          >
            {t("banners.cookie.essential")}
          </button>
          <button
            type="button"
            id="btn-consent-accept"
            onClick={() => choose("all")}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition ${accept}`}
          >
            {t("banners.cookie.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}

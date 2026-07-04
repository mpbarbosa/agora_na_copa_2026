import { X, ExternalLink } from "lucide-react";
import { useEffect } from "react";
import { useT } from "../i18n";

const FIFA_REGULATIONS_URL =
  "https://digitalhub.fifa.com/m/636f5c9c6f29771f/original/FWC2026_regulations_EN.pdf";

interface Props {
  theme: "classic-light" | "stadium-dark";
  onClose: () => void;
}

export function StandingsRulesCard({ theme, onClose }: Props) {
  const t = useT();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isDark = theme !== "classic-light";
  const card = isDark
    ? "bg-[#121414]/95 border-white/10 text-slate-100"
    : "bg-white border-slate-200 text-slate-900";
  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const divider = isDark ? "border-white/10" : "border-slate-100";
  const stepBg = isDark ? "bg-white/5" : "bg-slate-50";
  const stepLabel = isDark ? "text-[#ffd84d]" : "text-[#009c3b]";
  const badge = isDark
    ? "bg-[#ffd84d]/10 text-[#ffd84d] border border-[#ffd84d]/20"
    : "bg-[#009c3b]/10 text-[#009c3b] border border-[#009c3b]/20";
  const link = isDark ? "text-[#00e476] hover:text-white" : "text-[#009c3b] hover:text-[#007a2e]";

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      style={{ background: isDark ? "rgba(0,0,0,0.75)" : "rgba(15,23,42,0.45)" }}
      onClick={onClose}
      data-testid="standings-rules-card-backdrop"
    >
      <div
        className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl ${card}`}
        onClick={(e) => e.stopPropagation()}
        data-testid="standings-rules-card"
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-start justify-between gap-4 p-5 border-b ${divider} ${isDark ? "bg-[#121414]/95" : "bg-white"}`}>
          <div>
            <h2 className="font-anton text-lg uppercase tracking-wider">
              {t("standings.rules.title")}
            </h2>
            <p className={`mt-0.5 font-mono text-[10px] uppercase tracking-wider ${muted}`}>
              {t("standings.rules.subtitle")}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`mt-0.5 shrink-0 p-1.5 rounded-lg transition ${
              isDark
                ? "text-slate-400 hover:text-white hover:bg-white/10"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
            aria-label={t("standings.rules.close")}
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className={`font-archivo text-sm ${muted}`}>
            {t("standings.rules.intro")}
          </p>

          {/* Step 1 */}
          <div className={`rounded-xl p-4 ${stepBg}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded ${badge}`}>
                {t("standings.rules.step1")}
              </span>
              <span className={`font-anton text-sm uppercase tracking-wide ${stepLabel}`}>
                {t("standings.rules.step1Title")}
              </span>
            </div>
            <p className={`font-mono text-[10px] uppercase tracking-wider mb-2 ${muted}`}>
              {t("standings.rules.step1Desc")}
            </p>
            <ol className="space-y-1.5 font-archivo text-sm">
              <li className="flex gap-2">
                <span className={`font-mono text-[10px] font-bold shrink-0 mt-0.5 ${stepLabel}`}>A</span>
                <span>{t("standings.rules.step1A")}</span>
              </li>
              <li className="flex gap-2">
                <span className={`font-mono text-[10px] font-bold shrink-0 mt-0.5 ${stepLabel}`}>B</span>
                <span>{t("standings.rules.step1B")}</span>
              </li>
              <li className="flex gap-2">
                <span className={`font-mono text-[10px] font-bold shrink-0 mt-0.5 ${stepLabel}`}>C</span>
                <span>{t("standings.rules.step1C")}</span>
              </li>
            </ol>
          </div>

          {/* Step 2 */}
          <div className={`rounded-xl p-4 ${stepBg}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded ${badge}`}>
                {t("standings.rules.step2")}
              </span>
              <span className={`font-anton text-sm uppercase tracking-wide ${stepLabel}`}>
                {t("standings.rules.step2Title")}
              </span>
            </div>
            <p className={`font-mono text-[10px] uppercase tracking-wider mb-2 ${muted}`}>
              {t("standings.rules.step2Desc")}
            </p>
            <ol className="space-y-1.5 font-archivo text-sm mb-3" start={4}>
              <li className="flex gap-2">
                <span className={`font-mono text-[10px] font-bold shrink-0 mt-0.5 ${stepLabel}`}>D</span>
                <span>{t("standings.rules.step2D")}</span>
              </li>
              <li className="flex gap-2">
                <span className={`font-mono text-[10px] font-bold shrink-0 mt-0.5 ${stepLabel}`}>E</span>
                <span>{t("standings.rules.step2E")}</span>
              </li>
              <li className="flex gap-2">
                <span className={`font-mono text-[10px] font-bold shrink-0 mt-0.5 ${stepLabel}`}>F</span>
                <span>{t("standings.rules.step2F")}</span>
              </li>
            </ol>
            <div className={`ml-5 rounded-lg border p-3 font-mono text-[11px] space-y-1 ${isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-white"}`}>
              <div className="flex justify-between gap-4">
                <span className={muted}>{t("standings.rules.yellowCard")}</span>
                <span className="font-bold text-amber-500">{t("standings.rules.yellowCardPts")}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className={muted}>{t("standings.rules.indirectRed")}</span>
                <span className="font-bold text-red-500">{t("standings.rules.indirectRedPts")}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className={muted}>{t("standings.rules.directRed")}</span>
                <span className="font-bold text-red-500">{t("standings.rules.directRedPts")}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className={muted}>{t("standings.rules.yellowPlusRed")}</span>
                <span className="font-bold text-red-500">{t("standings.rules.yellowPlusRedPts")}</span>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className={`rounded-xl p-4 ${stepBg}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded ${badge}`}>
                {t("standings.rules.step3")}
              </span>
              <span className={`font-anton text-sm uppercase tracking-wide ${stepLabel}`}>
                {t("standings.rules.step3Title")}
              </span>
            </div>
            <ol className="space-y-1.5 font-archivo text-sm" start={7}>
              <li className="flex gap-2">
                <span className={`font-mono text-[10px] font-bold shrink-0 mt-0.5 ${stepLabel}`}>G</span>
                <span>{t("standings.rules.step3G")}</span>
              </li>
              <li className="flex gap-2">
                <span className={`font-mono text-[10px] font-bold shrink-0 mt-0.5 ${stepLabel}`}>H</span>
                <span>{t("standings.rules.step3H")}</span>
              </li>
            </ol>
          </div>

          {/* Best 8 third-place teams */}
          <div className={`rounded-xl border p-4 ${isDark ? "border-white/10" : "border-slate-200"}`}>
            <p className={`font-anton text-[11px] uppercase tracking-wider mb-2 ${muted}`}>
              {t("standings.rules.best8Title")}
            </p>
            <p className={`font-archivo text-sm ${muted} mb-2`}>
              {t("standings.rules.best8Desc")}
            </p>
            <p className="font-mono text-[11px] tracking-wide">
              {t("standings.rules.best8Order")}
            </p>
          </div>

          {/* Link to official regulations */}
          <div className={`border-t pt-4 ${divider}`}>
            <a
              href={FIFA_REGULATIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider transition ${link}`}
            >
              <ExternalLink size={12} />
              {t("standings.rules.officialLink")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// "Prévia"/"Destaques da partida" editorial panel — the pré/pós-jogo analysis
// tab inside MatchDetailView's Ao Vivo view. Presentational: the parent decides
// visibility (active tab + locale + non-empty text) and passes the resolved text.
import type { MatchStatus } from "../types";
import { useT } from "../i18n";
import { parseNoteSections } from "../utils/noteSections";
import { renderAnalysisWithMentions } from "./PlayerMention";

interface MatchEditorialTabProps {
  analysisText: string;
  status: MatchStatus;
  theme: "classic-light" | "stadium-dark";
}

export function MatchEditorialTab({ analysisText, status, theme }: MatchEditorialTabProps) {
  const t = useT();

  return (
    <div
      className={`rounded-2xl border px-4 py-4 ${
        theme === "classic-light"
          ? "bg-slate-50 border-slate-200"
          : "bg-[#121414]/70 border-white/10"
      }`}
      id="match-analysis-panel"
      data-testid="match-analysis"
    >
      <p
        className={`font-anton text-base uppercase tracking-wide ${
          theme === "classic-light" ? "text-slate-900" : "text-white"
        }`}
      >
        {status === "FINISHED" ? t("aoVivo.analysis.highlights") : t("aoVivo.analysis.preview")}
      </p>
      <div className="mt-3 space-y-3 max-w-prose">
        {parseNoteSections(
          analysisText,
          status === "FINISHED" ? t("aoVivo.analysis.highlightsLabel") : t("aoVivo.analysis.previewLabel"),
        ).map((section) => (
          <div key={section.label}>
            <p
              className={`font-mono text-[10px] uppercase tracking-wider ${
                theme === "classic-light" ? "text-slate-500" : "text-slate-300"
              }`}
            >
              {section.label}
            </p>
            <p
              className={`mt-1 font-sans text-[15px] leading-6 ${
                theme === "classic-light" ? "text-slate-700" : "text-slate-200"
              }`}
            >
              {renderAnalysisWithMentions(section.body, theme)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

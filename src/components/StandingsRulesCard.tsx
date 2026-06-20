import { X, ExternalLink } from "lucide-react";
import { useEffect } from "react";

const FIFA_REGULATIONS_URL =
  "https://digitalhub.fifa.com/m/636f5c9c6f29771f/original/FWC2026_regulations_EN.pdf";

interface Props {
  theme: "classic-light" | "stadium-dark";
  onClose: () => void;
}

export function StandingsRulesCard({ theme, onClose }: Props) {
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
              Critérios de Classificação
            </h2>
            <p className={`mt-0.5 font-mono text-[10px] uppercase tracking-wider ${muted}`}>
              Artigo 13 · Regulamento FIFA WC 2026
            </p>
          </div>
          <button
            onClick={onClose}
            className={`mt-0.5 shrink-0 p-1.5 rounded-lg transition ${
              isDark
                ? "text-slate-400 hover:text-white hover:bg-white/10"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className={`font-archivo text-sm ${muted}`}>
            Quando duas ou mais seleções estão empatadas em pontos ao final da fase de grupos,
            os critérios abaixo são aplicados em ordem.
          </p>

          {/* Step 1 */}
          <div className={`rounded-xl p-4 ${stepBg}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded ${badge}`}>
                Passo 1
              </span>
              <span className={`font-anton text-sm uppercase tracking-wide ${stepLabel}`}>
                Confronto direto
              </span>
            </div>
            <p className={`font-mono text-[10px] uppercase tracking-wider mb-2 ${muted}`}>
              Apenas os jogos entre as seleções empatadas
            </p>
            <ol className="space-y-1.5 font-archivo text-sm">
              <li className="flex gap-2">
                <span className={`font-mono text-[10px] font-bold shrink-0 mt-0.5 ${stepLabel}`}>A</span>
                <span>Maior número de pontos entre si</span>
              </li>
              <li className="flex gap-2">
                <span className={`font-mono text-[10px] font-bold shrink-0 mt-0.5 ${stepLabel}`}>B</span>
                <span>Maior saldo de gols nos jogos entre si</span>
              </li>
              <li className="flex gap-2">
                <span className={`font-mono text-[10px] font-bold shrink-0 mt-0.5 ${stepLabel}`}>C</span>
                <span>Maior número de gols marcados nos jogos entre si</span>
              </li>
            </ol>
          </div>

          {/* Step 2 */}
          <div className={`rounded-xl p-4 ${stepBg}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded ${badge}`}>
                Passo 2
              </span>
              <span className={`font-anton text-sm uppercase tracking-wide ${stepLabel}`}>
                Se ainda empatadas
              </span>
            </div>
            <p className={`font-mono text-[10px] uppercase tracking-wider mb-2 ${muted}`}>
              Critérios A–C reaplicados ao subgrupo restante; se ainda houver empate:
            </p>
            <ol className="space-y-1.5 font-archivo text-sm mb-3" start={4}>
              <li className="flex gap-2">
                <span className={`font-mono text-[10px] font-bold shrink-0 mt-0.5 ${stepLabel}`}>D</span>
                <span>Maior saldo de gols em todos os jogos do grupo</span>
              </li>
              <li className="flex gap-2">
                <span className={`font-mono text-[10px] font-bold shrink-0 mt-0.5 ${stepLabel}`}>E</span>
                <span>Maior número de gols marcados em todos os jogos do grupo</span>
              </li>
              <li className="flex gap-2">
                <span className={`font-mono text-[10px] font-bold shrink-0 mt-0.5 ${stepLabel}`}>F</span>
                <span>Fair play — menor pontuação de infrações disciplinares:</span>
              </li>
            </ol>
            <div className={`ml-5 rounded-lg border p-3 font-mono text-[11px] space-y-1 ${isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-white"}`}>
              <div className="flex justify-between gap-4">
                <span className={muted}>Cartão amarelo</span>
                <span className="font-bold text-amber-500">−1 pt</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className={muted}>Vermelho indireto (2 amarelos)</span>
                <span className="font-bold text-red-500">−3 pts</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className={muted}>Vermelho direto</span>
                <span className="font-bold text-red-500">−4 pts</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className={muted}>Amarelo + vermelho direto</span>
                <span className="font-bold text-red-500">−5 pts</span>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className={`rounded-xl p-4 ${stepBg}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded ${badge}`}>
                Passo 3
              </span>
              <span className={`font-anton text-sm uppercase tracking-wide ${stepLabel}`}>
                Última instância
              </span>
            </div>
            <ol className="space-y-1.5 font-archivo text-sm" start={7}>
              <li className="flex gap-2">
                <span className={`font-mono text-[10px] font-bold shrink-0 mt-0.5 ${stepLabel}`}>G</span>
                <span>Ranking FIFA/Coca-Cola Men's mais recente</span>
              </li>
              <li className="flex gap-2">
                <span className={`font-mono text-[10px] font-bold shrink-0 mt-0.5 ${stepLabel}`}>H</span>
                <span>Edições anteriores do ranking, retroativamente, até haver decisão</span>
              </li>
            </ol>
          </div>

          {/* Best 8 third-place teams */}
          <div className={`rounded-xl border p-4 ${isDark ? "border-white/10" : "border-slate-200"}`}>
            <p className={`font-anton text-[11px] uppercase tracking-wider mb-2 ${muted}`}>
              Melhores 8 terceiros colocados
            </p>
            <p className={`font-archivo text-sm ${muted} mb-2`}>
              Critério separado — sem confronto direto:
            </p>
            <p className="font-mono text-[11px] tracking-wide">
              Pontos → Saldo de gols → Gols marcados → Fair play → Ranking FIFA
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
              Ver regulamento oficial da FIFA
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

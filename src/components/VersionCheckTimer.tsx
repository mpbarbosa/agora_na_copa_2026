import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { VersionCheckStatus } from "../hooks/useVersionCheck";

type Theme = "classic-light" | "stadium-dark";

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Discreet version-update status shown right of the app title: a mono countdown
 * to the next `/api/health` poll, plus a small button to force the check now
 * (or to reload and apply once a newer build is detected). Self-ticks every
 * second so only this element re-renders, not the whole shell.
 */
export function VersionCheckTimer({
  status,
  onForceCheck,
  theme,
}: {
  status: VersionCheckStatus;
  onForceCheck: () => void;
  theme: Theme;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [spinning, setSpinning] = useState(false);
  const spinTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (status.nextCheckAt === null) return; // update found — nothing to count down
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [status.nextCheckAt]);

  useEffect(() => () => window.clearTimeout(spinTimer.current), []);

  const muted = theme === "classic-light" ? "text-slate-400" : "text-slate-500";
  const accent = theme === "classic-light" ? "text-[#009c3b]" : "text-[#00e476]";
  const hover = theme === "classic-light" ? "hover:text-slate-700" : "hover:text-slate-200";

  const updateReady = status.updateAvailable || status.nextCheckAt === null;

  const handleClick = () => {
    if (updateReady) {
      window.location.reload(); // apply the newer build now
      return;
    }
    onForceCheck();
    setSpinning(true);
    window.clearTimeout(spinTimer.current);
    spinTimer.current = window.setTimeout(() => setSpinning(false), 800);
  };

  const lastLabel = status.lastCheckedAt
    ? `última verificação às ${new Date(status.lastCheckedAt).toLocaleTimeString("pt-BR")}`
    : "aguardando a primeira verificação";

  return (
    <span className="flex items-center gap-1.5" id="version-check-cluster">
      {updateReady ? (
        <span
          id="version-check-timer"
          className={`font-mono text-[10px] leading-none ${accent}`}
          title="Nova versão disponível — recarregue para atualizar"
        >
          nova versão
        </span>
      ) : (
        <span
          id="version-check-timer"
          className={`font-mono text-[10px] leading-none tabular-nums ${muted}`}
          title={`Próxima verificação de nova versão em ${formatCountdown(status.nextCheckAt! - now)} • ${lastLabel}`}
          aria-label="Tempo até a próxima verificação de nova versão"
        >
          {formatCountdown(status.nextCheckAt! - now)}
        </span>
      )}
      <button
        type="button"
        id="btn-version-check-now"
        onClick={handleClick}
        title={updateReady ? "Atualizar agora" : "Verificar atualização agora"}
        aria-label={updateReady ? "Atualizar para a nova versão agora" : "Verificar atualização agora"}
        className={`${updateReady ? accent : muted} ${hover} transition-colors`}
      >
        <RefreshCw size={11} className={spinning ? "animate-spin" : ""} aria-hidden="true" />
      </button>
    </span>
  );
}

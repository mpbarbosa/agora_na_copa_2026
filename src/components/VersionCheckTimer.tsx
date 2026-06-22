import { useEffect, useState } from "react";
import type { VersionCheckStatus } from "../hooks/useVersionCheck";

type Theme = "classic-light" | "stadium-dark";

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Discreet, mono countdown to the next version-update check (the `/api/health`
 * poll driven by useVersionCheck), shown right of the app title. Switches to a
 * subtle "nova versão" hint once a newer build is detected. Self-ticks every
 * second so only this element re-renders, not the whole shell.
 */
export function VersionCheckTimer({
  status,
  theme,
}: {
  status: VersionCheckStatus;
  theme: Theme;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status.nextCheckAt === null) return; // update found — nothing to count down
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [status.nextCheckAt]);

  const muted = theme === "classic-light" ? "text-slate-400" : "text-slate-500";
  const accent = theme === "classic-light" ? "text-[#009c3b]" : "text-[#00e476]";

  if (status.updateAvailable || status.nextCheckAt === null) {
    return (
      <span
        id="version-check-timer"
        className={`font-mono text-[10px] leading-none ${accent}`}
        title="Nova versão disponível — recarregue para atualizar"
      >
        ↻ nova versão
      </span>
    );
  }

  const lastLabel = status.lastCheckedAt
    ? `última verificação às ${new Date(status.lastCheckedAt).toLocaleTimeString("pt-BR")}`
    : "aguardando a primeira verificação";

  return (
    <span
      id="version-check-timer"
      className={`flex items-center gap-1 font-mono text-[10px] leading-none ${muted}`}
      title={`Próxima verificação de nova versão em ${formatCountdown(status.nextCheckAt - now)} • ${lastLabel}`}
      aria-label="Tempo até a próxima verificação de nova versão"
    >
      <span aria-hidden="true">↻</span>
      <span className="tabular-nums">{formatCountdown(status.nextCheckAt - now)}</span>
    </span>
  );
}

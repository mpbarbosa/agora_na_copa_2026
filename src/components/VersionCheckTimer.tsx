import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { VersionCheckStatus } from "../hooks/useVersionCheck";
import { useLocale, useT } from "../i18n";

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
  const t = useT();
  const { intlTag } = useLocale();
  const [now, setNow] = useState(() => Date.now());
  const [spinning, setSpinning] = useState(false);
  const spinTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (status.nextCheckAt === null) return; // update found — nothing to count down
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [status.nextCheckAt]);

  useEffect(() => () => window.clearTimeout(spinTimer.current), []);

  const muted = "text-slate-500";
  const accent = theme === "classic-light" ? "text-[#007a2e]" : "text-[#00e476]";
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
    ? t("banners.version.lastCheckAt", {
        time: new Date(status.lastCheckedAt).toLocaleTimeString(intlTag),
      })
    : t("banners.version.awaitingFirst");

  return (
    <span className="flex items-center gap-1.5" id="version-check-cluster">
      {updateReady ? (
        <span
          id="version-check-timer"
          className={`font-mono text-[10px] leading-none ${accent}`}
          title={t("banners.version.updateTitle")}
        >
          {t("banners.version.newVersion")}
        </span>
      ) : (
        <span
          id="version-check-timer"
          className={`font-mono text-[10px] leading-none tabular-nums ${muted}`}
          title={t("banners.version.nextCheckTitle", {
            countdown: formatCountdown(status.nextCheckAt! - now),
            last: lastLabel,
          })}
          aria-label={t("banners.version.timerAria")}
        >
          {formatCountdown(status.nextCheckAt! - now)}
        </span>
      )}
      <button
        type="button"
        id="btn-version-check-now"
        onClick={handleClick}
        title={updateReady ? t("banners.version.updateNow") : t("banners.version.checkNow")}
        aria-label={updateReady ? t("banners.version.updateNowAria") : t("banners.version.checkNow")}
        className={`${updateReady ? accent : muted} ${hover} transition-colors`}
      >
        <RefreshCw size={11} className={spinning ? "animate-spin" : ""} aria-hidden="true" />
      </button>
    </span>
  );
}

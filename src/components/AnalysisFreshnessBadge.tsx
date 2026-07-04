import { useT } from "../i18n";

interface AnalysisFreshnessBadgeProps {
  /** True = "Atualizada", false = "Desatualizada", null/undefined = render nothing. */
  upToDate: boolean | null | undefined;
  theme: "classic-light" | "stadium-dark";
  /** data-testid for the badge element (the `data-fresh` attribute carries the boolean). */
  testId?: string;
  className?: string;
}

/**
 * Small pill telling whether an editorial analysis (group / team / player) is
 * current with its subject's last finished match. Green "Atualizada" when up to
 * date, amber "Desatualizada" when behind. Shared by StandingsView,
 * TeamLineupView and the player card so the three surfaces stay visually
 * consistent. Renders nothing when `upToDate` is null/undefined.
 */
export function AnalysisFreshnessBadge({
  upToDate,
  theme,
  testId,
  className = "",
}: AnalysisFreshnessBadgeProps) {
  const t = useT();
  if (upToDate === null || upToDate === undefined) return null;
  const isLight = theme === "classic-light";

  const tone = upToDate
    ? isLight
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
    : isLight
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-amber-400/30 bg-amber-400/10 text-amber-300";

  return (
    <span
      data-testid={testId}
      data-fresh={upToDate ? "true" : "false"}
      title={
        upToDate
          ? t("common.freshness.upToDateTitle")
          : t("common.freshness.staleTitle")
      }
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${tone} ${className}`}
    >
      ● {upToDate ? t("common.freshness.upToDate") : t("common.freshness.stale")}
    </span>
  );
}

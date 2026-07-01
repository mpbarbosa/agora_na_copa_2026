import { CloudRain } from "lucide-react";

interface MatchAdvisoryNoticeProps {
  /** The advisory text (pt-BR), e.g. a weather-delay warning. */
  message: string;
  theme: "classic-light" | "stadium-dark";
}

/**
 * A per-match advisory banner shown in the scoreboard — for schedule notes that
 * the live status feed doesn't carry, such as a weather-related kickoff delay.
 * Amber styling matches WeatherSuspensionNotice (its sibling for SUSPENDED ties).
 * Text comes from `src/data/matchAdvisories.json`, keyed by match id; the caller
 * hides it once the match is FINISHED so a stale note never lingers.
 */
export function MatchAdvisoryNotice({ message, theme }: MatchAdvisoryNoticeProps) {
  const isLight = theme === "classic-light";

  return (
    <div
      role="status"
      id="match-advisory-notice"
      data-testid="match-advisory-notice"
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider ${
        isLight
          ? "border-amber-300 bg-amber-50 text-amber-700"
          : "border-amber-400/30 bg-amber-400/10 text-amber-300"
      }`}
    >
      <CloudRain size={14} aria-hidden="true" />
      <span className="normal-case tracking-normal">{message}</span>
    </div>
  );
}

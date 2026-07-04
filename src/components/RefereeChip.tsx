import type { MatchReferee } from "../types";
import { useT } from "../i18n";

type Theme = "classic-light" | "stadium-dark";

/**
 * Match referee chip for the scoreboard: shows the FIFA-assigned main referee
 * (name + nationality) for a match. FIFA only assigns referees a day or two
 * before kickoff and reliably publishes just the main referee, so this renders
 * nothing until a referee is available — never an empty placeholder.
 */
export function RefereeChip({
  referee,
  theme,
  onClick,
}: {
  referee: MatchReferee | undefined;
  theme: Theme;
  /** When provided, the chip becomes a button that opens the referee card. */
  onClick?: () => void;
}) {
  const t = useT();
  if (!referee?.name) return null;

  const isLight = theme === "classic-light";
  const baseClasses = `inline-flex items-center gap-2 rounded-full border px-3 py-1 ${
    isLight
      ? "border-slate-200 bg-slate-100 text-slate-700"
      : "border-white/10 bg-white/5 text-slate-100"
  }`;
  const title = referee.country
    ? t("common.referee.titleWithCountry", { name: referee.name, country: referee.country })
    : t("common.referee.title", { name: referee.name });
  const label = referee.country
    ? t("common.referee.labelWithCountry", { name: referee.name, country: referee.country })
    : t("common.referee.label", { name: referee.name });

  if (onClick) {
    return (
      <button
        type="button"
        id="match-referee-chip"
        onClick={onClick}
        aria-haspopup="dialog"
        className={`${baseClasses} cursor-pointer transition hover:brightness-95 ${
          isLight ? "hover:bg-slate-200" : "hover:bg-white/10"
        }`}
        title={title}
        aria-label={t("common.referee.openCard", { label })}
      >
        <span className="text-base leading-none" aria-hidden="true">
          🧑‍⚖️
        </span>
        <span
          className={`font-archivo text-[11px] font-semibold uppercase tracking-wide ${
            isLight ? "text-slate-500" : "text-slate-300"
          }`}
        >
          {t("common.referee.caption")}
        </span>
        <span className="font-archivo text-sm font-bold leading-none">{referee.name}</span>
        {referee.country && (
          <span className="font-mono text-[11px] font-bold leading-none opacity-70">
            {referee.country}
          </span>
        )}
      </button>
    );
  }

  return (
    <span
      id="match-referee-chip"
      className={baseClasses}
      title={title}
      aria-label={label}
    >
      <span className="text-base leading-none" aria-hidden="true">
        🧑‍⚖️
      </span>
      <span
        className={`font-archivo text-[11px] font-semibold uppercase tracking-wide ${
          isLight ? "text-slate-500" : "text-slate-300"
        }`}
      >
        {t("common.referee.caption")}
      </span>
      <span className="font-archivo text-sm font-bold leading-none">{referee.name}</span>
      {referee.country && (
        <span className="font-mono text-[11px] font-bold leading-none opacity-70">
          {referee.country}
        </span>
      )}
    </span>
  );
}

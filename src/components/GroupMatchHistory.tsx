import type { Match, TeamRef } from "../types";
import { useT } from "../i18n";
import { FlagIcon } from "./FlagIcon";

interface GroupMatchHistoryProps {
  /** All matches belonging to this group (both teams in the group). */
  matches: Match[];
  theme: "classic-light" | "stadium-dark";
  /** Slug used for stable element ids/testids, e.g. "grupo-a". */
  slug: string;
  onSelectTeamLineup: (team: TeamRef) => void;
  /** Open a match's detail ("Partida") page, focused on this match. */
  onSelectMatch: (matchId: string) => void;
}

/** "15/06" from an ISO kickoff timestamp like "2026-06-15T16:00:00-03:00". */
function shortDate(kickoffTimestamp: string): string {
  const [, mo, d] = kickoffTimestamp.slice(0, 10).split("-");
  return d && mo ? `${d}/${mo}` : "";
}

/**
 * Compact, collapsible list of a group's matches — finished and live results
 * (with scores) followed by the remaining scheduled fixtures (with kickoff time),
 * all in chronological order. Rendered as a `<details>` element directly below
 * "Análise do grupo" in each group card, mirroring that section's markup. Hidden
 * only when the group has no matches at all.
 */
export function GroupMatchHistory({ matches, theme, slug, onSelectTeamLineup, onSelectMatch }: GroupMatchHistoryProps) {
  const t = useT();
  const isLight = theme === "classic-light";

  const ordered = [...matches].sort((a, b) =>
    a.kickoffTimestamp.localeCompare(b.kickoffTimestamp),
  );

  if (ordered.length === 0) return null;

  const headingClasses = isLight ? "text-slate-900" : "text-white";
  const mutedClasses = isLight ? "text-slate-600" : "text-slate-300";
  const dividerClasses = isLight ? "border-slate-100" : "border-white/5";
  const liveColor = isLight ? "text-red-600" : "text-red-400";

  return (
    <details
      className={`group mt-4 border-t pt-3 ${dividerClasses}`}
      id={`standings-group-history-${slug}`}
      data-testid={`group-history-${slug}`}
    >
      <summary
        className={`flex cursor-pointer list-none items-center justify-between gap-2 font-anton text-sm uppercase tracking-wide ${headingClasses} [&::-webkit-details-marker]:hidden`}
      >
        <span>{t("standings.history.title")}</span>
        <span
          aria-hidden="true"
          className={`font-mono text-[10px] transition-transform group-open:rotate-180 ${mutedClasses}`}
        >
          ▾
        </span>
      </summary>

      <ul className="mt-2 space-y-1.5">
        {ordered.map((m) => {
          const live = m.status === "LIVE";
          const hasScore = (m.status === "FINISHED" || m.status === "LIVE") && !!m.score;
          return (
            <li
              key={m.id}
              className="flex items-center gap-2 font-mono text-[11px]"
              data-testid={`group-history-row-${m.id}`}
            >
              <span className={`w-10 shrink-0 ${mutedClasses}`}>{shortDate(m.kickoffTimestamp)}</span>

              <div className="flex flex-1 items-center justify-end gap-1.5 overflow-hidden">
                <span className={`truncate ${headingClasses}`} title={m.teamA.name}>
                  {m.teamA.code}
                </span>
                <FlagIcon
                  flag={m.teamA.flagSvg}
                  className="h-3.5 w-5 shrink-0"
                  onClick={() => onSelectTeamLineup(m.teamA)}
                />
              </div>

              <button
                type="button"
                onClick={() => onSelectMatch(m.id)}
                title={t("standings.history.openMatchTitle", { teamA: m.teamA.code, teamB: m.teamB.code })}
                aria-label={t("standings.history.openMatchAria", { teamA: m.teamA.name, teamB: m.teamB.name })}
                data-testid={`group-history-match-link-${m.id}`}
                className={`shrink-0 rounded tabular-nums underline-offset-2 transition hover:underline ${
                  hasScore
                    ? `font-bold ${live ? liveColor : headingClasses}`
                    : mutedClasses
                } ${isLight ? "hover:text-[#007a2f]" : "hover:text-[#00e476]"}`}
              >
                {hasScore ? `${m.score!.teamA}–${m.score!.teamB}` : m.kickoffTime}
              </button>

              <div className="flex flex-1 items-center gap-1.5 overflow-hidden">
                <FlagIcon
                  flag={m.teamB.flagSvg}
                  className="h-3.5 w-5 shrink-0"
                  onClick={() => onSelectTeamLineup(m.teamB)}
                />
                <span className={`truncate ${headingClasses}`} title={m.teamB.name}>
                  {m.teamB.code}
                </span>
              </div>

              {live && (
                <span className={`shrink-0 text-[8px] font-bold uppercase tracking-wider ${liveColor}`}>
                  {t("standings.history.live")}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

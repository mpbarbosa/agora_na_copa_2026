import type { CommentaryEvent, Match, MatchOverlayEntry, TeamRef } from "../types";
import { FlagIcon } from "./FlagIcon";
import { MatchWeatherChip } from "./MatchWeatherChip";
import { WeatherSuspensionNotice } from "./WeatherSuspensionNotice";

interface SimultaneousLiveMatchesProps {
  /** The matches in progress right now (2+ — the simultaneous case). */
  matches: Match[];
  /** Live overlays (broadcast + state/incidents) keyed by match id. */
  overlays: Record<string, MatchOverlayEntry>;
  theme: "classic-light" | "stadium-dark";
  onSelectTeamLineup: (team: TeamRef) => void;
  onOpenStandingsGroup: (groupLabel: string) => void;
}

const INCIDENT_ICON: Record<CommentaryEvent["type"], string> = {
  GOAL: "⚽",
  YELLOW_CARD: "🟨",
  RED_CARD: "🟥",
  SUBSTITUTION: "🔁",
  WHISTLE: "🟢",
  COMMENT: "💬",
};

/**
 * When two or more matches are live at once (the final group round plays both of a
 * group's games simultaneously), the Ao Vivo page renders a COMPACT card for each —
 * scoreboard, "Onde assistir" and live "Lances" — stacked vertically ABOVE the
 * single-match detail, so every live game is visible at a glance. The lineup
 * (Escalações) is intentionally left to the single-match detail below (and the
 * Seleções view) so these cards stay light and don't turn Ao Vivo into a stack of
 * full team pages. Rendered whenever `liveMatches.length >= 2`.
 */
export function SimultaneousLiveMatches({
  matches,
  overlays,
  theme,
  onSelectTeamLineup,
  onOpenStandingsGroup,
}: SimultaneousLiveMatchesProps) {
  const isLight = theme === "classic-light";
  const cardClasses = isLight
    ? "bg-white border-slate-200/90 shadow-sm"
    : "bg-gradient-to-br from-[#121414] to-[#1e2020] border-white/5 shadow-2xl";
  const headingClasses = isLight ? "text-slate-800" : "text-white";
  const mutedClasses = isLight ? "text-slate-500" : "text-slate-300";
  const dividerClasses = isLight ? "border-slate-150" : "border-white/5";
  const sectionTitle = `font-anton text-sm uppercase tracking-wider ${headingClasses}`;

  return (
    <div
      className="max-w-5xl mx-auto px-4 mt-8 space-y-6"
      id="simultaneous-live-matches"
      data-testid="simultaneous-live-matches"
    >
      {matches.map((match) => {
        const overlay = overlays[match.id];
        const live = match.status === "LIVE";
        const suspended = match.status === "SUSPENDED";
        const score = match.score;
        const incidents = [...(overlay?.matchState.incidents ?? [])].reverse();
        const broadcasters = overlay?.broadcastGuide.broadcasters ?? match.broadcasters;
        const groupLabel = match.stageName === "Group Stage" ? match.teamA.group : null;

        return (
          <section
            key={match.id}
            id={`live-match-card-${match.id}`}
            data-testid={`live-match-card-${match.id}`}
            className={`rounded-2xl border p-5 md:p-6 ${cardClasses}`}
          >
            {/* Status badge */}
            <div className="flex items-center justify-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  live ? "bg-red-500 animate-pulse" : suspended ? "bg-amber-500 animate-pulse" : "bg-slate-400"
                }`}
              />
              <span
                className={`font-mono text-xs font-bold uppercase tracking-widest ${
                  suspended ? "text-amber-600" : isLight ? "text-slate-600" : "text-[#a7e6bf]"
                }`}
              >
                {live ? (match.matchTime ? `AO VIVO • ${match.matchTime}` : "AO VIVO") : suspended ? "PARALISADO" : "ENCERRADO"}
              </span>
            </div>

            {/* Scoreboard: teamA · score · teamB */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-xl border border-black/5 bg-white p-2 dark:border-white/10">
                  <FlagIcon
                    flag={match.teamA.flagSvg}
                    className="h-full w-full object-contain"
                    onClick={() => onSelectTeamLineup(match.teamA)}
                  />
                </div>
                <span className={`text-center font-anton text-sm uppercase tracking-wide ${headingClasses}`}>
                  {match.teamA.name}
                </span>
              </div>

              <div className={`shrink-0 font-anton text-5xl leading-none tracking-tight ${live ? "text-red-500" : headingClasses}`}>
                {score ? `${score.teamA}–${score.teamB}` : match.kickoffTime}
              </div>

              <div className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-xl border border-black/5 bg-white p-2 dark:border-white/10">
                  <FlagIcon
                    flag={match.teamB.flagSvg}
                    className="h-full w-full object-contain"
                    onClick={() => onSelectTeamLineup(match.teamB)}
                  />
                </div>
                <span className={`text-center font-anton text-sm uppercase tracking-wide ${headingClasses}`}>
                  {match.teamB.name}
                </span>
              </div>
            </div>

            {/* Venue + group + live weather */}
            <div className={`mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t pt-3 text-center font-mono text-[11px] uppercase tracking-wider ${dividerClasses} ${mutedClasses}`}>
              <span>{match.kickoffDate}</span>
              <span>· {match.stadiumName}, {match.city}</span>
              {groupLabel && (
                <button
                  type="button"
                  onClick={() => onOpenStandingsGroup(groupLabel)}
                  className={`rounded-full border px-2 py-0.5 font-bold ${
                    isLight ? "border-slate-200 bg-slate-100 text-slate-700" : "border-white/10 bg-white/5 text-slate-100"
                  }`}
                >
                  {groupLabel}
                </button>
              )}
              {(live || suspended) && <MatchWeatherChip match={match} theme={theme} />}
            </div>

            {/* Weather/lightning suspension advisory + FIFA regulations link */}
            {suspended && (
              <div className="mt-3 flex justify-center">
                <WeatherSuspensionNotice theme={theme} />
              </div>
            )}

            {/* Onde assistir */}
            {broadcasters.length > 0 && (
              <div className={`mt-4 border-t pt-3 ${dividerClasses}`}>
                <p className={`${sectionTitle} mb-2`}>Onde assistir</p>
                <div className="flex flex-wrap gap-2">
                  {broadcasters.map((cast) => (
                    <a
                      key={cast.id}
                      href={cast.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] ${
                        isLight ? "border-slate-200 hover:bg-slate-50" : "border-white/10 hover:bg-white/5"
                      }`}
                      style={{ color: cast.iconColor }}
                    >
                      <span className="font-bold">{cast.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Lances (live incidents) */}
            {incidents.length > 0 && (
              <div className={`mt-4 border-t pt-3 ${dividerClasses}`}>
                <p className={`${sectionTitle} mb-2`}>Lances</p>
                <ul className="space-y-1.5">
                  {incidents.map((ev) => (
                    <li key={ev.id} className="flex items-start gap-2 font-archivo text-sm">
                      <span className="w-9 shrink-0 font-mono text-[11px] text-amber-500">{ev.time}</span>
                      <span aria-hidden="true">{INCIDENT_ICON[ev.type]}</span>
                      <span className={isLight ? "text-slate-700" : "text-slate-200"}>{ev.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </section>
        );
      })}
    </div>
  );
}

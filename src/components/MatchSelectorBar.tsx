// The Ao Vivo match-selector bar: live matches as chips, upcoming matches in a
// horizontally-scrollable rail (with prev/next controls). Owns its own rail refs
// and the "scroll the selected chip into view" effect; the parent passes the
// status-split groups + selection state and receives the pick via onSelectMatch.
import type { Match, MatchStatus } from "../types";
import type { ProvisionalSlot } from "../standings";
import { useT } from "../i18n";
import { resolveTeamDisplay } from "../utils/resolveTeamDisplay";
import { formatCountryNameForTooltip } from "../utils/matchSelection";
import { useMatchSelectorRail } from "../hooks/useMatchSelectorRail";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MatchSelectorBarProps {
  groups: { status: MatchStatus; label: string; matches: Match[] }[];
  groupPositionMap: Map<string, ProvisionalSlot>;
  selectedMatchId: string;
  onSelectMatch: (matchId: string) => void;
  theme: "classic-light" | "stadium-dark";
}

export function MatchSelectorBar({
  groups,
  groupPositionMap,
  selectedMatchId,
  onSelectMatch,
  theme,
}: MatchSelectorBarProps) {
  const t = useT();
  const { setRailRef, scrollRail } = useMatchSelectorRail(selectedMatchId);
  const hasLiveHeaderGroup = groups.some(({ status }) => status === "LIVE");
  const hasUpcomingHeaderGroup = groups.some(({ status }) => status === "PRE_GAME");

  return (
    <div
      className={`border-b ${
        theme === "classic-light"
          ? "bg-white border-slate-200"
          : "bg-[#121414]/90 border-white/10 backdrop-blur-md"
      }`}
      id="match-selector-bar"
    >
      <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-start justify-between gap-4">
        {/* Match selector groups, split by status: live / upcoming */}
        <div
          className={`grid min-w-0 flex-1 gap-3 ${
            hasLiveHeaderGroup && hasUpcomingHeaderGroup
              ? "xl:grid-cols-[max-content_minmax(0,1fr)] xl:items-start"
              : ""
          }`}
          id="match-selector-groups"
        >
          {groups.map(({ status, label, matches: group }) => {
            return (
              <div
                className={`grid min-w-0 gap-1 ${status === "LIVE" ? "xl:w-fit" : ""}`}
                id={`match-group-${status}`}
                key={status}
              >
                <span
                  className={`shrink-0 font-mono text-xs font-bold uppercase tracking-wider ${
                    theme === "classic-light"
                      ? "text-slate-700"
                      : "text-slate-100"
                  }`}
                >
                  {label}
                </span>
                {status === "LIVE" ? (
                  <div
                    className={`flex min-w-0 flex-wrap items-center gap-1 rounded-lg border p-1 xl:w-fit ${
                      theme === "classic-light"
                        ? "bg-slate-100 border-slate-200"
                        : "bg-white/10 border-white/15"
                    }`}
                    id={`match-selector-chips-${status}`}
                  >
                    {group.map((m) => {
                      const a = resolveTeamDisplay(m, m.teamA, groupPositionMap);
                      const b = resolveTeamDisplay(m, m.teamB, groupPositionMap);
                      return (
                      <button
                        key={m.id}
                        id={`btn-match-${m.id}`}
                        onClick={() => onSelectMatch(m.id)}
                        title={t("aoVivo.selector.matchTooltip", {
                          teamA: formatCountryNameForTooltip(a.name),
                          teamB: formatCountryNameForTooltip(b.name),
                        })}
                        aria-label={t("aoVivo.selector.matchTooltip", {
                          teamA: formatCountryNameForTooltip(a.name),
                          teamB: formatCountryNameForTooltip(b.name),
                        })}
                        className={`shrink-0 px-3.5 py-2 rounded-md text-[13px] md:text-sm leading-none font-anton transition-all uppercase tracking-wide ${
                          selectedMatchId === m.id
                            ? theme === "classic-light"
                              ? "bg-white text-slate-950 shadow-sm font-semibold"
                              : "bg-[#171a1c] text-[#ffd84d] shadow-sm font-semibold"
                            : theme === "classic-light"
                              ? "text-slate-700 hover:bg-white hover:text-slate-950"
                              : "text-slate-100 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <span>{a.code}</span>
                          <span>x</span>
                          <span>{b.code}</span>
                        </span>
                      </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => scrollRail(status, "prev")}
                      className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border md:inline-flex ${
                        theme === "classic-light"
                          ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          : "border-white/10 bg-[#171a1c] text-slate-100 hover:bg-white/10"
                      }`}
                      aria-label={t("aoVivo.selector.prevIn", {
                        label: label.toLowerCase(),
                      })}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="relative min-w-0 flex-1">
                      <div
                        ref={(node) => setRailRef(status, node)}
                        className={`match-selector-rail scrollbar-hidden flex min-w-0 max-w-full snap-x snap-mandatory flex-nowrap items-center gap-1 overflow-x-auto rounded-lg border p-1 scroll-smooth ${
                          theme === "classic-light"
                            ? "bg-slate-100 border-slate-200"
                            : "bg-white/10 border-white/15"
                        }`}
                        id={`match-selector-chips-${status}`}
                      >
                        {group.map((m) => {
                          const a = resolveTeamDisplay(m, m.teamA, groupPositionMap);
                          const b = resolveTeamDisplay(m, m.teamB, groupPositionMap);
                          return (
                          <button
                            key={m.id}
                            id={`btn-match-${m.id}`}
                            onClick={() => onSelectMatch(m.id)}
                            title={t("aoVivo.selector.matchTooltip", {
                              teamA: formatCountryNameForTooltip(a.name),
                              teamB: formatCountryNameForTooltip(b.name),
                            })}
                            aria-label={t("aoVivo.selector.matchTooltip", {
                              teamA: formatCountryNameForTooltip(a.name),
                              teamB: formatCountryNameForTooltip(b.name),
                            })}
                            className={`shrink-0 snap-center px-3.5 py-2 rounded-md text-[13px] md:text-sm leading-none font-anton transition-all uppercase tracking-wide ${
                              selectedMatchId === m.id
                                ? theme === "classic-light"
                                  ? "bg-white text-slate-950 shadow-sm font-semibold"
                                  : "bg-[#171a1c] text-[#ffd84d] shadow-sm font-semibold"
                                : theme === "classic-light"
                                  ? "text-slate-700 hover:bg-white hover:text-slate-950"
                                  : "text-slate-100 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <span>{a.code}</span>
                              <span>x</span>
                              <span>{b.code}</span>
                            </span>
                          </button>
                          );
                        })}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => scrollRail(status, "next")}
                      className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border md:inline-flex ${
                        theme === "classic-light"
                          ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          : "border-white/10 bg-[#171a1c] text-slate-100 hover:bg-white/10"
                      }`}
                      aria-label={t("aoVivo.selector.nextIn", {
                        label: label.toLowerCase(),
                      })}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

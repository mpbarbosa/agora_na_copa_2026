import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import type { Match, TeamRef } from "../types";
import { computeStandings, groupStandings, computeQualificationNote, computeContentionNote, computeEliminationNote } from "../standings";
import { FlagIcon } from "./FlagIcon";
import { StandingsRulesCard } from "./StandingsRulesCard";
import { ThirdPlaceTable } from "./ThirdPlaceTable";
import { GroupMatchHistory } from "./GroupMatchHistory";
import { parseNoteSections } from "../utils/noteSections";
import { formatAnalysisTimestamp } from "../utils/dateFormat";
import { isAnalysisUpToDate, lastFinishedKickoff } from "../utils/analysisFreshness";
import { AnalysisFreshnessBadge } from "./AnalysisFreshnessBadge";
import GROUP_ANALYSIS from "../data/groupAnalysis.json";

interface GroupAnalysisEntry {
  text: string;
  updatedAt?: string;
}

const GROUP_ANALYSIS_BY_LETTER = GROUP_ANALYSIS as Record<string, GroupAnalysisEntry>;

interface StandingsViewProps {
  matches: Match[];
  theme: "classic-light" | "stadium-dark";
  onSelectTeamLineup: (team: TeamRef) => void;
  focusGroupSlug?: string | null;
}

const COLUMNS = [
  { key: "points",         label: "PTS" },
  { key: "goalDifference", label: "SG"  },
  { key: "played",         label: "J"   },
  { key: "won",            label: "V"   },
  { key: "drawn",          label: "E"   },
  { key: "lost",           label: "D"   },
  { key: "goalsFor",       label: "GF"  },
  { key: "goalsAgainst",   label: "GA"  },
] as const;

const groupSlug = (group: string) => group.replace(/\s+/g, "-").toLowerCase();

interface LiveState {
  status: string;
  score?: { teamA: number; teamB: number };
}

interface TooltipState {
  key: string;
  note: string;
  left: number;
  top?: number;
  bottom?: number;
}

export function StandingsView({
  matches,
  theme,
  onSelectTeamLineup,
  focusGroupSlug = null,
}: StandingsViewProps) {
  const [showRules, setShowRules] = useState(false);
  const [liveStates, setLiveStates] = useState<Record<string, LiveState>>({});
  const [openTooltip, setOpenTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    if (!openTooltip) return;
    const close = () => setOpenTooltip(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenTooltip(null);
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    // The popover is position:fixed, so it does not follow scroll/resize —
    // dismiss it instead of letting it detach from its trigger.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [openTooltip]);

  const openTooltipAt = (key: string, note: string, trigger: HTMLElement) => {
    const r = trigger.getBoundingClientRect();
    const POPOVER_WIDTH = 208; // matches w-52
    const left = Math.max(8, Math.min(r.left, window.innerWidth - POPOVER_WIDTH - 8));
    const openUp = r.top > window.innerHeight * 0.55;
    setOpenTooltip({
      key,
      note,
      left,
      ...(openUp
        ? { bottom: window.innerHeight - r.top + 4 }
        : { top: r.bottom + 4 }),
    });
  };

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch("/api/match-states");
        if (!res.ok || !active) return;
        const data: { states: Record<string, LiveState>; refreshAfterMs?: number } = await res.json();
        if (active) setLiveStates(data.states ?? {});
        if (active) timer = setTimeout(poll, data.refreshAfterMs ?? 30000);
      } catch {
        if (active) timer = setTimeout(poll, 30000);
      }
    };

    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  const liveMatches = useMemo(
    () =>
      matches.map((m) => {
        const state = liveStates[m.id];
        if (!state) return m;
        return {
          ...m,
          status: state.status as Match["status"],
          ...(state.score !== undefined ? { score: state.score } : {}),
        };
      }),
    [matches, liveStates],
  );

  const groups = useMemo(() => groupStandings(computeStandings(liveMatches), liveMatches), [liveMatches]);

  const cardClasses =
    theme === "classic-light"
      ? "bg-white border-slate-200 shadow-sm"
      : "bg-[#121414] border-white/10";
  const headingClasses = theme === "classic-light" ? "text-slate-900" : "text-white";
  const mutedClasses = theme === "classic-light" ? "text-slate-600" : "text-slate-300";
  const headerCellClasses = theme === "classic-light" ? "text-slate-500" : "text-slate-400";
  const rowBorderClasses = theme === "classic-light" ? "border-slate-100" : "border-white/5";
  const qualifiedClasses =
    theme === "classic-light"
      ? "border-l-[#10b981]"
      : "border-l-[#00ff85]";
  const resolvedFocusGroupSlug =
    focusGroupSlug ||
    (typeof window !== "undefined" && window.location.hash.startsWith("#standings-group-")
      ? window.location.hash.replace("#standings-group-", "")
      : null);

  useEffect(() => {
    if (!resolvedFocusGroupSlug) {
      return;
    }

    const element = document.getElementById(`standings-group-${resolvedFocusGroupSlug}`);
    if (!element) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      if (element instanceof HTMLElement) {
        element.focus({ preventScroll: true });
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [resolvedFocusGroupSlug]);

  return (
    <div className="mx-auto mt-8 max-w-7xl px-4 2xl:max-w-[1600px]" id="standings-view">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            className={`font-anton text-2xl md:text-3xl uppercase tracking-wider ${headingClasses}`}
            id="standings-title"
          >
            Tabela de Classificação
          </h2>
          <p className={`mt-1 mb-6 font-mono text-[11px] uppercase tracking-wider ${mutedClasses}`}>
            Fase de grupos • 12 chaves de 4 seleções
          </p>
        </div>
        <button
          onClick={() => setShowRules(true)}
          title="Critérios de classificação"
          className={`mt-1 shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-wider border transition ${
            theme === "classic-light"
              ? "border-[#009c3b]/35 text-[#009c3b] shadow-[0_0_0_1px_rgba(0,156,59,0.08),0_0_12px_rgba(0,156,59,0.18)] hover:shadow-[0_0_0_1px_rgba(0,156,59,0.15),0_0_18px_rgba(0,156,59,0.3)]"
              : "border-[#ffd84d]/25 text-[#ffd84d] shadow-[0_0_0_1px_rgba(255,216,77,0.08),0_0_12px_rgba(255,216,77,0.15)] hover:shadow-[0_0_0_1px_rgba(255,216,77,0.15),0_0_18px_rgba(255,216,77,0.25)]"
          }`}
          data-testid="standings-rules-btn"
        >
          <span className="relative">
            <Info size={12} />
            <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                theme === "classic-light" ? "bg-[#009c3b]" : "bg-[#ffd84d]"
              }`} />
              <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                theme === "classic-light" ? "bg-[#009c3b]" : "bg-[#ffd84d]"
              }`} />
            </span>
          </span>
          Critérios
        </button>
      </div>

      {showRules && (
        <StandingsRulesCard theme={theme} onClose={() => setShowRules(false)} />
      )}

      <div
        className={`mb-6 flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 ${
          theme === "classic-light"
            ? "border-slate-200 bg-slate-50 text-slate-500"
            : "border-white/10 bg-white/5 text-slate-400"
        }`}
        id="standings-tooltip-hint"
      >
        <Info size={13} className="mt-px shrink-0" />
        <p className="font-mono text-[10px] uppercase tracking-wider leading-relaxed">
          Toque ou passe o cursor sobre o{" "}
          <span className={`font-bold ${theme === "classic-light" ? "text-[#009c3b]" : "text-[#00e476]"}`}>✓</span>
          {" "}(classificado),{" "}
          <span className="font-bold text-red-500">✕</span>
          {" "}(eliminado) ou sobre o{" "}
          <span className={`font-bold ${theme === "classic-light" ? "text-slate-700" : "text-slate-200"}`}>nº de posição</span>
          {" "}(1º/2º ainda em disputa) para ver a análise matemática da situação de cada seleção.
        </p>
      </div>

      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 2xl:grid-cols-4"
        id="standings-grid"
      >
        {groups.map(({ group, rows, qualification }) => {
          const seedCount = rows.filter((row) => row.dataSource === "seed").length;
          const isFocusedGroup = resolvedFocusGroupSlug === groupSlug(group);
          const groupCodes = new Set(rows.map((r) => r.code));
          // The final round plays both of a group's matches simultaneously, so a
          // group can have more than one live match at once — show them all.
          const liveGroupMatches = liveMatches.filter(
            (m) =>
              m.status === "LIVE" &&
              groupCodes.has(m.teamA.code) &&
              groupCodes.has(m.teamB.code),
          );
          const hasLive = liveGroupMatches.length > 0;
          const liveColor = theme === "classic-light" ? "text-red-600" : "text-red-400";

          return (
            <div
              key={group}
              id={`standings-group-${groupSlug(group)}`}
              tabIndex={-1}
              data-focused={isFocusedGroup ? "true" : "false"}
              className={`rounded-2xl border p-4 outline-none ${
                isFocusedGroup
                  ? theme === "classic-light"
                    ? "ring-2 ring-[#009c3b]/40 ring-offset-2 ring-offset-[#f4f7f6]"
                    : "ring-2 ring-[#00e476]/40 ring-offset-2 ring-offset-[#0a0c0c]"
                  : ""
              } ${cardClasses}`}
            >
              <div className="flex items-center gap-2">
                <h3
                  className={`font-anton text-lg uppercase tracking-wide ${headingClasses}`}
                >
                  {group}
                </h3>
                {hasLive && (
                  <span className={`inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider ${liveColor}`}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse bg-current" />
                    Ao Vivo
                  </span>
                )}
              </div>

              {hasLive ? (
                <div
                  className="mt-1 mb-3 space-y-0.5"
                  data-testid={`live-match-${groupSlug(group)}`}
                >
                  {liveGroupMatches.map((m) => (
                    <p
                      key={m.id}
                      className={`font-mono text-[10px] uppercase tracking-wider ${liveColor}`}
                      data-testid={`live-match-${m.id}`}
                    >
                      {m.teamA.code} {m.score?.teamA ?? 0}–{m.score?.teamB ?? 0} {m.teamB.code} · em andamento
                    </p>
                  ))}
                </div>
              ) : seedCount === rows.length ? (
                <p className={`mt-1 mb-3 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                  Resultados da fase de grupos ainda não disputados
                </p>
              ) : seedCount > 0 ? (
                <p className={`mt-1 mb-3 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                  Alguns confrontos deste grupo ainda não foram disputados
                </p>
              ) : (
                <div className="mb-3" />
              )}

              <div className="-mx-1 overflow-x-auto pb-1">
                <table className="w-full font-mono text-[11px] sm:text-xs">
                  <thead>
                    <tr className={`border-b ${rowBorderClasses}`}>
                      <th className={`w-5 py-1.5 text-left font-normal uppercase tracking-wider ${headerCellClasses}`} aria-label="Posição" />
                      <th className={`py-1.5 text-left font-normal uppercase tracking-wider ${headerCellClasses}`}>
                        Equipe
                      </th>
                      {COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          className={`px-1 py-1.5 text-right font-normal uppercase tracking-wider ${
                            col.key === "points"
                              ? `font-bold ${headingClasses}`
                              : headerCellClasses
                          }`}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const isQualifying = index < 2;
                      const status = qualification.get(row.code) ?? "contention";
                      const ptsCellColor =
                        isQualifying
                          ? theme === "classic-light" ? "text-[#009c3b]" : "text-[#00e476]"
                          : headingClasses;
                      const rowLeftBorder =
                        status === "qualified"
                          ? `border-l-2 ${theme === "classic-light" ? "border-l-[#009c3b]" : "border-l-[#00e476]"}`
                          : status === "eliminated"
                          ? "border-l-2 border-l-red-500"
                          : isQualifying
                          ? `border-l-2 ${qualifiedClasses}`
                          : "border-l-2 border-l-transparent";
                      const rowTitle =
                        status === "qualified"
                          ? "Classificado matematicamente para o mata-mata"
                          : status === "eliminated"
                          ? "Eliminado da fase de grupos"
                          : undefined;
                      const note =
                        status === "qualified"
                          ? computeQualificationNote(row.code, rows, liveMatches)
                          : status === "eliminated"
                          ? computeEliminationNote(row.code, rows, liveMatches)
                          : index < 2 && status === "contention"
                          ? computeContentionNote(row.code, rows, liveMatches)
                          : null;
                      const tooltipKey = `${group}-${row.code}`;
                      const isTooltipOpen = openTooltip?.key === tooltipKey;
                      return (
                        <tr
                          key={row.id}
                          id={`standings-row-${row.code.toLowerCase()}`}
                          title={rowTitle}
                          className={`border-b last:border-b-0 ${rowBorderClasses} ${rowLeftBorder} ${
                            status === "eliminated" ? "opacity-60" : ""
                          } ${
                            status === "qualified"
                              ? theme === "classic-light"
                                ? "bg-emerald-50"
                                : "bg-[#00e476]/[0.06]"
                              : status === "eliminated"
                              ? theme === "classic-light"
                                ? "bg-red-50"
                                : "bg-red-500/[0.05]"
                              : ""
                          }`}
                        >
                          <td className="py-1.5 pl-1 text-center font-mono text-[9px]">
                            {note ? (
                              <button
                                type="button"
                                title={note}
                                aria-label={note}
                                aria-expanded={isTooltipOpen}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isTooltipOpen) {
                                    setOpenTooltip(null);
                                  } else {
                                    openTooltipAt(tooltipKey, note, e.currentTarget);
                                  }
                                }}
                                className={
                                  status === "qualified"
                                    ? `inline-flex items-center justify-center w-[14px] h-[14px] rounded-full text-[8px] font-bold cursor-help ${
                                        theme === "classic-light"
                                          ? "bg-[#009c3b] text-white"
                                          : "bg-[#00e476] text-black"
                                      }`
                                    : status === "eliminated"
                                    ? "inline-flex items-center justify-center w-[14px] h-[14px] rounded-full text-[8px] font-bold cursor-help bg-red-500 text-white"
                                    : `cursor-help underline decoration-dotted underline-offset-2 ${mutedClasses}`
                                }
                                data-testid={`standings-note-trigger-${row.code.toLowerCase()}`}
                              >
                                {status === "qualified" ? "✓" : status === "eliminated" ? "✕" : index + 1}
                              </button>
                            ) : (
                              <span className={mutedClasses}>{index + 1}</span>
                            )}
                          </td>
                          <td className={`whitespace-nowrap py-1.5 pl-2 font-archivo ${headingClasses}`}>
                            <div className="flex items-center gap-2">
                              <FlagIcon
                                flag={row.flagSvg}
                                className="h-4 w-6"
                                onClick={() => onSelectTeamLineup(row)}
                              />
                              <span title={row.name}>{row.code}</span>
                            </div>
                          </td>
                          {COLUMNS.map((col) => (
                            <td
                              key={col.key}
                              id={`standings-cell-${row.code.toLowerCase()}-${col.key}`}
                              className={`whitespace-nowrap px-1 py-1.5 text-right ${
                                col.key === "points"
                                  ? `font-bold text-sm ${ptsCellColor}`
                                  : col.key === "goalDifference"
                                    ? `font-semibold ${isQualifying ? ptsCellColor : mutedClasses}`
                                    : mutedClasses
                              }`}
                            >
                              {row[col.key]}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {(() => {
                const letter = group.match(/Grupo ([A-L])/)?.[1];
                const analysis = letter ? GROUP_ANALYSIS_BY_LETTER[letter] : undefined;
                if (!analysis) return null;
                // Up to date when the analysis was authored at/after the group's
                // most recent finished match (live-polled statuses).
                const groupLastFinished = lastFinishedKickoff(
                  liveMatches.filter(
                    (m) => groupCodes.has(m.teamA.code) && groupCodes.has(m.teamB.code),
                  ),
                );
                const groupUpToDate = isAnalysisUpToDate(analysis.updatedAt, groupLastFinished);
                return (
                  <details
                    className={`group mt-4 border-t pt-3 ${rowBorderClasses}`}
                    id={`standings-group-analysis-${groupSlug(group)}`}
                    data-testid={`group-analysis-${groupSlug(group)}`}
                  >
                    <summary
                      className={`flex cursor-pointer list-none items-center justify-between gap-2 font-anton text-sm uppercase tracking-wide ${headingClasses} [&::-webkit-details-marker]:hidden`}
                    >
                      <span className="flex items-center gap-2">
                        Análise do grupo
                        <AnalysisFreshnessBadge
                          upToDate={groupUpToDate}
                          theme={theme}
                          testId={`group-analysis-freshness-${groupSlug(group)}`}
                        />
                      </span>
                      <span
                        aria-hidden="true"
                        className={`font-mono text-[10px] transition-transform group-open:rotate-180 ${mutedClasses}`}
                      >
                        ▾
                      </span>
                    </summary>
                    <div className="mt-2 space-y-2">
                      {parseNoteSections(analysis.text).map((section) => (
                        <div key={section.label}>
                          <p className={`font-mono text-[9px] uppercase tracking-wider ${mutedClasses}`}>
                            {section.label}
                          </p>
                          <p className={`mt-0.5 font-archivo text-xs leading-5 ${headingClasses}`}>
                            {section.body}
                          </p>
                        </div>
                      ))}
                    </div>
                    {formatAnalysisTimestamp(analysis.updatedAt) && (
                      <p
                        className={`mt-3 font-mono text-[9px] uppercase tracking-wider ${mutedClasses}`}
                        data-testid={`group-analysis-updated-${groupSlug(group)}`}
                      >
                        {formatAnalysisTimestamp(analysis.updatedAt)}
                      </p>
                    )}
                  </details>
                );
              })()}

              <GroupMatchHistory
                matches={liveMatches.filter(
                  (m) => groupCodes.has(m.teamA.code) && groupCodes.has(m.teamB.code),
                )}
                theme={theme}
                slug={groupSlug(group)}
                onSelectTeamLineup={onSelectTeamLineup}
              />
            </div>
          );
        })}
      </div>

      <ThirdPlaceTable
        groups={groups}
        theme={theme}
        onSelectTeamLineup={onSelectTeamLineup}
      />

      {openTooltip && (
        <div
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
          style={{
            left: openTooltip.left,
            ...(openTooltip.top !== undefined ? { top: openTooltip.top } : {}),
            ...(openTooltip.bottom !== undefined ? { bottom: openTooltip.bottom } : {}),
          }}
          className={`fixed z-50 w-52 max-w-[calc(100vw-16px)] rounded-lg border p-2.5 text-left font-mono text-[10px] normal-case leading-relaxed tracking-normal shadow-lg ${
            theme === "classic-light"
              ? "border-slate-200 bg-white text-slate-700"
              : "border-white/15 bg-[#1a1c1c] text-slate-200"
          }`}
          data-testid="standings-note-popover"
        >
          {openTooltip.note}
        </div>
      )}
    </div>
  );
}

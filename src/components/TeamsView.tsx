import { useEffect, useMemo, useState } from "react";
import type { Match, TeamRef } from "../types";
import { computeStandings, groupStandings, rankBestThirds } from "../standings";
import { FlagIcon } from "./FlagIcon";

interface TeamsViewProps {
  matches: Match[];
  theme: "classic-light" | "stadium-dark";
  onSelectTeamLineup: (team: TeamRef) => void;
}

interface LiveState {
  status: string;
  score?: { teamA: number; teamB: number };
}

export function TeamsView({ matches, theme, onSelectTeamLineup }: TeamsViewProps) {
  const [liveStates, setLiveStates] = useState<Record<string, LiveState>>({});

  // Poll live match states so qualification/elimination here matches the Grupos
  // view (which merges the same /api/match-states feed). Without this, the raw
  // `matches` prop can be stale and a clinched team (e.g. USA) would miss its
  // badge even though Grupos shows it qualified.
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

  // Cross-group ranking of every group's 3rd-placed team — the 8 best advance
  // (Art. 12.5). Keyed by team code → whether it currently sits inside the
  // qualifying eight. Mirrors StandingsView so both views agree on a 3rd-placed
  // team's fate.
  const bestThirdsQualifies = useMemo(() => {
    const ranked = rankBestThirds(groups);
    return new Map(ranked.map((third) => [third.row.code, third.qualifies]));
  }, [groups]);

  // The best-thirds cut is only DEFINED once all 12 groups have finished (all 12
  // third-placed teams are known). Until then a 3rd-placed team's badge stays
  // pending — it can't yet be resolved to qualified/eliminated.
  const allGroupsFinished = useMemo(
    () =>
      groups.every(({ rows }) => {
        const codes = new Set(rows.map((r) => r.code));
        const groupMatches = liveMatches.filter(
          (m) => codes.has(m.teamA.code) && codes.has(m.teamB.code),
        );
        return groupMatches.length > 0 && groupMatches.every((m) => m.status === "FINISHED");
      }),
    [groups, liveMatches],
  );

  const cardClasses =
    theme === "classic-light"
      ? "bg-white border-slate-200 shadow-sm"
      : "bg-[#121414] border-white/10";
  const headingClasses = theme === "classic-light" ? "text-slate-900" : "text-white";
  const mutedClasses = theme === "classic-light" ? "text-slate-600" : "text-slate-300";

  return (
    <div className="mx-auto mt-8 max-w-7xl px-4 2xl:max-w-[1600px]" id="teams-view">
      <h2
        className={`font-anton text-2xl md:text-3xl uppercase tracking-wider ${headingClasses}`}
        id="teams-view-title"
      >
        Seleções
      </h2>
      <p className={`mt-1 mb-6 font-mono text-[11px] uppercase tracking-wider ${mutedClasses}`}>
        Todas as 48 seleções da Copa com acesso direto ao painel completo de cada equipe • <span className={theme === "classic-light" ? "text-[#065f2c]" : "text-[#00e476]"}>✓ Classificada</span> = vaga garantida no mata-mata • <span className={theme === "classic-light" ? "text-rose-700" : "text-rose-300"}>✕ Eliminada</span> = sem chances de classificação
      </p>

      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 2xl:grid-cols-4"
        id="teams-groups-grid"
      >
        {groups.map(({ group, rows, qualification }) => (
          <section
            key={group}
            id={`teams-group-${group.replace(/\s+/g, "-").toLowerCase()}`}
            className={`rounded-2xl border p-4 ${cardClasses}`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className={`font-anton text-lg uppercase tracking-wide ${headingClasses}`}>
                {group}
              </h3>
              <span className={`font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                {rows.length} seleções
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {rows.map((team, index) => {
                // A 3rd-placed team in a finished group is decided by the
                // cross-group best-thirds ranking once every group is done: the 8
                // best advance, the rest are eliminated. The per-group
                // qualification reports "contention" here (it can't see other
                // groups), so resolve it — matching the Grupos view.
                const isResolvedBestThird = index === 2 && allGroupsFinished && bestThirdsQualifies.has(team.code);
                const status = isResolvedBestThird
                  ? bestThirdsQualifies.get(team.code)
                    ? "qualified"
                    : "eliminated"
                  : qualification.get(team.code);
                const isQualified = status === "qualified";
                const isEliminated = status === "eliminated";

                return (
                  <button
                    key={team.id}
                    id={`btn-team-card-${team.code.toLowerCase()}`}
                    type="button"
                    onClick={() => onSelectTeamLineup(team)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                      theme === "classic-light"
                        ? "border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white"
                        : "border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white p-2">
                      <FlagIcon flag={team.flagSvg} className="h-full w-full object-contain" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={`truncate font-anton text-sm uppercase tracking-wide ${headingClasses}`}>
                        {team.name}
                      </p>
                      <p className={`mt-1 font-archivo text-sm ${mutedClasses}`}>
                        {team.code} • {team.points} pt{team.points === 1 ? "" : "s"} • {team.played} jogo{team.played === 1 ? "" : "s"}
                      </p>
                    </div>

                    {isQualified && (
                      <span
                        data-testid={`team-qualified-${team.code.toLowerCase()}`}
                        title="Classificada para o mata-mata"
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
                          theme === "classic-light"
                            ? "border-[#009c3b]/30 bg-[#009c3b]/10 text-[#065f2c]"
                            : "border-[#00e476]/25 bg-[#00e476]/10 text-[#00e476]"
                        }`}
                      >
                        <span aria-hidden="true">✓</span> Classificada
                      </span>
                    )}

                    {isEliminated && (
                      <span
                        data-testid={`team-eliminated-${team.code.toLowerCase()}`}
                        title="Sem chances de classificação para o mata-mata"
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
                          theme === "classic-light"
                            ? "border-rose-300 bg-rose-50 text-rose-700"
                            : "border-rose-400/30 bg-rose-500/10 text-rose-300"
                        }`}
                      >
                        <span aria-hidden="true">✕</span> Eliminada
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

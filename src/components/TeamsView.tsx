import { useEffect, useMemo, useState } from "react";
import type { Match, TeamRef } from "../types";
import { apiUrl, useT } from "../i18n";
import { computeStandings, groupStandings, rankBestThirds } from "../standings";
import { buildTeamResultHistory, getTeamTournamentStatus } from "../utils/teamTournamentStatus";
import type { TeamStatusTone } from "../utils/teamTournamentStatus";
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
  const t = useT();
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
        const res = await fetch(apiUrl("/api/match-states"));
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

  // Badge palette, mirroring the team-page tournament-status pill: rose = out,
  // amber = champion, green = still alive / advanced.
  const toneClasses = (tone: TeamStatusTone) => {
    if (tone === "eliminated")
      return theme === "classic-light"
        ? "border-rose-300 bg-rose-50 text-rose-700"
        : "border-rose-400/30 bg-rose-500/10 text-rose-300";
    if (tone === "champion")
      return theme === "classic-light"
        ? "border-amber-300 bg-amber-50 text-amber-700"
        : "border-amber-400/30 bg-amber-400/10 text-amber-300";
    return theme === "classic-light"
      ? "border-[#009c3b]/30 bg-[#009c3b]/10 text-[#065f2c]"
      : "border-[#00e476]/25 bg-[#00e476]/10 text-[#00e476]";
  };

  return (
    <div className="mx-auto mt-8 max-w-7xl px-4 2xl:max-w-[1600px]" id="teams-view">
      <h2
        className={`font-anton text-2xl md:text-3xl uppercase tracking-wider ${headingClasses}`}
        id="teams-view-title"
      >
        {t("teams.title")}
      </h2>
      <p className={`mt-1 mb-6 font-mono text-[11px] uppercase tracking-wider ${mutedClasses}`}>
        {t("teams.subtitle")} • <span className={theme === "classic-light" ? "text-[#065f2c]" : "text-[#00e476]"}>{t("teams.legendQualified")}</span> = {t("teams.legendQualifiedDesc")} • <span className={theme === "classic-light" ? "text-rose-700" : "text-rose-300"}>{t("teams.legendEliminated")}</span> = {t("teams.legendEliminatedDesc")}
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
                {t("teams.groupTeamCount", { count: rows.length })}
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

                // Show the CURRENT stage the team reached — the round it advanced
                // to or was knocked out in, from its real knockout results —
                // instead of the group-only qualified/eliminated verdict the
                // Grupos view already carries. getTeamTournamentStatus reads only
                // the knockout ties (it's given no groupStageComplete flag, so it
                // never declares group elimination itself — that needs the
                // cross-group best-thirds cut, resolved above as `status`). When
                // the team has no knockout tie yet, fall back to that group
                // verdict: eliminated → "na fase de grupos", clinched → generic.
                const koStatus = getTeamTournamentStatus(buildTeamResultHistory(team.code, liveMatches));
                const progress =
                  koStatus ??
                  (status === "eliminated"
                    ? { label: t("utils.eliminatedGroupStage"), tone: "eliminated" as const }
                    : status === "qualified"
                      ? { label: t("teams.qualifiedBadge"), tone: "advanced" as const }
                      : null);

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
                        {t(team.points === 1 ? "teams.teamStatsOne" : "teams.teamStatsMany", {
                          code: team.code,
                          points: team.points,
                          played: team.played,
                          jogos: t(team.played === 1 ? "teams.gameSingular" : "teams.gamePlural"),
                        })}
                      </p>

                      {progress && (
                        <span
                          data-testid={`team-${progress.tone === "eliminated" ? "eliminated" : "qualified"}-${team.code.toLowerCase()}`}
                          data-status-tone={progress.tone}
                          title={progress.label}
                          className={`mt-2 inline-flex max-w-full items-start gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase leading-tight tracking-wider ${toneClasses(progress.tone)}`}
                        >
                          <span aria-hidden="true">{progress.tone === "eliminated" ? "✕" : "✓"}</span>
                          <span className="whitespace-normal">{progress.label}</span>
                        </span>
                      )}
                    </div>
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

import { useMemo } from "react";
import type { Match, TeamRef } from "../types";
import { computeStandings, groupStandings } from "../standings";
import { FlagIcon } from "./FlagIcon";

interface TeamsViewProps {
  matches: Match[];
  theme: "classic-light" | "stadium-dark";
  onSelectTeamLineup: (team: TeamRef) => void;
}

export function TeamsView({ matches, theme, onSelectTeamLineup }: TeamsViewProps) {
  const groups = useMemo(() => groupStandings(computeStandings(matches)), [matches]);

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
        Todas as 48 seleções da Copa com acesso direto ao painel completo de cada equipe
      </p>

      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 2xl:grid-cols-4"
        id="teams-groups-grid"
      >
        {groups.map(({ group, rows }) => (
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
              {rows.map((team) => (
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
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

import { useMemo } from "react";
import type { Match } from "../types";
import { computeStandings, groupStandings } from "../standings";
import { FlagIcon } from "./FlagIcon";

interface StandingsViewProps {
  matches: Match[];
  theme: "classic-light" | "stadium-dark";
}

const COLUMNS = [
  { key: "played", label: "J" },
  { key: "won", label: "V" },
  { key: "drawn", label: "E" },
  { key: "lost", label: "D" },
  { key: "goalsFor", label: "GF" },
  { key: "goalsAgainst", label: "GA" },
  { key: "goalDifference", label: "SG" },
  { key: "points", label: "PTS" },
] as const;

const groupSlug = (group: string) => group.replace(/\s+/g, "-").toLowerCase();

export function StandingsView({ matches, theme }: StandingsViewProps) {
  const groups = useMemo(() => groupStandings(computeStandings(matches)), [matches]);

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

  return (
    <div className="mx-auto mt-8 max-w-7xl px-4 2xl:max-w-[1600px]" id="standings-view">
      <h2
        className={`font-anton text-2xl md:text-3xl uppercase tracking-wider ${headingClasses}`}
        id="standings-title"
      >
        Tabela de Classificação
      </h2>
      <p className={`mt-1 mb-6 font-mono text-[11px] uppercase tracking-wider ${mutedClasses}`}>
        Fase de grupos • 12 chaves de 4 seleções
      </p>

      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 2xl:grid-cols-4"
        id="standings-grid"
      >
        {groups.map(({ group, rows }) => {
          const seedCount = rows.filter((row) => row.dataSource === "seed").length;

          return (
            <div
              key={group}
              id={`standings-group-${groupSlug(group)}`}
              className={`rounded-2xl border p-4 ${cardClasses}`}
            >
              <h3
                className={`font-anton text-lg uppercase tracking-wide ${headingClasses}`}
              >
                {group}
              </h3>

              {seedCount === rows.length ? (
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
                <table className="min-w-[420px] w-full font-mono text-[11px] sm:text-xs">
                  <thead>
                    <tr className={`border-b ${rowBorderClasses}`}>
                      <th className={`py-1.5 text-left font-normal uppercase tracking-wider ${headerCellClasses}`}>
                        Equipe
                      </th>
                      {COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          className={`px-1 py-1.5 text-right font-normal uppercase tracking-wider ${headerCellClasses}`}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr
                        key={row.id}
                        id={`standings-row-${row.code.toLowerCase()}`}
                        className={`border-b last:border-b-0 ${rowBorderClasses} ${
                          index < 2 ? `border-l-2 ${qualifiedClasses}` : ""
                        }`}
                      >
                        <td className={`whitespace-nowrap py-1.5 pl-2 font-archivo ${headingClasses}`}>
                          <div className="flex items-center gap-2">
                            <FlagIcon flag={row.flagSvg} className="h-4 w-6" />
                            <span title={row.name}>{row.code}</span>
                          </div>
                        </td>
                        {COLUMNS.map((col) => (
                          <td
                            key={col.key}
                            id={`standings-cell-${row.code.toLowerCase()}-${col.key}`}
                            className={`whitespace-nowrap px-1 py-1.5 text-right ${
                              col.key === "points" ? `font-bold ${headingClasses}` : mutedClasses
                            }`}
                          >
                            {row[col.key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

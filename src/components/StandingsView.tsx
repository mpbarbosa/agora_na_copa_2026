import { useMemo } from "react";
import { computeStandings, groupStandings } from "../standings";
import { FlagIcon } from "./FlagIcon";

interface StandingsViewProps {
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

export function StandingsView({ theme }: StandingsViewProps) {
  const groups = useMemo(() => groupStandings(computeStandings()), []);

  const cardClasses =
    theme === "classic-light"
      ? "bg-white border-slate-200 shadow-sm"
      : "bg-[#121414] border-white/10";
  const headingClasses = theme === "classic-light" ? "text-slate-900" : "text-white";
  const mutedClasses = theme === "classic-light" ? "text-slate-500" : "text-slate-300";
  const headerCellClasses = theme === "classic-light" ? "text-slate-400" : "text-slate-500";
  const rowBorderClasses = theme === "classic-light" ? "border-slate-100" : "border-white/5";
  const qualifiedClasses =
    theme === "classic-light"
      ? "border-l-[#10b981]"
      : "border-l-[#00ff85]";

  return (
    <div className="max-w-7xl mx-auto px-4 mt-8" id="standings-view">
      <h2
        className={`font-anton text-2xl md:text-3xl uppercase tracking-wider ${headingClasses}`}
        id="standings-title"
      >
        Tabela de Classificação
      </h2>
      <p className={`mt-1 mb-6 font-mono text-[11px] uppercase tracking-wider ${mutedClasses}`}>
        Fase de grupos • 12 chaves de 4 seleções
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
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

              <table className="w-full font-mono text-xs">
                <thead>
                  <tr className={`border-b ${rowBorderClasses}`}>
                    <th className={`text-left font-normal uppercase tracking-wider py-1.5 ${headerCellClasses}`}>
                      Equipe
                    </th>
                    {COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className={`text-right font-normal uppercase tracking-wider py-1.5 px-1 ${headerCellClasses}`}
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
                      <td className={`py-1.5 pl-2 font-archivo ${headingClasses}`}>
                        <div className="flex items-center gap-2">
                          <FlagIcon flag={row.flagSvg} className="w-6 h-4" />
                          <span title={row.name}>{row.code}</span>
                        </div>
                      </td>
                      {COLUMNS.map((col) => (
                        <td
                          key={col.key}
                          className={`text-right py-1.5 px-1 ${
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
          );
        })}
      </div>
    </div>
  );
}

import type { StandingsRow, TeamRef } from "../types";
import { rankBestThirds } from "../standings";
import { FlagIcon } from "./FlagIcon";

interface ThirdPlaceTableProps {
  groups: { group: string; rows: StandingsRow[] }[];
  theme: "classic-light" | "stadium-dark";
  onSelectTeamLineup: (team: TeamRef) => void;
}

const QUALIFYING_SLOTS = 8;

// Cross-group ranking of the 12 third-placed teams. The best 8 provisionally
// advance to the Round of 32 (FIFA WC 2026 Art. 12.5); ranking criteria are
// points → goal difference → goals for → fair play (Art. 13), shared with the
// group tables and the bracket via rankBestThirds.
export function ThirdPlaceTable({ groups, theme, onSelectTeamLineup }: ThirdPlaceTableProps) {
  const ranked = rankBestThirds(groups);

  // Nothing meaningful to rank until at least one group-stage result exists —
  // an all-seed ranking would just be noise.
  const hasResults = groups.some((g) => g.rows.some((r) => r.dataSource === "result"));
  if (ranked.length === 0 || !hasResults) return null;

  const isLight = theme === "classic-light";
  const cardClasses = isLight
    ? "bg-white border-slate-200 shadow-sm"
    : "bg-[#121414] border-white/10";
  const headingClasses = isLight ? "text-slate-900" : "text-white";
  const mutedClasses = isLight ? "text-slate-600" : "text-slate-300";
  const headerCellClasses = isLight ? "text-slate-500" : "text-slate-400";
  const rowBorderClasses = isLight ? "border-slate-100" : "border-white/5";
  const accent = isLight ? "text-[#009c3b]" : "text-[#00e476]";
  const cutLineClasses = isLight ? "border-[#009c3b]/40" : "border-[#00e476]/40";

  return (
    <section
      className={`mt-8 rounded-2xl border p-4 sm:p-5 ${cardClasses}`}
      id="third-place-ranking"
      data-testid="third-place-ranking"
    >
      <h3 className={`font-anton text-lg uppercase tracking-wide ${headingClasses}`}>
        Melhores 3º colocados
      </h3>
      <p className={`mt-1 mb-4 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
        8 das 12 chaves avançam pelo 3º lugar · ranking provisório
      </p>

      <div className="-mx-1 overflow-x-auto pb-1">
        <table className="w-full font-mono text-[11px] sm:text-xs">
          <thead>
            <tr className={`border-b ${rowBorderClasses}`}>
              <th className={`w-6 py-1.5 text-left font-normal uppercase tracking-wider ${headerCellClasses}`}>
                #
              </th>
              <th className={`w-8 py-1.5 text-left font-normal uppercase tracking-wider ${headerCellClasses}`}>
                Gr.
              </th>
              <th className={`py-1.5 text-left font-normal uppercase tracking-wider ${headerCellClasses}`}>
                Equipe
              </th>
              <th
                className={`px-1 py-1.5 text-right font-normal uppercase tracking-wider ${headerCellClasses}`}
                title="Jogos disputados (encerrados + em andamento)"
              >
                J
              </th>
              <th className={`px-1 py-1.5 text-right font-normal uppercase tracking-wider font-bold ${headingClasses}`}>
                PTS
              </th>
              <th className={`px-1 py-1.5 text-right font-normal uppercase tracking-wider ${headerCellClasses}`}>
                SG
              </th>
              <th className={`px-1 py-1.5 text-right font-normal uppercase tracking-wider ${headerCellClasses}`}>
                GF
              </th>
              <th
                className={`px-1 py-1.5 text-right font-normal uppercase tracking-wider ${headerCellClasses}`}
                title="Fair play (Art. 13.2f): −1 amarelo, −3 segundo amarelo, −4 vermelho direto"
              >
                FP
              </th>
            </tr>
          </thead>
          <tbody>
            {ranked.map(({ row, groupLetter, qualifies }, index) => {
              const isCutLine = index === QUALIFYING_SLOTS;
              return (
                <tr
                  key={row.id}
                  id={`third-place-row-${row.code.toLowerCase()}`}
                  data-qualifies={qualifies ? "true" : "false"}
                  className={`border-b last:border-b-0 ${rowBorderClasses} ${
                    isCutLine ? `border-t-2 ${cutLineClasses}` : ""
                  } ${
                    qualifies
                      ? isLight
                        ? "bg-emerald-50"
                        : "bg-[#00e476]/[0.06]"
                      : "opacity-60"
                  }`}
                >
                  <td className={`py-1.5 pl-1 text-center ${qualifies ? accent : mutedClasses}`}>
                    {index + 1}
                  </td>
                  <td className={`py-1.5 font-bold ${headingClasses}`}>{groupLetter}</td>
                  <td className={`whitespace-nowrap py-1.5 pl-1 font-archivo ${headingClasses}`}>
                    <div className="flex items-center gap-2">
                      <FlagIcon
                        flag={row.flagSvg}
                        className="h-4 w-6"
                        onClick={() => onSelectTeamLineup(row)}
                      />
                      <span title={row.name}>{row.code}</span>
                    </div>
                  </td>
                  <td className={`whitespace-nowrap px-1 py-1.5 text-right ${mutedClasses}`}>
                    {row.played}
                  </td>
                  <td className={`whitespace-nowrap px-1 py-1.5 text-right font-bold text-sm ${qualifies ? accent : headingClasses}`}>
                    {row.points}
                  </td>
                  <td className={`whitespace-nowrap px-1 py-1.5 text-right font-semibold ${mutedClasses}`}>
                    {row.goalDifference}
                  </td>
                  <td className={`whitespace-nowrap px-1 py-1.5 text-right ${mutedClasses}`}>
                    {row.goalsFor}
                  </td>
                  <td className={`whitespace-nowrap px-1 py-1.5 text-right ${mutedClasses}`}>
                    {row.fairPlayPoints}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className={`mt-3 font-mono text-[9px] uppercase tracking-wider leading-relaxed ${mutedClasses}`}>
        A linha verde marca o corte dos 8 classificados. A alocação oficial de cada 3º
        colocado às chaves do mata-mata só é definida ao fim da fase de grupos.
      </p>
    </section>
  );
}

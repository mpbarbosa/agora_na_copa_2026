import { useEffect, useState } from "react";
import type { StandingsRow, TeamRef } from "../types";
import { rankBestThirds } from "../standings";
import { FlagIcon } from "./FlagIcon";

interface ThirdPlaceTableProps {
  groups: { group: string; rows: StandingsRow[] }[];
  theme: "classic-light" | "stadium-dark";
  onSelectTeamLineup: (team: TeamRef) => void;
}

const QUALIFYING_SLOTS = 8;

// Simulated probability (0..1) of reaching the Round of 32, as a compact percent.
function formatChance(advance: number | undefined): string {
  return typeof advance === "number" ? `${Math.round(advance * 100)}%` : "—";
}

// A team is treated as a lock for the Round of 32 once its simulated odds round
// to 100% — every sampled scenario keeps it among the eight best thirds.
function isGuaranteed(advance: number | undefined): boolean {
  return typeof advance === "number" && Math.round(advance * 100) >= 100;
}

// A team is treated as eliminated once its simulated odds round to 0% — no sampled
// scenario keeps it among the eight best thirds.
function isEliminated(advance: number | undefined): boolean {
  return typeof advance === "number" && Math.round(advance * 100) <= 0;
}

// Hover explanation of a third-placed team's run at the eight best-third slots:
// where it ranks among the 12 thirds, whether it sits inside the provisional cut,
// and its simulated odds. Teams still in contention get the "na briga" framing;
// locks and eliminated teams get a definitive line. Falls back to rank-only until
// the simulated chance loads.
function buildThirdTooltip(
  name: string,
  rankAmongThirds: number,
  qualifies: boolean,
  advance: number | undefined,
  guaranteed: boolean,
): string {
  const ord = `${rankAmongThirds}º melhor 3º colocado`;
  if (advance === undefined) return `${name} · ${ord}`;
  const pct = Math.round(advance * 100);
  if (guaranteed) return `${name} · ${ord} — classificação ao mata-mata garantida.`;
  if (pct <= 0) return `${name} · ${ord} — eliminado: sem cenários de ficar entre os 8 melhores 3ºs.`;
  if (qualifies)
    return `${name} · ${ord} — dentro do corte provisório dos 8, mas sem vaga garantida (${pct}% nas simulações).`;
  return `${name} · ${ord} — fora do corte provisório dos 8, mas ainda na briga (${pct}% nas simulações).`;
}

// Cross-group ranking of the 12 third-placed teams. The best 8 provisionally
// advance to the Round of 32 (FIFA WC 2026 Art. 12.5); ranking criteria are
// points → goal difference → goals for → fair play (Art. 13), shared with the
// group tables and the bracket via rankBestThirds.
export function ThirdPlaceTable({ groups, theme, onSelectTeamLineup }: ThirdPlaceTableProps) {
  const ranked = rankBestThirds(groups);
  const codesKey = ranked.map((third) => third.row.code).join(",");

  // Simulated Round-of-32 odds per ranked team, fetched from /api/qualification-odds
  // (Monte-Carlo, server-cached). Best-effort: on any failure the cells fall back to
  // "—" and the rest of the table is unaffected.
  const [chanceByCode, setChanceByCode] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    const codes = codesKey ? codesKey.split(",") : [];
    if (codes.length === 0) {
      setChanceByCode(new Map());
      return;
    }
    let active = true;
    void Promise.all(
      codes.map(async (code) => {
        try {
          const res = await fetch(`/api/qualification-odds/${encodeURIComponent(code)}`);
          if (!res.ok) return null;
          const body = (await res.json()) as { odds?: { advance?: unknown } };
          const advance = body?.odds?.advance;
          return typeof advance === "number" ? ([code, advance] as const) : null;
        } catch {
          return null;
        }
      }),
    ).then((entries) => {
      if (!active) return;
      setChanceByCode(new Map(entries.filter((e): e is readonly [string, number] => e !== null)));
    });
    return () => {
      active = false;
    };
  }, [codesKey]);

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
                title="Probabilidade simulada (Monte Carlo) de avançar ao mata-mata"
              >
                Chance
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
              const advance = chanceByCode.get(row.code);
              const guaranteed = isGuaranteed(advance);
              const eliminated = isEliminated(advance);
              return (
                <tr
                  key={row.id}
                  id={`third-place-row-${row.code.toLowerCase()}`}
                  data-qualifies={qualifies ? "true" : "false"}
                  data-guaranteed={guaranteed ? "true" : "false"}
                  data-eliminated={eliminated ? "true" : "false"}
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
                      <span title={buildThirdTooltip(row.name, index + 1, qualifies, advance, guaranteed)}>
                        {row.code}
                      </span>
                      {guaranteed && (
                        <span
                          className={`rounded px-1 text-[9px] font-bold uppercase tracking-wider ${
                            isLight ? "bg-[#009c3b] text-white" : "bg-[#00e476] text-black"
                          }`}
                          title="Classificação garantida ao mata-mata (100% nas simulações)"
                          aria-label="Classificação garantida"
                        >
                          ✓
                        </span>
                      )}
                      {eliminated && (
                        <span
                          className={`rounded px-1 text-[9px] font-bold uppercase tracking-wider ${
                            isLight ? "bg-[#9f1239] text-white" : "bg-[#ff879d] text-black"
                          }`}
                          title="Eliminado: 0% de chance de ficar entre os 8 melhores 3ºs"
                          aria-label="Eliminado"
                        >
                          ✕
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    className={`whitespace-nowrap px-1 py-1.5 text-right font-semibold ${
                      qualifies ? accent : mutedClasses
                    }`}
                    title="Probabilidade simulada de avançar ao mata-mata"
                  >
                    {formatChance(advance)}
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
        A linha verde marca o corte dos 8 classificados. A coluna Chance é uma
        probabilidade simulada (Monte Carlo) de avançar ao mata-mata — palpite para a
        torcida, não cravada de resultado. A alocação oficial de cada 3º colocado às
        chaves do mata-mata só é definida ao fim da fase de grupos.
      </p>
    </section>
  );
}

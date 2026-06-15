import { useMemo, useState } from "react";
import { Trophy, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { bracket as baseBracket } from "../data/tournament";
import type { BracketNode } from "../types";

interface BracketViewProps {
  theme: "classic-light" | "stadium-dark";
}

type BracketSlot = "A" | "B";
type SelectionMap = Partial<Record<string, BracketSlot>>;

const STAGES: BracketNode["stage"][] = ["R32", "R16", "QF", "SF", "F"];

const STAGE_LABELS: Record<BracketNode["stage"], string> = {
  R32: "16 Avos",
  R16: "Oitavas",
  QF: "Quartas",
  SF: "Semifinais",
  F: "Final",
};

function matchNumber(matchId: string) {
  return Number.parseInt(matchId.split("-")[1], 10);
}

function cloneBracket(): BracketNode[] {
  return baseBracket.map((node) => ({ ...node }));
}

function getSlotLabel(node: BracketNode, slot: BracketSlot) {
  if (slot === "A") {
    return node.teamA?.name ?? node.placeholderA;
  }

  return node.teamB?.name ?? node.placeholderB;
}

function getAdvancingSlot(matchId: string): BracketSlot {
  return matchNumber(matchId) % 2 === 1 ? "A" : "B";
}

function getStageNodes(nodes: BracketNode[], stage: BracketNode["stage"]) {
  return nodes
    .filter((node) => node.stage === stage)
    .sort((a, b) => matchNumber(a.id) - matchNumber(b.id));
}

function getDescendantSelectionIds(matchId: string) {
  const ids: string[] = [];
  let currentId = baseBracket.find((node) => node.id === matchId)?.nextMatchId;

  while (currentId) {
    ids.push(currentId);
    currentId = baseBracket.find((node) => node.id === currentId)?.nextMatchId;
  }

  return ids;
}

function deriveBracket(selections: SelectionMap) {
  const nodes = cloneBracket();
  const byId = new Map(nodes.map((node) => [node.id, node]));

  for (const stage of STAGES) {
    const stageNodes = getStageNodes(nodes, stage);

    for (const node of stageNodes) {
      const winner = selections[node.id];
      node.winner = winner;

      if (!winner || !node.nextMatchId) {
        continue;
      }

      const target = byId.get(node.nextMatchId);
      const label = getSlotLabel(node, winner);
      if (!target || !label) {
        continue;
      }

      const targetSlot = getAdvancingSlot(node.id);
      if (targetSlot === "A") {
        target.placeholderA = label;
      } else {
        target.placeholderB = label;
      }
    }
  }

  return nodes;
}

export function BracketView({ theme }: BracketViewProps) {
  const [selections, setSelections] = useState<SelectionMap>({});

  const nodes = useMemo(() => deriveBracket(selections), [selections]);
  const finalNode = nodes.find((node) => node.id === "F-1");
  const championSlot = selections["F-1"];
  const championLabel = finalNode && championSlot ? getSlotLabel(finalNode, championSlot) : null;

  const shellClasses =
    theme === "classic-light"
      ? "bg-white border-slate-200 shadow-sm"
      : "bg-[#121414] border-white/10";
  const stageClasses =
    theme === "classic-light"
      ? "bg-slate-50 border-slate-200"
      : "bg-white/5 border-white/10";
  const matchClasses =
    theme === "classic-light"
      ? "bg-white border-slate-200"
      : "bg-[#161919] border-white/10";
  const headingClasses = theme === "classic-light" ? "text-slate-900" : "text-white";
  const mutedClasses = theme === "classic-light" ? "text-slate-600" : "text-slate-300";
  const subtleClasses = theme === "classic-light" ? "text-slate-500" : "text-slate-400";
  const activePickClasses =
    theme === "classic-light"
      ? "border-[#009c3b] bg-[#009c3b]/10 text-[#065f2c]"
      : "border-[#00e476] bg-[#00e476]/10 text-[#a7e6bf]";
  const idlePickClasses =
    theme === "classic-light"
      ? "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
      : "border-white/10 bg-white/5 text-slate-100 hover:border-white/20";
  const disabledPickClasses =
    theme === "classic-light"
      ? "border-slate-100 bg-slate-50 text-slate-300"
      : "border-white/5 bg-white/5 text-slate-500";

  const handleAdvance = (matchId: string, slot: BracketSlot) => {
    setSelections((prev) => {
      const next: SelectionMap = { ...prev, [matchId]: slot };

      for (const descendantId of getDescendantSelectionIds(matchId)) {
        delete next[descendantId];
      }

      return next;
    });
  };

  const handleReset = () => {
    setSelections({});
  };

  return (
    <div className="mx-auto mt-8 max-w-7xl px-4 2xl:max-w-[1700px]" id="bracket-view">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2
            className={`font-anton text-2xl md:text-3xl uppercase tracking-wider ${headingClasses}`}
            id="bracket-title"
          >
            Chaveamento do Mata-Mata
          </h2>
          <p className={`mt-1 font-mono text-[11px] uppercase tracking-wider ${mutedClasses}`}>
            Escolhas ficam apenas neste navegador e reiniciam ao recarregar a página
          </p>
        </div>

        <button
          id="bracket-reset-button"
          type="button"
          onClick={handleReset}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition ${
            theme === "classic-light"
              ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              : "border-white/10 bg-white/5 text-slate-100 hover:border-white/20"
          }`}
        >
          <RotateCcw size={14} />
          Reiniciar chaveamento
        </button>
      </div>

      <div
        className={`mt-6 rounded-3xl border p-4 md:p-5 ${shellClasses}`}
        id="bracket-shell"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className={`font-anton text-lg uppercase tracking-wide ${headingClasses}`}>
              Rota até MetLife Stadium
            </p>
            <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
              East Rutherford • final em palco único • progressão manual partida a partida
            </p>
          </div>

          <span
            className={`inline-flex w-full rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider sm:w-auto ${
              theme === "classic-light"
                ? "border-slate-200 bg-slate-50 text-slate-600"
                : "border-white/10 bg-white/5 text-slate-200"
            }`}
            id="bracket-reset-note"
          >
            Estado local • sem persistência
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-5 2xl:gap-5" id="bracket-stage-grid">
          {STAGES.map((stage) => {
            const stageNodes = getStageNodes(nodes, stage);

            return (
              <section
                key={stage}
                id={`bracket-stage-${stage.toLowerCase()}`}
                className={`h-full rounded-3xl border p-4 ${stageClasses}`}
              >
                <div className="mb-4">
                  <h3 className={`font-anton text-lg uppercase tracking-wide ${headingClasses}`}>
                    {STAGE_LABELS[stage]}
                  </h3>
                  <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${subtleClasses}`}>
                    {stage === "F"
                      ? "Grande final em East Rutherford"
                      : `${stageNodes.length} confrontos`}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {stageNodes.map((node) => (
                    <article
                      key={node.id}
                      id={`bracket-match-${node.id}`}
                      className={`rounded-2xl border p-3 ${matchClasses}`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className={`font-mono text-[10px] uppercase tracking-wider ${subtleClasses}`}>
                            {node.id}
                          </p>
                          <p className={`mt-1 font-archivo text-sm ${mutedClasses}`}>
                            Clique no classificado para avançar
                          </p>
                        </div>
                        {stage === "F" ? (
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${
                              theme === "classic-light"
                                ? "border-[#009c3b]/20 bg-[#009c3b]/10 text-[#065f2c]"
                                : "border-[#00e476]/20 bg-[#00e476]/10 text-[#a7e6bf]"
                            }`}
                          >
                            MetLife
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-col gap-2">
                        {(["A", "B"] as const).map((slot) => {
                          const label = getSlotLabel(node, slot);
                          const isActive = node.winner === slot;

                          return (
                            <button
                              key={slot}
                              id={`bracket-pick-${node.id}-${slot.toLowerCase()}`}
                              type="button"
                              disabled={!label}
                              onClick={() => handleAdvance(node.id, slot)}
                              className={`min-h-11 rounded-2xl border px-3 py-3 text-left font-archivo text-sm leading-5 break-words transition ${
                                !label
                                  ? disabledPickClasses
                                  : isActive
                                    ? activePickClasses
                                    : idlePickClasses
                              }`}
                            >
                              {label ?? "Aguardando classificado"}
                            </button>
                          );
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <AnimatePresence>
          {championLabel ? (
            <motion.div
              key={championLabel}
              id="bracket-champion-callout"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className={`mt-6 rounded-3xl border px-5 py-5 ${
                theme === "classic-light"
                  ? "border-[#ffd84d]/50 bg-[#fff7d1]"
                  : "border-[#ffd84d]/25 bg-[#171a1c]"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                      theme === "classic-light"
                        ? "bg-[#ffd84d]/35 text-[#8a5a00]"
                        : "bg-[#ffd84d]/15 text-[#ffd84d]"
                    }`}
                  >
                    <Trophy size={22} />
                  </div>
                  <div>
                    <p className={`font-mono text-[10px] uppercase tracking-[0.22em] ${mutedClasses}`}>
                      Campeão projetado
                    </p>
                    <h3
                      className={`mt-1 font-anton text-2xl uppercase tracking-wide ${headingClasses}`}
                      id="bracket-champion-name"
                    >
                      {championLabel}
                    </h3>
                  </div>
                </div>

                <p className={`font-archivo text-sm leading-6 ${mutedClasses}`}>
                  Escolha local concluída. Reinicie o chaveamento para montar uma nova rota até a final.
                </p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

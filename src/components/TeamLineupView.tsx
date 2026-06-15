import React from "react";
import type { Player, TeamRef } from "../types";
import { FlagIcon } from "./FlagIcon";
import { TeamPitchBoard } from "./TeamPitchBoard";
import { ArrowLeft } from "lucide-react";

interface TeamLineupViewProps {
  team: TeamRef;
  lineup: Player[] | null;
  lineupSource?: "fifa" | "fallback";
  theme: "classic-light" | "stadium-dark";
  onBack: () => void;
}

export const TeamLineupView: React.FC<TeamLineupViewProps> = ({ team, lineup, lineupSource, theme, onBack }) => {
  const cardClasses =
    theme === "classic-light"
      ? "bg-white border-slate-200 shadow-sm"
      : "bg-[#121414] border-white/10";
  const headingClasses = theme === "classic-light" ? "text-slate-900" : "text-white";
  const mutedClasses = theme === "classic-light" ? "text-slate-600" : "text-slate-300";
  const backButtonClasses =
    theme === "classic-light"
      ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
      : "bg-white/10 text-white hover:bg-white/15";

  return (
    <div className="mx-auto mt-8 max-w-7xl px-4 2xl:max-w-[1600px]" id="team-lineup-view">
      <button
        id="btn-team-lineup-back"
        onClick={onBack}
        className={`mb-6 flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest transition ${backButtonClasses}`}
      >
        <ArrowLeft size={14} />
        Voltar
      </button>

      <div className="flex items-center gap-4 mb-6" id="team-lineup-header">
        <div className="w-20 h-14 md:w-24 md:h-16 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden p-2">
          <FlagIcon flag={team.flagSvg} className="w-full h-full object-contain" />
        </div>
        <div>
          <h2 className={`font-anton text-2xl md:text-3xl uppercase tracking-wider ${headingClasses}`} id="team-lineup-title">
            {team.name}
          </h2>
          {team.group && (
            <p className={`mt-1 font-mono text-[11px] uppercase tracking-wider ${mutedClasses}`}>
              Grupo {team.group}
            </p>
          )}
        </div>
      </div>

      {lineup && lineup.length > 0 ? (
        <div className={`p-4 md:p-6 rounded-2xl border ${cardClasses}`} id="team-lineup-board-card">
          {lineupSource && (
            <p
              className={`mb-3 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}
              id="team-lineup-source-note"
            >
              {lineupSource === "fifa"
                ? "Escalação oficial FIFA"
                : "Escalação estimada (dados locais)"}
            </p>
          )}
          <TeamPitchBoard team={{ ...team, lineup }} mirror={false} />
        </div>
      ) : (
        <div
          className={`p-8 rounded-2xl border flex flex-col items-center justify-center text-center ${cardClasses}`}
          id="team-lineup-unavailable"
        >
          <p className={`font-archivo text-base ${headingClasses}`}>
            Escalação não disponbilizada pela Fifa.
          </p>
        </div>
      )}
    </div>
  );
};

import React, { useState } from "react";
import { LineupEntry, Match, TeamRef } from "../types";
import { FlagIcon } from "./FlagIcon";
import { TeamPitchBoard } from "./TeamPitchBoard";
import { useT } from "../i18n";

interface PitchLineupProps {
  match: Match;
  onSelectTeamLineup?: (team: TeamRef) => void;
  lineupEntry?: { teamA: LineupEntry; teamB: LineupEntry };
}

export const PitchLineup: React.FC<PitchLineupProps> = ({ match, onSelectTeamLineup, lineupEntry }) => {
  const t = useT();
  const [activeTeam, setActiveTeam] = useState<"A" | "B">("A");

  const teamALineup = lineupEntry?.teamA.players ?? match.teamA.lineup;
  const teamBLineup = lineupEntry?.teamB.players ?? match.teamB.lineup;
  const team = activeTeam === "A"
    ? { ...match.teamA, lineup: teamALineup }
    : { ...match.teamB, lineup: teamBLineup };
  const opponent = activeTeam === "A" ? match.teamB : match.teamA;
  const activeLineupSource = activeTeam === "A" ? lineupEntry?.teamA : lineupEntry?.teamB;

  return (
    <div className="w-full flex flex-col space-y-4" id="pitch-container">
      {/* Team selector tabs */}
      <div className="flex border-b border-white/10" id="pitch-team-tabs">
        <div
          id="btn-team-a"
          role="button"
          tabIndex={0}
          onClick={() => setActiveTeam("A")}
          onKeyDown={(e) => e.key === "Enter" && setActiveTeam("A")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-center uppercase tracking-widest font-anton transition-all cursor-pointer ${
            activeTeam === "A"
              ? "text-[#ffd700] border-b-2 border-[#ffd700] bg-white/5"
              : "text-white/80 hover:text-white"
          }`}
        >
          {onSelectTeamLineup && (
            <span onClick={(e) => e.stopPropagation()}>
              <FlagIcon
                flag={match.teamA.flagSvg}
                className="h-4 w-6"
                onClick={() => onSelectTeamLineup(match.teamA)}
              />
            </span>
          )}
          <span>{match.teamA.name} ({teamALineup.length} Jogadores)</span>
        </div>
        <div
          id="btn-team-b"
          role="button"
          tabIndex={0}
          onClick={() => setActiveTeam("B")}
          onKeyDown={(e) => e.key === "Enter" && setActiveTeam("B")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-center uppercase tracking-widest font-anton transition-all cursor-pointer ${
            activeTeam === "B"
              ? "text-[#ffd700] border-b-2 border-[#ffd700] bg-white/5"
              : "text-white/80 hover:text-white"
          }`}
        >
          {onSelectTeamLineup && (
            <span onClick={(e) => e.stopPropagation()}>
              <FlagIcon
                flag={match.teamB.flagSvg}
                className="h-4 w-6"
                onClick={() => onSelectTeamLineup(match.teamB)}
              />
            </span>
          )}
          <span>{match.teamB.name} ({teamBLineup.length} Jogadores)</span>
        </div>
      </div>

      {activeLineupSource && (
        <p
          className="font-mono text-[10px] uppercase tracking-wider text-white/50"
          id="pitch-lineup-source-note"
        >
          {activeLineupSource.source === "fifa"
            ? t("teamLineup.lineupOfficial")
            : t("teamLineup.lineupEstimated")}
        </p>
      )}

      <TeamPitchBoard team={team} opponentName={opponent.name} mirror={activeTeam === "B"} />
    </div>
  );
};

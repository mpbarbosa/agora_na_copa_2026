// Interactive tactical-lineup tab inside MatchDetailView's Ao Vivo view: the
// header plus the dynamic PitchLineup board for the selected match.
import type { Match, TeamRef, LineupEntry } from "../types";
import { useT } from "../i18n";
import { PitchLineup } from "./PitchLineup";

interface MatchLineupTabProps {
  match: Match;
  onSelectTeamLineup: (team: TeamRef) => void;
  lineupEntry?: { teamA: LineupEntry; teamB: LineupEntry };
  theme: "classic-light" | "stadium-dark";
}

export function MatchLineupTab({ match, onSelectTeamLineup, lineupEntry, theme }: MatchLineupTabProps) {
  const t = useT();

  return (
    <div className="w-full" id="lineups-view-container">
      <div
        className={`p-6 rounded-2xl border transition ${
          theme === "classic-light"
            ? "bg-white border-slate-200 shadow"
            : "bg-gradient-to-br from-[#121414] to-[#1a1c1c] border-white/5 shadow-xl text-white"
        }`}
        id="lineup-tab-card"
      >
        <div
          className="flex items-center justify-between mb-6"
          id="lineup-tabs-header"
        >
          <div>
            <h3 className="font-anton text-lg tracking-wider uppercase text-slate-800 dark:text-white">
              {t("aoVivo.lineup.title")}
            </h3>
            <p className="text-sm font-archivo text-slate-600 dark:text-slate-300 leading-6">
              {t("aoVivo.lineup.desc")}
            </p>
          </div>
        </div>

        {/* Soccer Dynamic Pitch Lineup Board */}
        <PitchLineup
          match={match}
          onSelectTeamLineup={onSelectTeamLineup}
          lineupEntry={lineupEntry}
        />
      </div>
    </div>
  );
}

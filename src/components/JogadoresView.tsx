import React, { useMemo } from "react";
import { APP_MATCHES } from "../appMatches";
import type { Player } from "../types";
import { FlagIcon } from "./FlagIcon";
import { getPositionLabel } from "../utils/playerDisplay";

interface JogadoresViewProps {
  theme: "classic-light" | "stadium-dark";
}

interface TeamEntry {
  name: string;
  code: string;
  flagSvg: string;
  primaryColor: string;
  secondaryColor: string;
  group: string;
  players: Player[];
}

function extractTeams(): TeamEntry[] {
  const seen = new Map<string, TeamEntry>();
  for (const match of APP_MATCHES) {
    for (const side of [match.teamA, match.teamB]) {
      if (!seen.has(side.code)) {
        seen.set(side.code, {
          name: side.name,
          code: side.code,
          flagSvg: side.flagSvg,
          primaryColor: side.primaryColor,
          secondaryColor: side.secondaryColor,
          group: side.group,
          players: side.lineup,
        });
      }
    }
  }
  return Array.from(seen.values()).sort((a, b) => {
    const g = a.group.localeCompare(b.group, "pt");
    return g !== 0 ? g : a.name.localeCompare(b.name, "pt");
  });
}

const POSITION_ORDER = { GK: 0, DF: 1, MF: 2, FW: 3 };

function sortedPlayers(players: Player[]): Player[] {
  return [...players].sort(
    (a, b) => POSITION_ORDER[a.position] - POSITION_ORDER[b.position] || a.number - b.number,
  );
}

const POSITION_COLORS: Record<string, string> = {
  GK: "#f59e0b",
  DF: "#3b82f6",
  MF: "#10b981",
  FW: "#ef4444",
};

interface PlayerCardProps {
  player: Player;
  primaryColor: string;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, primaryColor }) => {
  const posColor = POSITION_COLORS[player.position] ?? "#6b7280";
  const hasPhoto = Boolean(player.pictureUrl);

  return (
    <div
      className="relative flex flex-col bg-[#fbf9fa] border-2 border-black rounded-sm overflow-hidden"
      style={{ boxShadow: "3px 3px 0 #000" }}
      id={`jogador-card-${player.id}`}
    >
      {/* Photo area */}
      <div
        className="relative w-full aspect-[3/4] flex items-center justify-center overflow-hidden"
        style={{
          background: hasPhoto
            ? "#e2e8f0"
            : `linear-gradient(145deg, ${primaryColor}22 0%, ${primaryColor}08 100%)`,
          borderBottom: "2px solid #000",
        }}
      >
        {hasPhoto ? (
          <img
            src={player.pictureUrl}
            alt={player.name}
            className="w-full h-full object-cover object-top"
            loading="lazy"
          />
        ) : (
          <span
            className="font-anton text-5xl uppercase select-none"
            style={{ color: `${primaryColor}55` }}
          >
            {player.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
          </span>
        )}

        {/* Shirt number badge */}
        <div
          className="absolute top-1.5 left-1.5 font-anton text-[11px] leading-none px-1.5 py-0.5 border border-black text-black bg-white"
          style={{ boxShadow: "1px 1px 0 #000" }}
        >
          #{player.number}
        </div>

        {/* Position badge */}
        <div
          className="absolute top-1.5 right-1.5 font-mono text-[9px] font-bold leading-none px-1.5 py-0.5 text-white border border-black"
          style={{ background: posColor, boxShadow: "1px 1px 0 #000" }}
        >
          {player.position}
        </div>
      </div>

      {/* Info area */}
      <div className="px-2 py-2 flex flex-col gap-0.5">
        <p className="font-anton text-[13px] uppercase leading-tight text-black line-clamp-2">
          {player.name}
        </p>
        <p className="font-mono text-[9px] uppercase tracking-wider text-slate-500 leading-tight">
          {getPositionLabel(player.position)}
        </p>
        {player.club && (
          <p className="font-archivo text-[10px] text-slate-600 leading-tight truncate">
            {player.club}
          </p>
        )}
      </div>

      {/* Team color accent strip */}
      <div className="h-1 w-full mt-auto" style={{ background: primaryColor }} />
    </div>
  );
}

interface TeamSectionProps {
  team: TeamEntry;
  theme: "classic-light" | "stadium-dark";
}

const TeamSection: React.FC<TeamSectionProps> = ({ team, theme }) => {
  const players = sortedPlayers(team.players);
  const headingColor = theme === "classic-light" ? "text-slate-900" : "text-white";
  const sectionBg = theme === "classic-light" ? "bg-white border-slate-200" : "bg-[#0f1112] border-white/10";

  return (
    <section
      className={`rounded-sm border-2 border-black overflow-hidden`}
      style={{ boxShadow: "4px 4px 0 #000" }}
      id={`jogadores-team-${team.code.toLowerCase()}`}
    >
      {/* Team header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b-2 border-black"
        style={{ background: `${team.primaryColor}18` }}
      >
        <div
          className="w-1 self-stretch rounded-full shrink-0"
          style={{ background: team.primaryColor, minHeight: "1.5rem" }}
        />
        <FlagIcon flag={team.flagSvg} className="h-7 w-10 shrink-0 object-contain" />
        <div className="flex-1 min-w-0">
          <h2 className={`font-anton text-base uppercase tracking-wide leading-tight ${headingColor}`}>
            {team.name}
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 leading-tight">
            {team.group} · {players.length} jogadores
          </p>
        </div>
        <span
          className="font-mono text-[10px] font-bold px-2 py-0.5 border border-black text-black bg-white shrink-0"
          style={{ boxShadow: "1px 1px 0 #000" }}
        >
          {team.code}
        </span>
      </div>

      {/* Player grid */}
      <div className={`p-3 ${sectionBg}`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {players.map((player) => (
            <PlayerCard key={player.id} player={player} primaryColor={team.primaryColor} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function JogadoresView({ theme }: JogadoresViewProps) {
  const teams = useMemo(() => extractTeams(), []);

  const groups = useMemo(() => {
    const map = new Map<string, TeamEntry[]>();
    for (const team of teams) {
      if (!map.has(team.group)) map.set(team.group, []);
      map.get(team.group)!.push(team);
    }
    return Array.from(map.entries());
  }, [teams]);

  const headingColor = theme === "classic-light" ? "text-slate-900" : "text-white";
  const mutedColor = theme === "classic-light" ? "text-slate-500" : "text-slate-400";
  const groupLabelColor = theme === "classic-light" ? "text-slate-700 border-slate-300" : "text-slate-300 border-white/20";

  return (
    <div className="max-w-7xl mx-auto px-4 mt-8 pb-16" id="jogadores-view">
      {/* Page header */}
      <div className="mb-8">
        <h1 className={`font-anton text-3xl uppercase tracking-wide ${headingColor}`}>
          Jogadores
        </h1>
        <p className={`mt-1 font-mono text-xs uppercase tracking-wider ${mutedColor}`}>
          {teams.length} seleções · {teams.reduce((n, t) => n + t.players.length, 0)} atletas
        </p>
      </div>

      {/* Groups */}
      <div className="flex flex-col gap-12">
        {groups.map(([group, groupTeams]) => (
          <div key={group}>
            {/* Group label */}
            <div className={`flex items-center gap-3 mb-4`}>
              <span className={`font-anton text-sm uppercase tracking-widest ${groupLabelColor}`}>
                {group}
              </span>
              <div className={`flex-1 border-t ${groupLabelColor}`} />
            </div>

            {/* Teams in group */}
            <div className="flex flex-col gap-6">
              {groupTeams.map((team) => (
                <TeamSection key={team.code} team={team} theme={theme} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

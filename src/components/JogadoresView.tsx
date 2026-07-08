import React, { useMemo, useState } from "react";
import { APP_MATCHES } from "../appMatches";
import { getTeamSquad } from "../data/playerRegistry";
import type { Player, TeamRef } from "../types";
import { FlagIcon } from "./FlagIcon";
import { PlayerPortrait, PlayerOverlayCard, PlayerPictureOverlay } from "./PlayerOverlayCard";
import { InstagramBrandIcon } from "./InstagramBrandIcon";
import { getPositionLabel, buildPlayerStatCells, buildPlayerDetailRows } from "../utils/playerDisplay";
import { usePlayerStats } from "../hooks/usePlayerStats";
import { useT } from "../i18n";

interface JogadoresViewProps {
  theme: "classic-light" | "stadium-dark";
  onSelectTeamLineup: (team: TeamRef) => void;
}

interface SelectedContext {
  player: Player;
  team: TeamEntry;
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
    // Knockout fixtures carry bracket placeholder sides ("1° G", "2° A", best-third
    // and winner/runner-up slots) that are not real squads. Every one of the 48
    // national teams plays the group stage, so restricting extraction to it yields
    // exactly the real teams and drops the placeholders.
    if (match.stageName !== "Group Stage") continue;
    for (const side of [match.teamA, match.teamB]) {
      if (!seen.has(side.code)) {
        const squadEntries = getTeamSquad(side.code);
        const players: Player[] =
          squadEntries.length > 0
            ? squadEntries.map((sp) => ({
                id: sp.fifaId,
                name: sp.name,
                number: sp.number,
                position: sp.position,
                x: 0,
                y: 0,
                club: sp.club,
                pictureUrl: sp.pictureUrl,
                socials: sp.socials,
                instagramPostUrl: sp.instagramPostUrl,
                instagramPostUrls: sp.instagramPostUrls,
                worldCupNote: sp.worldCupNote,
                fullName: sp.fullName,
                dateOfBirth: sp.dateOfBirth,
                height: sp.height,
                fifaId: sp.fifaId,
              }))
            : side.lineup;
        seen.set(side.code, {
          name: side.name,
          code: side.code,
          flagSvg: side.flagSvg,
          primaryColor: side.primaryColor,
          secondaryColor: side.secondaryColor,
          group: side.group,
          players,
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

const LEGEND_IDS = new Set([
  "229397", // Lionel Messi (ARG)
  "405742", // Vinicius Jr (BRA)
  "190460", // Neymar Jr (BRA)
  "344654", // Mohamed Salah (EGY)
  "484320", // Lamine Yamal (ESP)
  "389867", // K. Mbappé (FRA)
  "388475", // Mehdi Taremi (IRN)
  "384462", // Cristiano Ronaldo (POR)
]);

interface PlayerCardProps {
  player: Player;
  primaryColor: string;
  secondaryColor: string;
  onClick: () => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, primaryColor, secondaryColor, onClick }) => {
  const t = useT();
  const posColor = POSITION_COLORS[player.position] ?? "#6b7280";
  const hasPhoto = Boolean(player.pictureUrl);
  const hasInstagram = Boolean(player.socials?.instagram);
  const isLegend = LEGEND_IDS.has(player.id);
  const initials = player.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  if (!hasPhoto) {
    // ── Empty slot: álbum vazio aesthetic ──────────────────────────────────
    return (
      <div
        className="relative flex flex-col bg-[#f5f4f2] border-2 border-dashed border-slate-300 rounded-sm overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
        id={`jogador-card-${player.id}`}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onClick()}
        aria-label={t("jogadores.viewProfileOf", { name: player.name })}
      >
        {/* Slot photo area */}
        <div
          className="relative w-full aspect-[3/4] flex flex-col items-center justify-center gap-2 overflow-hidden"
          style={{ background: `${primaryColor}08` }}
        >
          <span
            className="font-anton text-4xl select-none leading-none"
            style={{ color: `${primaryColor}35` }}
          >
            {initials}
          </span>
          {/* Muted number badge */}
          <div className="absolute top-1.5 left-1.5 font-mono text-[10px] leading-none px-1.5 py-0.5 border border-dashed border-slate-300 text-slate-400 bg-transparent">
            #{player.number}
          </div>
          {/* Muted position badge */}
          <div
            className="absolute top-1.5 right-1.5 font-mono text-[9px] font-bold leading-none px-1.5 py-0.5 border border-dashed border-slate-300"
            style={{ color: `${posColor}99` }}
          >
            {player.position}
          </div>
        </div>

        {/* Info area — muted */}
        <div className="px-2 py-2 flex flex-col gap-0.5">
          <p className="font-anton text-[12px] uppercase leading-tight text-slate-400 line-clamp-2">
            {player.name}
          </p>
          <p className="font-mono text-[9px] uppercase tracking-wider text-slate-300 leading-tight">
            {getPositionLabel(player.position)}
          </p>
          {player.club && (
            <p className="font-archivo text-[10px] text-slate-300 leading-tight truncate">
              {player.club}
            </p>
          )}
        </div>

        {/* Muted accent strip */}
        <div className="h-0.5 w-full mt-auto" style={{ background: `${primaryColor}30` }} />
      </div>
    );
  }

  // ── Filled sticker card ──────────────────────────────────────────────────
  const borderColor = isLegend ? "#b8860b" : "#000";
  const shadowColor = isLegend ? "#b8860b" : "#000";

  return (
    <div
      className="relative flex flex-col bg-white rounded-sm overflow-hidden cursor-pointer transition-transform hover:scale-[1.03] hover:-translate-y-0.5"
      style={{
        border: `2px solid ${borderColor}`,
        boxShadow: `4px 4px 0 ${shadowColor}`,
      }}
      id={`jogador-card-${player.id}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      aria-label={t("jogadores.viewProfileOf", { name: player.name })}
    >
      {/* Photo area with sticker inner frame */}
      <div
        className="relative w-full aspect-[3/4] overflow-hidden p-[5px]"
        style={{
          background: isLegend ? "linear-gradient(145deg, #fef9e7, #e8e6e3)" : "#e8e6e3",
          borderBottom: `2px solid ${borderColor}`,
        }}
      >
        <PlayerPortrait
          player={player}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          className="w-full h-full rounded-[2px] overflow-hidden"
          imageClassName="w-full h-full object-cover object-top"
          fallbackTextClassName="text-4xl"
        />

        {/* Foil shimmer overlay for legends */}
        {isLegend && (
          <div
            className="sticker-foil-overlay absolute inset-0 rounded-[2px] pointer-events-none"
            aria-hidden="true"
          />
        )}

        {/* Circular number badge — bottom-left, team color */}
        <div
          className="absolute bottom-2 left-2 w-7 h-7 rounded-full flex items-center justify-center font-anton text-[11px] text-white leading-none"
          style={{
            background: primaryColor,
            border: `2px solid ${borderColor}`,
            boxShadow: `1px 1px 0 ${shadowColor}`,
          }}
        >
          {player.number}
        </div>

        {/* Position badge — top-right */}
        <div
          className="absolute top-2 right-2 font-mono text-[9px] font-bold leading-none px-1.5 py-0.5 text-white"
          style={{
            background: posColor,
            border: `1px solid ${borderColor}`,
            boxShadow: `1px 1px 0 ${shadowColor}`,
          }}
        >
          {player.position}
        </div>

        {/* Legend crown badge — top-left (replaces IG when legend) */}
        {isLegend ? (
          <div
            className="absolute top-2 left-2 w-5 h-5 flex items-center justify-center rounded-full bg-[#ffd700] text-[10px] leading-none"
            style={{ border: "1.5px solid #b8860b", boxShadow: "1px 1px 0 #b8860b" }}
            title={t("jogadores.legendBadge")}
          >
            ★
          </div>
        ) : hasInstagram ? (
          <div
            className="absolute top-2 left-2 w-5 h-5 flex items-center justify-center border border-black bg-white rounded-full"
            style={{ boxShadow: "1px 1px 0 #000" }}
            title={t("jogadores.instagramVerified")}
          >
            <InstagramBrandIcon size={11} />
          </div>
        ) : null}
      </div>

      {/* Info area */}
      <div className="px-2 pt-2 pb-1 flex flex-col gap-0.5">
        <p className="font-anton text-[13px] uppercase leading-tight text-black line-clamp-2">
          {player.name}
        </p>
        <p className="font-mono text-[9px] uppercase tracking-wider text-slate-500 leading-tight">
          {getPositionLabel(player.position)}
        </p>
        {player.club && (
          <p className="font-archivo text-[10px] text-slate-500 leading-tight truncate">
            {player.club}
          </p>
        )}
      </div>

      {/* Team color accent strip */}
      <div
        className="h-1.5 w-full mt-auto"
        style={{
          background: isLegend
            ? "linear-gradient(90deg, #b8860b, #ffd700, #b8860b)"
            : primaryColor,
          borderTop: `2px solid ${borderColor}`,
        }}
      />
    </div>
  );
};

interface TeamSectionProps {
  team: TeamEntry;
  theme: "classic-light" | "stadium-dark";
  onPlayerClick: (player: Player) => void;
  onTeamClick: () => void;
}

const TeamSection: React.FC<TeamSectionProps> = ({ team, theme, onPlayerClick, onTeamClick }) => {
  const t = useT();
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
          <button
            type="button"
            onClick={onTeamClick}
            className={`font-anton text-base uppercase tracking-wide leading-tight text-left hover:underline underline-offset-2 ${headingColor}`}
            aria-label={t("jogadores.viewLineupOf", { name: team.name })}
          >
            {team.name}
          </button>
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 leading-tight">
            {t("jogadores.teamPlayerCount", { group: team.group, count: players.length })}
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
            <PlayerCard
              key={player.id}
              player={player}
              primaryColor={team.primaryColor}
              secondaryColor={team.secondaryColor}
              onClick={() => onPlayerClick(player)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function JogadoresView({ theme, onSelectTeamLineup }: JogadoresViewProps) {
  const t = useT();
  const teams = useMemo(() => extractTeams(), []);
  const [selected, setSelected] = useState<SelectedContext | null>(null);
  const [expandedPlayer, setExpandedPlayer] = useState<Player | null>(null);
  const [filterTeamCode, setFilterTeamCode] = useState<string | null>(null);
  const [filterPlayerName, setFilterPlayerName] = useState("");
  const [filterStarsOnly, setFilterStarsOnly] = useState(false);
  const selectedStats = usePlayerStats(selected?.team.code, selected?.player.name);

  const allGroupedTeams = useMemo(() => {
    const map = new Map<string, TeamEntry[]>();
    for (const team of teams) {
      if (!map.has(team.group)) map.set(team.group, []);
      map.get(team.group)!.push(team);
    }
    return Array.from(map.entries());
  }, [teams]);

  const displayedGroups = useMemo(() => {
    const nameQuery = filterPlayerName.trim().toLowerCase();
    const teamSource = filterTeamCode ? teams.filter((t) => t.code === filterTeamCode) : teams;
    const filtered = teamSource.flatMap((team) => {
      const players = team.players.filter((p) => {
        if (filterStarsOnly && !p.worldCupNote) return false;
        if (
          nameQuery &&
          !(
            p.name.toLowerCase().includes(nameQuery) ||
            (p.fullName ?? "").toLowerCase().includes(nameQuery)
          )
        )
          return false;
        return true;
      });
      return players.length > 0 ? [{ ...team, players }] : [];
    });
    const map = new Map<string, TeamEntry[]>();
    for (const team of filtered) {
      if (!map.has(team.group)) map.set(team.group, []);
      map.get(team.group)!.push(team);
    }
    return Array.from(map.entries());
  }, [teams, filterTeamCode, filterPlayerName, filterStarsOnly]);

  const headingColor = theme === "classic-light" ? "text-slate-900" : "text-white";
  const mutedColor = theme === "classic-light" ? "text-slate-500" : "text-slate-400";
  const groupLabelColor = theme === "classic-light" ? "text-slate-700 border-slate-300" : "text-slate-300 border-white/20";
  const selectBg = theme === "classic-light" ? "bg-white text-slate-900" : "bg-[#0f1112] text-white";
  const inputBg = theme === "classic-light" ? "bg-white text-slate-900 placeholder-slate-400" : "bg-[#0f1112] text-white placeholder-slate-500";

  const totalDisplayed = displayedGroups.reduce(
    (n, [, groupTeams]) => n + groupTeams.reduce((m, t) => m + t.players.length, 0),
    0,
  );
  const hasActiveFilter = Boolean(filterTeamCode || filterPlayerName.trim() || filterStarsOnly);
  const subtitleText = hasActiveFilter
    ? t("jogadores.subtitleFiltered", {
        count: totalDisplayed,
        plural: totalDisplayed !== 1 ? "s" : "",
      })
    : t("jogadores.subtitleAll", {
        teams: teams.length,
        players: teams.reduce((n, team) => n + team.players.length, 0),
      });

  const toTeamRef = (team: TeamEntry): TeamRef => ({
    name: team.name,
    code: team.code,
    flagSvg: team.flagSvg,
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
    group: team.group,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 mt-8 pb-16" id="jogadores-view">
      {/* Page header + filter */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={`font-anton text-3xl uppercase tracking-wide ${headingColor}`}>
            {t("jogadores.title")}
          </h1>
          <p className={`mt-1 font-mono text-xs uppercase tracking-wider ${mutedColor}`}>
            {subtitleText}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Name search */}
          <div className="relative">
            <input
              type="search"
              value={filterPlayerName}
              onChange={(e) => setFilterPlayerName(e.target.value)}
              placeholder={t("jogadores.searchPlaceholder")}
              className={`border-2 border-black font-archivo text-xs px-3 py-1.5 pr-8 w-44 ${inputBg}`}
              style={{ boxShadow: "2px 2px 0 #000" }}
              aria-label={t("jogadores.searchAriaLabel")}
            />
            {filterPlayerName && (
              <button
                type="button"
                onClick={() => setFilterPlayerName("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 leading-none"
                aria-label={t("jogadores.clearSearch")}
              >
                ×
              </button>
            )}
          </div>

          {/* Team filter */}
          <span className={`font-mono text-xs uppercase tracking-wider shrink-0 ${mutedColor}`}>
            {t("jogadores.teamFilterLabel")}
          </span>
          <select
            value={filterTeamCode ?? ""}
            onChange={(e) => setFilterTeamCode(e.target.value || null)}
            className={`border-2 border-black font-mono text-xs uppercase px-3 py-1.5 cursor-pointer ${selectBg}`}
            style={{ boxShadow: "2px 2px 0 #000" }}
            aria-label={t("jogadores.filterByTeam")}
          >
            <option value="">{t("jogadores.allTeams")}</option>
            {allGroupedTeams.map(([group, groupTeams]) => (
              <optgroup key={group} label={group}>
                {groupTeams.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {/* Stars (Craques da Copa) filter */}
          <button
            type="button"
            id="btn-filter-stars"
            aria-pressed={filterStarsOnly}
            onClick={() => setFilterStarsOnly((v) => !v)}
            className={`font-mono text-xs uppercase px-3 py-1.5 border-2 border-black transition-colors ${
              filterStarsOnly
                ? "bg-[#ffd84d] text-black"
                : theme === "classic-light"
                  ? "bg-white text-black hover:bg-slate-100"
                  : "bg-[#0f1112] text-white hover:bg-white/10"
            }`}
            style={{ boxShadow: "2px 2px 0 #000" }}
            title={t("jogadores.starsFilterTitle")}
          >
            {t("jogadores.starsFilter")}
          </button>

          {/* Clear all filters */}
          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => { setFilterTeamCode(null); setFilterPlayerName(""); setFilterStarsOnly(false); }}
              className="font-mono text-xs uppercase px-3 py-1.5 border-2 border-black bg-white text-black hover:bg-slate-100 transition-colors"
              style={{ boxShadow: "2px 2px 0 #000" }}
            >
              {t("jogadores.clearAllFilters")}
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {displayedGroups.length === 0 && hasActiveFilter && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className={`font-anton text-xl uppercase tracking-wide ${headingColor}`}>
            {t("jogadores.emptyTitle")}
          </p>
          <p className={`font-mono text-xs uppercase tracking-wider ${mutedColor}`}>
            {t("jogadores.emptyHint")}
          </p>
        </div>
      )}

      {/* Groups */}
      <div className="flex flex-col gap-12">
        {displayedGroups.map(([group, groupTeams]) => (
          <div key={group}>
            {/* Group label */}
            <div className="flex items-center gap-3 mb-4">
              <span className={`font-anton text-sm uppercase tracking-widest ${groupLabelColor}`}>
                {group}
              </span>
              <div className={`flex-1 border-t ${groupLabelColor}`} />
            </div>

            {/* Teams in group */}
            <div className="flex flex-col gap-6">
              {groupTeams.map((team) => (
                <TeamSection
                  key={team.code}
                  team={team}
                  theme={theme}
                  onPlayerClick={(player) => setSelected({ player, team })}
                  onTeamClick={() => onSelectTeamLineup(toTeamRef(team))}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Player overlay */}
      {selected && (
        <PlayerOverlayCard
          id="jogadores-player-overlay"
          theme={theme}
          player={selected.player}
          teamName={selected.team.name}
          primaryColor={selected.team.primaryColor}
          secondaryColor={selected.team.secondaryColor}
          flagSvg={selected.team.flagSvg}
          stats={buildPlayerStatCells(selected.player, selectedStats, theme, t)}
          details={buildPlayerDetailRows(selected.player, t)}
          onClose={() => setSelected(null)}
          onOpenPicture={() => setExpandedPlayer(selected.player)}
          onOpenTeamView={() => {
            onSelectTeamLineup(toTeamRef(selected.team));
            setSelected(null);
          }}
        />
      )}

      {expandedPlayer && (
        <PlayerPictureOverlay
          player={expandedPlayer}
          onClose={() => setExpandedPlayer(null)}
        />
      )}
    </div>
  );
}

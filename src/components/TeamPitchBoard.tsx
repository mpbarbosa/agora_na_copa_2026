import { FC, useEffect, useMemo, useState } from "react";
import { Player, Position, type PlayerSocials } from "../types";
import { enrichPlayerWithMetadata } from "../utils/playerMetadata";
import {
  PlayerOverlayCard,
  PlayerPictureOverlay,
  PlayerPortrait,
  renderSocialPlatformLabel,
} from "./PlayerOverlayCard";
import { getPlayerSocialEntries, getPositionLabel } from "../utils/playerDisplay";

interface TeamPitchBoardProps {
  team: {
    name: string;
    code: string;
    primaryColor: string;
    secondaryColor: string;
    lineup: Player[];
  };
  opponentName?: string;
  mirror?: boolean;
  theme?: "classic-light" | "stadium-dark";
}

const normalizePlayerName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toLowerCase();

const isSamePlayer = (candidate: Player, target: Player) =>
  candidate.id === target.id ||
  (candidate.number === target.number &&
    normalizePlayerName(candidate.name) === normalizePlayerName(target.name)) ||
  candidate.number === target.number;


export const TeamPitchBoard: FC<TeamPitchBoardProps> = ({
  team,
  opponentName,
  mirror = false,
  theme = "stadium-dark",
}) => {
  const enrichedLineup = useMemo(
    () => team.lineup.map((player) => enrichPlayerWithMetadata(team.code, player)),
    [team.code, team.lineup],
  );
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [expandedPlayer, setExpandedPlayer] = useState<Player | null>(null);
  const [featuredPlayer, setFeaturedPlayer] = useState<Player | null>(null);
  const [featuredPlayerStats, setFeaturedPlayerStats] = useState<{
    goals: number;
    yellowCards: number;
    redCards: number;
  } | null>(null);
  const selectedPlayerSocials = selectedPlayer ? getPlayerSocialEntries(selectedPlayer.socials) : [];

  useEffect(() => {
    setSelectedPlayer((current) => {
      if (!current) return null;
      return enrichedLineup.find((player) => isSamePlayer(player, current)) ?? null;
    });
    setExpandedPlayer((current) => {
      if (!current) return null;
      const nextPlayer = enrichedLineup.find((player) => isSamePlayer(player, current)) ?? null;
      return nextPlayer?.pictureUrl ? nextPlayer : null;
    });
    setFeaturedPlayer((current) => {
      if (!current) return null;
      return enrichedLineup.find((player) => isSamePlayer(player, current)) ?? null;
    });
  }, [enrichedLineup]);

  useEffect(() => {
    if (!featuredPlayer) {
      setFeaturedPlayerStats(null);
      return;
    }
    let active = true;
    fetch(
      `/api/player-stats/${encodeURIComponent(team.code)}/${encodeURIComponent(featuredPlayer.name)}`,
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (active) setFeaturedPlayerStats(data); })
      .catch(() => { if (active) setFeaturedPlayerStats(null); });
    return () => { active = false; };
  }, [featuredPlayer, team.code]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="pitch-main-content">
      {/* Tactical Pitch Visualizer */}
      <div className="lg:col-span-2 flex flex-col items-center justify-center p-2 bg-gradient-to-b from-[#051a10] to-[#010905] rounded-xl border border-white/5 relative overflow-hidden" id="pitch-canvas-wrapper">
        {/* Pitch Lines background */}
        <div className="w-full aspect-[3/4] md:aspect-[4/5] bg-[#0c2e1b] rounded-lg relative overflow-hidden p-6 border-2 border-white/20 select-none shadow-inner" id="soccer-pitch">
          {/* Outer line */}
          <div className="absolute inset-4 border border-white/30 pointer-events-none rounded"></div>
          {/* Center line */}
          <div className="absolute top-1/2 left-4 right-4 h-0 border-t border-white/30 pointer-events-none"></div>
          {/* Center circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border border-white/30 rounded-full pointer-events-none"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/40 rounded-full pointer-events-none"></div>

          {/* Penalty areas */}
          {/* Top Penalty Area */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-1/2 h-24 border border-white/30 pointer-events-none"></div>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-1/4 h-10 border border-white/30 pointer-events-none"></div>
          <div className="absolute top-28 left-1/2 -translate-x-1/2 w-16 h-8 border-b border-dashed border-white/20 rounded-b-full pointer-events-none"></div>

          {/* Bottom Penalty Area */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-1/2 h-24 border border-white/30 pointer-events-none"></div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-1/4 h-10 border border-white/30 pointer-events-none"></div>
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-16 h-8 border-t border-dashed border-white/20 rounded-t-full pointer-events-none"></div>

          {/* Corner Arcs */}
          <div className="absolute top-4 left-4 w-4 h-4 border-r border-b border-white/30 rounded-br-full"></div>
          <div className="absolute top-4 right-4 w-4 h-4 border-l border-b border-white/30 rounded-bl-full"></div>
          <div className="absolute bottom-4 left-4 w-4 h-4 border-r border-t border-white/30 rounded-tr-full"></div>
          <div className="absolute bottom-4 right-4 w-4 h-4 border-l border-t border-white/30 rounded-tl-full"></div>

          {/* Draw Players */}
          {enrichedLineup.map((player) => {
            const isSelected = selectedPlayer?.id === player.id;
            // Translate percentage coordinates to match standard directions.
            // When mirrored, flip vertically for a premium head-to-head depiction.
            const topY = mirror ? 100 - player.y : player.y;

            return (
              <button
                key={player.id}
                id={`player-${player.id}`}
                onClick={() => setSelectedPlayer(player)}
                style={{
                  left: `${player.x}%`,
                  top: `${topY}%`,
                  transform: "translate(-50%, -50%)"
                }}
                className={`absolute z-10 flex flex-col items-center justify-center transition-all group focus:outline-none`}
              >
                {/* Glow ring */}
                <div className={`absolute -inset-2 rounded-full transition-all duration-300 blur-md ${
                  isSelected ? "bg-[#ffd700]/30 scale-125" : "bg-transparent group-hover:bg-white/10"
                }`}></div>

                {/* Shirt circle */}
                <div
                  className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 shadow-lg transition-transform ${
                    isSelected
                      ? "border-[#ffd700] text-black scale-110 font-black animate-pulse"
                      : "border-white/90 text-white group-hover:scale-105"
                  }`}
                  style={{
                    background: isSelected
                      ? "#ffd700"
                      : `linear-gradient(135deg, ${team.primaryColor}, ${team.secondaryColor}aa)`
                  }}
                >
                  <span className="font-mono tracking-tighter">{player.number}</span>
                </div>

                {/* Player Name Tag */}
                <span className={`mt-1 font-archivo text-[11px] md:text-xs text-white px-1.5 py-0.5 rounded shadow-sm border whitespace-nowrap bg-black/80 ${
                  isSelected ? "border-[#ffd700] text-[#ffd700] font-semibold" : "border-white/10"
                }`}>
                  {player.name}
                </span>
              </button>
            );
          })}
        </div>
        <div className="p-2 text-white/70 font-mono text-xs text-center w-full" id="pitch-instruction">
          * Clique em um jogador para visualizar foto, detalhes táticos e clube atual
        </div>
      </div>

      {/* Selected Player Details & Squad Stats */}
      <div className="flex flex-col space-y-4" id="pitch-sidebar">
        {/* Player details panel */}
        <div className="p-4 rounded-xl glassmorphic-card border border-white/10 flex-1" id="player-details-card">
          {selectedPlayer ? (
            <div className="flex flex-col h-full justify-between space-y-4" id="selected-player-info">
              <div>
                <div className="flex items-center space-x-3 mb-3">
                  {selectedPlayer.pictureUrl ? (
                    <button
                      type="button"
                      id="btn-expand-player-picture"
                      onClick={() => setExpandedPlayer(selectedPlayer)}
                      className="shrink-0 rounded-2xl transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#ffd700]/70"
                      aria-label={`Ampliar foto de ${selectedPlayer.name}`}
                    >
                      <PlayerPortrait
                        player={selectedPlayer}
                        primaryColor={team.primaryColor}
                        secondaryColor={team.secondaryColor}
                        className="h-20 w-20 rounded-2xl border border-white/15 bg-black/30 shadow-lg"
                        fallbackTextClassName="text-2xl"
                        imageClassName="h-full w-full object-contain object-top p-1"
                        showNumberBadge
                        numberBadgeClassName="absolute bottom-1 right-1 rounded-full border border-white/10 bg-black/80 px-2 py-0.5 font-mono text-[10px] font-black text-[#ffd700]"
                      />
                    </button>
                  ) : (
                    <PlayerPortrait
                      player={selectedPlayer}
                      primaryColor={team.primaryColor}
                      secondaryColor={team.secondaryColor}
                      className="h-20 w-20 shrink-0 rounded-2xl border border-white/15 bg-black/30 shadow-lg"
                      fallbackTextClassName="text-2xl"
                      imageClassName="h-full w-full object-contain object-top p-1"
                      showNumberBadge
                      numberBadgeClassName="absolute bottom-1 right-1 rounded-full border border-white/10 bg-black/80 px-2 py-0.5 font-mono text-[10px] font-black text-[#ffd700]"
                    />
                  )}
                  <div>
                    <h4 className="font-anton text-lg tracking-wider text-white uppercase">{selectedPlayer.name}</h4>
                    <p className="text-white/75 text-sm font-archivo">{selectedPlayer.club || "Seleção Nacional"}</p>
                  </div>
                </div>

                {selectedPlayer.pictureUrl && (
                  <p className="mb-3 text-[10px] font-mono uppercase tracking-wider text-white/45">
                    Clique na foto para ampliar
                  </p>
                )}

                <div className="space-y-2 text-sm text-white/80 font-archivo" id="player-meta-grid">
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-white/65 font-mono">POSIÇÃO</span>
                    <span className="font-semibold text-[#00e476]">{getPositionLabel(selectedPlayer.position)}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-white/65 font-mono">SELEÇÃO</span>
                    <span className="font-semibold uppercase">{team.name}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-white/65 font-mono">VALOR TÁTICO</span>
                    <span className="font-semibold text-white">Crucial • Titular Confirmado</span>
                  </div>
                </div>

                {selectedPlayerSocials.length > 0 && (
                  <div className="mt-4" id="player-social-links">
                    <p className="text-white/65 font-mono text-[10px] uppercase tracking-wider">
                      Redes oficiais
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedPlayerSocials.map(([platform, url]) => (
                        <a
                          key={platform}
                          id={`player-social-link-${platform}`}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white transition hover:border-[#ffd700]/40 hover:text-[#ffd700]"
                        >
                          {renderSocialPlatformLabel(platform)}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <button
                    type="button"
                    id="btn-open-player-overlay-card"
                    onClick={() => setFeaturedPlayer(selectedPlayer)}
                    className="w-full rounded-xl border border-[#ffd700]/25 bg-[#ffd700]/10 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-[#ffd700] transition hover:bg-[#ffd700]/15 focus:outline-none focus:ring-2 focus:ring-[#ffd700]/50"
                  >
                    Abrir card completo do jogador
                  </button>
                </div>

                {opponentName && (
                  <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/5" id="pundit-quote">
                    <p className="text-sm text-white/85 italic font-archivo leading-6">
                      "Para esta partida contra a {opponentName}, {selectedPlayer.name} desempenha papel fundamental no bloco tático {selectedPlayer.position === Position.FW ? "ofensivo para que romper a última linha adversária" : "sustentando a posse ou as saídas rápidas"}. "
                    </p>
                  </div>
                )}
              </div>

              <button
                id="btn-close-player-details"
                onClick={() => setSelectedPlayer(null)}
                className="w-full py-2 bg-white/10 hover:bg-white/15 transition rounded text-xs font-mono font-bold text-white uppercase"
              >
                Fechar Detalhes
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-full min-h-[180px] text-white/70 font-archivo" id="no-player-selected">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 stroke-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <p className="text-sm">Selecione qualquer jogador no campo para examinar foto e detalhes táticos.</p>
            </div>
          )}
        </div>

        {/* Full Lineup squad list summary */}
        <div className="p-4 rounded-xl glassmorphic-card border border-white/10" id="full-squad-list-card">
          <h5 className="font-anton text-xs uppercase tracking-widest text-white/80 mb-2">ESCALAÇÃO COMPLETA ({team.name})</h5>
          <div className="max-h-[220px] overflow-y-auto pr-1 space-y-1" id="players-list-scrollable">
            {enrichedLineup.map((p) => {
              const isSelected = selectedPlayer?.id === p.id;
              return (
                <button
                  key={p.id}
                  id={`squad-player-row-${p.id}`}
                  onClick={() => setSelectedPlayer(p)}
                  className={`w-full flex items-center justify-between p-1.5 rounded text-left transition ${
                    isSelected
                      ? "bg-[#ffd700]/10 border border-[#ffd700]/30"
                      : "hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <PlayerPortrait
                      player={p}
                      primaryColor={team.primaryColor}
                      secondaryColor={team.secondaryColor}
                      className="h-8 w-8 shrink-0 rounded-full border border-white/10 bg-white/5"
                      fallbackTextClassName="text-[11px]"
                    />
                    <span className="font-mono text-xs text-[#00e476] w-5 text-right">{p.number}</span>
                    <span className="font-archivo text-sm text-white font-medium">{p.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono text-white/70 px-1 py-0.5 bg-white/5 rounded">
                      {p.position}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {expandedPlayer && (
        <PlayerPictureOverlay
          id="player-picture-overlay"
          player={expandedPlayer}
          onClose={() => setExpandedPlayer(null)}
        />
      )}

      {featuredPlayer && (
        <PlayerOverlayCard
          id="player-feature-overlay"
          theme={theme as "classic-light" | "stadium-dark"}
          player={featuredPlayer}
          teamName={team.name}
          primaryColor={team.primaryColor}
          secondaryColor={team.secondaryColor}
          stats={[
            { label: "Camisa", value: featuredPlayer.number },
            { label: "Posição", value: getPositionLabel(featuredPlayer.position) },
            { label: "Seleção", value: team.name },
            ...(featuredPlayerStats &&
            (featuredPlayerStats.goals > 0 ||
              featuredPlayerStats.yellowCards > 0 ||
              featuredPlayerStats.redCards > 0)
              ? [
                  {
                    label: "Gols",
                    value: featuredPlayerStats.goals,
                    accent:
                      theme === "classic-light" ? "text-[#065f2c]" : "text-[#00e476]",
                  },
                  {
                    label: "Amarelos",
                    value: featuredPlayerStats.yellowCards,
                    accent:
                      theme === "classic-light" ? "text-[#9a6700]" : "text-[#ffd84d]",
                  },
                  {
                    label: "Vermelhos",
                    value: featuredPlayerStats.redCards,
                    accent:
                      theme === "classic-light" ? "text-[#9f1239]" : "text-[#ff879d]",
                  },
                ]
              : []),
          ]}
          details={[
            { label: "Clube atual", value: featuredPlayer.club || "Seleção Nacional" },
            { label: "Leitura tática", value: "Titular confirmado • Papel crucial" },
            ...(opponentName
              ? [
                  {
                    label: "Contexto da partida",
                    value: `Contra a ${opponentName}, ${featuredPlayer.name} aparece como peça-chave para o plano de jogo da ${team.name}.`,
                    fullWidth: true as const,
                  },
                ]
              : []),
          ]}
          onClose={() => setFeaturedPlayer(null)}
          onOpenPicture={() => setExpandedPlayer(featuredPlayer)}
          openPictureButtonId="btn-open-player-feature-picture"
        />
      )}
    </div>
  );
};

import { useEffect, useState } from "react";
import type { Player, TeamViewResponse } from "../types";
import { PlayerPortrait } from "./PlayerOverlayCard";
import { FlagIcon } from "./FlagIcon";
import { getPositionLabel } from "../utils/playerDisplay";

interface JogadoresViewProps {
  theme: "classic-light" | "stadium-dark";
}

const NZL_PRIMARY = "#00247d";
const NZL_SECONDARY = "#c8102e";

export function JogadoresView({ theme }: JogadoresViewProps) {
  const [justPlayer, setJustPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/team-view/NZL")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: TeamViewResponse | null) => {
        if (!active) return;
        const just = data?.lineup?.players.find(
          (p) => p.id === "nz9" || p.name === "Elijah Just",
        );
        setJustPlayer(just ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const cardBg =
    theme === "classic-light"
      ? "bg-white border-slate-200 shadow-sm"
      : "bg-[#121414] border-white/10";
  const headingColor = theme === "classic-light" ? "text-slate-900" : "text-white";
  const mutedColor = theme === "classic-light" ? "text-slate-500" : "text-slate-400";
  const labelColor = theme === "classic-light" ? "text-slate-700" : "text-slate-200";

  return (
    <div className="max-w-5xl mx-auto px-4 mt-8" id="jogadores-view">
      <div className="mb-6">
        <h1 className={`font-anton text-2xl uppercase tracking-wide ${headingColor}`}>
          Jogadores
        </h1>
        <p className={`mt-1 font-mono text-xs uppercase tracking-wider ${mutedColor}`}>
          Perfis individuais dos atletas da Copa do Mundo 2026
        </p>
      </div>

      {loading ? (
        <div className={`rounded-2xl border p-8 text-center font-mono text-sm ${cardBg} ${mutedColor}`}>
          Carregando dados do jogador…
        </div>
      ) : justPlayer ? (
        <div
          className={`rounded-2xl border p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 ${cardBg}`}
          id="just-player-card"
        >
          <PlayerPortrait
            player={justPlayer}
            primaryColor={NZL_PRIMARY}
            secondaryColor={NZL_SECONDARY}
            className="h-64 w-48 shrink-0 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10"
            fallbackTextClassName="text-5xl"
            imageClassName="h-full w-full object-cover"
            imgId="just-portrait"
            showNumberBadge
            numberBadgeClassName="absolute bottom-3 right-3 rounded-full border border-white/10 bg-black/75 px-2.5 py-0.5 font-mono text-xs font-black text-[#ffd700]"
          />

          <div className="flex flex-col gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <FlagIcon flag="newzealand" className="h-5 w-8 shrink-0" />
              <span className={`font-mono text-[10px] uppercase tracking-widest ${mutedColor}`}>
                Nova Zelândia
              </span>
            </div>

            <h2 className={`font-anton text-3xl uppercase tracking-wide ${headingColor}`}>
              {justPlayer.name}
            </h2>

            <div className="grid grid-cols-2 gap-2 text-sm font-archivo">
              <div>
                <p className={`text-[10px] font-mono uppercase tracking-wider ${mutedColor}`}>Camisa</p>
                <p className={`font-bold ${labelColor}`}>#{justPlayer.number}</p>
              </div>
              <div>
                <p className={`text-[10px] font-mono uppercase tracking-wider ${mutedColor}`}>Posição</p>
                <p className={`font-bold ${labelColor}`}>{getPositionLabel(justPlayer.position)}</p>
              </div>
              {justPlayer.club && (
                <div className="col-span-2">
                  <p className={`text-[10px] font-mono uppercase tracking-wider ${mutedColor}`}>Clube</p>
                  <p className={`font-bold ${labelColor}`}>{justPlayer.club}</p>
                </div>
              )}
            </div>

            {justPlayer.pictureUrl && (
              <p className={`font-mono text-[10px] ${mutedColor}`}>
                Foto carregada via FIFA oficial
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className={`rounded-2xl border p-8 text-center font-mono text-sm ${cardBg} ${mutedColor}`}>
          Dados do jogador indisponíveis no momento.
        </div>
      )}
    </div>
  );
}

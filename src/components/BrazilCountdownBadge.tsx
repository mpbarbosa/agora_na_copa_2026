import { useState } from "react";
import type { Match } from "../types";
import { FlagIcon } from "./FlagIcon";
import { useClockTick } from "../hooks/useClockTick";

const BRAZIL_FLAG_SRC =
  "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Brazil.svg";

function findBrazilFocusMatch(matches: Match[]): Match | null {
  const braMatches = matches
    .filter((m) => m.teamA.code === "BRA" || m.teamB.code === "BRA")
    .sort(
      (a, b) =>
        new Date(a.kickoffTimestamp).getTime() -
        new Date(b.kickoffTimestamp).getTime(),
    );
  return (
    braMatches.find((m) => m.status === "LIVE") ??
    braMatches.find((m) => m.status === "PRE_GAME") ??
    null
  );
}

function formatCountdown(totalSecs: number): string {
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const hh = h.toString().padStart(2, "0");
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  if (d > 0) {
    return `${d.toString().padStart(2, "0")}:${hh}:${mm}:${ss}`;
  }
  return `${hh}:${mm}:${ss}`;
}

interface BrazilCountdownBadgeProps {
  matches: Match[];
}

export function BrazilCountdownBadge({ matches }: BrazilCountdownBadgeProps) {
  const [dismissed, setDismissed] = useState(false);
  const now = useClockTick();

  if (dismissed) return null;

  const match = findBrazilFocusMatch(matches);
  if (!match) return null;

  const isLive = match.status === "LIVE";
  const opponent = match.teamA.code === "BRA" ? match.teamB : match.teamA;
  const secsRemaining = Math.max(
    0,
    Math.floor(
      (new Date(match.kickoffTimestamp).getTime() - now.getTime()) / 1000,
    ),
  );

  return (
    <div
      id="brazil-countdown-badge"
      className="fixed bottom-4 right-4 z-40 w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#050505]/90 backdrop-blur-xl"
      style={{
        boxShadow:
          "0 0 28px rgba(0,156,59,0.22), 0 8px 32px rgba(0,0,0,0.7)",
      }}
    >
      {/* Brazil-colour top stripe */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#009c3b] via-[#ffdf00] to-[#009c3b]" />

      {/* Waving flag + close button */}
      <div
        className="relative overflow-hidden"
        style={{ perspective: "600px" }}
      >
        <img
          src={BRAZIL_FLAG_SRC}
          alt="Bandeira do Brasil"
          className="flag-wave block h-20 w-full object-cover"
        />
        <button
          type="button"
          id="btn-close-brazil-badge"
          onClick={() => setDismissed(true)}
          aria-label="Fechar informações do Brasil"
          className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 leading-none text-white/60 transition hover:bg-black/90 hover:text-white"
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          >
            <line x1="1" y1="1" x2="7" y2="7" />
            <line x1="7" y1="1" x2="1" y2="7" />
          </svg>
        </button>
      </div>

      {/* Info section */}
      <div className="px-3 pb-3 pt-2.5">
        {/* Status label */}
        {isLive ? (
          <div className="mb-2 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00e476] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00e476]" />
            </span>
            <span className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-[#00e476]">
              Brasil ao vivo
            </span>
          </div>
        ) : (
          <p className="mb-2 font-mono text-[8px] uppercase tracking-[0.18em] text-white/40">
            Próximo jogo do Brasil
          </p>
        )}

        {/* Opponent */}
        <div className="flex items-center gap-2">
          <FlagIcon
            flag={opponent.flagSvg}
            className="h-4 w-6 shrink-0 rounded-[2px]"
          />
          <span className="font-anton text-sm uppercase leading-tight tracking-wide text-white">
            {opponent.name}
          </span>
        </div>

        {/* Date · time */}
        <p className="mt-1 font-mono text-[9px] tracking-wide text-white/35">
          {match.kickoffDate} · {match.kickoffTime}
        </p>

        {/* Countdown or live indicator */}
        {isLive ? (
          <div className="mt-2 rounded-lg border border-[#00e476]/20 bg-[#00e476]/8 py-2 text-center">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#00e476]">
              Em campo
            </span>
          </div>
        ) : (
          <div
            className="mt-2 rounded-lg border border-[#ffdf00]/20 bg-[#ffdf00]/8 py-2 text-center"
            aria-live="polite"
          >
            <span
              id="brazil-countdown-timer"
              className="font-mono text-sm font-bold tracking-wider text-[#ffdf00]"
              aria-label={`Faltam ${formatCountdown(secsRemaining)} para o próximo jogo do Brasil`}
            >
              {formatCountdown(secsRemaining)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

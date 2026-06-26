import { useMemo, useState } from "react";
import type { Match } from "../types";
import { FlagIcon } from "./FlagIcon";
import { useClockTick } from "../hooks/useClockTick";
import { buildGroupPositionMap } from "../standings";
import type { ProvisionalSlot } from "../standings";

const BRAZIL_FLAG_SRC =
  "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Brazil.svg";

type FixtureSide = Match["teamA"];

interface ResolvedSide {
  code: string;
  name: string;
  flagSvg: string;
  // True when this side only provisionally holds its slot — i.e. it was resolved from a
  // group position whose occupant isn't mathematically locked yet ("contention"). False
  // for a confirmed/real team OR a group leader already locked into the slot ("qualified").
  provisional: boolean;
}

interface BrazilFocus {
  match: Match;
  opponent: ResolvedSide;
  // True when Brazil or the opponent only provisionally holds its group slot — i.e. the
  // knockout confronto isn't locked yet. Surfaced so the badge never asserts an
  // unconfirmed pairing as certain (a hard data-accuracy rule). Mirrors the bracket's
  // qualified (✓, certain) vs contention ("prov.", uncertain) distinction.
  provisional: boolean;
}

// Resolve a fixture side to the team effectively occupying it. A confirmed side keeps its
// own identity; an unresolved R32 group slot ("1C","2F") resolves to the team currently
// holding that group position, mirroring how BracketView renders the bracket. A slot whose
// occupant is only in "contention" is flagged provisional; a "qualified" occupant is
// already locked into the slot, so the pairing it implies is certain. Returns null for
// slots with no determined occupant yet (winner/best-third refs).
function resolveSide(
  side: FixtureSide,
  groupPositions: Map<string, ProvisionalSlot>,
): ResolvedSide | null {
  const slot = groupPositions.get(side.code);
  if (slot) {
    const { code, name, flagSvg } = slot.team;
    return { code, name, flagSvg, provisional: slot.status !== "qualified" };
  }
  // A confirmed team carries a real flag; an undecided winner/best-third slot does not.
  if (side.flagSvg) {
    return { code: side.code, name: side.name, flagSvg: side.flagSvg, provisional: false };
  }
  return null;
}

// Brazil's most imminent live-or-upcoming fixture, resolving knockout slots from live
// standings so a bracket pairing (e.g. "1C" once Brazil tops its group) still surfaces.
// The badge's source (APP_MATCHES) keeps knockout slots as placeholder codes, unlike
// BracketView which resolves them from live standings — so we apply the same resolution
// here before matching on "BRA".
function findBrazilFocus(
  matches: Match[],
  groupPositions: Map<string, ProvisionalSlot>,
): BrazilFocus | null {
  const braFixtures = matches
    .map((match): BrazilFocus | null => {
      const a = resolveSide(match.teamA, groupPositions);
      const b = resolveSide(match.teamB, groupPositions);
      const braIsA = a?.code === "BRA";
      const braIsB = b?.code === "BRA";
      if (!braIsA && !braIsB) return null;
      const brazil = (braIsA ? a : b)!;
      const opponent = braIsA ? b : a;
      if (!opponent) return null; // opponent slot still undecided — nothing to show
      return {
        match,
        opponent,
        provisional: brazil.provisional || opponent.provisional,
      };
    })
    .filter((f): f is BrazilFocus => f !== null)
    .sort(
      (x, y) =>
        new Date(x.match.kickoffTimestamp).getTime() -
        new Date(y.match.kickoffTimestamp).getTime(),
    );
  return (
    braFixtures.find((f) => f.match.status === "LIVE") ??
    braFixtures.find((f) => f.match.status === "PRE_GAME") ??
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
    return `${d.toString().padStart(2, "0")}d ${hh}h ${mm}m ${ss}s`;
  }
  return `${hh}h ${mm}m ${ss}s`;
}

interface BrazilCountdownBadgeProps {
  matches: Match[];
}

export function BrazilCountdownBadge({ matches }: BrazilCountdownBadgeProps) {
  const [dismissed, setDismissed] = useState(false);
  const now = useClockTick();

  const focus = useMemo(
    () => findBrazilFocus(matches, buildGroupPositionMap(matches)),
    [matches],
  );

  if (dismissed) return null;
  if (!focus) return null;

  const { match, opponent, provisional } = focus;
  const isLive = match.status === "LIVE";
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

        {/* Confronto não confirmado: Brasil e/ou o adversário ainda dependem da
            classificação — sinalizamos para não afirmar um cruzamento incerto. */}
        {!isLive && provisional && (
          <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-[#ffd84d]/80">
            Confronto provável
          </p>
        )}

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

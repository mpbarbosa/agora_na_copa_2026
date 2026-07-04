import React, { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { SquadPlayer } from "../types";
import { getPlayerByFifaId } from "../data/playerRegistry";
import { getPositionLabel } from "../utils/playerDisplay";
import { PlayerPortrait } from "./PlayerOverlayCard";
import { MESSI_FIFA_ID } from "../messiTour";
import { useLocale } from "../i18n";

type Theme = "classic-light" | "stadium-dark";

/** Small read-only player card used as a hover/tap preview inside running text. */
export function PlayerCardCompact({ player, theme }: { player: SquadPlayer; theme: Theme }) {
  const { locale } = useLocale();
  const isDark = theme !== "classic-light";
  return (
    <div
      className={`flex w-64 overflow-hidden rounded-xl border shadow-2xl ${
        isDark ? "border-white/10 bg-[#121414] text-slate-100" : "border-slate-200 bg-white text-slate-900"
      }`}
    >
      <div className="relative h-24 w-20 shrink-0" style={{ background: isDark ? "#0b0d0d" : "#eef2f6" }}>
        <PlayerPortrait
          player={player}
          primaryColor="#1f2937"
          secondaryColor="#374151"
          className="h-full w-full"
          imageClassName="h-full w-full object-cover"
          fallbackTextClassName="text-2xl"
        />
        <span className="absolute bottom-1 right-1 rounded-sm bg-[#009c3b] px-1.5 py-0.5 font-mono text-[10px] font-black text-white">
          {player.number}
        </span>
      </div>
      <div className="min-w-0 flex-1 p-2.5">
        <p className="truncate font-anton text-sm uppercase leading-tight">{player.name}</p>
        <p className={`mt-0.5 font-mono text-[10px] uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          {getPositionLabel(player.position)} · {player.teamCode}
        </p>
        {player.club && (
          <p className={`mt-1 text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>{player.club}</p>
        )}
        {locale !== "es" && player.worldCupNote && (
          <p className="mt-1.5 font-mono text-[9px] uppercase tracking-wider text-[#009c3b]">★ Craque da Copa</p>
        )}
      </div>
    </div>
  );
}

/** An inline player name that reveals a compact card on hover (desktop) or tap (mobile). */
function PlayerMention({ player, label, theme }: { player: SquadPlayer; label: string; theme: Theme }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const isDark = theme !== "classic-light";

  const show = () => {
    window.clearTimeout(closeTimer.current);
    const r = triggerRef.current?.getBoundingClientRect();
    if (r) {
      const cardW = 256;
      const left = Math.min(Math.max(8, r.left), window.innerWidth - cardW - 8);
      setCoords({ top: r.bottom + 6, left });
    }
    setOpen(true);
  };
  // Small delay so the cursor can travel from the word to the card without it closing.
  const scheduleHide = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 90);
  };

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: Event) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || cardRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDocPointer);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        onFocus={show}
        onBlur={scheduleHide}
        onClick={() => (open ? setOpen(false) : show())}
        aria-label={`Ver card de ${player.name}`}
        className={`underline decoration-dotted underline-offset-2 font-semibold transition-colors ${
          isDark ? "text-[#00e476] hover:text-white" : "text-[#009c3b] hover:text-[#007a2e]"
        }`}
      >
        {label}
      </button>
      {open &&
        createPortal(
          <div
            ref={cardRef}
            className="fixed z-[9999]"
            style={{ top: coords.top, left: coords.left }}
            onMouseEnter={show}
            onMouseLeave={scheduleHide}
          >
            <PlayerCardCompact player={player} theme={theme} />
          </div>,
          document.body,
        )}
    </>
  );
}

/**
 * Renders analysis body text, turning each standalone "Messi" into a hover/tap
 * mention that previews his compact player card. Falls back to plain text if the
 * player can't be resolved or isn't mentioned.
 */
export function renderAnalysisWithMentions(text: string, theme: Theme): React.ReactNode {
  const messi = getPlayerByFifaId(MESSI_FIFA_ID);
  if (!messi) return text;
  const parts = text.split(/(\bMessi\b)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part === "Messi" ? <PlayerMention player={messi} label={part} theme={theme} /> : part}
    </Fragment>
  ));
}

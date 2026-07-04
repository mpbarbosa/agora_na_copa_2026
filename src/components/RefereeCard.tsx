import { useState } from "react";
import { FlagIcon } from "./FlagIcon";
import { InstagramBrandIcon } from "./InstagramBrandIcon";
import { InstagramPostFrame } from "./InstagramPostFrame";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useT } from "../i18n";
import { standings } from "../data/tournament";
import type { MatchReferee } from "../types";

const FLAG_BY_CODE = new Map(standings.map((row) => [row.code, row.flagSvg]));

interface RefereeCardProps {
  theme: "classic-light" | "stadium-dark";
  referee: MatchReferee;
  /** Optional Instagram highlight permalinks — collapsible embed, like the coach card. */
  instagramPostUrls?: string[];
  onClose: () => void;
  id?: string;
}

// First letters of the first two name words, e.g. "Katia Garcia" → "KG".
function refereeInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toLocaleUpperCase("pt-BR") ?? "")
    .join("");
}

/**
 * Referee overlay card — the match-official analogue of `CoachCard`. Referees
 * carry far less data than coaches (FIFA publishes only name + nationality, and
 * there is no win/loss record to compute), so the card is intentionally lean: a
 * header (name, nationality flag, initials avatar) plus an optional collapsible
 * "Destaque(s) no Instagram" embed. Opened from the now-clickable `RefereeChip`.
 */
export function RefereeCard({ theme, referee, instagramPostUrls, onClose, id }: RefereeCardProps) {
  const t = useT();
  useEscapeKey(onClose);
  const [igExpanded, setIgExpanded] = useState(false);
  const igPosts = instagramPostUrls ?? [];
  const hasInstagramHighlights = igPosts.length > 0;

  const accent = "#eab308"; // amber — a neutral referee tone (no team colour)
  const isLight = theme === "classic-light";
  const cardBg = isLight ? "bg-white text-slate-900" : "bg-[#0c0d0e] text-white";
  const borderColor = isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)";
  const mutedClasses = isLight ? "text-slate-500" : "text-slate-400";
  const closeClasses = isLight
    ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
    : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10";

  const flagSvg = referee.country ? FLAG_BY_CODE.get(referee.country) : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 p-0 backdrop-blur-md sm:items-center sm:p-4"
      id={id}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-t-2xl border shadow-2xl sm:max-h-[90vh] sm:rounded-xl ${cardBg}`}
        style={{ borderColor }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full" style={{ background: accent }} />

        {/* Header */}
        <div className="relative overflow-hidden border-b px-4 py-3 sm:px-5 sm:py-4" style={{ borderColor }}>
          <button
            type="button"
            id={id ? `btn-close-${id}` : undefined}
            onClick={onClose}
            className={`absolute right-4 top-4 z-10 rounded border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition ${closeClasses}`}
          >
            {t("playerCard.close")}
          </button>

          <p className={`font-mono text-[10px] uppercase tracking-[0.25em] ${mutedClasses}`}>
            {t("playerCard.refereeEyebrow")}
          </p>

          <div className="mt-2 flex items-center gap-3 pr-16 sm:pr-20">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-anton text-lg leading-none sm:h-14 sm:w-14 sm:text-xl"
              style={{ background: `${accent}1f`, color: accent, border: `2px solid ${accent}55` }}
              aria-hidden="true"
            >
              {refereeInitials(referee.name)}
            </div>
            <div className="min-w-0">
              <h4 className="font-anton text-2xl uppercase leading-none tracking-wide sm:text-4xl">
                {referee.name}
              </h4>
              <p className={`mt-1.5 flex items-center gap-1.5 font-archivo text-sm ${mutedClasses}`}>
                {flagSvg && <FlagIcon flag={flagSvg} className="h-3.5 w-5 shrink-0" />}
                <span>Árbitro(a){referee.country ? ` • ${referee.country}` : ""}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5">
          <p className={`font-archivo text-sm leading-relaxed ${mutedClasses}`}>
            Árbitro(a) principal designado(a) pela FIFA para a partida.
          </p>

          {/* Destaque(s) no Instagram — collapsible embed, mirroring the coach card */}
          {hasInstagramHighlights && (
            <div className="mt-5" id={id ? `${id}-ig-highlight` : undefined}>
              <button
                type="button"
                onClick={() => setIgExpanded((open) => !open)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 transition ${
                  isLight
                    ? "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
                aria-expanded={igExpanded}
                id={id ? `${id}-ig-toggle` : undefined}
              >
                <span className="flex items-center gap-2">
                  <InstagramBrandIcon size={16} />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
                    {igPosts.length > 1 ? "Destaques no Instagram" : "Destaque no Instagram"}
                  </span>
                </span>
                <span
                  className={`font-mono text-[10px] transition-transform duration-200 ${igExpanded ? "rotate-180" : ""} ${mutedClasses}`}
                >
                  ▾
                </span>
              </button>

              {igExpanded && (
                <div className="mt-3 space-y-5" id={id ? `${id}-ig-panel` : undefined}>
                  {igPosts.map((postUrl, index) => (
                    <div key={postUrl} className="space-y-3">
                      <InstagramPostFrame
                        permalink={postUrl}
                        id={id ? `${id}-ig-embed-${index}` : undefined}
                      />
                      <a
                        href={postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        id={id ? `${id}-ig-open-${index}` : undefined}
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${closeClasses}`}
                        style={{ borderColor: `${accent}40` }}
                      >
                        <InstagramBrandIcon size={14} />
                        Abrir no Instagram
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

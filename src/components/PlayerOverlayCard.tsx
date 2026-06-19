import React, { useState } from "react";
import { Position, type Player, type PlayerSocials } from "../types";
import { InstagramBrandIcon } from "./InstagramBrandIcon";
import { FlagIcon } from "./FlagIcon";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { getPlayerSocialEntries } from "../utils/playerDisplay";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

export const getPlayerAge = (dateOfBirth: string): number =>
  Math.floor((Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000));

const PT_MONTHS_SHORT = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

// Formats "1993-07-28" → "28 jul. 1993" without timezone shift risk
export function formatBirthDate(isoDate: string): string {
  const [yearStr, monthStr, dayStr] = isoDate.split("-");
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  return `${day} ${PT_MONTHS_SHORT[month - 1]} ${yearStr}`;
}

interface TournamentStats {
  goals: number;
  yellowCards: number;
  redCards: number;
}

// Returns stat cells for goals/yellows/reds, only including rows with value > 0.
export function buildTournamentStatCells(
  stats: TournamentStats | null | undefined,
  theme: "classic-light" | "stadium-dark",
) {
  if (!stats) return [];
  const cells = [];
  if (stats.goals > 0)
    cells.push({
      label: "Gols",
      value: stats.goals,
      accent: theme === "classic-light" ? "text-[#065f2c]" : "text-[#00e476]",
    });
  if (stats.yellowCards > 0)
    cells.push({
      label: "Amarelos",
      value: stats.yellowCards,
      accent: theme === "classic-light" ? "text-[#9a6700]" : "text-[#ffd84d]",
    });
  if (stats.redCards > 0)
    cells.push({
      label: "Vermelhos",
      value: stats.redCards,
      accent: theme === "classic-light" ? "text-[#9f1239]" : "text-[#ff879d]",
    });
  return cells;
}

const SOCIAL_PLATFORM_LABELS: Record<keyof PlayerSocials, string> = {
  instagram: "Instagram",
  x: "X",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  site: "Site oficial",
};

const SOCIAL_BASE_URLS: Partial<Record<keyof PlayerSocials, string>> = {
  instagram: "https://www.instagram.com/",
  x:         "https://x.com/",
  tiktok:    "https://www.tiktok.com/@",
  youtube:   "https://www.youtube.com/@",
  facebook:  "https://www.facebook.com/",
};

function getSocialUrl(platform: keyof PlayerSocials, value: string): string {
  const base = SOCIAL_BASE_URLS[platform];
  if (!base) return value; // "site" already stores the full URL
  if (value.startsWith("http")) return value;
  return `${base}${value}`;
}

export function renderSocialPlatformLabel(platform: keyof PlayerSocials) {
  if (platform === "instagram") {
    return (
      <>
        <InstagramBrandIcon size={16} />
        <span className="sr-only">{SOCIAL_PLATFORM_LABELS[platform]}</span>
      </>
    );
  }
  return SOCIAL_PLATFORM_LABELS[platform];
}

// ─── PlayerPortrait ───────────────────────────────────────────────────────────

export interface PlayerPortraitProps {
  player: { name: string; number?: number; pictureUrl?: string };
  primaryColor: string;
  secondaryColor: string;
  className: string;
  fallbackTextClassName?: string;
  imageClassName?: string;
  imgId?: string;
  showNumberBadge?: boolean;
  numberBadgeClassName?: string;
  numberBadgeStyle?: React.CSSProperties;
}

export function PlayerPortrait({
  player,
  primaryColor,
  secondaryColor,
  className,
  fallbackTextClassName = "",
  imageClassName = "h-full w-full object-cover",
  imgId,
  showNumberBadge = false,
  numberBadgeClassName = "",
  numberBadgeStyle,
}: PlayerPortraitProps) {
  const [failedUrl, setFailedUrl] = useState<string | undefined>(undefined);
  const showImage = Boolean(player.pictureUrl) && player.pictureUrl !== failedUrl;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {showImage ? (
        <img
          src={player.pictureUrl}
          alt={`Foto de ${player.name}`}
          id={imgId}
          className={imageClassName}
          loading="lazy"
          decoding="async"
          onError={() => setFailedUrl(player.pictureUrl)}
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center font-bold font-mono text-white ${fallbackTextClassName}`}
          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
        >
          {player.number}
        </div>
      )}
      {showImage && showNumberBadge && (
        <span className={numberBadgeClassName} style={numberBadgeStyle}>{player.number}</span>
      )}
    </div>
  );
}

// ─── PlayerPictureOverlay ─────────────────────────────────────────────────────

interface PlayerPictureOverlayProps {
  player: Pick<Player, "name" | "pictureUrl">;
  onClose: () => void;
  id?: string;
}

export function PlayerPictureOverlay({ player, onClose, id }: PlayerPictureOverlayProps) {
  useEscapeKey(onClose);

  if (!player.pictureUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      id={id}
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] max-w-[92vw] rounded-2xl border border-white/10 bg-[#050505]/95 p-3 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          id={id ? `btn-close-${id}` : undefined}
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/70 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white transition hover:bg-black/90"
        >
          Fechar
        </button>
        <img
          src={player.pictureUrl}
          alt={`Foto ampliada de ${player.name}`}
          className="block h-auto max-h-[calc(92vh-1.5rem)] w-auto max-w-[calc(92vw-1.5rem)] rounded-xl object-contain"
        />
      </div>
    </div>
  );
}

// ─── PlayerOverlayCard ────────────────────────────────────────────────────────

interface StatCell {
  label: string;
  value: string | number;
  accent?: string;
}

interface DetailRow {
  label?: string;
  value: string;
  fullWidth?: boolean;
}

interface PlayerOverlayCardProps {
  theme: "classic-light" | "stadium-dark";
  player: {
    name: string;
    fullName?: string;
    number?: number;
    position?: Position;
    club?: string;
    pictureUrl?: string;
    socials?: PlayerSocials;
    instagramPostUrl?: string;
    captain?: boolean;
    dateOfBirth?: string;
    height?: number;
  };
  teamName: string;
  primaryColor?: string;
  secondaryColor?: string;
  flagSvg?: string;
  onOpenTeamView?: () => void;
  stats: StatCell[];
  details?: DetailRow[];
  onClose: () => void;
  onOpenPicture?: () => void;
  openPictureButtonId?: string;
  id?: string;
}

const INSTAGRAM_ORIGIN = "https://www.instagram.com/";

function isSafeInstagramUrl(url: string): boolean {
  return url.startsWith(INSTAGRAM_ORIGIN);
}

export function PlayerOverlayCard({
  theme,
  player,
  teamName,
  primaryColor,
  secondaryColor,
  flagSvg,
  onOpenTeamView,
  stats,
  details,
  onClose,
  onOpenPicture,
  openPictureButtonId,
  id,
}: PlayerOverlayCardProps) {
  useEscapeKey(onClose);
  const [igExpanded, setIgExpanded] = useState(false);
  const igScriptLoadedRef = React.useRef(false);

  const accent = primaryColor ?? "#00e476";
  const isLight = theme === "classic-light";

  const cardBg = isLight ? "bg-white text-slate-900" : "bg-[#0c0d0e] text-white";
  const borderColor = isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)";
  const mutedClasses = isLight ? "text-slate-500" : "text-slate-400";
  const closeClasses = isLight
    ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
    : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10";
  const photoBg = isLight ? `${accent}12` : "#111314";

  const socials = getPlayerSocialEntries(player.socials);
  const safeInstagramPostUrl =
    player.instagramPostUrl && isSafeInstagramUrl(player.instagramPostUrl)
      ? player.instagramPostUrl
      : null;

  const handleToggleIg = () => {
    setIgExpanded((prev) => {
      const opening = !prev;
      if (opening) {
        if (!igScriptLoadedRef.current) {
          const script = document.createElement("script");
          script.src = "https://www.instagram.com/embed.js";
          script.async = true;
          document.head.appendChild(script);
          igScriptLoadedRef.current = true;
        } else {
          window.instgrm?.Embeds.process();
        }
      }
      return opening;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 p-0 backdrop-blur-md sm:items-center sm:p-4"
      id={id}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-t-2xl border shadow-2xl sm:max-h-none sm:overflow-visible sm:rounded-xl ${cardBg}`}
        style={{ borderColor }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Top accent bar — team colour */}
        <div className="h-1 w-full" style={{ background: accent }} />

        {/* Header */}
        <div className="relative overflow-hidden border-b px-4 py-3 sm:px-5 sm:py-4" style={{ borderColor }}>
          {/* Jersey number watermark */}
          {player.number != null && (
            <span
              className="pointer-events-none absolute right-2 top-0 select-none font-anton leading-none"
              style={{ fontSize: "clamp(80px, 14vw, 120px)", color: accent, opacity: 0.07 }}
              aria-hidden="true"
            >
              {player.number}
            </span>
          )}

          {/* Close */}
          <button
            type="button"
            id={id ? `btn-close-${id}` : undefined}
            onClick={onClose}
            className={`absolute right-4 top-4 z-10 rounded border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition ${closeClasses}`}
          >
            Fechar
          </button>

          <p className={`font-mono text-[10px] uppercase tracking-[0.25em] ${mutedClasses}`}>
            Card completo do jogador
          </p>

          <div className="mt-2 flex items-center gap-3 pr-16 sm:pr-20">
            {flagSvg && onOpenTeamView && (
              <button
                type="button"
                onClick={onOpenTeamView}
                className="shrink-0 transition hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-white/30"
                aria-label={`Abrir painel completo de ${teamName}`}
              >
                <FlagIcon flag={flagSvg} className="h-6 w-9 shrink-0" />
              </button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-anton text-2xl uppercase leading-none tracking-wide sm:text-4xl">
                  {player.name}
                </h4>
                {player.captain && (
                  <span
                    className="shrink-0 rounded-sm border px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider"
                    style={{ color: accent, borderColor: `${accent}60`, background: `${accent}15` }}
                  >
                    C
                  </span>
                )}
              </div>
              {player.fullName && player.fullName !== player.name && (
                <p className={`mt-0.5 font-archivo text-xs ${mutedClasses}`}>{player.fullName}</p>
              )}
            </div>
          </div>

          <p className={`mt-1.5 font-archivo text-sm ${mutedClasses}`}>
            {onOpenTeamView ? (
              <button
                type="button"
                onClick={onOpenTeamView}
                className="transition hover:opacity-70"
              >
                {teamName}
              </button>
            ) : (
              teamName
            )}
            {player.club ? ` • ${player.club}` : ""}
          </p>
        </div>

        {/* Body */}
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Portrait column */}
          <div className="border-b p-4 lg:border-b-0 lg:border-r" style={{ borderColor }}>
            <div
              className="flex min-h-[180px] items-center justify-center overflow-hidden rounded-lg border sm:min-h-[320px]"
              style={{ background: photoBg, borderColor }}
            >
              <PlayerPortrait
                player={player}
                primaryColor={primaryColor ?? "#000"}
                secondaryColor={secondaryColor ?? "#333"}
                className="h-full w-full"
                fallbackTextClassName="text-6xl"
                imageClassName="h-full max-h-[420px] w-full object-contain p-4"
                imgId={id ? `${id}-hero-image` : undefined}
                showNumberBadge
                numberBadgeClassName="absolute bottom-3 right-3 rounded-sm px-2.5 py-1 font-mono text-xs font-black text-white"
                numberBadgeStyle={{ background: accent }}
              />
            </div>
            {player.pictureUrl && onOpenPicture && (
              <button
                type="button"
                id={openPictureButtonId}
                onClick={onOpenPicture}
                className={`mt-3 inline-flex rounded border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${closeClasses}`}
              >
                Abrir foto em tamanho real
              </button>
            )}
          </div>

          {/* Stats + details column */}
          <div className="p-4 sm:p-5">
            {/* Stat tiles — editorial left-border blocks */}
            <div
              className="grid grid-cols-3 gap-2"
              id={id ? `${id}-stats` : undefined}
            >
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="border-l-[3px] pl-3 py-1.5"
                  style={{ borderLeftColor: accent }}
                >
                  <p
                    className={`font-anton text-2xl uppercase leading-none ${stat.accent ?? ""}`}
                    style={!stat.accent ? { color: accent } : {}}
                  >
                    {stat.value}
                  </p>
                  <p className={`mt-1 font-mono text-[9px] uppercase tracking-wider ${mutedClasses}`}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Detail rows — clean key/value with hairline dividers */}
            {details && details.length > 0 && (
              <div
                className="mt-5 border-t font-archivo text-sm"
                style={{ borderColor }}
                id={id ? `${id}-details` : undefined}
              >
                {details.map((detail, i) =>
                  detail.fullWidth ? (
                    <div
                      key={i}
                      className="border-b py-3"
                      style={{ borderColor }}
                    >
                      {detail.label && (
                        <p className={`mb-1 font-mono text-[9px] uppercase tracking-wider ${mutedClasses}`}>
                          {detail.label}
                        </p>
                      )}
                      <p className="leading-6">{detail.value}</p>
                    </div>
                  ) : (
                    <div
                      key={i}
                      className="flex items-center justify-between border-b py-2.5"
                      style={{ borderColor }}
                    >
                      <span className={`font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                        {detail.label}
                      </span>
                      <span className="font-semibold tabular-nums">{detail.value}</span>
                    </div>
                  ),
                )}
              </div>
            )}

            {/* Social links */}
            {socials.length > 0 && (
              <div className="mt-5" id={id ? `${id}-social-links` : undefined}>
                <p className={`font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                  Redes oficiais
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {socials.map(([platform, url]) => (
                    <a
                      key={platform}
                      id={id ? `${id}-social-link-${platform}` : undefined}
                      href={getSocialUrl(platform, url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center justify-center rounded border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${closeClasses}`}
                      style={{ borderColor: `${accent}40` }}
                    >
                      {renderSocialPlatformLabel(platform)}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Destaque no Instagram */}
            {safeInstagramPostUrl && (
              <div className="mt-5" id={id ? `${id}-ig-highlight` : undefined}>
                <button
                  type="button"
                  onClick={handleToggleIg}
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
                      Destaque no Instagram
                    </span>
                  </span>
                  <span
                    className={`font-mono text-[10px] transition-transform duration-200 ${igExpanded ? "rotate-180" : ""} ${mutedClasses}`}
                  >
                    ▾
                  </span>
                </button>

                {igExpanded && (
                  <div className="mt-3 space-y-3" id={id ? `${id}-ig-panel` : undefined}>
                    <blockquote
                      className="instagram-media"
                      data-instgrm-permalink={safeInstagramPostUrl}
                      data-instgrm-version="14"
                      style={{ width: "100%", minWidth: 0, margin: 0 }}
                    />
                    <a
                      href={safeInstagramPostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      id={id ? `${id}-ig-open` : undefined}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${closeClasses}`}
                      style={{ borderColor: `${accent}40` }}
                    >
                      <InstagramBrandIcon size={14} />
                      Abrir no Instagram
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

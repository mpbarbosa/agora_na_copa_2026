import { useState } from "react";
import { Position, type Player, type PlayerSocials } from "../types";
import { InstagramBrandIcon } from "./InstagramBrandIcon";
import { FlagIcon } from "./FlagIcon";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { getPlayerSocialEntries } from "../utils/playerDisplay";

export const getPlayerAge = (dateOfBirth: string): number =>
  Math.floor((Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000));

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
        <span className={numberBadgeClassName}>{player.number}</span>
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

  const cardClasses =
    theme === "classic-light"
      ? "border-slate-200 bg-white text-slate-900"
      : "border-white/10 bg-[#121414] text-white";
  const mutedClasses = theme === "classic-light" ? "text-slate-600" : "text-slate-300";
  const buttonClasses =
    theme === "classic-light"
      ? "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
      : "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10";
  const detailBgClasses =
    theme === "classic-light" ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/5";
  const dividerColor =
    theme === "classic-light" ? "rgb(226 232 240)" : "rgb(255 255 255 / 0.08)";
  const socialButtonClasses =
    theme === "classic-light"
      ? "border-slate-200 bg-slate-50 text-slate-700 hover:border-[#065f2c]/30 hover:text-[#065f2c]"
      : "border-white/10 bg-white/5 text-white hover:border-[#ffd700]/40 hover:text-[#ffd700]";

  const socials = getPlayerSocialEntries(player.socials);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      id={id}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-2xl overflow-hidden rounded-3xl border shadow-2xl ${cardClasses}`}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div
          className="border-b px-5 py-4"
          style={{
            background: `linear-gradient(135deg, ${primaryColor ?? "#000"}22, ${secondaryColor ?? "#333"}22)`,
            borderColor: dividerColor,
          }}
        >
          <button
            type="button"
            id={id ? `btn-close-${id}` : undefined}
            onClick={onClose}
            className={`absolute right-4 top-4 rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition ${buttonClasses}`}
          >
            Fechar
          </button>
          <p className={`font-mono text-[10px] uppercase tracking-[0.25em] ${mutedClasses}`}>
            Card completo do jogador
          </p>
          <div className="mt-2 flex items-center gap-3 pr-20">
            {flagSvg && onOpenTeamView && (
              <button
                type="button"
                onClick={onOpenTeamView}
                className="shrink-0 rounded transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#ffd84d]/70"
                aria-label={`Abrir painel completo de ${teamName}`}
              >
                <FlagIcon flag={flagSvg} className="h-6 w-9 shrink-0" />
              </button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-anton text-3xl uppercase tracking-wide">{player.name}</h4>
                {player.captain && (
                  <span className="shrink-0 rounded-full border border-[#ffd700]/60 bg-[#ffd700]/15 px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-[#ffd700]">
                    C
                  </span>
                )}
              </div>
              {player.fullName && player.fullName !== player.name && (
                <p className={`font-archivo text-xs ${mutedClasses}`}>{player.fullName}</p>
              )}
            </div>
          </div>
          <p className={`mt-1 font-archivo text-sm ${mutedClasses}`}>
            {onOpenTeamView ? (
              <button
                type="button"
                onClick={onOpenTeamView}
                className={`transition hover:opacity-80 ${
                  theme === "classic-light" ? "hover:text-[#065f2c]" : "hover:text-[#ffd84d]"
                }`}
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
          <div
            className="border-b p-4 lg:border-b-0 lg:border-r"
            style={{ borderColor: dividerColor }}
          >
            <div
              className={`flex min-h-[320px] items-center justify-center overflow-hidden rounded-3xl border ${
                theme === "classic-light"
                  ? "border-slate-200 bg-slate-50"
                  : "border-white/10 bg-[#161919]"
              }`}
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
                numberBadgeClassName="absolute bottom-4 right-4 rounded-full border border-white/10 bg-black/80 px-3 py-1 font-mono text-xs font-black text-[#ffd700]"
              />
            </div>
            {player.pictureUrl && onOpenPicture && (
              <button
                type="button"
                id={openPictureButtonId}
                onClick={onOpenPicture}
                className={`mt-3 inline-flex rounded-full border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${buttonClasses}`}
              >
                Abrir foto em tamanho real
              </button>
            )}
          </div>

          <div className="p-5">
            <div
              className="grid grid-cols-1 gap-3 sm:grid-cols-3"
              id={id ? `${id}-stats` : undefined}
            >
              {stats.map((stat) => (
                <div key={stat.label} className={`rounded-2xl border px-3 py-3 ${detailBgClasses}`}>
                  <p className={`font-anton text-lg uppercase ${stat.accent ?? "text-[#00e476]"}`}>
                    {stat.value}
                  </p>
                  <p
                    className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {details && details.length > 0 && (
              <div
                className="mt-4 space-y-2 text-sm font-archivo"
                id={id ? `${id}-details` : undefined}
              >
                {details.map((detail, i) =>
                  detail.fullWidth ? (
                    <div key={i} className={`rounded-2xl border px-3 py-3 ${detailBgClasses}`}>
                      {detail.label && <p className={mutedClasses}>{detail.label}</p>}
                      <p className="mt-1 leading-6">{detail.value}</p>
                    </div>
                  ) : (
                    <div
                      key={i}
                      className={`flex items-center justify-between rounded-2xl border px-3 py-3 ${detailBgClasses}`}
                    >
                      <span className={mutedClasses}>{detail.label}</span>
                      <span className="font-semibold text-right">{detail.value}</span>
                    </div>
                  ),
                )}
              </div>
            )}

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
                      className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${socialButtonClasses}`}
                    >
                      {renderSocialPlatformLabel(platform)}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

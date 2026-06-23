import PLAYER_VIDEOS from "../data/playerVideos.json";

type PlayerVideo = { embedUrl: string; title: string };
const PLAYER_VIDEOS_BY_FIFA_ID = PLAYER_VIDEOS as Record<string, PlayerVideo[]>;

// Extracts the YouTube id from an /embed/<id> URL (ignoring any query string).
const getYoutubeId = (embedUrl: string) => embedUrl.match(/\/embed\/([^?/]+)/)?.[1] ?? "";

interface PlayerVideoRailProps {
  fifaId?: string;
  playerName: string;
  isLight: boolean;
  accent: string;
  mutedClasses: string;
  id?: string;
}

/**
 * Horizontal carousel ("trilho") of YouTube videos about a player, keyed by the
 * player's FIFA id in `playerVideos.json`. Each card is a thumbnail that opens
 * the video on YouTube in a new tab. Renders nothing when the player has no
 * curated videos, so it is safe to mount for every player card.
 */
export function PlayerVideoRail({
  fifaId,
  playerName,
  isLight,
  accent,
  mutedClasses,
  id,
}: PlayerVideoRailProps) {
  const videos = (fifaId && PLAYER_VIDEOS_BY_FIFA_ID[fifaId]) || [];
  if (videos.length === 0) return null;

  const borderColor = isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)";

  return (
    <div className="border-t px-4 py-4 sm:px-5" style={{ borderColor }} id={id}>
      <p className={`font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
        Vídeos do jogador
      </p>

      <div className="mt-3 flex items-stretch gap-3 overflow-x-auto pb-1">
        {videos.map((video, idx) => {
          const videoId = getYoutubeId(video.embedUrl);
          const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
          const thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          return (
            <a
              key={`${videoId}-${idx}`}
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={id ? `${id}-item` : undefined}
              aria-label={`Assistir no YouTube: ${video.title}`}
              title={video.title}
              className="group block w-[172px] shrink-0"
            >
              <span
                className="relative block overflow-hidden rounded-xl border"
                style={{ width: 172, height: 96, borderColor }}
              >
                <img
                  src={thumbUrl}
                  alt={video.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <span className="absolute inset-0 bg-black/30 transition-colors group-hover:bg-black/20" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff0000] transition-transform group-hover:scale-110">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 translate-x-px fill-white" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </span>
              </span>
              <span
                className={`mt-1.5 line-clamp-2 block font-archivo text-[11px] leading-snug ${
                  isLight ? "text-slate-700" : "text-slate-200"
                }`}
                style={{ maxWidth: 172 }}
              >
                {video.title}
              </span>
            </a>
          );
        })}
      </div>

      <p className={`mt-1 font-mono text-[9px] uppercase tracking-wider ${mutedClasses}`}>
        Vídeos sobre {playerName} no YouTube
        <span className="sr-only"> (abrem em uma nova aba)</span>
        <span aria-hidden="true" style={{ color: accent }}> ▸</span>
      </p>
    </div>
  );
}

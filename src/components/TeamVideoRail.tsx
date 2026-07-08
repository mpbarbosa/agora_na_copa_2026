import TEAM_VIDEOS from "../data/teamVideos.json";

type TeamVideo = { embedUrl: string; title: string };
const TEAM_VIDEOS_BY_CODE = TEAM_VIDEOS as Record<string, TeamVideo[]>;

// Extracts the YouTube id from an /embed/<id> URL (ignoring any query string).
const getYoutubeId = (embedUrl: string) => embedUrl.match(/\/embed\/([^?/]+)/)?.[1] ?? "";

interface TeamVideoRailProps {
  /** Team code (e.g. "USA") — keys into teamVideos.json. */
  teamCode: string;
  teamName: string;
  theme: "classic-light" | "stadium-dark";
}

/**
 * "Vídeos da seleção" section on a national-team page (`TeamLineupView`) — the
 * team-level analogue of `PlayerVideoRail`. Renders the team's curated YouTube
 * videos from `src/data/teamVideos.json` (coach press conferences, team
 * features, official broadcaster/federation content) as a horizontal carousel
 * of thumbnails that open on YouTube in a new tab. Renders nothing when the
 * team carries no videos, so it is safe to mount for every team page.
 */
export function TeamVideoRail({ teamCode, teamName, theme }: TeamVideoRailProps) {
  const videos = TEAM_VIDEOS_BY_CODE[teamCode] ?? [];
  if (videos.length === 0) return null;

  const isLight = theme === "classic-light";
  const cardClasses = isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#121414] border-white/10";
  const headingClasses = isLight ? "text-slate-900" : "text-white";
  const mutedClasses = isLight ? "text-slate-600" : "text-slate-300";
  const borderColor = isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)";

  return (
    <section
      className={`rounded-3xl border p-4 md:p-6 ${cardClasses}`}
      id="team-view-videos"
      data-testid="team-videos"
    >
      <h3 className={`font-anton text-xl uppercase tracking-wide ${headingClasses}`}>
        Vídeos da seleção
      </h3>
      <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
        Vídeos sobre {teamName} no YouTube
      </p>

      <div className="mt-4 flex items-stretch gap-3 overflow-x-auto pb-1">
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
              data-testid="team-videos-item"
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
    </section>
  );
}

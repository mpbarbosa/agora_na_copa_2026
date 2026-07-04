import TEAM_INSTAGRAM from "../data/teamInstagram.json";
import { useT } from "../i18n";
import { resolveInstagramPostUrls } from "../utils/instagram";
import { InstagramPostFrame } from "./InstagramPostFrame";
import { InstagramBrandIcon } from "./InstagramBrandIcon";

interface TeamInstagramHighlightsProps {
  /** Team code (e.g. "BRA") — keys into teamInstagram.json. */
  teamCode: string;
  theme: "classic-light" | "stadium-dark";
}

// Per-team Instagram permalinks, keyed by team code. Built once at module load.
const POSTS_BY_TEAM: Record<string, string[]> = TEAM_INSTAGRAM;

/**
 * "Destaques no Instagram" section on a national-team page (`TeamLineupView`).
 * Renders the team's curated Instagram posts from `src/data/teamInstagram.json`
 * via the blocker-resilient `/embed/` iframe (`InstagramPostFrame`), each paired
 * with an "Abrir no Instagram" link so the user is never stranded if the iframe
 * fails to load. Renders nothing when the team carries no posts.
 */
export function TeamInstagramHighlights({ teamCode, theme }: TeamInstagramHighlightsProps) {
  const t = useT();
  const posts = resolveInstagramPostUrls(POSTS_BY_TEAM[teamCode], undefined);
  if (posts.length === 0) return null;

  const isLight = theme === "classic-light";
  const cardClasses = isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#121414] border-white/10";
  const headingClasses = isLight ? "text-slate-900" : "text-white";
  const mutedClasses = isLight ? "text-slate-600" : "text-slate-300";
  const openClasses = isLight
    ? "border-slate-200 text-slate-700 hover:bg-white"
    : "border-white/15 text-slate-100 hover:bg-white/10";

  return (
    <section
      className={`rounded-3xl border p-4 md:p-6 ${cardClasses}`}
      id="team-view-instagram"
      data-testid="team-instagram"
    >
      <div className="flex items-center gap-2">
        <InstagramBrandIcon size={20} />
        <h3 className={`font-anton text-xl uppercase tracking-wide ${headingClasses}`}>
          {t("playerCard.instagramHighlightMany")}
        </h3>
      </div>
      <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
        {t("teamLineup.igHighlightsSubtitle")}
      </p>

      <div className="mx-auto mt-4 max-w-md space-y-5">
        {posts.map((postUrl, index) => (
          <div key={postUrl} className="space-y-3">
            <InstagramPostFrame permalink={postUrl} id={`team-instagram-embed-${index}`} />
            <a
              href={postUrl}
              target="_blank"
              rel="noopener noreferrer"
              id={`team-instagram-open-${index}`}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${openClasses}`}
            >
              <InstagramBrandIcon size={14} />
              {t("playerCard.openInstagram")}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

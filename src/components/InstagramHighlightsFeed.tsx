import { useEffect, useMemo, useState } from "react";
import { useT } from "../i18n";
import { getInstagramHighlights } from "../data/instagramHighlights";
import { getPositionLabel } from "../utils/playerDisplay";
import { InstagramBrandIcon } from "./InstagramBrandIcon";
import { InstagramEmbed } from "./InstagramEmbed";
import { FlagIcon } from "./FlagIcon";

interface InstagramHighlightsFeedProps {
  theme: "classic-light" | "stadium-dark";
  /**
   * A request from the carousel above to focus a player's card: expand it (so its
   * embed mounts) and scroll it into view. A fresh object (incrementing nonce)
   * re-triggers the scroll even when the same player is clicked twice.
   */
  focus?: { fifaId: string; nonce: number } | null;
}

// A feed of real player Instagram highlights for the Redes Sociais tab. Each
// card mounts its embed lazily — only the first is open by default and the rest
// load on tap — so the page never spins up many Instagram iframes at once (the
// same performance posture as the per-player overlay). Renders nothing when no
// player carries a highlight, keeping the tab clean.
export function InstagramHighlightsFeed({ theme, focus }: InstagramHighlightsFeedProps) {
  const t = useT();
  const highlights = useMemo(getInstagramHighlights, []);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    highlights.length > 0 ? { [highlights[0].fifaId]: true } : {},
  );

  // Respond to a carousel click: expand that player's card (mount its embed) and
  // scroll it into view under the sticky header (the card's `scroll-mt` clears it).
  // Scroll synchronously with an instant jump: the card always renders (only its
  // embed panel is conditional) and expands downward, so its top offset is stable —
  // no defer needed. (Both native smooth scroll and a requestAnimationFrame-deferred
  // jump proved to be no-ops inside this app shell; an immediate jump is reliable.)
  useEffect(() => {
    if (!focus) return;
    const { fifaId } = focus;
    setExpanded((prev) => (prev[fifaId] ? prev : { ...prev, [fifaId]: true }));
    document.getElementById(`ig-highlight-card-${fifaId}`)?.scrollIntoView({ block: "start" });
  }, [focus]);

  if (highlights.length === 0) return null;

  const isLight = theme === "classic-light";
  const shellClasses = isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#121414] border-white/10";
  const cardClasses = isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10";
  const headingClasses = isLight ? "text-slate-900" : "text-white";
  const mutedClasses = isLight ? "text-slate-500" : "text-slate-400";
  const toggleHover = isLight ? "hover:bg-slate-100" : "hover:bg-white/10";
  const openClasses = isLight
    ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
    : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10";

  const toggle = (fifaId: string) =>
    setExpanded((prev) => ({ ...prev, [fifaId]: !prev[fifaId] }));

  return (
    <section
      id="instagram-highlights-feed"
      aria-label={t("fanSocial.igHighlightsAria")}
      className={`mt-6 rounded-3xl border p-5 ${shellClasses}`}
    >
      <div className="flex items-center gap-2">
        <InstagramBrandIcon size={20} />
        <h3 className={`font-anton text-lg uppercase tracking-wide ${headingClasses}`}>
          {t("playerCard.instagramHighlightMany")}
        </h3>
      </div>
      <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
        {t("fanSocial.igHighlightsSubtitle")}
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {highlights.map((highlight) => {
          const isOpen = expanded[highlight.fifaId] ?? false;
          return (
            <article
              key={highlight.fifaId}
              id={`ig-highlight-card-${highlight.fifaId}`}
              className={`scroll-mt-24 rounded-2xl border p-3 ${cardClasses}`}
            >
              <button
                type="button"
                onClick={() => toggle(highlight.fifaId)}
                aria-expanded={isOpen}
                id={`ig-highlight-toggle-${highlight.fifaId}`}
                className={`flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left transition ${toggleHover}`}
              >
                <FlagIcon flag={highlight.flagSvg} className="h-5 w-7 shrink-0 rounded-[2px]" />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate font-archivo font-semibold ${headingClasses}`}>
                    {highlight.name}
                  </span>
                  <span className={`block font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                    {highlight.teamName} • {getPositionLabel(highlight.position)}
                  </span>
                </span>
                <InstagramBrandIcon size={16} />
                <span
                  className={`font-mono text-[10px] transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${mutedClasses}`}
                >
                  ▾
                </span>
              </button>

              {isOpen && (
                <div className="mt-3 space-y-3" id={`ig-highlight-panel-${highlight.fifaId}`}>
                  <InstagramEmbed permalink={highlight.instagramPostUrl} />
                  <a
                    href={highlight.instagramPostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    id={`ig-highlight-open-${highlight.fifaId}`}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${openClasses}`}
                  >
                    <InstagramBrandIcon size={14} />
                    {t("playerCard.openInstagram")}
                  </a>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

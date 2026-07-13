import { useMemo } from "react";
import { useT } from "../i18n";
import { getInstagramHighlights, type InstagramHighlight } from "../data/instagramHighlights";
import { InstagramBrandIcon } from "./InstagramBrandIcon";
import { FlagIcon } from "./FlagIcon";

interface InstagramHighlightsCarouselProps {
  theme: "classic-light" | "stadium-dark";
  /**
   * Called with a player's fifaId when a tile is clicked. The parent bridges this
   * to the InstagramHighlightsFeed below, which expands + scrolls to that player's
   * card (where the real IG post is embedded).
   */
  onFocusPlayer: (fifaId: string) => void;
}

// Roughly how long (seconds) one tile takes to cross, so the loop speed stays
// constant regardless of how many players carry a highlight.
const SECONDS_PER_TILE = 1.1;

/** Two-letter initials fallback shown if a FIFA photo fails to load. */
const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// An animated, auto-scrolling photo band of the players who carry an Instagram
// highlight — an eye-catching lead-in to the InstagramHighlightsFeed below. Each
// tile is an in-page anchor to that player's card in the feed: clicking it asks
// the parent to expand + scroll to that card (where the real IG post embeds).
// Pure-CSS marquee (see
// `.ig-marquee-*` in index.css): the tiles are laid out TWICE as one flat flex
// row, each owning its trailing gap via `mr-3`, so translating the track by
// exactly -50% loops with no seam. It pauses on hover/focus and, under
// prefers-reduced-motion, degrades to a normal horizontal scroll (duplicate tiles
// hidden). The duplicate set is aria-hidden and untabbable so AT sees each player
// once.
export function InstagramHighlightsCarousel({
  theme,
  onFocusPlayer,
}: InstagramHighlightsCarouselProps) {
  const t = useT();
  const highlights = useMemo(getInstagramHighlights, []);

  if (highlights.length === 0) return null;

  const isLight = theme === "classic-light";
  const tileClasses = isLight
    ? "bg-slate-100 border-slate-200 hover:border-slate-300"
    : "bg-white/5 border-white/10 hover:border-white/25";
  const nameClasses = isLight ? "text-slate-800" : "text-white";
  const photoBg = isLight ? "bg-white" : "bg-black/30";

  const renderTile = (highlight: InstagramHighlight, duplicate: boolean) => (
    <a
      key={`${duplicate ? "dup-" : ""}${highlight.fifaId}`}
      // Only the primary set carries a stable id and is reachable by keyboard/AT;
      // the duplicate exists purely to close the visual loop.
      id={duplicate ? undefined : `ig-carousel-tile-${highlight.fifaId}`}
      // In-page anchor to the feed card below; the onClick drives the smooth
      // scroll + expand, and the href keeps it a real link (keyboard/AT + a
      // graceful jump if JS is unavailable).
      href={`#ig-highlight-card-${highlight.fifaId}`}
      onClick={(e) => {
        e.preventDefault();
        onFocusPlayer(highlight.fifaId);
      }}
      tabIndex={duplicate ? -1 : undefined}
      aria-hidden={duplicate || undefined}
      aria-label={t("fanSocial.igCarouselTileAria", { name: highlight.name })}
      title={highlight.name}
      className={`group relative mr-3 flex w-28 shrink-0 flex-col overflow-hidden rounded-2xl border transition ${tileClasses} ${
        duplicate ? "ig-marquee-dup" : ""
      }`}
    >
      <div className={`relative aspect-[3/4] w-full overflow-hidden ${photoBg}`}>
        {/* Initials fallback sits behind the photo; if the FIFA image 404s, the
            img hides itself (onError) and this shows through. */}
        <span
          aria-hidden="true"
          className={`absolute inset-0 flex items-center justify-center font-anton text-2xl tracking-wide ${
            isLight ? "text-slate-300" : "text-white/25"
          }`}
        >
          {initialsOf(highlight.name)}
        </span>
        <img
          src={highlight.pictureUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
          className="relative h-full w-full object-contain object-bottom p-1 transition-transform duration-300 group-hover:scale-105"
        />
        <FlagIcon
          flag={highlight.flagSvg}
          className="absolute left-1.5 top-1.5 h-3.5 w-5 rounded-[2px] shadow-sm"
        />
        {/* Instagram glyph, brightened on hover, to signal "opens on Instagram". */}
        <span className="absolute bottom-1.5 right-1.5 opacity-70 transition group-hover:opacity-100">
          <InstagramBrandIcon size={16} />
        </span>
      </div>
      <span
        className={`truncate px-2 py-1.5 text-center font-archivo text-[11px] font-semibold ${nameClasses}`}
      >
        {highlight.name}
      </span>
    </a>
  );

  return (
    <section
      id="ig-highlights-carousel"
      aria-label={t("fanSocial.igCarouselAria")}
      className="ig-marquee-viewport mt-6 overflow-hidden"
    >
      <div
        className="ig-marquee-track flex w-max"
        style={{ ["--ig-marquee-duration" as string]: `${highlights.length * SECONDS_PER_TILE}s` }}
      >
        {highlights.map((h) => renderTile(h, false))}
        {highlights.map((h) => renderTile(h, true))}
      </div>
    </section>
  );
}

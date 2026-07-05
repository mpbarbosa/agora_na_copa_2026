import { useEffect, useRef, useState } from "react";
import { toInstagramEmbedUrl } from "../utils/instagram";
import { useT } from "../i18n";

interface InstagramPostFrameProps {
  /** The post/reel permalink to embed (must be an instagram.com URL). */
  permalink: string;
  /** Optional id for the iframe (e2e hooks). */
  id?: string;
}

// Default height before Instagram reports the real one — tall enough to show a
// typical single-image post header + media without an initial clip.
const DEFAULT_HEIGHT = 640;

/**
 * Embeds a single Instagram post/reel via a direct `<iframe>` to Instagram's
 * `/embed/` endpoint — a script-free alternative to the embed.js blockquote
 * (`InstagramEmbed`). The blockquote needs Instagram's embed.js to hydrate it,
 * which content/tracker blockers commonly block, leaving a blank embed; this
 * iframe renders the post on its own. The `/embed/` page posts a `MEASURE`
 * message with its content height, which we listen for to size the iframe (so it
 * fits a post of any caption length without internal scroll or dead space).
 * Always pair it with a plain "Abrir no Instagram" link so users aren't stranded
 * if the iframe fails to load.
 */
export function InstagramPostFrame({ permalink, id }: InstagramPostFrameProps) {
  const t = useT();
  const embedUrl = toInstagramEmbedUrl(permalink);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);

  useEffect(() => {
    if (!embedUrl) return;

    const onMessage = (event: MessageEvent) => {
      // Only trust the resize signal from Instagram's own embed frame.
      if (!event.origin.endsWith("instagram.com")) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        const measured = data?.type === "MEASURE" ? Number(data?.details?.height) : NaN;
        if (Number.isFinite(measured) && measured > 0) setHeight(Math.ceil(measured));
      } catch {
        // Non-JSON message from another embed — ignore and keep the default height.
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [embedUrl]);

  if (!embedUrl) return null;

  return (
    <iframe
      ref={iframeRef}
      id={id}
      src={embedUrl}
      title={t("aoVivo.instagramPostTitle")}
      loading="lazy"
      scrolling="no"
      className="mx-auto w-full max-w-[540px] rounded-xl border-0 bg-white"
      style={{ height }}
      allow="encrypted-media"
    />
  );
}

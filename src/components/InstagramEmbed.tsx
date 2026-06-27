import { useEffect } from "react";
import { isSafeInstagramUrl } from "../utils/instagram";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

// Tracks the one-time injection of Instagram's official embed.js across the app.
// embed.js auto-processes every <blockquote class="instagram-media"> present when
// it loads, and exposes window.instgrm.Embeds.process() to (re)hydrate any added
// afterwards — so we inject once and call process() on subsequent mounts.
let embedScriptInjected = false;

interface InstagramEmbedProps {
  /** The post/reel permalink to embed (must be an instagram.com URL). */
  permalink: string;
  /** Optional id for the blockquote (e2e hooks). */
  id?: string;
}

/**
 * Renders a single Instagram post/reel via Instagram's official embed.js
 * blockquote pattern (see docs/adr/0001). Shared by the player overlay card, the
 * FIFA reel on Redes Sociais, and the Instagram highlights feed. Callers decide
 * WHEN to mount it — mounting injects/loads embed.js, so render it only when the
 * embed should actually appear (e.g. lazily, on expand). Always pair it with a
 * plain "Abrir no Instagram" link so users aren't stranded if the script fails.
 */
export function InstagramEmbed({ permalink, id }: InstagramEmbedProps) {
  useEffect(() => {
    if (!isSafeInstagramUrl(permalink)) return;
    if (window.instgrm) {
      window.instgrm.Embeds.process();
    } else if (!embedScriptInjected) {
      embedScriptInjected = true;
      const script = document.createElement("script");
      script.src = "https://www.instagram.com/embed.js";
      script.async = true;
      document.head.appendChild(script);
    }
    // else: a pending embed.js load will auto-process this blockquote on arrival.
  }, [permalink]);

  if (!isSafeInstagramUrl(permalink)) return null;

  return (
    <blockquote
      id={id}
      className="instagram-media"
      data-instgrm-permalink={permalink}
      data-instgrm-version="14"
      style={{ width: "100%", minWidth: 0, margin: 0 }}
    />
  );
}

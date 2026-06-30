/** Canonical Instagram origin; only permalinks under it are embedded or opened. */
export const INSTAGRAM_ORIGIN = "https://www.instagram.com/";

/**
 * Guards against rendering an embed or link for a non-Instagram (or malformed)
 * URL — a defensive check before handing a permalink to Instagram's embed.js or
 * to an anchor's href.
 */
export function isSafeInstagramUrl(url: string): boolean {
  return url.startsWith(INSTAGRAM_ORIGIN);
}

/**
 * Converts a post/reel permalink into Instagram's dedicated `/embed/` URL — the
 * self-contained page meant to be loaded inside an `<iframe>`. Unlike the
 * canonical post URL (which sends `X-Frame-Options: DENY`), the `/embed/`
 * endpoint is frameable, so this is a script-free alternative to the embed.js
 * blockquote (which content/tracker blockers frequently block, leaving a blank
 * embed). Query/hash/trailing slashes are stripped before appending `/embed/`.
 * Returns null for a non-Instagram (or malformed) URL.
 */
export function toInstagramEmbedUrl(url: string): string | null {
  if (!isSafeInstagramUrl(url)) return null;
  const withoutQuery = url.split(/[?#]/)[0].replace(/\/+$/, "");
  if (withoutQuery === INSTAGRAM_ORIGIN.replace(/\/+$/, "")) return null;
  return `${withoutQuery}/embed/`;
}

/**
 * Resolves a player's Instagram highlight permalinks into an ordered, de-duped,
 * safe list. The multi-entry `urls` list takes precedence; the singular
 * `fallbackUrl` is used only when the list is absent or has no safe entries
 * (back-compat for entries that still carry a single `instagramPostUrl`).
 */
export function resolveInstagramPostUrls(
  urls: string[] | undefined,
  fallbackUrl: string | undefined,
): string[] {
  const fromList = (urls ?? []).filter(isSafeInstagramUrl);
  const resolved =
    fromList.length > 0
      ? fromList
      : fallbackUrl && isSafeInstagramUrl(fallbackUrl)
        ? [fallbackUrl]
        : [];
  return Array.from(new Set(resolved));
}

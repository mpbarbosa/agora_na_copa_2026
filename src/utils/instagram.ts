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

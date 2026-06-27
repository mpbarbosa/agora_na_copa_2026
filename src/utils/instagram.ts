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

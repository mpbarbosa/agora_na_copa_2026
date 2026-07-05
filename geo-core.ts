// Pure IP→country helpers for the `/api/geo` endpoint. The MaxMind reader open
// and `.get()` (I/O) live in `server.ts`; everything reproducible/testable lives
// here so it can be unit-tested without the GeoLite2 mmdb present (CI/Docker has
// no db — the endpoint degrades to `country: null`, which these helpers model).
//
// No network, no filesystem — imported by both `server.ts` and
// `tests/geo-core.test.ts`.

/** Minimal shape of a MaxMind GeoLite2-Country lookup result we consume. */
export interface CountryLookupResult {
  country?: { iso_code?: string | null } | null;
  registered_country?: { iso_code?: string | null } | null;
}

/**
 * Normalize the client IP for a MaxMind lookup:
 *  - drops the IPv4-mapped IPv6 prefix (`::ffff:203.0.113.7` → `203.0.113.7`),
 *  - trims whitespace,
 *  - returns "" for empty / the access-log placeholder "-" so callers skip the
 *    lookup rather than feed the reader garbage.
 */
export const normalizeClientIp = (ip: string | null | undefined): string => {
  const trimmed = (ip ?? "").trim();
  if (!trimmed || trimmed === "-") return "";
  return trimmed.replace(/^::ffff:/i, "");
};

/**
 * Extract the ISO-2 country code from a MaxMind Country lookup, falling back to
 * the registered country (VPN/edge cases sometimes only carry that). Returns an
 * uppercase code, or null when the lookup is empty/unknown (localhost, private
 * ranges, an IP the db doesn't resolve). Never throws.
 */
export const countryFromCountryResponse = (
  result: CountryLookupResult | null | undefined,
): string | null => {
  const iso =
    result?.country?.iso_code ?? result?.registered_country?.iso_code ?? null;
  if (typeof iso !== "string") return null;
  const code = iso.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
};

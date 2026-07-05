// The countries offered in the broadcast-guide country picker. Each ISO-2 code
// was verified live against FIFA's per-country "Onde Assistir / Dónde Ver" watch
// endpoint (`/api/broadcast-guide?country=XX` → real `source: "fifa"` sources),
// so every option resolves to genuine broadcaster data — none are dead. FIFA uses
// ISO alpha-2 here (BR/AR/US…), which is NOT our FIFA 3-letter team code.
//
// Country display names are localized inline (pt/es) rather than through the i18n
// catalog: they are data, and 20×2 name keys would bloat the catalog. The picker
// chrome (label, etc.) does live in the catalog.
//
// Paraguay (PY) is intentionally absent — FIFA has no watch data for it, so it
// would only ever show the empty state.
import type { Locale } from "../i18n/locale";

export interface BroadcastCountry {
  /** ISO-2 country code, as FIFA's watch endpoint expects. */
  code: string;
  /** Localized display name per supported locale. */
  name: Record<Locale, string>;
}

// Americas first (the core audience), then Europe. The picker sorts by localized
// name at render, so this order is just the canonical source-of-truth listing.
export const BROADCAST_COUNTRIES: BroadcastCountry[] = [
  { code: "BR", name: { pt: "Brasil", es: "Brasil", en: "Brazil" } },
  { code: "AR", name: { pt: "Argentina", es: "Argentina", en: "Argentina" } },
  { code: "US", name: { pt: "Estados Unidos", es: "Estados Unidos", en: "United States" } },
  { code: "MX", name: { pt: "México", es: "México", en: "Mexico" } },
  { code: "CO", name: { pt: "Colômbia", es: "Colombia", en: "Colombia" } },
  { code: "CL", name: { pt: "Chile", es: "Chile", en: "Chile" } },
  { code: "PE", name: { pt: "Peru", es: "Perú", en: "Peru" } },
  { code: "UY", name: { pt: "Uruguai", es: "Uruguay", en: "Uruguay" } },
  { code: "EC", name: { pt: "Equador", es: "Ecuador", en: "Ecuador" } },
  { code: "BO", name: { pt: "Bolívia", es: "Bolivia", en: "Bolivia" } },
  { code: "VE", name: { pt: "Venezuela", es: "Venezuela", en: "Venezuela" } },
  { code: "CR", name: { pt: "Costa Rica", es: "Costa Rica", en: "Costa Rica" } },
  { code: "PA", name: { pt: "Panamá", es: "Panamá", en: "Panama" } },
  { code: "ES", name: { pt: "Espanha", es: "España", en: "Spain" } },
  { code: "PT", name: { pt: "Portugal", es: "Portugal", en: "Portugal" } },
  { code: "GB", name: { pt: "Reino Unido", es: "Reino Unido", en: "United Kingdom" } },
  { code: "FR", name: { pt: "França", es: "Francia", en: "France" } },
  { code: "DE", name: { pt: "Alemanha", es: "Alemania", en: "Germany" } },
  { code: "IT", name: { pt: "Itália", es: "Italia", en: "Italy" } },
  { code: "NL", name: { pt: "Países Baixos", es: "Países Bajos", en: "Netherlands" } },
];

const BROADCAST_COUNTRY_CODES = new Set(BROADCAST_COUNTRIES.map((c) => c.code));

// The server's default broadcast country (used when the `?country=` param is
// absent). Clients keep the request bare-path for this value — mirroring how
// `apiUrl` omits `?language=` for the default locale — so existing Playwright
// route mocks (`**/api/match-overlays`) still match.
export const DEFAULT_BROADCAST_COUNTRY = "BR";

/** The default broadcast country per locale when geo/IP can't determine one. */
export const DEFAULT_COUNTRY_BY_LOCALE: Record<Locale, string> = {
  pt: "BR",
  es: "MX",
  en: "US",
};

/** True when a code is one we offer (guards a geo/stored value before use). */
export const isBroadcastCountry = (code: string | null | undefined): boolean =>
  typeof code === "string" && BROADCAST_COUNTRY_CODES.has(code.toUpperCase());

/** Localized display name for a code (falls back to the raw code if unknown). */
export const broadcastCountryName = (code: string, locale: Locale): string =>
  BROADCAST_COUNTRIES.find((c) => c.code === code)?.name[locale] ?? code;

/**
 * ISO-2 → flag emoji via Unicode regional-indicator symbols (🇧🇷). Zero assets,
 * works for any country. (Windows desktop renders the two letters instead of a
 * flag — an acceptable, still-legible fallback; the audience is mobile-first.)
 */
export const countryCodeToFlagEmoji = (code: string): string =>
  code
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 2)
    .replace(/[A-Z]/g, (ch) =>
      String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65),
    );

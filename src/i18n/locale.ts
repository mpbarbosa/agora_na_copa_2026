// Pure locale core — no React, no DOM-only assumptions beyond guarded `window`
// access — so `server.ts` can import the same mappings when it threads the
// Host-derived locale through the FIFA fetch language and formatting.
//
// The app is Brazilian-Portuguese first: `pt` is the default everywhere and the
// Spanish (LATAM) shell is opt-in via the `es.` subdomain (see docs runbook),
// a `?lang=` query param, or the in-app language switcher.

export type Locale = "pt" | "es";

export const DEFAULT_LOCALE: Locale = "pt";
export const SUPPORTED_LOCALES: readonly Locale[] = ["pt", "es"];

export const isLocale = (value: unknown): value is Locale =>
  value === "pt" || value === "es";

/** Coerce any input to a supported locale, falling back to pt. */
export const coerceLocale = (value: unknown): Locale =>
  isLocale(value) ? value : DEFAULT_LOCALE;

/** BCP-47 tag for Intl / toLocale* formatting. LATAM Spanish → es-MX. */
export const localeToIntlTag = (locale: Locale): string =>
  locale === "es" ? "es-MX" : "pt-BR";

/** Language code the FIFA API expects (?language=…). */
export const localeToFifaLanguage = (locale: Locale): string =>
  locale === "es" ? "es" : "pt";

/** Inverse of {@link localeToFifaLanguage}: a FIFA/`?language=` code → Locale. */
export const localeFromFifaLanguage = (language: string): Locale =>
  language.trim().toLowerCase().startsWith("es") ? "es" : DEFAULT_LOCALE;

/** `<html lang>` value. */
export const localeToHtmlLang = (locale: Locale): string =>
  locale === "es" ? "es-419" : "pt-BR";

/** Open Graph og:locale value. */
export const localeToOgLocale = (locale: Locale): string =>
  locale === "es" ? "es_MX" : "pt_BR";

/**
 * Derive the locale from a request Host header (server) — the `es.` subdomain
 * serves Spanish; everything else stays pt. Kept here so both the server and
 * any client hostname check share one rule.
 */
export const localeFromHost = (host: string | null | undefined): Locale =>
  typeof host === "string" && /^es\./i.test(host.trim()) ? "es" : DEFAULT_LOCALE;

const STORAGE_KEY = "agora-locale";
const QUERY_KEY = "lang";
// Server injects this global into index.html based on the Host header (Phase 1).
const INJECTED_GLOBAL = "__AGORA_LOCALE__";

/**
 * Resolve the locale to boot the client with. Precedence (first wins):
 *   1. explicit user override persisted by the switcher (localStorage)
 *   2. `?lang=pt|es` query param (also persisted — handy for local testing)
 *   3. server-injected `window.__AGORA_LOCALE__` (from the Host header)
 *   4. `es.` hostname prefix (belt-and-suspenders if injection is absent)
 *   5. default pt
 */
export const resolveInitialLocale = (): Locale => {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  try {
    const stored = window.localStorage?.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // localStorage can throw in private-mode / sandboxed contexts — ignore.
  }

  try {
    const queryLang = new URLSearchParams(window.location.search).get(QUERY_KEY);
    if (isLocale(queryLang)) {
      persistLocale(queryLang);
      return queryLang;
    }
  } catch {
    // malformed URL — ignore.
  }

  const injected = (window as unknown as Record<string, unknown>)[INJECTED_GLOBAL];
  if (isLocale(injected)) return injected;

  return localeFromHost(window.location?.hostname);
};

// Module-level mirror of the active locale so non-React code (fetch helpers)
// can read the current language without the context. The LocaleProvider keeps
// this in sync; before it mounts we fall back to resolving from the URL/host.
let activeLocale: Locale | null = null;

/** Current locale for non-React callers (fetch URL builders). */
export const getActiveLocale = (): Locale =>
  activeLocale ?? resolveInitialLocale();

/** Called by the LocaleProvider whenever the locale changes. */
export const setActiveLocale = (locale: Locale): void => {
  activeLocale = locale;
};

/**
 * Append the active locale's FIFA `language` code to an API path, preserving any
 * existing query string. Route FIFA-sourced fetches through this so the Spanish
 * shell requests Spanish team/broadcaster data.
 *
 * pt is the server default (a missing `language` param resolves to pt), so for pt
 * we return the path UNCHANGED — no redundant `?language=pt`. This also keeps the
 * pt request URLs byte-identical to before i18n, so existing tests/mocks that
 * match the bare path (e.g. Playwright `**​/api/match-states`) still intercept.
 */
export const apiUrl = (path: string, locale: Locale = getActiveLocale()): string => {
  if (locale === DEFAULT_LOCALE) return path;
  const language = localeToFifaLanguage(locale);
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}language=${language}`;
};

/** Persist the user's explicit locale choice. Safe to call anywhere. */
export const persistLocale = (locale: Locale): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.setItem(STORAGE_KEY, locale);
  } catch {
    // ignore storage failures — the choice just won't survive a reload.
  }
};

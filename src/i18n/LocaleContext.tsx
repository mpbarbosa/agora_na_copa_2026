// Locale context — the one place the app reads/sets the active language.
//
// The theme prop is threaded explicitly through every component, but locale
// touches ~500 strings across ~90 files, so prop-drilling a `t` would be
// unworkable. A context + `useT()` hook is the deliberate exception; it reads
// the initial locale synchronously (no flash) and lets any component translate
// or format without new props.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  localeToHtmlLang,
  localeToIntlTag,
  persistLocale,
  resolveInitialLocale,
  setActiveLocale,
  type Locale,
} from "./locale";
import { translate } from "./strings";

export interface LocaleContextValue {
  locale: Locale;
  /** Translate a catalog key (falls back pt → key). */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** BCP-47 tag for Intl / toLocale* calls (pt-BR | es-MX). */
  intlTag: string;
  /** Switch language, persist the choice, and update <html lang>. */
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const initial = resolveInitialLocale();
    setActiveLocale(initial);
    return initial;
  });

  // Keep <html lang> in sync so screen readers, hyphenation, and SEO crawlers
  // see the active language even on the client-rendered SPA.
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = localeToHtmlLang(locale);
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    persistLocale(next);
    setActiveLocale(next);
    setLocaleState(next);
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      t: (key, params) => translate(locale, key, params),
      intlTag: localeToIntlTag(locale),
      setLocale,
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Full locale context. Throws if used outside the provider. */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (ctx === null) {
    // Defensive: a component rendered outside the provider still works in pt.
    return {
      locale: DEFAULT_LOCALE,
      t: (key, params) => translate(DEFAULT_LOCALE, key, params),
      intlTag: localeToIntlTag(DEFAULT_LOCALE),
      setLocale: () => {},
    };
  }
  return ctx;
}

/** Convenience: just the translate function. */
export function useT(): LocaleContextValue["t"] {
  return useLocale().t;
}

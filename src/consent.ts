import { useEffect, useState } from "react";

// LGPD cookie-consent state, persisted in localStorage and shared across the app.
// "all" = visitor accepted analytics/ads cookies; "essential" = only essential.
// Ads/analytics scripts must check hasAdsConsent() before loading.

const CONSENT_KEY = "lgpd-cookie-consent";
const CONSENT_EVENT = "lgpd-consent-change";

export type ConsentValue = "all" | "essential";

export function getConsent(): ConsentValue | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { value?: ConsentValue };
    return parsed.value === "all" || parsed.value === "essential" ? parsed.value : null;
  } catch {
    return null;
  }
}

export function setConsent(value: ConsentValue): void {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ value, at: new Date().toISOString() }));
  } catch {
    /* localStorage unavailable (e.g. private mode) — consent just won't persist */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT));
}

/** Ads/analytics may load only when the visitor accepted all cookies. */
export function hasAdsConsent(): boolean {
  return getConsent() === "all";
}

/** Reactive consent hook: current choice (or null) + a setter; syncs across tabs. */
export function useConsent(): {
  consent: ConsentValue | null;
  choose: (v: ConsentValue) => void;
} {
  const [consent, setLocal] = useState<ConsentValue | null>(() => getConsent());
  useEffect(() => {
    const sync = () => setLocal(getConsent());
    window.addEventListener(CONSENT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CONSENT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return { consent, choose: setConsent };
}

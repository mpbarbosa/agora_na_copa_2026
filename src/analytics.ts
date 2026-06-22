import { GA4_MEASUREMENT_ID, isAnalyticsConfigured } from "./config";
import { hasAdsConsent } from "./consent";

// Google Analytics 4 integration. Loads gtag.js lazily, ONLY after the visitor
// accepted cookies (hasAdsConsent) AND a real measurement id is configured.
// Every public function is a no-op while dormant, so the placeholder build ships
// zero tracking and zero console noise.

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let loaded = false;

/** GA4 runs only with a real id AND ads/analytics consent ("Aceitar"). */
export function isAnalyticsActive(): boolean {
  return isAnalyticsConfigured() && hasAdsConsent();
}

/** Inject gtag.js once, after consent. Idempotent; a no-op while dormant. */
export function loadAnalytics(): void {
  if (loaded || !isAnalyticsActive()) return;
  loaded = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => {
    window.dataLayer!.push(args);
  };

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
  script.setAttribute("data-ga4", "1");
  document.head.appendChild(script);

  window.gtag("js", new Date());
  window.gtag("config", GA4_MEASUREMENT_ID, { anonymize_ip: true });
}

/** Send a custom GA4 event (queued to dataLayer until gtag.js finishes loading). */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (!isAnalyticsActive() || !window.gtag) return;
  window.gtag("event", name, params ?? {});
}

/** Send a SPA page_view (the app is one URL with in-app tab navigation). */
export function trackPageView(path: string, title?: string): void {
  if (!isAnalyticsActive() || !window.gtag) return;
  window.gtag("event", "page_view", { page_path: path, page_title: title });
}

import { useEffect } from "react";
import { useConsent } from "../consent";
import { loadAnalytics, trackEvent, trackPageView } from "../analytics";

/**
 * Wires Google Analytics 4 into the SPA: loads gtag.js once consent is granted,
 * sends a page_view on nav change, and tracks affiliate-link clicks (delegated
 * via [data-affiliate-id]). Everything is a no-op until a real GA4 id is set AND
 * the visitor accepted cookies.
 */
export function useAnalytics(pagePath: string, pageTitle?: string): void {
  const { consent } = useConsent();

  // Load gtag.js the moment consent flips to "all".
  useEffect(() => {
    loadAnalytics();
  }, [consent]);

  // SPA "page view" on each nav change.
  useEffect(() => {
    trackPageView(pagePath, pageTitle);
  }, [pagePath, pageTitle]);

  // Delegated click tracking for affiliate links (and any future [data-affiliate-id]).
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest?.("[data-affiliate-id]");
      if (link) {
        trackEvent("select_affiliate", {
          affiliate_id: link.getAttribute("data-affiliate-id"),
        });
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);
}

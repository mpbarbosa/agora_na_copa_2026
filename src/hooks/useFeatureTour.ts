import { useCallback, useEffect, useRef } from "react";
import { useConsent } from "../consent";
import { trackEvent } from "../analytics";
import { startFeatureTour } from "../featureTour";

const SEEN_KEY = "feature-tour-seen";

/**
 * Feature-discovery tour controller. Exposes startTour() for the header "?" button
 * and auto-starts once on first visit — but only AFTER the cookie banner is dismissed
 * (consent !== null), so the two never collide. Marks "seen" in localStorage when the
 * tour ends, and reports tour_start / tour_complete / tour_skip to GA4.
 */
export function useFeatureTour(theme: "classic-light" | "stadium-dark"): {
  startTour: () => void;
} {
  const { consent } = useConsent();
  const autoStarted = useRef(false);

  const startTour = useCallback(() => {
    trackEvent("tour_start");
    startFeatureTour(theme, (completed) => {
      trackEvent(completed ? "tour_complete" : "tour_skip");
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* localStorage unavailable — tour will just show again next visit */
      }
    });
  }, [theme]);

  useEffect(() => {
    if (consent === null || autoStarted.current) return; // wait for the cookie banner; once per mount
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (seen) return;
    autoStarted.current = true;
    const timer = window.setTimeout(startTour, 600); // let layout settle after consent dismissal
    return () => window.clearTimeout(timer);
  }, [consent, startTour]);

  return { startTour };
}

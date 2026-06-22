import { useEffect, useRef } from "react";
import { useConsent } from "../consent";
import { getSessionCount } from "../session";
import { startMessiTour } from "../messiTour";

const SEEN_KEY = "messi-tour-seen";
const FEATURE_TOUR_SEEN = "feature-tour-seen";

/**
 * Auto-plays the Messi card walkthrough — but NOT on the first session. It runs
 * once, from the 2nd session onward, after the cookie banner is dismissed and only
 * after the general feature tour has been seen (so the two never overlap).
 */
export function useMessiTour(theme: "classic-light" | "stadium-dark"): void {
  const { consent } = useConsent();
  const started = useRef(false);

  // Count this visit as a session regardless of consent.
  useEffect(() => {
    getSessionCount();
  }, []);

  useEffect(() => {
    if (consent === null || started.current) return; // wait for the cookie choice; once per mount
    let seen = false;
    let featureSeen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
      featureSeen = localStorage.getItem(FEATURE_TOUR_SEEN) === "1";
    } catch {
      /* ignore */
    }
    if (seen) return;
    if (!featureSeen) return; // let the general feature tour go first (avoids overlap)
    if (getSessionCount() < 2) return; // never on the first session

    started.current = true;
    const timer = window.setTimeout(() => {
      startMessiTour(theme, () => {
        try {
          localStorage.setItem(SEEN_KEY, "1");
        } catch {
          /* ignore */
        }
      });
    }, 900); // let the page settle after consent
    return () => window.clearTimeout(timer);
  }, [consent, theme]);
}

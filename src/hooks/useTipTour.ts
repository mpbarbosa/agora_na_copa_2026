import { useEffect, useRef } from "react";
import { useConsent } from "../consent";
import { getSessionCount } from "../session";
import { TIP_TOURS } from "../tipTours";

const FEATURE_TOUR_SEEN = "feature-tour-seen"; // localStorage: general feature tour done
const ROTATION_KEY = "tip-tour-rotation"; // localStorage: index of the NEXT tip to play
const SHOWN_THIS_SESSION = "tip-tour-shown"; // sessionStorage: one tip per browser session

// Picks which tip plays this session and advances the rotation pointer. The first
// eligible session starts at a RANDOM tip; each later session moves to the next one,
// so a visitor cycles through all of them carousel-style. Persists the next index.
function pickTipIndex(): number {
  const count = TIP_TOURS.length;
  try {
    const stored = localStorage.getItem(ROTATION_KEY);
    const index =
      stored === null
        ? Math.floor(Math.random() * count) // random entry point on the first eligible session
        : ((Number(stored) % count) + count) % count;
    localStorage.setItem(ROTATION_KEY, String((index + 1) % count));
    return index;
  } catch {
    return 0; // storage unavailable → fall back to the first tip
  }
}

/**
 * Plays ONE guided tip walkthrough per browser session, rotating through TIP_TOURS
 * from a random starting point. Same gating as the old Messi tour: never on the very
 * first session, only after the cookie banner is dismissed and the general feature
 * tour has been seen (so they never overlap). Replaces useMessiTour.
 */
export function useTipTour(theme: "classic-light" | "stadium-dark"): void {
  const { consent } = useConsent();
  const started = useRef(false);

  // Count this visit as a session regardless of consent.
  useEffect(() => {
    getSessionCount();
  }, []);

  useEffect(() => {
    if (consent === null || started.current) return; // wait for the cookie choice; once per mount

    let featureSeen = false;
    let shownThisSession = false;
    try {
      featureSeen = localStorage.getItem(FEATURE_TOUR_SEEN) === "1";
      shownThisSession = sessionStorage.getItem(SHOWN_THIS_SESSION) === "1";
    } catch {
      /* ignore */
    }
    if (shownThisSession) return; // already played a tip this session
    if (!featureSeen) return; // let the general feature tour go first (avoids overlap)
    if (getSessionCount() < 2) return; // never on the first session

    started.current = true;
    const tour = TIP_TOURS[pickTipIndex()];
    try {
      sessionStorage.setItem(SHOWN_THIS_SESSION, "1");
    } catch {
      /* ignore */
    }

    const timer = window.setTimeout(() => {
      tour.start(theme);
    }, 900); // let the page settle after consent
    return () => window.clearTimeout(timer);
  }, [consent, theme]);
}

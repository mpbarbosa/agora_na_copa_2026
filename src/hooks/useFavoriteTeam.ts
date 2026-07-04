import { useCallback, useState } from "react";

const STORAGE_KEY = "agora:favorite-team";

/**
 * The national team a supporter chose to follow in the countdown badge, persisted across
 * visits in localStorage. `defaultTeam` is the locale-aware seed used only when nothing has
 * been stored yet (pt → "BRA"; es → null, so the badge invites the visitor to pick). Once
 * the visitor selects a team it wins over the default on every later visit.
 *
 * Follows the app's localStorage convention: every access is wrapped in try/catch so the
 * hook degrades gracefully in private-mode / storage-blocked browsers.
 */
export function useFavoriteTeam(
  defaultTeam: string | null,
): [string | null, (code: string) => void] {
  const [team, setTeam] = useState<string | null>(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) return stored;
    } catch {
      /* localStorage unavailable — fall back to the default */
    }
    return defaultTeam;
  });

  const selectTeam = useCallback((code: string) => {
    setTeam(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* localStorage unavailable — selection lives for this session only */
    }
  }, []);

  return [team, selectTeam];
}

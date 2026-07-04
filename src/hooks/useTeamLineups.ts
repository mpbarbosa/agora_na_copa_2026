import { useState, useEffect } from "react";
import { apiUrl } from "../i18n";
import type { TeamLineupsMap } from "../utils/teamLineup";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

interface TeamLineupsApiResponse {
  refreshAfterMs: number;
  lineups: TeamLineupsMap;
}

export function useTeamLineups(active: boolean): TeamLineupsMap {
  const [teamLineups, setTeamLineups] = useState<TeamLineupsMap>({});

  useEffect(() => {
    if (!active) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;
    let requestInFlight = false;

    const clearScheduledLoad = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };

    const isPageVisible = () =>
      typeof document === "undefined" || document.visibilityState === "visible";

    const scheduleNextLoad = (refreshAfterMs?: number) => {
      if (!isPageVisible()) {
        return;
      }

      const delay =
        typeof refreshAfterMs === "number" && refreshAfterMs > 0
          ? refreshAfterMs
          : REFRESH_INTERVAL_MS;

      clearScheduledLoad();
      timeoutId = window.setTimeout(() => {
        void loadTeamLineups();
      }, delay);
    };

    const loadTeamLineups = async () => {
      if (cancelled || requestInFlight) {
        return;
      }

      requestInFlight = true;

      try {
        const response = await fetch(apiUrl("/api/team-lineups"));
        if (!response.ok) {
          throw new Error("Falha ao atualizar escalações da FIFA.");
        }

        const data: TeamLineupsApiResponse = await response.json();
        if (cancelled) return;

        setTeamLineups(data.lineups);
        scheduleNextLoad(data.refreshAfterMs);
      } catch (error) {
        console.error(error);
        scheduleNextLoad();
      } finally {
        requestInFlight = false;
      }
    };

    const handlePageVisible = () => {
      if (cancelled || !isPageVisible()) {
        return;
      }

      clearScheduledLoad();
      void loadTeamLineups();
    };

    void loadTeamLineups();
    window.addEventListener("focus", handlePageVisible);
    document.addEventListener("visibilitychange", handlePageVisible);

    return () => {
      cancelled = true;
      clearScheduledLoad();
      window.removeEventListener("focus", handlePageVisible);
      document.removeEventListener("visibilitychange", handlePageVisible);
    };
  }, [active]);

  return teamLineups;
}

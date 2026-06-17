import { useEffect, useState } from "react";

export interface PlayerStats {
  goals: number;
  yellowCards: number;
  redCards: number;
}

export function usePlayerStats(
  teamCode: string | null | undefined,
  playerName: string | null | undefined,
): PlayerStats | null {
  const [stats, setStats] = useState<PlayerStats | null>(null);

  useEffect(() => {
    if (!teamCode || !playerName) {
      setStats(null);
      return;
    }
    let active = true;
    fetch(
      `/api/player-stats/${encodeURIComponent(teamCode)}/${encodeURIComponent(playerName)}`,
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (active) setStats(data); })
      .catch(() => { if (active) setStats(null); });
    return () => { active = false; };
  }, [teamCode, playerName]);

  return stats;
}

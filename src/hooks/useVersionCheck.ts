import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

export function useVersionCheck(clientVersion: string): boolean {
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      if (!active) return;
      if (document.visibilityState === "hidden") {
        timer = setTimeout(check, POLL_INTERVAL_MS);
        return;
      }
      try {
        const res = await fetch("/api/health");
        if (!res.ok || !active) return;
        const data: { version?: string } = await res.json();
        if (active && data.version && data.version !== clientVersion) {
          setNewVersionAvailable(true);
          return; // stop polling once a new version is detected
        }
      } catch {
        // network error — silent, retry next interval
      }
      if (active) timer = setTimeout(check, POLL_INTERVAL_MS);
    };

    // First check deferred — no banner flash on startup
    timer = setTimeout(check, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        void check();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [clientVersion]);

  return newVersionAvailable;
}

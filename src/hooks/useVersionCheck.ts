import { useEffect, useState } from "react";

export const VERSION_POLL_INTERVAL_MS = 5 * 60 * 1000;

export interface VersionCheckStatus {
  /** True once the server reports a build different from the client's. */
  updateAvailable: boolean;
  /** Epoch ms of the next scheduled check, or null once an update is found (polling stops). */
  nextCheckAt: number | null;
  /** Epoch ms of the last completed (non-errored) check, or null before the first one. */
  lastCheckedAt: number | null;
}

export function useVersionCheck(clientVersion: string): VersionCheckStatus {
  const [status, setStatus] = useState<VersionCheckStatus>(() => ({
    updateAvailable: false,
    nextCheckAt: Date.now() + VERSION_POLL_INTERVAL_MS,
    lastCheckedAt: null,
  }));

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      if (!active) return;
      setStatus((prev) => ({ ...prev, nextCheckAt: Date.now() + VERSION_POLL_INTERVAL_MS }));
      timer = setTimeout(check, VERSION_POLL_INTERVAL_MS);
    };

    const check = async () => {
      if (!active) return;
      if (document.visibilityState === "hidden") {
        schedule();
        return;
      }
      try {
        const res = await fetch("/api/health");
        if (res.ok && active) {
          const data: { version?: string } = await res.json();
          setStatus((prev) => ({ ...prev, lastCheckedAt: Date.now() }));
          if (data.version && data.version !== clientVersion) {
            setStatus((prev) => ({ ...prev, updateAvailable: true, nextCheckAt: null }));
            return; // stop polling once a new version is detected
          }
        }
      } catch {
        // network error — silent, retry next interval
      }
      schedule();
    };

    // First check deferred — no banner flash on startup
    schedule();

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

  return status;
}

import { useEffect, useState } from "react";

const PRESENCE_POLL_MS = 25 * 1000; // < the server's 45s window, so 1 miss is tolerated
const CLIENT_ID_KEY = "agora:client-id";

/**
 * A stable per-browser id (persisted in localStorage, so it survives tabs/reloads).
 * Sent with the heartbeat so the server can count distinct browsers behind one IP —
 * separating co-located users while deduping one browser's tabs. Empty when storage
 * is unavailable, in which case the server falls back to counting by IP alone.
 */
function getClientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

/**
 * Reports how many fans are online right now. The server counts distinct (IP +
 * per-browser id) pairs, so the heartbeat sends this browser's id. Fires on mount and
 * every ~25s, but only while the tab is visible (a hidden tab stops heartbeating and
 * drops out of the count after the server's window). Returns the latest count, or
 * null until the first response. Best-effort: network errors are swallowed so the
 * badge simply stays put.
 */
export function useOnlineCount(): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const clientId = getClientId();

    const heartbeat = async () => {
      try {
        const res = await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: clientId }),
        });
        if (res.ok && active) {
          const data: { online?: number } = await res.json();
          if (typeof data.online === "number") setCount(data.online);
        }
      } catch {
        /* presence is best-effort — ignore network failures */
      }
      if (active && document.visibilityState === "visible") {
        timer = setTimeout(heartbeat, PRESENCE_POLL_MS);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && active) {
        clearTimeout(timer);
        void heartbeat(); // resume immediately when the tab is shown again
      }
    };

    if (document.visibilityState === "visible") void heartbeat();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return count;
}

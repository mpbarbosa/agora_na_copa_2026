const SESSION_FLAG = "agora-session-active"; // sessionStorage: set once per browser session
const SESSION_COUNT = "agora-session-count"; // localStorage: total sessions seen

/**
 * How many sessions this visitor has had (1 on the very first visit). Increments
 * once per browser session — guarded by a sessionStorage flag — so repeated calls
 * within the same session are idempotent. Used to hold features back until the
 * 2nd session onward (e.g. the Messi tour).
 */
export function getSessionCount(): number {
  try {
    if (!sessionStorage.getItem(SESSION_FLAG)) {
      sessionStorage.setItem(SESSION_FLAG, "1");
      const next = Number(localStorage.getItem(SESSION_COUNT) || "0") + 1;
      localStorage.setItem(SESSION_COUNT, String(next));
      return next;
    }
    return Number(localStorage.getItem(SESSION_COUNT) || "1");
  } catch {
    return 1; // storage unavailable → treat as first session (don't run gated features)
  }
}

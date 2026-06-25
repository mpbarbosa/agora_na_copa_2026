const CLIENT_ID_KEY = "agora:client-id";

/**
 * A stable per-browser id (persisted in localStorage, so it survives tabs/reloads).
 * Sent with presence heartbeats and chat posts so the server can count/throttle by
 * distinct browser behind one IP — separating co-located users while deduping one
 * browser's tabs. Returns "" when storage is unavailable, in which case the server
 * falls back to keying by IP alone.
 */
export function getClientId(): string {
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

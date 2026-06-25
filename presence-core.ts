// Pure in-memory "online users" presence logic, extracted from server.ts so it can
// be unit-tested independently. A presence store maps a client KEY (the request IP)
// to the epoch-ms timestamp of its last heartbeat; a key counts as "online" while
// its last heartbeat is within the presence window. Single-instance only (in-memory).

export type PresenceStore = Map<string, number>;

/** Record (or refresh) a client key's heartbeat at `nowMs`. Ignores an empty key. */
export function recordHeartbeat(store: PresenceStore, key: string, nowMs: number): void {
  if (key) store.set(key, nowMs);
}

/**
 * Count keys whose last heartbeat is within `windowMs` of `nowMs`, pruning any older
 * entries from the store as a side effect (keeps memory bounded). Returns the live
 * count of distinct online keys.
 */
export function countOnline(store: PresenceStore, nowMs: number, windowMs: number): number {
  let online = 0;
  for (const [id, lastSeen] of store) {
    if (nowMs - lastSeen <= windowMs) {
      online += 1;
    } else {
      store.delete(id);
    }
  }
  return online;
}

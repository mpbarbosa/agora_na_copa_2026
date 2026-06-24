// Pure in-memory "online users" presence logic, extracted from server.ts so it can
// be unit-tested independently. A presence store maps a client session id to the
// epoch-ms timestamp of its last heartbeat; a session counts as "online" while its
// last heartbeat is within the presence window. Single-instance only (in-memory).

export type PresenceStore = Map<string, number>;

/** Record (or refresh) a session's heartbeat at `nowMs`. Ignores empty ids. */
export function recordHeartbeat(store: PresenceStore, id: string, nowMs: number): void {
  if (id) store.set(id, nowMs);
}

/**
 * Count sessions whose last heartbeat is within `windowMs` of `nowMs`, pruning any
 * older entries from the store as a side effect (keeps memory bounded). Returns the
 * live count.
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

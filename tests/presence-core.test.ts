import assert from "node:assert/strict";
import test from "node:test";

import { type PresenceStore, recordHeartbeat, countOnline } from "../presence-core";

const WINDOW = 45_000;

test("countOnline counts only sessions within the window", () => {
  const store: PresenceStore = new Map();
  const now = 1_000_000;
  recordHeartbeat(store, "a", now);
  recordHeartbeat(store, "b", now - 10_000); // within window
  recordHeartbeat(store, "c", now - 60_000); // stale (outside window)

  assert.equal(countOnline(store, now, WINDOW), 2);
});

test("countOnline prunes stale sessions from the store", () => {
  const store: PresenceStore = new Map();
  const now = 1_000_000;
  recordHeartbeat(store, "old", now - 60_000);
  recordHeartbeat(store, "fresh", now);

  countOnline(store, now, WINDOW);
  assert.ok(!store.has("old")); // pruned
  assert.ok(store.has("fresh"));
});

test("recordHeartbeat refreshes an existing session's timestamp", () => {
  const store: PresenceStore = new Map();
  recordHeartbeat(store, "a", 1_000); // would be stale
  recordHeartbeat(store, "a", 1_000_000); // refreshed

  assert.equal(store.size, 1);
  assert.equal(countOnline(store, 1_000_000, WINDOW), 1);
});

test("recordHeartbeat ignores an empty id", () => {
  const store: PresenceStore = new Map();
  recordHeartbeat(store, "", 1_000);
  assert.equal(store.size, 0);
});

test("countOnline is 0 for an empty store", () => {
  assert.equal(countOnline(new Map(), 1_000, WINDOW), 0);
});

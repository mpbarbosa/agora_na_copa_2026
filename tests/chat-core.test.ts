import assert from "node:assert/strict";
import test from "node:test";

import {
  type ChatStore,
  type ChatRateMap,
  CHAT_LIMITS,
  validateNickname,
  validateText,
  passesRateLimit,
  appendMessage,
  getMessages,
  pruneIdleMatches,
} from "../chat-core";

// --- validateNickname ---------------------------------------------------------

test("validateNickname cleans and accepts a normal name", () => {
  const r = validateNickname("  Zé  da   Várzea ");
  assert.equal(r.ok, true);
  assert.equal(r.value, "Zé da Várzea");
});

test("validateNickname rejects empty/whitespace-only", () => {
  assert.equal(validateNickname("   ").ok, false);
  assert.equal(validateNickname("").ok, false);
});

test("validateNickname rejects non-strings", () => {
  assert.equal(validateNickname(undefined).ok, false);
  assert.equal(validateNickname(42 as unknown).ok, false);
});

test("validateNickname clamps to the max length (does not reject)", () => {
  const long = "a".repeat(CHAT_LIMITS.maxNicknameLength + 20);
  const r = validateNickname(long);
  assert.equal(r.ok, true);
  assert.ok(r.ok && r.value.length === CHAT_LIMITS.maxNicknameLength);
});

test("validateNickname rejects URL-like names", () => {
  assert.equal(validateNickname("visite spam.com").ok, false);
  assert.equal(validateNickname("http://x.io").ok, false);
});

// --- validateText -------------------------------------------------------------

test("validateText accepts a normal message and strips control chars", () => {
  const r = validateText("Golaço\tdo\nBrasil!");
  assert.equal(r.ok, true);
  assert.equal(r.value, "Golaço do Brasil!");
});

test("validateText rejects empty after cleaning", () => {
  assert.equal(validateText("\n\t  ").ok, false);
});

test("validateText rejects over-length (not truncated)", () => {
  const r = validateText("a".repeat(CHAT_LIMITS.maxTextLength + 1));
  assert.equal(r.ok, false);
});

test("validateText accepts exactly the max length", () => {
  const r = validateText("a".repeat(CHAT_LIMITS.maxTextLength));
  assert.equal(r.ok, true);
});

test("validateText rejects links", () => {
  assert.equal(validateText("acessa https://gol.tv agora").ok, false);
  assert.equal(validateText(" daqui www.spam.net").ok, false);
  assert.equal(validateText("entra em apostas.bet/promo").ok, false);
});

// --- passesRateLimit ----------------------------------------------------------

test("passesRateLimit allows the first post and enforces the min gap", () => {
  const m: ChatRateMap = new Map();
  assert.equal(passesRateLimit(m, "ip|a", 1_000), true);
  assert.equal(passesRateLimit(m, "ip|a", 1_000 + CHAT_LIMITS.minGapMs - 1), false);
  assert.equal(passesRateLimit(m, "ip|a", 1_000 + CHAT_LIMITS.minGapMs), true);
});

test("passesRateLimit caps posts per trailing minute", () => {
  const m: ChatRateMap = new Map();
  let t = 1_000_000;
  for (let i = 0; i < CHAT_LIMITS.perMinute; i++) {
    assert.equal(passesRateLimit(m, "ip|b", t), true);
    t += CHAT_LIMITS.minGapMs; // spaced past the min gap
  }
  // One more within the same minute is throttled.
  assert.equal(passesRateLimit(m, "ip|b", t), false);
});

test("passesRateLimit frees up after the minute window slides", () => {
  const m: ChatRateMap = new Map();
  let t = 0;
  for (let i = 0; i < CHAT_LIMITS.perMinute; i++) {
    passesRateLimit(m, "ip|c", t);
    t += CHAT_LIMITS.minGapMs;
  }
  assert.equal(passesRateLimit(m, "ip|c", t), false);
  // Jump past 60s from the oldest entries: window slides, posting allowed again.
  assert.equal(passesRateLimit(m, "ip|c", t + 60_000), true);
});

test("passesRateLimit isolates clients by key", () => {
  const m: ChatRateMap = new Map();
  assert.equal(passesRateLimit(m, "ip|x", 1_000), true);
  assert.equal(passesRateLimit(m, "ip|y", 1_000), true); // different key, not throttled
});

test("passesRateLimit rejects an empty key", () => {
  assert.equal(passesRateLimit(new Map(), "", 1_000), false);
});

// --- appendMessage / getMessages ---------------------------------------------

test("appendMessage assigns monotonic ids per match", () => {
  const store: ChatStore = new Map();
  const a = appendMessage(store, "m1", { nickname: "N", text: "oi" }, 10);
  const b = appendMessage(store, "m1", { nickname: "N", text: "tudo bem" }, 20);
  assert.equal(a.id, 1);
  assert.equal(b.id, 2);
  assert.equal(b.at, 20);
});

test("appendMessage keeps separate id sequences per match", () => {
  const store: ChatStore = new Map();
  const a = appendMessage(store, "m1", { nickname: "N", text: "a" }, 1);
  const b = appendMessage(store, "m2", { nickname: "N", text: "b" }, 2);
  assert.equal(a.id, 1);
  assert.equal(b.id, 1);
});

test("appendMessage FIFO-evicts beyond the per-match cap", () => {
  const store: ChatStore = new Map();
  const cap = 3;
  for (let i = 1; i <= 5; i++) {
    appendMessage(store, "m1", { nickname: "N", text: `msg${i}` }, i, cap);
  }
  const all = getMessages(store, "m1");
  assert.equal(all.length, cap);
  // Oldest two dropped; ids remain monotonic (3,4,5).
  assert.deepEqual(all.map((m) => m.text), ["msg3", "msg4", "msg5"]);
  assert.deepEqual(all.map((m) => m.id), [3, 4, 5]);
});

test("getMessages returns the whole buffer with no cursor", () => {
  const store: ChatStore = new Map();
  appendMessage(store, "m1", { nickname: "N", text: "a" }, 1);
  appendMessage(store, "m1", { nickname: "N", text: "b" }, 2);
  assert.equal(getMessages(store, "m1").length, 2);
});

test("getMessages returns only messages after the cursor", () => {
  const store: ChatStore = new Map();
  appendMessage(store, "m1", { nickname: "N", text: "a" }, 1); // id 1
  appendMessage(store, "m1", { nickname: "N", text: "b" }, 2); // id 2
  appendMessage(store, "m1", { nickname: "N", text: "c" }, 3); // id 3
  const after = getMessages(store, "m1", 1);
  assert.deepEqual(after.map((m) => m.text), ["b", "c"]);
});

test("getMessages on an unknown match is empty", () => {
  assert.deepEqual(getMessages(new Map(), "nope"), []);
});

// --- pruneIdleMatches ---------------------------------------------------------

test("pruneIdleMatches drops buffers for matches that are no longer live", () => {
  const store: ChatStore = new Map();
  appendMessage(store, "live1", { nickname: "N", text: "x" }, 1);
  appendMessage(store, "live2", { nickname: "N", text: "y" }, 2);
  appendMessage(store, "ended", { nickname: "N", text: "z" }, 3);

  const removed = pruneIdleMatches(store, ["live1", "live2"]);
  assert.equal(removed, 1);
  assert.ok(store.has("live1"));
  assert.ok(store.has("live2"));
  assert.ok(!store.has("ended"));
});

test("pruneIdleMatches with no live ids clears everything", () => {
  const store: ChatStore = new Map();
  appendMessage(store, "a", { nickname: "N", text: "x" }, 1);
  appendMessage(store, "b", { nickname: "N", text: "y" }, 2);
  assert.equal(pruneIdleMatches(store, []), 2);
  assert.equal(store.size, 0);
});

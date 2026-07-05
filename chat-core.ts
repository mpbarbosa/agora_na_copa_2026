// Pure in-memory live-match-chat logic, extracted from server.ts so it can be
// unit-tested independently (like presence-core.ts / weather-core.ts). A chat store
// maps a match id to that match's ring buffer of messages; a separate rate map tracks
// each client's recent posting cadence. Everything here is side-effect-free except the
// explicit in-place mutations of the passed-in Map(s). Single-instance only: buffers
// live in memory, are capped per match, and are pruned when a match stops being live —
// nothing is persisted (history is gone on restart, by design).

import type { ChatMessage } from "./src/types";
import type { Locale } from "./src/i18n/locale";

// Validation messages, pt default with es-LATAM / en-US variants (see src/i18n).
const CHAT_MESSAGES = {
  pt: {
    nicknameInvalid: "Apelido inválido.",
    nicknameEmpty: "Escolha um apelido para participar.",
    nicknameLinks: "O apelido não pode conter links.",
    textInvalid: "Mensagem inválida.",
    textEmpty: "Digite uma mensagem.",
    textTooLong: (max: number) => `A mensagem passa de ${max} caracteres.`,
    textLinks: "A mensagem não pode conter links.",
  },
  es: {
    nicknameInvalid: "Apodo inválido.",
    nicknameEmpty: "Elige un apodo para participar.",
    nicknameLinks: "El apodo no puede contener enlaces.",
    textInvalid: "Mensaje inválido.",
    textEmpty: "Escribe un mensaje.",
    textTooLong: (max: number) => `El mensaje supera los ${max} caracteres.`,
    textLinks: "El mensaje no puede contener enlaces.",
  },
  en: {
    nicknameInvalid: "Invalid nickname.",
    nicknameEmpty: "Choose a nickname to join in.",
    nicknameLinks: "Nicknames can't contain links.",
    textInvalid: "Invalid message.",
    textEmpty: "Type a message.",
    textTooLong: (max: number) => `Your message is over ${max} characters.`,
    textLinks: "Messages can't contain links.",
  },
} as const;

const chatMessages = (locale: Locale) =>
  CHAT_MESSAGES[locale] ?? CHAT_MESSAGES.pt;

/** Per-match ring buffer: matchId -> messages, oldest first. */
export type ChatStore = Map<string, ChatMessage[]>;

/** Per-client posting history (epoch-ms of recent posts), keyed by `IP|browserId`. */
export type ChatRateMap = Map<string, number[]>;

/** Tunable limits for the chat, kept in one place so server + tests agree. */
export const CHAT_LIMITS = {
  /** Max characters in a nickname (clamped, then validated non-empty). */
  maxNicknameLength: 24,
  /** Max characters in a message body. */
  maxTextLength: 280,
  /** Max retained messages per match; older ones are FIFO-evicted. */
  maxMessagesPerMatch: 200,
  /** Minimum gap between two posts from the same client. */
  minGapMs: 3_000,
  /** Max posts per client within the trailing 60s window. */
  perMinute: 15,
} as const;

const CONTROL_CHARS = /[\x00-\x1f\x7f]/g;
// Any http(s):// or www. or bare "domain.tld/…" token — keeps link spam out of an
// unmoderated room. Deliberately broad: false positives just ask the user to rephrase.
const URL_PATTERN = /(https?:\/\/|www\.|\b[a-z0-9-]+\.[a-z]{2,}(?:\/|\b))/i;

/**
 * Outcome of validating a field. A flat shape (not a discriminated union) because this
 * project compiles without `strictNullChecks`, so the discriminant wouldn't narrow:
 * `value` holds the cleaned text when `ok`, and `reason` the pt-BR message when not.
 */
export interface ValidationResult {
  ok: boolean;
  value: string;
  reason: string;
}

const valid = (value: string): ValidationResult => ({ ok: true, value, reason: "" });
const invalid = (reason: string): ValidationResult => ({ ok: false, value: "", reason });

/**
 * Normalize whitespace: turn control characters (tabs/newlines/DEL) into spaces so
 * words don't fuse, collapse runs of whitespace to a single space, then trim the ends.
 */
function clean(raw: string): string {
  return raw.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
}

/**
 * Validate a self-declared nickname: must be a non-empty string, contains no URL-like
 * token, and is clamped to `maxNicknameLength` after cleaning. Returns the cleaned
 * value or a reason. (Length is clamped, not rejected, so a long name still posts.)
 */
export function validateNickname(
  raw: unknown,
  locale: Locale = "pt",
): ValidationResult {
  const m = chatMessages(locale);
  if (typeof raw !== "string") return invalid(m.nicknameInvalid);
  const cleaned = clean(raw).slice(0, CHAT_LIMITS.maxNicknameLength);
  if (!cleaned) return invalid(m.nicknameEmpty);
  if (URL_PATTERN.test(cleaned)) return invalid(m.nicknameLinks);
  return valid(cleaned);
}

/**
 * Validate a message body: must be a non-empty string after cleaning, no longer than
 * `maxTextLength` (rejected, not silently truncated, so nothing is lost mid-sentence),
 * and free of URL-like tokens. Returns the cleaned value or a reason.
 */
export function validateText(
  raw: unknown,
  locale: Locale = "pt",
): ValidationResult {
  const m = chatMessages(locale);
  if (typeof raw !== "string") return invalid(m.textInvalid);
  const cleaned = clean(raw);
  if (!cleaned) return invalid(m.textEmpty);
  if (cleaned.length > CHAT_LIMITS.maxTextLength) {
    return invalid(m.textTooLong(CHAT_LIMITS.maxTextLength));
  }
  if (URL_PATTERN.test(cleaned)) return invalid(m.textLinks);
  return valid(cleaned);
}

/**
 * Check whether `key` may post at `nowMs`, recording the post as a side effect when it
 * passes. Enforces both a minimum gap since the last post and a cap per trailing
 * minute. Prunes timestamps older than the minute window so the map stays bounded.
 * Returns true (and records) when allowed; false (and records nothing) when throttled.
 */
export function passesRateLimit(
  rateMap: ChatRateMap,
  key: string,
  nowMs: number,
  limits: { minGapMs: number; perMinute: number } = CHAT_LIMITS,
): boolean {
  if (!key) return false;
  const recent = (rateMap.get(key) ?? []).filter((t) => nowMs - t < 60_000);
  const last = recent[recent.length - 1];
  if (last !== undefined && nowMs - last < limits.minGapMs) {
    rateMap.set(key, recent); // persist the prune even on rejection
    return false;
  }
  if (recent.length >= limits.perMinute) {
    rateMap.set(key, recent);
    return false;
  }
  recent.push(nowMs);
  rateMap.set(key, recent);
  return true;
}

/**
 * Append a message to a match's buffer and return the stored `ChatMessage` (with its
 * assigned monotonic id). The id continues from the last message in the buffer, so it
 * stays unique within the buffer's lifetime. FIFO-evicts the oldest messages past
 * `maxMessagesPerMatch` to keep memory bounded on the small host.
 */
export function appendMessage(
  store: ChatStore,
  matchId: string,
  fields: { nickname: string; text: string },
  nowMs: number,
  maxPerMatch: number = CHAT_LIMITS.maxMessagesPerMatch,
): ChatMessage {
  const buffer = store.get(matchId) ?? [];
  const lastId = buffer.length ? buffer[buffer.length - 1].id : 0;
  const message: ChatMessage = {
    id: lastId + 1,
    nickname: fields.nickname,
    text: fields.text,
    at: nowMs,
  };
  buffer.push(message);
  if (buffer.length > maxPerMatch) buffer.splice(0, buffer.length - maxPerMatch);
  store.set(matchId, buffer);
  return message;
}

/**
 * Read a match's messages after the `sinceId` cursor (exclusive), oldest first. With no
 * cursor, returns the whole retained buffer. Used for incremental polling: the client
 * passes the id of the last message it has seen.
 */
export function getMessages(store: ChatStore, matchId: string, sinceId?: number): ChatMessage[] {
  const buffer = store.get(matchId) ?? [];
  if (sinceId === undefined) return buffer.slice();
  return buffer.filter((m) => m.id > sinceId);
}

/**
 * Drop buffers for matches that are no longer live, freeing their memory. `liveIds` is
 * the set of currently-LIVE match ids (from the FIFA match-states sync). Mutates the
 * store in place; returns the number of match buffers removed.
 */
export function pruneIdleMatches(store: ChatStore, liveIds: Iterable<string>): number {
  const live = new Set(liveIds);
  let removed = 0;
  for (const matchId of store.keys()) {
    if (!live.has(matchId)) {
      store.delete(matchId);
      removed += 1;
    }
  }
  return removed;
}

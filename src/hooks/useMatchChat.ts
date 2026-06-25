import { useCallback, useEffect, useRef, useState } from "react";

import type { ChatMessage, ChatResponse } from "../types";
import { getClientId } from "../utils/clientId";

const CHAT_POLL_MS = 6 * 1000; // brisk enough to feel live without hammering the host

export interface MatchChatState {
  /** Whether the chat is open (the match is LIVE). */
  open: boolean;
  /** Messages received so far, oldest first. */
  messages: ChatMessage[];
  /** True once the first poll has resolved. */
  ready: boolean;
  /** A post in flight. */
  sending: boolean;
  /** Last user-facing error (validation/rate-limit/network), or null. */
  error: string | null;
  /** Post a message; resolves true on success. Clears/sets `error` accordingly. */
  send: (nickname: string, text: string) => Promise<boolean>;
}

/**
 * Drives the live chat for one match. Polls `GET /api/chat/:matchId` every ~6s while the
 * tab is visible, advancing a `since` cursor so each poll fetches only new messages.
 * Mirrors the visibility-aware loop in {@link useOnlineCount}: a hidden tab stops
 * polling and resumes on show. Posting goes through `POST /api/chat/:matchId`; on success
 * the new message is appended and the cursor advanced immediately (no wait for the poll).
 * Best-effort: network errors surface in `error` without throwing.
 */
export function useMatchChat(matchId: string | null): MatchChatState {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Highest message id seen, used as the incremental-poll cursor (ref so the polling
  // closure always reads the latest without re-subscribing the effect).
  const cursorRef = useRef(0);

  // Reset all state when the match changes, so a new room never shows the old one's tail.
  useEffect(() => {
    cursorRef.current = 0;
    setOpen(false);
    setMessages([]);
    setReady(false);
    setError(null);
  }, [matchId]);

  useEffect(() => {
    if (!matchId || typeof window === "undefined") return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch(`/api/chat/${encodeURIComponent(matchId)}?since=${cursorRef.current}`);
        if (res.ok && active) {
          const data: ChatResponse = await res.json();
          setOpen(Boolean(data.open));
          if (data.messages.length) {
            cursorRef.current = data.messages[data.messages.length - 1].id;
            setMessages((prev) => [...prev, ...data.messages]);
          }
        }
      } catch {
        /* polling is best-effort — ignore network failures */
      } finally {
        if (active) setReady(true);
      }
      if (active && document.visibilityState === "visible") {
        timer = setTimeout(poll, CHAT_POLL_MS);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && active) {
        clearTimeout(timer);
        void poll();
      }
    };

    if (document.visibilityState === "visible") void poll();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [matchId]);

  const send = useCallback(
    async (nickname: string, text: string): Promise<boolean> => {
      if (!matchId) return false;
      setSending(true);
      setError(null);
      try {
        const res = await fetch(`/api/chat/${encodeURIComponent(matchId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: getClientId(), nickname, text }),
        });
        const data: { message?: ChatMessage; error?: string } = await res.json().catch(() => ({}));
        if (!res.ok || !data.message) {
          setError(data.error ?? "Não foi possível enviar. Tente novamente.");
          return false;
        }
        // Append our own message right away and advance the cursor past it.
        cursorRef.current = Math.max(cursorRef.current, data.message.id);
        setMessages((prev) => [...prev, data.message as ChatMessage]);
        return true;
      } catch {
        setError("Falha de conexão. Tente novamente.");
        return false;
      } finally {
        setSending(false);
      }
    },
    [matchId],
  );

  return { open, messages, ready, sending, error, send };
}

import { type FormEvent, useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";

import { useMatchChat } from "../hooks/useMatchChat";

const NICKNAME_KEY = "agora:nickname";

const readStoredNickname = (): string => {
  try {
    return localStorage.getItem(NICKNAME_KEY) ?? "";
  } catch {
    return "";
  }
};

const storeNickname = (value: string): void => {
  try {
    localStorage.setItem(NICKNAME_KEY, value);
  } catch {
    /* storage unavailable — nickname just won't persist across reloads */
  }
};

const formatTime = (epochMs: number): string =>
  new Date(epochMs).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

interface MatchChatPanelProps {
  matchId: string;
  theme: "classic-light" | "stadium-dark";
}

/**
 * Live match chat ("Resenha ao vivo"). Anonymous: fans pick a self-declared apelido (kept
 * in localStorage) and post while the match is LIVE. The room is open only when the server
 * reports the match live; otherwise the compose box is replaced by a muted note. Reuses
 * the comment-thread look from the Redes Sociais feed. Drives everything via
 * {@link useMatchChat} (poll + post). Not authenticated — messages are best-effort and
 * reset on server restart, by design.
 */
export function MatchChatPanel({ matchId, theme }: MatchChatPanelProps) {
  const light = theme === "classic-light";
  const { open, messages, ready, sending, error, send } = useMatchChat(matchId);
  const [nickname, setNickname] = useState(readStoredNickname);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view as the thread grows.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedNick = nickname.trim();
    const trimmedText = draft.trim();
    if (!trimmedNick || !trimmedText) return;
    storeNickname(trimmedNick);
    const ok = await send(trimmedNick, trimmedText);
    if (ok) setDraft("");
  };

  const shellClasses = light
    ? "border-slate-200 bg-white/80"
    : "border-white/10 bg-[#101314]/80";
  const headingClasses = light ? "text-slate-800" : "text-white";
  const mutedClasses = light ? "text-slate-500" : "text-slate-400";
  const fieldClasses = light
    ? "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-[#009c3b]"
    : "border-white/10 bg-[#161919] text-slate-100 placeholder:text-slate-500 focus:border-[#00e476]";
  const accentText = light ? "text-[#009c3b]" : "text-[#00e476]";
  const sendButtonClasses = light
    ? "border-slate-200 bg-white text-slate-700 hover:border-[#009c3b] hover:text-[#009c3b]"
    : "border-white/10 bg-[#161919] text-slate-200 hover:border-[#00e476] hover:text-[#00e476]";

  return (
    <section
      id="match-chat"
      data-testid="match-chat-panel"
      className={`mt-6 rounded-3xl border p-5 backdrop-blur ${shellClasses}`}
    >
      <div className="flex items-center gap-2">
        <MessageCircle size={16} className={accentText} />
        <h3 className={`font-anton text-lg uppercase tracking-wide ${headingClasses}`}>
          Resenha ao vivo
        </h3>
        {open && (
          <span
            data-testid="match-chat-live-dot"
            className="ml-1 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[#e4002b]"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#e4002b]" />
            Ao vivo
          </span>
        )}
      </div>
      <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
        Bate-papo anônimo só durante a partida — as mensagens somem quando o jogo acaba.
      </p>

      <div
        ref={listRef}
        data-testid="match-chat-messages"
        className="mt-4 flex max-h-72 flex-col gap-2 overflow-y-auto pr-1"
      >
        {messages.length === 0 ? (
          open ? (
            <p className={`font-archivo text-sm ${mutedClasses}`}>
              Seja o primeiro a mandar a real sobre o jogo.
            </p>
          ) : null
        ) : (
          messages.map((m) => (
            <div key={m.id} data-testid="match-chat-message" className="min-w-0">
              <p className="font-archivo text-sm leading-5">
                <span className={`font-semibold ${accentText}`}>{m.nickname}</span>
                <span className={`ml-2 font-mono text-[10px] ${mutedClasses}`}>{formatTime(m.at)}</span>
              </p>
              <p className={`-mt-0.5 break-words font-archivo text-sm leading-5 ${headingClasses}`}>
                {m.text}
              </p>
            </div>
          ))
        )}
      </div>

      {error && (
        <p data-testid="match-chat-error" className="mt-3 font-archivo text-sm text-[#e4002b]">
          {error}
        </p>
      )}

      {open ? (
        <form className="mt-4 flex flex-col gap-2" onSubmit={handleSubmit}>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Seu apelido"
            maxLength={24}
            aria-label="Apelido"
            data-testid="match-chat-nickname"
            className={`min-h-10 rounded-full border px-4 font-archivo text-sm outline-none transition ${fieldClasses}`}
          />
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Manda a real…"
              maxLength={280}
              aria-label="Mensagem"
              data-testid="match-chat-input"
              className={`min-h-10 flex-1 rounded-full border px-4 font-archivo text-sm outline-none transition ${fieldClasses}`}
            />
            <button
              type="submit"
              disabled={sending || !nickname.trim() || !draft.trim()}
              aria-label="Enviar mensagem"
              data-testid="match-chat-send"
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-40 ${sendButtonClasses}`}
            >
              <Send size={15} />
            </button>
          </div>
        </form>
      ) : (
        <p
          data-testid="match-chat-closed"
          className={`mt-4 font-archivo text-sm ${mutedClasses}`}
        >
          O chat abre quando a partida começa. Volte no apito inicial!
        </p>
      )}
    </section>
  );
}

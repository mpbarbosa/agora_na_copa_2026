// Loads the proven pt-BR speech engine (catas_altas_speech) from jsDelivr at
// RUNTIME. The dynamic import is left untouched by Vite (`@vite-ignore` + a
// non-literal URL), so nothing about the engine ships in agora's bundle or the
// production filesystem — the browser fetches it from the CDN on demand. Prod
// only needs network access to jsDelivr.

const CATAS_SPEECH_URL =
  "https://cdn.jsdelivr.net/gh/mpbarbosa/catas_altas_speech@0.1.2/dist/esm/index.js";

/** The slice of the catas_altas_speech SpeechSynthesisManager we use. */
export interface CatasSpeech {
  speak(text: string, priority?: number): void;
  stop(): void;
  destroy?(): void;
  /** Resolved voice (for the speech-status readout); available once voices load. */
  getCurrentVoice?(): { name?: string; lang?: string; localService?: boolean } | null;
}

export type CatasSpeechCtor = new (enableLogging?: boolean) => CatasSpeech;

interface CatasSpeechModule {
  default: CatasSpeechCtor;
}

/** True when the browser exposes Web Speech synthesis (the engine's prerequisite). */
export function isSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance === "function"
  );
}

/**
 * A direct, instrumented Web Speech test that BYPASSES the catas engine and its
 * queue. Speaks a fixed phrase with `lang="pt-BR"` and NO forced voice (lets the
 * device pick its own default — the most reliable path, and it isolates whether
 * a silent narration is the auto-selected voice vs. the device itself). Reports
 * each outcome via `onStatus` so the result shows on screen.
 *
 * Must be called from a user gesture (a click) to satisfy mobile audio unlock.
 */
export function runDirectSpeechTest(onStatus: (status: string) => void): void {
  if (!isSpeechSupported()) {
    onStatus("Web Speech indisponível neste navegador.");
    return;
  }
  const synth = window.speechSynthesis;
  try {
    synth.cancel();
  } catch {
    /* clear any stuck utterance */
  }
  try {
    synth.resume();
  } catch {
    /* recover from a paused state (mobile backgrounding) */
  }

  const utterance = new SpeechSynthesisUtterance(
    "Testando a narração. Um, dois, três. Gol do Brasil!",
  );
  // Mirror the working guia_js engine EXACTLY: bind a concrete voice object and
  // do NOT set `lang`. On Android, a lang-only utterance with no voice bound is
  // silent — which is why the previous version produced no audio.
  const norm = (lang: string) => (lang || "").toLowerCase().replace("_", "-");
  const voices = synth.getVoices();
  const voice =
    voices.find((v) => norm(v.lang) === "pt-br") ??
    voices.find((v) => norm(v.lang).startsWith("pt")) ??
    voices[0] ??
    null;
  if (voice) {
    try {
      utterance.voice = voice;
    } catch {
      /* some engines reject assigning a voice; carry on with the default */
    }
  }
  utterance.volume = 1;
  utterance.rate = 1;
  utterance.pitch = 1;

  let started = false;
  let finished = false;
  utterance.onstart = () => {
    started = true;
    onStatus("🔊 falando…");
  };
  utterance.onend = () => {
    finished = true;
    onStatus(
      started
        ? "✓ concluído — áudio enviado pelo dispositivo."
        : "terminou sem áudio — o mecanismo de TTS do Android pode não estar ativo. Configurações → TTS → Ouvir um exemplo (e suba o volume de mídia).",
    );
  };
  utterance.onerror = (event) => {
    finished = true;
    onStatus(`erro do dispositivo: ${event.error || "desconhecido"}`);
  };

  onStatus(voice ? `enviado (voz: ${voice.name})…` : "enviado (nenhuma voz disponível)…");
  try {
    synth.speak(utterance);
  } catch (err) {
    onStatus(`falha ao iniciar: ${String(err)}`);
    return;
  }

  window.setTimeout(() => {
    if (!started && !finished) {
      onStatus(
        "sem áudio em 2s — provável volume de mídia baixo ou voz pt-BR não instalada (TTS do Android).",
      );
    }
  }, 2000);
}

let cached: Promise<CatasSpeechCtor | null> | null = null;

/**
 * Lazily import the engine constructor from the CDN. Cached across calls;
 * resolves to null (never throws) if the CDN is unreachable, so narration just
 * silently no-ops instead of breaking the page.
 */
export function loadSpeechEngine(): Promise<CatasSpeechCtor | null> {
  if (cached) return cached;
  if (typeof window === "undefined") return Promise.resolve(null);
  cached = (import(/* @vite-ignore */ CATAS_SPEECH_URL) as Promise<CatasSpeechModule>)
    .then((mod) => mod.default ?? null)
    .catch((err) => {
      console.warn("Narração: não foi possível carregar o motor de voz (CDN).", err);
      return null;
    });
  return cached;
}

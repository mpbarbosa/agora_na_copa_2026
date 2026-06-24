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
  /** Override the engine's auto-selected voice (used by the voice picker). */
  setVoice?(voice: SpeechSynthesisVoice | null): void;
}

// Voice names that signal a higher-quality neural/cloud engine.
const NEURAL_VOICE = /google|natural|online|neural|wavenet|premium|enhanced/i;

const norm = (lang: string) => (lang || "").toLowerCase().replace("_", "-");

/**
 * Picks the best pt-BR voice for display / explicit-reset: exact pt-BR over a pt
 * variant, neural/network breaking ties. Returns null when no Portuguese voice
 * exists (callers then fall back to the device default rather than forcing a
 * non-pt voice). For the *automatic* engine override use pickNetworkPtBrVoice.
 */
export function pickPtBrVoice(
  voices: readonly SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const score = (v: SpeechSynthesisVoice) => {
    const lang = norm(v.lang);
    let s = 0;
    if (lang === "pt-br") s += 100;
    else if (lang.startsWith("pt")) s += 50;
    if (NEURAL_VOICE.test(v.name)) s += 20;
    return s;
  };
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const v of voices) {
    const s = score(v);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }
  return bestScore > 0 ? best : null;
}

/**
 * A pt-BR voice worth OVERRIDING the engine's own selection with: a network
 * (cloud) voice, or one whose name signals a neural/online engine. Returns null
 * when the only pt-BR voices are plain on-device ones — callers then defer to the
 * engine's own pick (the on-device pt-BR voice), which is exactly what the proven
 * reference (guia_js) uses and which is audible on devices whose on-device voice
 * works. This still upgrades to "Google português do Brasil" on phones where the
 * on-device voice is listed but silent.
 */
export function pickNetworkPtBrVoice(
  voices: readonly SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const v of voices) {
    const lang = norm(v.lang);
    if (!lang.startsWith("pt")) continue;
    const isNetwork = v.localService === false; // explicitly a cloud voice
    const isNeural = NEURAL_VOICE.test(v.name);
    if (!isNetwork && !isNeural) continue; // plain on-device → leave it to the engine
    let s = lang === "pt-br" ? 100 : 50;
    if (isNetwork) s += 20;
    if (isNeural) s += 10;
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }
  return best;
}

/**
 * The simplest possible synchronous Web Speech call. Used to unlock mobile audio
 * from inside a user gesture and to speak when the catas engine hasn't finished
 * loading from the CDN yet (awaiting that import would leave the gesture and lose
 * the unlock). Deliberately NO `cancel()`/`resume()` beforehand — that is the
 * Android-Chrome bug that silently swallows the utterance. Binds a voice only when
 * one is given; otherwise the device default, which is the most reliable. No-ops
 * on unsupported browsers or empty text; never throws.
 */
export function speakDirect(text: string, voice?: SpeechSynthesisVoice | null): void {
  if (!isSpeechSupported()) return;
  const trimmed = text?.trim();
  if (!trimmed) return;
  const utterance = new SpeechSynthesisUtterance(trimmed);
  if (voice) {
    try {
      utterance.voice = voice;
    } catch {
      /* some engines reject assigning a voice; carry on with the default */
    }
  }
  try {
    window.speechSynthesis.speak(utterance);
  } catch {
    /* ignore — narration is best-effort */
  }
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
export function runDirectSpeechTest(
  onStatus: (status: string) => void,
  preferredVoice?: SpeechSynthesisVoice | null,
): void {
  if (!isSpeechSupported()) {
    onStatus("Web Speech indisponível neste navegador.");
    return;
  }
  const synth = window.speechSynthesis;

  // The SIMPLEST possible Web Speech call. Deliberately NO `cancel()`/`resume()`
  // beforehand — calling `cancel()` right before `speak()` is a known Android
  // Chrome bug that silently swallows the utterance. No `lang`, no rate/pitch/
  // volume (defaults are fine). Bind a voice ONLY when the user explicitly picked
  // one in the dropdown; otherwise let the device use its own default voice.
  const utterance = new SpeechSynthesisUtterance(
    "Testando a narração. Um, dois, três. Gol do Brasil!",
  );
  if (preferredVoice) {
    try {
      utterance.voice = preferredVoice;
    } catch {
      /* some engines reject assigning a voice; carry on with the default */
    }
  }

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

  onStatus(
    preferredVoice ? `enviado (voz: ${preferredVoice.name})…` : "enviado (voz padrão do aparelho)…",
  );
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

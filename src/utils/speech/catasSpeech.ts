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

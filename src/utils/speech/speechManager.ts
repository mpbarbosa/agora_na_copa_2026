// A small Web Speech API wrapper for pt-BR match narration. Distilled from the
// guia_js speech module down to the three patterns worth keeping: async voice
// loading (Chrome returns [] on the first getVoices() call), pt-BR voice
// scoring, and a tiny priority queue so a goal preempts a queued card. No
// observers, timers manager, logger, or config classes — just setTimeout.

interface QueueItem {
  text: string;
  priority: number;
  rate?: number;
  pitch?: number;
}

/** Optional per-utterance prosody overriding the manager's base rate/pitch. */
export interface SpeechProsody {
  rate?: number;
  pitch?: number;
}

/** True when the browser exposes the Web Speech synthesis API. */
export function isSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance === "function"
  );
}

// Voice names that signal a higher-quality neural/cloud engine across browsers
// (Chrome "Google …", Edge "… Online (Natural)", Apple "Luciana (Enhanced)", etc.).
const NEURAL_VOICE = /google|natural|online|neural|wavenet|premium|enhanced|luciana|francisc|ant[oô]nio/i;

// Picks the best pt-BR voice for sports narration: exact pt-BR beats pt-*, and a
// known neural voice beats a robotic one in the same locale. We deliberately do
// NOT prefer on-device voices — the best pt-BR voice ("Google português do
// Brasil") is a NETWORK voice — so localService is only a final tiebreaker.
export function selectPtBrVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const score = (v: SpeechSynthesisVoice) => {
    const lang = v.lang.toLowerCase().replace("_", "-");
    let s = 0;
    if (lang === "pt-br") s += 100;
    else if (lang.startsWith("pt")) s += 50;
    if (NEURAL_VOICE.test(v.name)) s += s > 0 ? 20 : 5;
    if (v.localService) s += 1;
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
  // bestScore 0 means no pt/neural voice at all — fall back to the system default.
  return bestScore > 0 ? best : voices[0];
}

export interface SpeechManagerOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  /** Max attempts to wait for voices to load (Chrome loads them async). */
  voiceRetries?: number;
  voiceRetryMs?: number;
}

export class SpeechManager {
  private readonly synth: SpeechSynthesis | null;
  private voice: SpeechSynthesisVoice | null = null;
  private readonly queue: QueueItem[] = [];
  private speaking = false;
  private disposed = false;
  private readonly rate: number;
  private readonly pitch: number;
  private readonly volume: number;

  constructor(options: SpeechManagerOptions = {}) {
    this.synth = isSpeechSupported() ? window.speechSynthesis : null;
    // Lively-but-clear baseline for sports narration (see the speech-setup
    // assessment): a touch faster than 1.0, full volume, neutral pitch.
    this.rate = options.rate ?? 1.05;
    this.pitch = options.pitch ?? 1;
    this.volume = options.volume ?? 1;
    if (this.synth) {
      this.loadVoice(options.voiceRetries ?? 10, options.voiceRetryMs ?? 250);
    }
  }

  /** Name of the resolved voice (for quick verification/debugging), or null. */
  getVoiceName(): string | null {
    return this.voice?.name ?? null;
  }

  /** Resolve and cache the best pt-BR voice, retrying while voices load. */
  private loadVoice(retriesLeft: number, retryMs: number): void {
    if (!this.synth || this.disposed) return;
    const voices = this.synth.getVoices();
    if (voices.length > 0) {
      this.voice = selectPtBrVoice(voices);
      this.processQueue(); // flush anything that was waiting for a voice
      return;
    }
    // Voices not ready yet — react to the event and also poll a few times.
    this.synth.onvoiceschanged = () => {
      if (this.disposed || !this.synth) return;
      this.voice = selectPtBrVoice(this.synth.getVoices());
      this.processQueue();
    };
    if (retriesLeft > 0) {
      window.setTimeout(() => this.loadVoice(retriesLeft - 1, retryMs), retryMs);
    }
  }

  /** Queue `text` to be spoken; higher priority is spoken first. */
  speak(text: string, priority = 0, prosody?: SpeechProsody): void {
    if (!this.synth || this.disposed) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    // Insert keeping the queue ordered by priority desc, FIFO within a tier.
    let i = this.queue.length;
    while (i > 0 && this.queue[i - 1].priority < priority) i--;
    this.queue.splice(i, 0, {
      text: trimmed,
      priority,
      rate: prosody?.rate,
      pitch: prosody?.pitch,
    });
    this.processQueue();
  }

  private processQueue(): void {
    if (!this.synth || this.disposed || this.speaking) return;
    if (this.queue.length === 0) return;
    // Android Chrome silently drops utterances spoken before the voice list has
    // loaded. If no voice is ready yet, hold the queue — loadVoice()'s
    // voiceschanged handler calls processQueue() again once voices arrive.
    if (!this.voice && this.synth.getVoices().length === 0) return;

    const item = this.queue.shift();
    if (!item) return;

    this.speaking = true;
    const utterance = new SpeechSynthesisUtterance(item.text);
    utterance.lang = "pt-BR";
    if (this.voice) {
      try {
        utterance.voice = this.voice;
      } catch {
        // Some engines reject assigning a voice object; the lang default speaks.
      }
    }
    utterance.rate = item.rate ?? this.rate;
    utterance.pitch = item.pitch ?? this.pitch;
    utterance.volume = this.volume;
    const done = () => {
      this.speaking = false;
      this.processQueue();
    };
    utterance.onend = done;
    utterance.onerror = done;
    // Mobile synths can sit in a paused state after backgrounding; resume() is a
    // no-op when already running, so it's safe to call defensively before speak.
    this.synth.resume();
    this.synth.speak(utterance);
  }

  /** Cancel current speech and drop everything queued. */
  stop(): void {
    this.queue.length = 0;
    this.speaking = false;
    if (this.synth) this.synth.cancel();
  }

  /** Stop and release; the instance must not be reused afterwards. */
  dispose(): void {
    this.stop();
    this.disposed = true;
    if (this.synth) this.synth.onvoiceschanged = null;
  }
}

// A small Web Speech API wrapper for pt-BR match narration. Distilled from the
// guia_js speech module down to the three patterns worth keeping: async voice
// loading (Chrome returns [] on the first getVoices() call), pt-BR voice
// scoring, and a tiny priority queue so a goal preempts a queued card. No
// observers, timers manager, logger, or config classes — just setTimeout.

interface QueueItem {
  text: string;
  priority: number;
}

/** True when the browser exposes the Web Speech synthesis API. */
export function isSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance === "function"
  );
}

// Prefers an exact pt-BR voice, then any pt-* voice, then the system default;
// within a tier, prefers an on-device (localService) voice.
export function selectPtBrVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const score = (v: SpeechSynthesisVoice) => {
    const lang = v.lang.toLowerCase().replace("_", "-");
    let s = 0;
    if (lang === "pt-br") s += 20;
    else if (lang.startsWith("pt")) s += 10;
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
  // bestScore 0 means no pt voice at all — fall back to the system default.
  return bestScore > 0 ? best : voices[0];
}

export interface SpeechManagerOptions {
  rate?: number;
  pitch?: number;
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

  constructor(options: SpeechManagerOptions = {}) {
    this.synth = isSpeechSupported() ? window.speechSynthesis : null;
    this.rate = options.rate ?? 1;
    this.pitch = options.pitch ?? 1;
    if (this.synth) {
      this.loadVoice(options.voiceRetries ?? 10, options.voiceRetryMs ?? 250);
    }
  }

  /** Resolve and cache the best pt-BR voice, retrying while voices load. */
  private loadVoice(retriesLeft: number, retryMs: number): void {
    if (!this.synth || this.disposed) return;
    const voices = this.synth.getVoices();
    if (voices.length > 0) {
      this.voice = selectPtBrVoice(voices);
      return;
    }
    // Voices not ready yet — react to the event and also poll a few times.
    this.synth.onvoiceschanged = () => {
      if (this.disposed || !this.synth) return;
      this.voice = selectPtBrVoice(this.synth.getVoices());
    };
    if (retriesLeft > 0) {
      window.setTimeout(() => this.loadVoice(retriesLeft - 1, retryMs), retryMs);
    }
  }

  /** Queue `text` to be spoken; higher priority is spoken first. */
  speak(text: string, priority = 0): void {
    if (!this.synth || this.disposed) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    // Insert keeping the queue ordered by priority desc, FIFO within a tier.
    let i = this.queue.length;
    while (i > 0 && this.queue[i - 1].priority < priority) i--;
    this.queue.splice(i, 0, { text: trimmed, priority });
    this.processQueue();
  }

  private processQueue(): void {
    if (!this.synth || this.disposed || this.speaking) return;
    const item = this.queue.shift();
    if (!item) return;

    this.speaking = true;
    const utterance = new SpeechSynthesisUtterance(item.text);
    utterance.lang = "pt-BR";
    if (this.voice) utterance.voice = this.voice;
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;
    const done = () => {
      this.speaking = false;
      this.processQueue();
    };
    utterance.onend = done;
    utterance.onerror = done;
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

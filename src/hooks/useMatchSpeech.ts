import { useCallback, useEffect, useRef, useState } from "react";
import {
  diffMatchStateToCues,
  phraseCue,
  type MatchSnapshot,
  type TeamNames,
} from "../utils/matchSpeech";
import {
  isSpeechSupported,
  loadSpeechEngine,
  pickPtBrVoice,
  type CatasSpeech,
} from "../utils/speech/catasSpeech";

const STORAGE_KEY = "agora:narracao";
const VOICE_KEY = "agora:narracao:voz";

function readPersisted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function persist(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ignore (private mode / storage disabled)
  }
}

function readVoicePref(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(VOICE_KEY);
  } catch {
    return null;
  }
}

function persistVoice(uri: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (uri) window.localStorage.setItem(VOICE_KEY, uri);
    else window.localStorage.removeItem(VOICE_KEY);
  } catch {
    /* ignore */
  }
}

export interface UseMatchSpeechArgs {
  matchId: string;
  snapshot: MatchSnapshot;
  teamNames: TeamNames;
}

export interface MatchSpeechStatus {
  /** Browser exposes the Web Speech API. */
  supported: boolean;
  /** The catas_altas_speech engine has been loaded from the CDN. */
  engineLoaded: boolean;
  /** Resolved pt-BR voice name, or null while voices are still loading. */
  voiceName: string | null;
  /** True = on-device voice, false = network voice, null = unknown/not loaded. */
  voiceLocal: boolean | null;
}

export interface MatchSpeechControls {
  enabled: boolean;
  supported: boolean;
  toggle: () => void;
  /** Speak an arbitrary phrase on demand (e.g. a tapped incident), regardless of the toggle. */
  speak: (text: string, priority?: number) => void;
  /** Live diagnostic snapshot for the speech-status readout in the setup drawer. */
  status: MatchSpeechStatus;
  /** Voices available in the browser (pt-BR first) for the voice picker. */
  voices: SpeechSynthesisVoice[];
  /** voiceURI of the user-chosen voice, or null to use the automatic pick. */
  selectedVoiceUri: string | null;
  /** The currently chosen voice object (for the direct test), or null. */
  selectedVoice: SpeechSynthesisVoice | null;
  /** Choose a voice (""/null = automatic). Applies to narration and the test. */
  selectVoice: (voiceUri: string) => void;
}

/**
 * Narrates the selected live match aloud using the catas_altas_speech engine,
 * loaded from the CDN at runtime (see ../utils/speech/catasSpeech). Owns the
 * engine instance, the persisted on/off preference, and the "seen" baseline so
 * enabling mid-match never replays the backlog. Each time the snapshot's
 * narratable fields change it diffs against the previous snapshot and speaks the
 * resulting cues (goal > period > card/score).
 *
 * The engine is preloaded on mount so it (and its pt-BR voices) are warm before
 * the first tap, and so `toggle()` can speak the confirmation inside the click
 * gesture — required to unlock audio on mobile browsers.
 */
export function useMatchSpeech({
  matchId,
  snapshot,
  teamNames,
}: UseMatchSpeechArgs): MatchSpeechControls {
  const supported = isSpeechSupported();
  const [enabled, setEnabled] = useState(() => supported && readPersisted());
  const [engineLoaded, setEngineLoaded] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string | null>(() => readVoicePref());

  const managerRef = useRef<CatasSpeech | null>(null);
  const prevRef = useRef<MatchSnapshot | null>(null);
  const snapshotRef = useRef(snapshot);
  const namesRef = useRef(teamNames);
  const enabledRef = useRef(enabled);
  snapshotRef.current = snapshot;
  namesRef.current = teamNames;
  enabledRef.current = enabled;

  // Preload the engine from the CDN on mount so it's warm before the first tap.
  useEffect(() => {
    if (!supported) return;
    let active = true;
    void loadSpeechEngine().then((Ctor) => {
      if (!active || !Ctor) return;
      if (!managerRef.current) {
        try {
          managerRef.current = new Ctor(false);
        } catch {
          // engine construction failed — narration silently no-ops
          return;
        }
      }
      if (active) setEngineLoaded(true);
    });
    return () => {
      active = false;
      try {
        managerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      managerRef.current = null;
    };
  }, [supported]);

  // Track available voices for the picker (pt-BR first).
  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const refresh = () => {
      const list = [...synth.getVoices()];
      const ptRank = (v: SpeechSynthesisVoice) => {
        const lang = (v.lang || "").toLowerCase().replace("_", "-");
        return lang.startsWith("pt-br") ? 0 : lang.startsWith("pt") ? 1 : 2;
      };
      list.sort((a, b) => ptRank(a) - ptRank(b) || a.name.localeCompare(b.name));
      setVoices(list);
    };
    refresh();
    synth.addEventListener?.("voiceschanged", refresh);
    return () => synth.removeEventListener?.("voiceschanged", refresh);
  }, [supported]);

  // Apply the chosen voice to the engine once it and the voices are ready —
  // the persisted pick, else the most reliable pt-BR voice (overriding the
  // engine's on-device bias, which is silent on some Android phones).
  useEffect(() => {
    if (!engineLoaded || voices.length === 0) return;
    const chosen = selectedVoiceUri
      ? (voices.find((v) => v.voiceURI === selectedVoiceUri) ?? null)
      : pickPtBrVoice(voices);
    if (chosen) managerRef.current?.setVoice?.(chosen);
  }, [engineLoaded, voices, selectedVoiceUri]);

  // Re-seed silently when the selected match changes — never narrate across a
  // match switch.
  useEffect(() => {
    prevRef.current = null;
    managerRef.current?.stop();
  }, [matchId]);

  // A value that changes only when a narratable field changes.
  const signature = [
    snapshot.status,
    snapshot.officialStatus ?? "",
    snapshot.score ? `${snapshot.score.teamA}-${snapshot.score.teamB}` : "",
    (snapshot.incidents ?? []).map((i) => i.id).join(","),
  ].join("|");

  useEffect(() => {
    if (!enabled) return;
    const manager = managerRef.current;
    if (!manager) return;
    const next = snapshotRef.current;
    const prev = prevRef.current;
    prevRef.current = next;
    if (!prev) return; // baseline seeded — don't replay it
    for (const cue of diffMatchStateToCues(prev, next)) {
      manager.speak(phraseCue(cue, namesRef.current), cue.priority);
    }
  }, [signature, enabled, matchId]);

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    persist(next);
    if (next) {
      prevRef.current = snapshotRef.current; // seed baseline, no backlog replay
      const manager = managerRef.current;
      if (manager) {
        // Speak synchronously inside the gesture to unlock audio on mobile.
        manager.speak("Narração ativada.", 1);
      } else {
        // Engine still loading — load, create, speak (best effort; may miss the
        // in-gesture unlock the very first time on a cold network).
        void loadSpeechEngine().then((Ctor) => {
          if (!Ctor) return;
          if (!managerRef.current) {
            try {
              managerRef.current = new Ctor(false);
            } catch {
              return;
            }
          }
          managerRef.current?.speak("Narração ativada.", 1);
        });
      }
    } else {
      managerRef.current?.stop();
    }
    setEnabled(next);
  }, []);

  // On-demand speech (the per-incident microphone). Works regardless of the
  // Narração toggle; runs inside the click gesture so it unlocks mobile audio.
  const speak = useCallback((text: string, priority = 3) => {
    const trimmed = text?.trim();
    if (!trimmed) return;
    const manager = managerRef.current;
    if (manager) {
      manager.speak(trimmed, priority);
      return;
    }
    void loadSpeechEngine().then((Ctor) => {
      if (!Ctor) return;
      if (!managerRef.current) {
        try {
          managerRef.current = new Ctor(false);
        } catch {
          return;
        }
      }
      managerRef.current?.speak(trimmed, priority);
    });
  }, []);

  // Choose a voice for narration + the direct test (applies via the effect above).
  const selectVoice = useCallback((voiceUri: string) => {
    const uri = voiceUri || null;
    setSelectedVoiceUri(uri);
    persistVoice(uri);
    const all = window.speechSynthesis.getVoices();
    const chosen = uri ? (all.find((v) => v.voiceURI === uri) ?? null) : pickPtBrVoice(all);
    managerRef.current?.setVoice?.(chosen);
  }, []);

  const selectedVoice = selectedVoiceUri
    ? (voices.find((v) => v.voiceURI === selectedVoiceUri) ?? null)
    : pickPtBrVoice(voices);

  // Live snapshot for the setup-drawer readout. Read off the engine each render;
  // the per-second clock tick in the Ao Vivo view keeps it current as voices load.
  const currentVoice = managerRef.current?.getCurrentVoice?.() ?? null;
  const status: MatchSpeechStatus = {
    supported,
    engineLoaded,
    voiceName: currentVoice?.name ?? selectedVoice?.name ?? null,
    voiceLocal: currentVoice?.localService ?? selectedVoice?.localService ?? null,
  };

  return {
    enabled,
    supported,
    toggle,
    speak,
    status,
    voices,
    selectedVoiceUri,
    selectedVoice,
    selectVoice,
  };
}

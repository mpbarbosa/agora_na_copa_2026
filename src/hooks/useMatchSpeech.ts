import { useCallback, useEffect, useRef, useState } from "react";
import {
  diffMatchStateToCues,
  phraseCue,
  type MatchSnapshot,
  type TeamNames,
} from "../utils/matchSpeech";
import {
  isSpeechSupported,
  createSpeechManager,
  pickPtBrVoice,
  pickNetworkPtBrVoice,
  speakDirect,
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
  /** The vendored speech engine has been constructed and is ready. */
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
 * Narrates the selected live match aloud using the vendored SpeechSynthesisManager
 * engine, constructed synchronously and locally (see ../utils/speech/catasSpeech
 * and ../utils/speech/engine). Owns the engine instance, the persisted on/off
 * preference, and the "seen" baseline so
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

  // Construct the engine SYNCHRONOUSLY on mount (it's vendored locally — no CDN to
  // await). This guarantees the manager exists before the first tap, so speak()
  // runs inside the gesture and unlocks mobile audio.
  useEffect(() => {
    if (!supported) return;
    if (!managerRef.current) {
      managerRef.current = createSpeechManager(false);
    }
    if (managerRef.current) setEngineLoaded(true);
    return () => {
      try {
        managerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      managerRef.current = null;
      setEngineLoaded(false);
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

  // Apply the chosen voice to the engine once it and the voices are ready.
  useEffect(() => {
    if (!engineLoaded || voices.length === 0) return;
    if (selectedVoiceUri) {
      const chosen = voices.find((v) => v.voiceURI === selectedVoiceUri) ?? null;
      if (chosen) managerRef.current?.setVoice?.(chosen);
      return;
    }
    // No explicit pick: only override the engine's own selection when a network/
    // neural pt-BR voice exists (the upgrade for phones whose on-device voice is
    // silent). Otherwise defer to the engine's on-device pt-BR pick — the same
    // voice the proven reference (guia_js) uses successfully.
    const upgrade = pickNetworkPtBrVoice(voices);
    if (upgrade) managerRef.current?.setVoice?.(upgrade);
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
      // The engine is created synchronously on mount, so it is normally ready here
      // and speak() runs inside the gesture (unlocking mobile audio). The direct
      // fallback only matters if the engine is unavailable on this device.
      const manager = managerRef.current;
      if (manager) {
        manager.speak("Narração ativada.", 1);
      } else {
        speakDirect("Narração ativada.");
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
    if (manager) manager.speak(trimmed, priority);
    else speakDirect(trimmed); // engine unavailable on this device — direct best-effort
  }, []);

  // Choose a voice for narration + the direct test (applies via the effect above).
  const selectVoice = useCallback((voiceUri: string) => {
    const uri = voiceUri || null;
    setSelectedVoiceUri(uri);
    persistVoice(uri);
    const all = window.speechSynthesis.getVoices();
    // Clearing the picker reverts to auto: a network/neural pt-BR voice if one
    // exists, else the best on-device pt-BR (mirroring the engine's own pick).
    const chosen = uri
      ? (all.find((v) => v.voiceURI === uri) ?? null)
      : (pickNetworkPtBrVoice(all) ?? pickPtBrVoice(all));
    managerRef.current?.setVoice?.(chosen);
  }, []);

  const selectedVoice = selectedVoiceUri
    ? (voices.find((v) => v.voiceURI === selectedVoiceUri) ?? null)
    : (pickNetworkPtBrVoice(voices) ?? pickPtBrVoice(voices));

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

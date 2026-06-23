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
  type CatasSpeech,
} from "../utils/speech/catasSpeech";

const STORAGE_KEY = "agora:narracao";

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

export interface UseMatchSpeechArgs {
  matchId: string;
  snapshot: MatchSnapshot;
  teamNames: TeamNames;
}

export interface MatchSpeechControls {
  enabled: boolean;
  supported: boolean;
  toggle: () => void;
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
      if (!active || !Ctor || managerRef.current) return;
      try {
        managerRef.current = new Ctor(false);
      } catch {
        // engine construction failed — narration silently no-ops
      }
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

  return { enabled, supported, toggle };
}

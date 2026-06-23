import { useCallback, useEffect, useRef, useState } from "react";
import { SpeechManager, isSpeechSupported } from "../utils/speech/speechManager";
import {
  diffMatchStateToCues,
  phraseCue,
  cueProsody,
  type MatchSnapshot,
  type TeamNames,
} from "../utils/matchSpeech";

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
 * Narrates the selected live match aloud. Owns the SpeechManager, the persisted
 * on/off preference, and the "seen" baseline so enabling mid-match never replays
 * the backlog. Each time the snapshot's narratable fields change it diffs against
 * the previous snapshot and speaks the resulting cues (goal > period > card/score).
 *
 * `toggle()` is meant to be called from a click handler: enabling there both
 * primes the audio within the user gesture (required by some browsers) and seeds
 * the baseline.
 */
export function useMatchSpeech({
  matchId,
  snapshot,
  teamNames,
}: UseMatchSpeechArgs): MatchSpeechControls {
  const supported = isSpeechSupported();
  const [enabled, setEnabled] = useState(() => supported && readPersisted());

  const managerRef = useRef<SpeechManager | null>(null);
  const prevRef = useRef<MatchSnapshot | null>(null);
  const snapshotRef = useRef(snapshot);
  const namesRef = useRef(teamNames);
  snapshotRef.current = snapshot;
  namesRef.current = teamNames;

  const ensureManager = useCallback((): SpeechManager | null => {
    if (!supported) return null;
    if (!managerRef.current) managerRef.current = new SpeechManager();
    return managerRef.current;
  }, [supported]);

  // Create the manager whenever narration is on (covers the persisted-restore
  // case where it starts enabled without a click).
  useEffect(() => {
    if (enabled) ensureManager();
  }, [enabled, ensureManager]);

  // Release on unmount.
  useEffect(() => {
    return () => {
      managerRef.current?.dispose();
      managerRef.current = null;
    };
  }, []);

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
      manager.speak(phraseCue(cue, namesRef.current), cue.priority, cueProsody(cue));
    }
  }, [signature, enabled, matchId]);

  const toggle = useCallback(() => {
    setEnabled((on) => {
      const next = !on;
      persist(next);
      if (next) {
        const manager = ensureManager();
        prevRef.current = snapshotRef.current; // seed at the gesture, no replay
        manager?.speak("Narração ativada.", 0); // confirm + unlock audio in-gesture
      } else {
        managerRef.current?.stop();
      }
      return next;
    });
  }, [ensureManager]);

  return { enabled, supported, toggle };
}

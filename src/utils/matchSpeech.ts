// Pure logic for narrating a live match: turns the delta between two match-state
// snapshots into ordered speech cues, and renders each cue into a pt-BR
// broadcast-voice phrase. No DOM, no Web Speech API here — all of that lives in
// the speech manager + the React hook, so this stays unit-testable.

import type { CommentaryEvent, MatchStatus } from "../types";

/** The minimal slice of a match state this module diffs. */
export interface MatchSnapshot {
  status: MatchStatus;
  /** Official FIFA period label, e.g. "1º tempo", "Intervalo", "2º tempo", "Fim de jogo". */
  officialStatus?: string;
  score?: { teamA: number; teamB: number };
  incidents?: CommentaryEvent[];
}

/** Team display names used only when phrasing a cue. */
export interface TeamNames {
  a: string;
  b: string;
}

// Priorities — higher speaks first when several cues queue at once.
export const CUE_PRIORITY = {
  GOAL: 3,
  PERIOD: 2,
  CARD: 1,
  SCORE: 1,
} as const;

/** Canonical period tokens we narrate (a subset of all FIFA periods). */
export type PeriodToken = "FIRST_HALF" | "HALFTIME" | "SECOND_HALF" | "FULL_TIME";

export type MatchSpeechCue =
  | { kind: "period"; token: PeriodToken; score?: { a: number; b: number }; priority: number }
  | {
      kind: "goal";
      team?: "A" | "B";
      scorer?: string;
      minute?: string;
      score?: { a: number; b: number };
      priority: number;
    }
  | { kind: "card"; card: "YELLOW" | "RED"; team?: "A" | "B"; player?: string; minute?: string; priority: number }
  | { kind: "score"; score: { a: number; b: number }; priority: number };

const NARRATED_INCIDENTS = new Set<CommentaryEvent["type"]>(["GOAL", "YELLOW_CARD", "RED_CARD"]);

// Maps an official FIFA period label to the canonical token we narrate.
const PERIOD_LABEL_TO_TOKEN: Record<string, PeriodToken> = {
  "1º tempo": "FIRST_HALF",
  Intervalo: "HALFTIME",
  "2º tempo": "SECOND_HALF",
  "Fim de jogo": "FULL_TIME",
  Encerrado: "FULL_TIME",
};

/** Resolve a snapshot to the period the match is in (or null when unknown). */
function periodToken(snapshot: MatchSnapshot): PeriodToken | null {
  if (snapshot.status === "FINISHED") return "FULL_TIME";
  const label = snapshot.officialStatus;
  if (!label) return null;
  return PERIOD_LABEL_TO_TOKEN[label] ?? null;
}

const scoreOf = (s?: { teamA: number; teamB: number }) =>
  s ? { a: s.teamA, b: s.teamB } : undefined;

const sameScore = (
  x?: { teamA: number; teamB: number },
  y?: { teamA: number; teamB: number },
) => (x?.teamA ?? null) === (y?.teamA ?? null) && (x?.teamB ?? null) === (y?.teamB ?? null);

const firstMention = (incident: CommentaryEvent) => incident.playerMentions?.[0]?.name;

/**
 * Diff two consecutive match snapshots into the speech cues that should be
 * announced for the transition. Returns [] on the first observation (`prev`
 * null) so enabling narration mid-match never replays the backlog.
 *
 * Cues are returned highest-priority first (goal > period > card/score).
 */
export function diffMatchStateToCues(
  prev: MatchSnapshot | null,
  next: MatchSnapshot,
): MatchSpeechCue[] {
  // First observation: seed the baseline silently.
  if (!prev) return [];

  const cues: MatchSpeechCue[] = [];
  const nextScore = scoreOf(next.score);

  // 1) New incidents (goals + cards), in feed order, deduped by id.
  const seen = new Set((prev.incidents ?? []).map((i) => i.id));
  let goalAnnounced = false;
  for (const incident of next.incidents ?? []) {
    if (seen.has(incident.id)) continue;
    if (!NARRATED_INCIDENTS.has(incident.type)) continue;
    const minute = incident.time || undefined;
    if (incident.type === "GOAL") {
      goalAnnounced = true;
      cues.push({
        kind: "goal",
        team: incident.team,
        scorer: firstMention(incident),
        minute,
        score: nextScore,
        priority: CUE_PRIORITY.GOAL,
      });
    } else {
      cues.push({
        kind: "card",
        card: incident.type === "RED_CARD" ? "RED" : "YELLOW",
        team: incident.team,
        player: firstMention(incident),
        minute,
        priority: CUE_PRIORITY.CARD,
      });
    }
  }

  // 2) Period transition (1º tempo / Intervalo / 2º tempo / Fim de jogo).
  const prevToken = periodToken(prev);
  const nextTok = periodToken(next);
  if (nextTok && nextTok !== prevToken) {
    cues.push({
      kind: "period",
      token: nextTok,
      score: nextTok === "FULL_TIME" ? nextScore : undefined,
      priority: CUE_PRIORITY.PERIOD,
    });
  }

  // 3) Score change with no goal incident to carry it (e.g. a correction).
  if (!goalAnnounced && nextScore && !sameScore(prev.score, next.score)) {
    cues.push({ kind: "score", score: nextScore, priority: CUE_PRIORITY.SCORE });
  }

  // Stable sort by priority desc (preserves goal-before-card feed order).
  return cues
    .map((cue, index) => ({ cue, index }))
    .sort((x, y) => y.cue.priority - x.cue.priority || x.index - y.index)
    .map(({ cue }) => cue);
}

const teamName = (side: "A" | "B" | undefined, names: TeamNames) =>
  side === "A" ? names.a : side === "B" ? names.b : null;

const minutePhrase = (minute?: string) => {
  const n = (minute ?? "").replace(/\D/g, "");
  return n ? `aos ${n} minutos` : "";
};

const scoreline = (score: { a: number; b: number } | undefined, names: TeamNames) =>
  score ? `${names.a} ${score.a} a ${score.b} ${names.b}` : "";

/**
 * Per-cue prosody for sports narration: a goal gets a small rate+pitch lift for
 * energy; everything else uses the manager's lively-but-neutral baseline.
 */
export function cueProsody(cue: MatchSpeechCue): { rate?: number; pitch?: number } | undefined {
  return cue.kind === "goal" ? { rate: 1.1, pitch: 1.15 } : undefined;
}

/** Render a cue into a pt-BR broadcast-voice phrase. */
export function phraseCue(cue: MatchSpeechCue, names: TeamNames): string {
  switch (cue.kind) {
    case "period":
      switch (cue.token) {
        case "FIRST_HALF":
          return "Bola rolando! Começa o primeiro tempo.";
        case "HALFTIME":
          return "Fim do primeiro tempo.";
        case "SECOND_HALF":
          return "Começa o segundo tempo.";
        case "FULL_TIME":
          return cue.score
            ? `Fim de jogo. Placar final: ${scoreline(cue.score, names)}.`
            : "Fim de jogo.";
      }
      return "";
    case "goal": {
      const side = teamName(cue.team, names);
      const parts = [side ? `Gol! Gol do ${side}!` : "Gol! Gol!"];
      const tail = [cue.scorer, minutePhrase(cue.minute)].filter(Boolean).join(", ");
      if (tail) parts.push(`${tail}.`);
      if (cue.score) parts.push(`${scoreline(cue.score, names)}.`);
      return parts.join(" ");
    }
    case "card": {
      const color = cue.card === "RED" ? "vermelho" : "amarelo";
      const who = cue.player ?? "jogador";
      const min = minutePhrase(cue.minute);
      return `Cartão ${color} para ${who}${min ? `, ${min}` : ""}.`;
    }
    case "score":
      return `Placar atualizado: ${scoreline(cue.score, names)}.`;
  }
}

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diffMatchStateToCues,
  phraseCue,
  CUE_PRIORITY,
  type MatchSnapshot,
} from "../src/utils/matchSpeech";
import type { CommentaryEvent } from "../src/types";

const NAMES = { a: "Brasil", b: "Argentina" };

const goal = (id: string, team: "A" | "B", scorer: string, time = "23'"): CommentaryEvent => ({
  id,
  time,
  type: "GOAL",
  text: `Gol de ${scorer}`,
  team,
  playerMentions: [{ name: scorer }],
});

const card = (
  id: string,
  type: "YELLOW_CARD" | "RED_CARD",
  team: "A" | "B",
  player: string,
): CommentaryEvent => ({
  id,
  time: "40'",
  type,
  text: `Cartão para ${player}`,
  team,
  playerMentions: [{ name: player }],
});

const live = (over: Partial<MatchSnapshot> = {}): MatchSnapshot => ({
  status: "LIVE",
  officialStatus: "1º tempo",
  score: { teamA: 0, teamB: 0 },
  incidents: [],
  ...over,
});

test("first observation (prev null) emits nothing — no backlog replay", () => {
  const next = live({ incidents: [goal("g1", "A", "Vinicius")], score: { teamA: 1, teamB: 0 } });
  assert.deepEqual(diffMatchStateToCues(null, next), []);
});

test("kickoff transition into the first half emits a period cue", () => {
  const prev = live({ status: "PRE_GAME", officialStatus: "Pré-jogo" });
  const next = live({ officialStatus: "1º tempo" });
  const cues = diffMatchStateToCues(prev, next);
  assert.equal(cues.length, 1);
  assert.deepEqual(cues[0], { kind: "period", token: "FIRST_HALF", score: undefined, priority: CUE_PRIORITY.PERIOD });
});

test("halftime, second-half and full-time transitions are detected", () => {
  const intervalo = diffMatchStateToCues(live({ officialStatus: "1º tempo" }), live({ officialStatus: "Intervalo" }));
  assert.equal(intervalo[0].kind === "period" && intervalo[0].token, "HALFTIME");

  const second = diffMatchStateToCues(live({ officialStatus: "Intervalo" }), live({ officialStatus: "2º tempo" }));
  assert.equal(second[0].kind === "period" && second[0].token, "SECOND_HALF");

  const full = diffMatchStateToCues(
    live({ officialStatus: "2º tempo", score: { teamA: 2, teamB: 1 } }),
    live({ status: "FINISHED", officialStatus: "Fim de jogo", score: { teamA: 2, teamB: 1 } }),
  );
  const ft = full.find((c) => c.kind === "period");
  assert.ok(ft && ft.kind === "period" && ft.token === "FULL_TIME");
  assert.deepEqual(ft.kind === "period" ? ft.score : null, { a: 2, b: 1 });
});

test("a new goal emits a goal cue carrying the new score, and no separate score cue", () => {
  const prev = live({ score: { teamA: 0, teamB: 0 } });
  const next = live({ incidents: [goal("g1", "A", "Vinicius")], score: { teamA: 1, teamB: 0 } });
  const cues = diffMatchStateToCues(prev, next);
  assert.equal(cues.length, 1);
  assert.equal(cues[0].kind, "goal");
  assert.equal(cues[0].kind === "goal" && cues[0].scorer, "Vinicius");
  assert.deepEqual(cues[0].kind === "goal" ? cues[0].score : null, { a: 1, b: 0 });
  assert.ok(!cues.some((c) => c.kind === "score"));
});

test("a score change with no goal incident emits a score cue", () => {
  const prev = live({ score: { teamA: 0, teamB: 0 } });
  const next = live({ score: { teamA: 0, teamB: 1 } });
  const cues = diffMatchStateToCues(prev, next);
  assert.deepEqual(cues, [{ kind: "score", score: { a: 0, b: 1 }, priority: CUE_PRIORITY.SCORE }]);
});

test("already-seen incidents are not re-announced", () => {
  const g = goal("g1", "A", "Vinicius");
  const prev = live({ incidents: [g], score: { teamA: 1, teamB: 0 } });
  const next = live({ incidents: [g], score: { teamA: 1, teamB: 0 } });
  assert.deepEqual(diffMatchStateToCues(prev, next), []);
});

test("yellow and red cards emit card cues", () => {
  const cues = diffMatchStateToCues(
    live(),
    live({ incidents: [card("c1", "YELLOW_CARD", "B", "Otamendi"), card("c2", "RED_CARD", "B", "Romero")] }),
  );
  assert.equal(cues.length, 2);
  assert.ok(cues.every((c) => c.kind === "card"));
  assert.equal(cues[0].kind === "card" && cues[0].card, "YELLOW");
  assert.equal(cues[1].kind === "card" && cues[1].card, "RED");
});

test("when a goal and a card arrive together, the goal is ordered first (priority)", () => {
  const cues = diffMatchStateToCues(
    live(),
    live({
      incidents: [card("c1", "YELLOW_CARD", "B", "Otamendi"), goal("g1", "A", "Raphinha")],
      score: { teamA: 1, teamB: 0 },
    }),
  );
  assert.equal(cues[0].kind, "goal");
  assert.equal(cues[1].kind, "card");
});

test("substitutions and generic commentary are not narrated", () => {
  const sub: CommentaryEvent = { id: "s1", time: "60'", type: "SUBSTITUTION", text: "Troca" };
  const comment: CommentaryEvent = { id: "k1", time: "61'", type: "COMMENT", text: "Pressão" };
  assert.deepEqual(diffMatchStateToCues(live(), live({ incidents: [sub, comment] })), []);
});

test("phraseCue renders pt-BR broadcast phrases", () => {
  assert.equal(
    phraseCue({ kind: "period", token: "FIRST_HALF", priority: 2 }, NAMES),
    "Bola rolando! Começa o primeiro tempo.",
  );
  assert.equal(phraseCue({ kind: "period", token: "HALFTIME", priority: 2 }, NAMES), "Fim do primeiro tempo.");
  assert.equal(
    phraseCue({ kind: "period", token: "FULL_TIME", score: { a: 2, b: 1 }, priority: 2 }, NAMES),
    "Fim de jogo. Placar final: Brasil 2 a 1 Argentina.",
  );
  assert.equal(
    phraseCue({ kind: "goal", team: "A", scorer: "Vinicius", minute: "23'", score: { a: 1, b: 0 }, priority: 3 }, NAMES),
    "Gol do Brasil! Vinicius, aos 23 minutos. Brasil 1 a 0 Argentina.",
  );
  assert.equal(
    phraseCue({ kind: "card", card: "RED", team: "B", player: "Romero", minute: "40'", priority: 1 }, NAMES),
    "Cartão vermelho para Romero, aos 40 minutos.",
  );
  assert.equal(
    phraseCue({ kind: "score", score: { a: 0, b: 1 }, priority: 1 }, NAMES),
    "Placar atualizado: Brasil 0 a 1 Argentina.",
  );
});

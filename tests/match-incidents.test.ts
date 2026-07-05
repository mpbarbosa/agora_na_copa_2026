import { test } from "node:test";
import assert from "node:assert/strict";
import type { CommentaryEvent, Match, Player } from "../src/types";
import { Position } from "../src/types";
import {
  normalizePlayerLookupText,
  isIncidentPlayerNameMatch,
  getIncidentPlayerTokens,
  buildIncidentPlayerSelections,
} from "../src/utils/matchIncidents";

const player = (name: string, over: Partial<Player> = {}): Player =>
  ({ id: name.toLowerCase(), name, number: 10, position: Position.FW, x: 50, y: 50, ...over }) as Player;

// buildIncidentPlayerSelections only reads name/code + lineup arrays off the teams.
const match = (aPlayers: Player[], bPlayers: Player[] = []): Match =>
  ({
    teamA: { name: "Brasil", code: "BRA", group: "G", lineup: aPlayers },
    teamB: { name: "Marrocos", code: "MAR", group: "G", lineup: bPlayers },
  }) as unknown as Match;

const incident = (over: Partial<CommentaryEvent>): CommentaryEvent =>
  ({ id: "1", time: "23'", type: "GOAL", text: "", ...over }) as CommentaryEvent;

test("normalizePlayerLookupText strips diacritics, punctuation and upper-cases", () => {
  assert.equal(normalizePlayerLookupText("Vinícius Júnior"), "VINICIUS JUNIOR");
  assert.equal(normalizePlayerLookupText("N'Golo Kanté"), "N GOLO KANTE");
  assert.equal(normalizePlayerLookupText("  Endrick  "), "ENDRICK");
});

test("isIncidentPlayerNameMatch: exact, accent-insensitive and substring", () => {
  assert.equal(isIncidentPlayerNameMatch("Neymar", "Neymar"), true);
  assert.equal(isIncidentPlayerNameMatch("Vinícius", "Vinicius"), true);
  assert.equal(isIncidentPlayerNameMatch("Cristiano Ronaldo", "Ronaldo"), true);
});

test("isIncidentPlayerNameMatch: same surname + compatible first initial", () => {
  assert.equal(isIncidentPlayerNameMatch("Rodrygo Silva", "R. Silva"), true);
  // Same surname but incompatible first names must NOT match.
  assert.equal(isIncidentPlayerNameMatch("Thiago Silva", "Danilo Silva"), false);
});

test("isIncidentPlayerNameMatch: unrelated names and empties are false", () => {
  assert.equal(isIncidentPlayerNameMatch("Messi", "Neymar"), false);
  assert.equal(isIncidentPlayerNameMatch("", "Neymar"), false);
  assert.equal(isIncidentPlayerNameMatch("Messi", ""), false);
});

test("getIncidentPlayerTokens parses each pt-BR incident template", () => {
  assert.deepEqual(getIncidentPlayerTokens(incident({ type: "GOAL", text: "Neymar marcou." })), ["Neymar"]);
  assert.deepEqual(getIncidentPlayerTokens(incident({ type: "YELLOW_CARD", text: "Casemiro recebeu amarelo." })), ["Casemiro"]);
  assert.deepEqual(getIncidentPlayerTokens(incident({ type: "RED_CARD", text: "Zidane foi expulso." })), ["Zidane"]);
  assert.deepEqual(getIncidentPlayerTokens(incident({ type: "SUBSTITUTION", text: "Sai Pedro, entra Rodrygo." })), ["Pedro", "Rodrygo"]);
  assert.deepEqual(getIncidentPlayerTokens(incident({ type: "COMMENT", text: "Grande jogada." })), []);
});

test("buildIncidentPlayerSelections resolves a goal token to the scoring team's player", () => {
  const neymar = player("Neymar");
  const result = buildIncidentPlayerSelections(
    incident({ type: "GOAL", text: "Neymar marcou.", team: "A" }),
    match([neymar]),
    undefined,
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].token, "Neymar");
  assert.equal(result[0].selection.player.name, "Neymar");
  assert.equal(result[0].selection.team.code, "BRA");
  assert.equal(result[0].selection.opponentName, "Marrocos");
});

test("buildIncidentPlayerSelections returns [] with no team side or no lineup match", () => {
  assert.deepEqual(
    buildIncidentPlayerSelections(incident({ type: "GOAL", text: "Neymar marcou." }), match([player("Neymar")]), undefined),
    [],
  );
  assert.deepEqual(
    buildIncidentPlayerSelections(incident({ type: "GOAL", text: "Fantasma marcou.", team: "A" }), match([player("Neymar")]), undefined),
    [],
  );
});

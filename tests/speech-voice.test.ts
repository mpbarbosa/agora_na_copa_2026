import { test } from "node:test";
import assert from "node:assert/strict";
import { selectPtBrVoice } from "../src/utils/speech/speechManager";

// Minimal SpeechSynthesisVoice-like fixtures (selectPtBrVoice only reads
// name/lang/localService).
const voice = (name: string, lang: string, localService = false) =>
  ({ name, lang, localService, default: false, voiceURI: name }) as unknown as SpeechSynthesisVoice;

test("returns null when there are no voices", () => {
  assert.equal(selectPtBrVoice([]), null);
});

test("a neural pt-BR network voice beats a robotic on-device pt-BR voice", () => {
  const voices = [
    voice("eSpeak Portuguese (Brazil)", "pt-BR", true),
    voice("Google português do Brasil", "pt-BR", false),
  ];
  assert.equal(selectPtBrVoice(voices)?.name, "Google português do Brasil");
});

test("exact pt-BR beats a neural pt-PT voice", () => {
  const voices = [
    voice("Microsoft Duarte Online (Natural) - Portuguese (Portugal)", "pt-PT", false),
    voice("Locutor pt-BR", "pt-BR", true),
  ];
  assert.equal(selectPtBrVoice(voices)?.lang, "pt-BR");
});

test("falls back to a pt-* voice when no pt-BR exists", () => {
  const voices = [voice("Daniel", "en-GB", true), voice("Joana", "pt-PT", false)];
  assert.equal(selectPtBrVoice(voices)?.name, "Joana");
});

test("with no pt voices, prefers a neural voice, else the first", () => {
  const neural = [voice("Daniel", "en-GB", true), voice("Google US English", "en-US", false)];
  assert.equal(selectPtBrVoice(neural)?.name, "Google US English");

  const none = [voice("Robo A", "en-US", true), voice("Robo B", "fr-FR", true)];
  assert.equal(selectPtBrVoice(none)?.name, "Robo A");
});

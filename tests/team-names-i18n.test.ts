import assert from "node:assert/strict";
import test from "node:test";

import { localizeTeamName } from "../src/i18n/teamNames";
import { localizeOfficialFifaStatus } from "../src/i18n/matchStatus";

test("localizeTeamName maps differing country names to es by code", () => {
  assert.equal(localizeTeamName("MARROCOS", "MAR", "es"), "MARRUECOS");
  assert.equal(localizeTeamName("ÁFRICA DO SUL", "RSA", "es"), "SUDÁFRICA");
  assert.equal(localizeTeamName("HOLANDA", "NED", "es"), "PAÍSES BAJOS");
  assert.equal(localizeTeamName("TCHÉQUIA", "CZE", "es"), "CHEQUIA");
  assert.equal(localizeTeamName("CORÉIA DO SUL", "KOR", "es"), "COREA DEL SUR");
});

test("localizeTeamName is a no-op for pt (byte-identical to the seed)", () => {
  assert.equal(localizeTeamName("MARROCOS", "MAR", "pt"), "MARROCOS");
  assert.equal(localizeTeamName("BRASIL", "BRA", "pt"), "BRASIL");
});

test("localizeTeamName falls through for unmapped codes and placeholder slots", () => {
  // Same spelling in both languages — no entry needed, returns input.
  assert.equal(localizeTeamName("BRASIL", "BRA", "es"), "BRASIL");
  assert.equal(localizeTeamName("PORTUGAL", "POR", "es"), "PORTUGAL");
  // Knockout placeholder slots carry a slot code, not a country — pass through.
  assert.equal(localizeTeamName("Vencedor #74", "W74", "es"), "Vencedor #74");
  // Missing code never throws.
  assert.equal(localizeTeamName("MARROCOS", null, "es"), "MARROCOS");
  assert.equal(localizeTeamName("MARROCOS", undefined, "es"), "MARROCOS");
});

test("localizeOfficialFifaStatus maps FIFA period/status labels to es", () => {
  assert.equal(localizeOfficialFifaStatus("1º tempo", "es"), "1er tiempo");
  assert.equal(localizeOfficialFifaStatus("2º tempo", "es"), "2do tiempo");
  assert.equal(localizeOfficialFifaStatus("Intervalo", "es"), "Entretiempo");
  assert.equal(localizeOfficialFifaStatus("Pênaltis", "es"), "Penales");
  assert.equal(localizeOfficialFifaStatus("Encerrado", "es"), "Finalizado");
  assert.equal(localizeOfficialFifaStatus("Paralisado", "es"), "Suspendido");
});

test("localizeOfficialFifaStatus is a no-op for pt and unmapped labels", () => {
  assert.equal(localizeOfficialFifaStatus("1º tempo", "pt"), "1º tempo");
  assert.equal(localizeOfficialFifaStatus("algo inesperado", "es"), "algo inesperado");
});

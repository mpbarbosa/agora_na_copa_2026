import assert from "node:assert/strict";
import test from "node:test";

import {
  localizeNote,
  localizeResilienceNote,
  localizeIndexHtml,
} from "../server-i18n";
import {
  localeFromHost,
  localeFromFifaLanguage,
  localeToIntlTag,
  apiUrl,
} from "../src/i18n/locale";

test("localeFromHost detects the es. subdomain, defaults to pt", () => {
  assert.equal(localeFromHost("es.copa2026.mpbarbosa.com"), "es");
  assert.equal(localeFromHost("ES.COPA2026.MPBARBOSA.COM"), "es");
  assert.equal(localeFromHost("copa2026.mpbarbosa.com"), "pt");
  assert.equal(localeFromHost("localhost"), "pt");
  assert.equal(localeFromHost(undefined), "pt");
});

test("localeFromFifaLanguage inverts the FIFA language code", () => {
  assert.equal(localeFromFifaLanguage("es"), "es");
  assert.equal(localeFromFifaLanguage("es-MX"), "es");
  assert.equal(localeFromFifaLanguage("pt"), "pt");
  assert.equal(localeFromFifaLanguage(""), "pt");
});

test("localeToIntlTag maps to BCP-47 formatting tags", () => {
  assert.equal(localeToIntlTag("es"), "es-MX");
  assert.equal(localeToIntlTag("pt"), "pt-BR");
});

test("apiUrl appends language only for non-default locales, preserving query", () => {
  assert.equal(apiUrl("/api/match-states", "es"), "/api/match-states?language=es");
  // pt is the server default → path is returned UNCHANGED (no ?language=pt), so
  // existing bare-path mocks/tests keep matching.
  assert.equal(apiUrl("/api/match-states", "pt"), "/api/match-states");
  assert.equal(
    apiUrl("/api/broadcast-guide?country=BR", "es"),
    "/api/broadcast-guide?country=BR&language=es",
  );
  assert.equal(apiUrl("/api/broadcast-guide?country=BR", "pt"), "/api/broadcast-guide?country=BR");
});

test("localizeNote translates known pt strings for es, else passes through", () => {
  assert.equal(
    localizeNote("Seleção não encontrada", "es"),
    "Selección no encontrada",
  );
  // pt locale never rewrites
  assert.equal(
    localizeNote("Seleção não encontrada", "pt"),
    "Seleção não encontrada",
  );
  // unmapped string passes through unchanged (graceful)
  assert.equal(localizeNote("Mensagem técnica X", "es"), "Mensagem técnica X");
});

test("localizeResilienceNote translates a payload's top-level note only for es", () => {
  const ptPayload = { source: "fallback", note: "Incidentes sincronizados com a FIFA." };
  assert.deepEqual(localizeResilienceNote(ptPayload, "pt"), ptPayload);
  assert.equal(
    localizeResilienceNote(ptPayload, "es").note,
    "Incidencias sincronizadas con la FIFA.",
  );
  // no note → returned as-is
  const noNote = { source: "fifa" } as { source: string; note?: string };
  assert.deepEqual(localizeResilienceNote(noNote, "es"), noNote);
});

test("localizeIndexHtml rewrites head tags + injects locale for es, no-op for pt", () => {
  const html = [
    '<!doctype html>',
    '<html lang="pt-BR">',
    "<head>",
    "<title>Agora na Copa 26 — Copa do Mundo FIFA 2026 ao vivo</title>",
    '<meta name="description" content="Acompanhe a Copa..." />',
    '<meta property="og:locale" content="pt_BR" />',
    '<meta property="og:site_name" content="Agora na Copa 26" />',
    '<meta property="og:image:alt" content="Agora na Copa 26 — companheiro da Copa" />',
    '<link rel="canonical" href="https://copa2026.mpbarbosa.com/" />',
    "</head>",
    "</html>",
  ].join("\n");

  assert.equal(localizeIndexHtml(html, "pt"), html);

  const es = localizeIndexHtml(html, "es");
  assert.match(es, /<html lang="es-419">/);
  assert.match(es, /<title>Ahora en el Mundial 26/);
  assert.match(es, /og:locale" content="es_MX"/);
  assert.match(es, /canonical" href="https:\/\/es\.copa2026\.mpbarbosa\.com\/"/);
  assert.match(es, /window\.__AGORA_LOCALE__="es"/);
  assert.match(es, /og:site_name" content="Ahora en el Mundial 26"/);
  assert.match(es, /og:image:alt" content="Ahora en el Mundial 26 —/);
  // description content is translated (no leftover pt copy)
  assert.doesNotMatch(es, /Acompanhe a Copa/);
});

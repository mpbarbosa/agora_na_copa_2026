import assert from "node:assert/strict";
import test from "node:test";

import {
  isLocale,
  SUPPORTED_LOCALES,
  localeToIntlTag,
  localeToFifaLanguage,
  localeFromFifaLanguage,
  localeToHtmlLang,
  localeToOgLocale,
  localeFromHost,
  apiUrl,
} from "../src/i18n/locale";
import { CATALOGS } from "../src/i18n/strings";

// ── Phase 1: the "en" (US English) locale spine ──────────────────────────────

test("en is a recognized, supported locale", () => {
  assert.equal(isLocale("en"), true);
  assert.ok(SUPPORTED_LOCALES.includes("en"));
});

test("en maps to US English tags across the localeTo* helpers", () => {
  assert.equal(localeToIntlTag("en"), "en-US");
  assert.equal(localeToFifaLanguage("en"), "en");
  assert.equal(localeToHtmlLang("en"), "en-US");
  assert.equal(localeToOgLocale("en"), "en_US");
});

test("localeFromFifaLanguage resolves English codes to en", () => {
  assert.equal(localeFromFifaLanguage("en"), "en");
  assert.equal(localeFromFifaLanguage("en-US"), "en");
  assert.equal(localeFromFifaLanguage("EN"), "en");
  // Still resolves the other locales / default.
  assert.equal(localeFromFifaLanguage("es"), "es");
  assert.equal(localeFromFifaLanguage("pt"), "pt");
});

test("localeFromHost detects the en. subdomain", () => {
  assert.equal(localeFromHost("en.copa2026.mpbarbosa.com"), "en");
  assert.equal(localeFromHost("EN.COPA2026.MPBARBOSA.COM"), "en");
  // The other locales / apex are unaffected.
  assert.equal(localeFromHost("es.copa2026.mpbarbosa.com"), "es");
  assert.equal(localeFromHost("copa2026.mpbarbosa.com"), "pt");
});

test("apiUrl appends the English FIFA language for en (pt stays bare)", () => {
  assert.equal(apiUrl("/api/match-states", "en"), "/api/match-states?language=en");
  assert.equal(
    apiUrl("/api/team-view/BRA?x=1", "en"),
    "/api/team-view/BRA?x=1&language=en",
  );
  assert.equal(apiUrl("/api/match-states", "pt"), "/api/match-states");
});

// ── Catalog integrity ────────────────────────────────────────────────────────

test("es and en UI catalogs are at full parity with the pt reference", () => {
  const ptKeys = Object.keys(CATALOGS.pt);
  for (const locale of ["es", "en"] as const) {
    const missing = ptKeys.filter((key) => !(key in CATALOGS[locale]));
    assert.deepEqual(
      missing,
      [],
      `${locale} is missing ${missing.length} pt keys: ${missing.slice(0, 10).join(", ")}`,
    );
  }
});

test("no locale carries an orphan key absent from the pt reference", () => {
  // A key present in es/en but not pt is a typo — it would never resolve via the
  // pt fallback and signals a drifted translation.
  for (const locale of ["es", "en"] as const) {
    const orphans = Object.keys(CATALOGS[locale]).filter(
      (key) => !(key in CATALOGS.pt),
    );
    assert.deepEqual(
      orphans,
      [],
      `${locale} has orphan keys not in pt: ${orphans.slice(0, 10).join(", ")}`,
    );
  }
});

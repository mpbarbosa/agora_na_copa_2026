import assert from "node:assert/strict";
import test from "node:test";

import { normalizeClientIp, countryFromCountryResponse } from "../geo-core";
import {
  BROADCAST_COUNTRIES,
  DEFAULT_COUNTRY_BY_LOCALE,
  isBroadcastCountry,
  broadcastCountryName,
  countryCodeToFlagEmoji,
} from "../src/data/broadcastCountries";

test("normalizeClientIp strips the IPv4-mapped prefix and trims", () => {
  assert.equal(normalizeClientIp("::ffff:203.0.113.7"), "203.0.113.7");
  assert.equal(normalizeClientIp("  198.51.100.9  "), "198.51.100.9");
  assert.equal(normalizeClientIp("2001:db8::1"), "2001:db8::1");
});

test("normalizeClientIp returns empty for absent/placeholder IPs", () => {
  assert.equal(normalizeClientIp(""), "");
  assert.equal(normalizeClientIp("-"), "");
  assert.equal(normalizeClientIp(null), "");
  assert.equal(normalizeClientIp(undefined), "");
});

test("countryFromCountryResponse extracts an uppercase ISO-2, else null", () => {
  assert.equal(countryFromCountryResponse({ country: { iso_code: "br" } }), "BR");
  assert.equal(countryFromCountryResponse({ country: { iso_code: "US" } }), "US");
  // Falls back to registered_country when country is absent (VPN/edge cases).
  assert.equal(
    countryFromCountryResponse({ registered_country: { iso_code: "AR" } }),
    "AR",
  );
  assert.equal(countryFromCountryResponse(null), null);
  assert.equal(countryFromCountryResponse(undefined), null);
  assert.equal(countryFromCountryResponse({}), null);
  assert.equal(countryFromCountryResponse({ country: { iso_code: null } }), null);
  // Not a 2-letter code → null (never feed the guide junk).
  assert.equal(countryFromCountryResponse({ country: { iso_code: "XYZ" } }), null);
});

test("isBroadcastCountry recognizes offered codes case-insensitively", () => {
  assert.equal(isBroadcastCountry("BR"), true);
  assert.equal(isBroadcastCountry("mx"), true);
  assert.equal(isBroadcastCountry("PY"), false); // excluded — no FIFA data
  assert.equal(isBroadcastCountry("ZZ"), false);
  assert.equal(isBroadcastCountry(null), false);
  assert.equal(isBroadcastCountry(undefined), false);
});

test("broadcastCountryName is localized, falling back to the raw code", () => {
  assert.equal(broadcastCountryName("MX", "es"), "México");
  assert.equal(broadcastCountryName("NL", "pt"), "Países Baixos");
  assert.equal(broadcastCountryName("NL", "es"), "Países Bajos");
  assert.equal(broadcastCountryName("ZZ", "pt"), "ZZ");
});

test("countryCodeToFlagEmoji maps a code to regional-indicator symbols", () => {
  assert.equal(countryCodeToFlagEmoji("BR"), "\u{1F1E7}\u{1F1F7}");
  assert.equal(countryCodeToFlagEmoji("us"), "\u{1F1FA}\u{1F1F8}");
});

test("every offered country is valid and fully localized", () => {
  for (const country of BROADCAST_COUNTRIES) {
    assert.equal(isBroadcastCountry(country.code), true, `${country.code} not recognized`);
    assert.ok(country.name.pt, `${country.code} missing pt name`);
    assert.ok(country.name.es, `${country.code} missing es name`);
  }
  // No duplicate codes.
  const codes = BROADCAST_COUNTRIES.map((c) => c.code);
  assert.equal(new Set(codes).size, codes.length);
});

test("the per-locale default countries are themselves offered", () => {
  assert.equal(DEFAULT_COUNTRY_BY_LOCALE.pt, "BR");
  assert.equal(DEFAULT_COUNTRY_BY_LOCALE.es, "MX");
  assert.equal(isBroadcastCountry(DEFAULT_COUNTRY_BY_LOCALE.pt), true);
  assert.equal(isBroadcastCountry(DEFAULT_COUNTRY_BY_LOCALE.es), true);
});

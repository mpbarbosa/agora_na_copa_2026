import assert from "node:assert/strict";
import test from "node:test";

import {
  OPEN_METEO_BASE_URL,
  buildOpenMeteoUrl,
  describeWeatherCode,
  parseOpenMeteoCurrent,
} from "../weather-core";

test("buildOpenMeteoUrl encodes the venue coordinates and current fields", () => {
  const url = buildOpenMeteoUrl(40.8135, -74.0745);
  assert.ok(url.startsWith(OPEN_METEO_BASE_URL));
  const params = new URL(url).searchParams;
  assert.equal(params.get("latitude"), "40.8135");
  assert.equal(params.get("longitude"), "-74.0745");
  assert.ok(params.get("current")?.includes("temperature_2m"));
  assert.ok(params.get("current")?.includes("weather_code"));
  assert.equal(params.get("wind_speed_unit"), "kmh");
});

test("describeWeatherCode maps known codes and is day/night aware", () => {
  assert.equal(describeWeatherCode(2, true).description, "Parcialmente nublado");
  // Clear sky shows a sun by day and a moon by night.
  assert.equal(describeWeatherCode(0, true).emoji, "☀️");
  assert.equal(describeWeatherCode(0, false).emoji, "🌙");
});

test("describeWeatherCode falls back for unknown codes", () => {
  const out = describeWeatherCode(12345, true);
  assert.equal(out.description, "Tempo instável");
  assert.ok(out.emoji.length > 0);
});

test("parseOpenMeteoCurrent rounds readings and resolves the description", () => {
  const snapshot = parseOpenMeteoCurrent({
    current: {
      temperature_2m: 27.4,
      apparent_temperature: 29.8,
      relative_humidity_2m: 61,
      weather_code: 3,
      wind_speed_10m: 12.6,
      is_day: 1,
    },
  });
  assert.ok(snapshot);
  assert.equal(snapshot?.temperatureC, 27);
  assert.equal(snapshot?.apparentC, 30);
  assert.equal(snapshot?.humidity, 61);
  assert.equal(snapshot?.windKmh, 13);
  assert.equal(snapshot?.weatherCode, 3);
  assert.equal(snapshot?.description, "Nublado");
  assert.equal(snapshot?.isDay, true);
});

test("parseOpenMeteoCurrent returns null on malformed payloads", () => {
  assert.equal(parseOpenMeteoCurrent(null), null);
  assert.equal(parseOpenMeteoCurrent({}), null);
  assert.equal(parseOpenMeteoCurrent({ current: {} }), null);
  assert.equal(parseOpenMeteoCurrent({ current: { temperature_2m: "warm" } }), null);
});

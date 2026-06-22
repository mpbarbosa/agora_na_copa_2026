// Pure logic for the Open-Meteo "current weather" integration: request-URL
// building, response parsing, and WMO weather-code → pt-BR description mapping.
//
// Open-Meteo (https://open-meteo.com) is a free, key-less forecast API, so this
// works with no configuration. Extracted from server.ts so it can be unit-tested
// independently (tests/weather-core.test.ts) — mirrors trends-core.ts. The
// endpoint that performs the fetch lives in server.ts; this module only builds
// the request and transforms the response.

import type { WeatherSnapshot } from "./src/types";

export const OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast";

/** Builds the Open-Meteo "current weather" request URL for a venue. */
export function buildOpenMeteoUrl(lat: number, lng: number): string {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day",
    wind_speed_unit: "kmh",
    timezone: "auto",
  });
  return `${OPEN_METEO_BASE_URL}?${params.toString()}`;
}

interface WmoLabel {
  description: string;
  emoji: string;
  /** Optional night-time glyph for codes whose look differs after dark. */
  nightEmoji?: string;
}

// WMO weather interpretation codes (Open-Meteo `weather_code`).
const WMO_CODES: Record<number, WmoLabel> = {
  0: { description: "Céu limpo", emoji: "☀️", nightEmoji: "🌙" },
  1: { description: "Predominantemente limpo", emoji: "🌤️", nightEmoji: "🌙" },
  2: { description: "Parcialmente nublado", emoji: "⛅", nightEmoji: "☁️" },
  3: { description: "Nublado", emoji: "☁️" },
  45: { description: "Névoa", emoji: "🌫️" },
  48: { description: "Névoa com geada", emoji: "🌫️" },
  51: { description: "Garoa leve", emoji: "🌦️" },
  53: { description: "Garoa", emoji: "🌦️" },
  55: { description: "Garoa intensa", emoji: "🌦️" },
  56: { description: "Garoa congelante", emoji: "🌧️" },
  57: { description: "Garoa congelante intensa", emoji: "🌧️" },
  61: { description: "Chuva fraca", emoji: "🌦️" },
  63: { description: "Chuva", emoji: "🌧️" },
  65: { description: "Chuva forte", emoji: "🌧️" },
  66: { description: "Chuva congelante", emoji: "🌧️" },
  67: { description: "Chuva congelante forte", emoji: "🌧️" },
  71: { description: "Neve fraca", emoji: "🌨️" },
  73: { description: "Neve", emoji: "🌨️" },
  75: { description: "Neve forte", emoji: "❄️" },
  77: { description: "Grãos de neve", emoji: "🌨️" },
  80: { description: "Pancadas de chuva", emoji: "🌦️" },
  81: { description: "Pancadas de chuva", emoji: "🌧️" },
  82: { description: "Pancadas de chuva fortes", emoji: "⛈️" },
  85: { description: "Pancadas de neve", emoji: "🌨️" },
  86: { description: "Pancadas de neve fortes", emoji: "❄️" },
  95: { description: "Tempestade", emoji: "⛈️" },
  96: { description: "Tempestade com granizo", emoji: "⛈️" },
  99: { description: "Tempestade com granizo", emoji: "⛈️" },
};

const UNKNOWN_LABEL: WmoLabel = { description: "Tempo instável", emoji: "🌡️" };

/** Maps a WMO weather code to a pt-BR description + emoji (day/night aware). */
export function describeWeatherCode(
  code: number,
  isDay: boolean,
): { description: string; emoji: string } {
  const label = WMO_CODES[code] ?? UNKNOWN_LABEL;
  const emoji = !isDay && label.nightEmoji ? label.nightEmoji : label.emoji;
  return { description: label.description, emoji };
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Parses an Open-Meteo forecast response into a WeatherSnapshot. Returns null
 * when the payload is missing the `current` block or its temperature reading,
 * so callers can fall back gracefully.
 */
export function parseOpenMeteoCurrent(raw: unknown): WeatherSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const current = (raw as { current?: unknown }).current;
  if (!current || typeof current !== "object") return null;
  const c = current as Record<string, unknown>;

  const temperatureC = toFiniteNumber(c.temperature_2m);
  if (temperatureC === null) return null;

  const weatherCode = toFiniteNumber(c.weather_code) ?? 0;
  const isDay = c.is_day === 1 || c.is_day === true;
  const { description, emoji } = describeWeatherCode(weatherCode, isDay);

  return {
    temperatureC: Math.round(temperatureC),
    apparentC: Math.round(toFiniteNumber(c.apparent_temperature) ?? temperatureC),
    weatherCode,
    description,
    emoji,
    windKmh: Math.round(toFiniteNumber(c.wind_speed_10m) ?? 0),
    humidity: Math.round(toFiniteNumber(c.relative_humidity_2m) ?? 0),
    isDay,
  };
}

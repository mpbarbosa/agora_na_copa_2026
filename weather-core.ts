// Pure logic for the Open-Meteo "current weather" integration: request-URL
// building, response parsing, and WMO weather-code → pt-BR description mapping.
//
// Open-Meteo (https://open-meteo.com) is a free, key-less forecast API, so this
// works with no configuration. Extracted from server.ts so it can be unit-tested
// independently (tests/weather-core.test.ts) — mirrors trends-core.ts. The
// endpoint that performs the fetch lives in server.ts; this module only builds
// the request and transforms the response.

import type { WeatherSnapshot } from "./src/types";
import type { Locale } from "./src/i18n/locale";

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
  /** pt-BR description. */
  pt: string;
  /** es-LATAM description. */
  es: string;
  emoji: string;
  /** Optional night-time glyph for codes whose look differs after dark. */
  nightEmoji?: string;
}

// WMO weather interpretation codes (Open-Meteo `weather_code`).
const WMO_CODES: Record<number, WmoLabel> = {
  0: { pt: "Céu limpo", es: "Cielo despejado", emoji: "☀️", nightEmoji: "🌙" },
  1: { pt: "Predominantemente limpo", es: "Mayormente despejado", emoji: "🌤️", nightEmoji: "🌙" },
  2: { pt: "Parcialmente nublado", es: "Parcialmente nublado", emoji: "⛅", nightEmoji: "☁️" },
  3: { pt: "Nublado", es: "Nublado", emoji: "☁️" },
  45: { pt: "Névoa", es: "Niebla", emoji: "🌫️" },
  48: { pt: "Névoa com geada", es: "Niebla con escarcha", emoji: "🌫️" },
  51: { pt: "Garoa leve", es: "Llovizna ligera", emoji: "🌦️" },
  53: { pt: "Garoa", es: "Llovizna", emoji: "🌦️" },
  55: { pt: "Garoa intensa", es: "Llovizna intensa", emoji: "🌦️" },
  56: { pt: "Garoa congelante", es: "Llovizna helada", emoji: "🌧️" },
  57: { pt: "Garoa congelante intensa", es: "Llovizna helada intensa", emoji: "🌧️" },
  61: { pt: "Chuva fraca", es: "Lluvia débil", emoji: "🌦️" },
  63: { pt: "Chuva", es: "Lluvia", emoji: "🌧️" },
  65: { pt: "Chuva forte", es: "Lluvia fuerte", emoji: "🌧️" },
  66: { pt: "Chuva congelante", es: "Lluvia helada", emoji: "🌧️" },
  67: { pt: "Chuva congelante forte", es: "Lluvia helada fuerte", emoji: "🌧️" },
  71: { pt: "Neve fraca", es: "Nieve débil", emoji: "🌨️" },
  73: { pt: "Neve", es: "Nieve", emoji: "🌨️" },
  75: { pt: "Neve forte", es: "Nieve fuerte", emoji: "❄️" },
  77: { pt: "Grãos de neve", es: "Granos de nieve", emoji: "🌨️" },
  80: { pt: "Pancadas de chuva", es: "Chubascos", emoji: "🌦️" },
  81: { pt: "Pancadas de chuva", es: "Chubascos", emoji: "🌧️" },
  82: { pt: "Pancadas de chuva fortes", es: "Chubascos fuertes", emoji: "⛈️" },
  85: { pt: "Pancadas de neve", es: "Chubascos de nieve", emoji: "🌨️" },
  86: { pt: "Pancadas de neve fortes", es: "Chubascos de nieve fuertes", emoji: "❄️" },
  95: { pt: "Tempestade", es: "Tormenta", emoji: "⛈️" },
  96: { pt: "Tempestade com granizo", es: "Tormenta con granizo", emoji: "⛈️" },
  99: { pt: "Tempestade com granizo", es: "Tormenta con granizo", emoji: "⛈️" },
};

const UNKNOWN_LABEL: WmoLabel = {
  pt: "Tempo instável",
  es: "Tiempo inestable",
  emoji: "🌡️",
};

/** Maps a WMO weather code to a localized description + emoji (day/night aware). */
export function describeWeatherCode(
  code: number,
  isDay: boolean,
  locale: Locale = "pt",
): { description: string; emoji: string } {
  const label = WMO_CODES[code] ?? UNKNOWN_LABEL;
  const emoji = !isDay && label.nightEmoji ? label.nightEmoji : label.emoji;
  return { description: locale === "es" ? label.es : label.pt, emoji };
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Parses an Open-Meteo forecast response into a WeatherSnapshot. Returns null
 * when the payload is missing the `current` block or its temperature reading,
 * so callers can fall back gracefully.
 */
export function parseOpenMeteoCurrent(
  raw: unknown,
  locale: Locale = "pt",
): WeatherSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const current = (raw as { current?: unknown }).current;
  if (!current || typeof current !== "object") return null;
  const c = current as Record<string, unknown>;

  const temperatureC = toFiniteNumber(c.temperature_2m);
  if (temperatureC === null) return null;

  const weatherCode = toFiniteNumber(c.weather_code) ?? 0;
  const isDay = c.is_day === 1 || c.is_day === true;
  const { description, emoji } = describeWeatherCode(weatherCode, isDay, locale);

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

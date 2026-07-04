import { useEffect, useState } from "react";
import type { Match, WeatherSnapshot } from "../types";
import { useT } from "../i18n";
import { resolveVenueCoordinates } from "../utils/venueCoordinates";

type Theme = "classic-light" | "stadium-dark";

const WEATHER_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Live-match weather chip for the "Ao Vivo" scoreboard: shows the current
 * conditions at the venue (Open-Meteo via `/api/match-weather`). Renders
 * nothing until real data arrives or if the venue can't be located, so it
 * never leaves an empty placeholder.
 */
export function MatchWeatherChip({ match, theme }: { match: Match; theme: Theme }) {
  const t = useT();
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);

  useEffect(() => {
    const coords = resolveVenueCoordinates(match);
    if (!coords) {
      setWeather(null);
      return;
    }

    let active = true;
    let intervalId: number | undefined;

    const load = async () => {
      try {
        const response = await fetch(
          `/api/match-weather?lat=${coords.lat}&lng=${coords.lng}`,
        );
        if (!response.ok) return;
        const data = (await response.json()) as { weather: WeatherSnapshot | null };
        if (active) setWeather(data.weather);
      } catch {
        // Network hiccup — keep whatever we last showed.
      }
    };

    void load();
    intervalId = window.setInterval(() => void load(), WEATHER_REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [match]);

  if (!weather) return null;

  const isLight = theme === "classic-light";
  // Link the chip to the full forecast for this venue on Open-Meteo (our data
  // source), so tapping the current-weather text opens the weather page.
  const coords = resolveVenueCoordinates(match);
  const weatherPageUrl = coords
    ? `https://open-meteo.com/en/docs?latitude=${coords.lat}&longitude=${coords.lng}`
    : undefined;
  return (
    <a
      id="match-weather-chip"
      href={weatherPageUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 rounded-full border px-3 py-1 transition hover:brightness-110 ${
        isLight
          ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
          : "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
      }`}
      title={t("common.weatherChip.title", {
        apparent: weather.apparentC,
        humidity: weather.humidity,
        wind: weather.windKmh,
      })}
      aria-label={t("common.weatherChip.ariaLabel", {
        description: weather.description,
        temperature: weather.temperatureC,
      })}
    >
      <span className="text-base leading-none" aria-hidden="true">
        {weather.emoji}
      </span>
      <span className="font-mono text-sm font-bold leading-none">{weather.temperatureC}°C</span>
      <span
        className={`font-archivo text-[11px] font-semibold uppercase tracking-wide ${
          isLight ? "text-slate-500" : "text-slate-300"
        }`}
      >
        {weather.description}
      </span>
      <span className="text-[10px] leading-none opacity-70" aria-hidden="true">
        ↗
      </span>
    </a>
  );
}

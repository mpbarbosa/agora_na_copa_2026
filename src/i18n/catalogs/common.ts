// Common catalog: small shared components used across views — the live-match
// weather chip, referee chip, weather-suspension / advisory notices, and the
// analysis / player-note freshness badges. Keys are dotted under `common.`.
// Keep broadcast voice in both languages.
import type { CatalogModule } from "./types";

export const commonCatalog: CatalogModule = {
  pt: {
    // MatchWeatherChip
    "common.weatherChip.title":
      "Ver previsão do tempo do estádio • Sensação {apparent}° • Umidade {humidity}% • Vento {wind} km/h",
    "common.weatherChip.ariaLabel":
      "Clima no estádio: {description}, {temperature} graus. Abrir a previsão do tempo.",

    // RefereeChip
    "common.referee.caption": "Árbitro",
    "common.referee.titleWithCountry": "Árbitro da partida: {name} ({country})",
    "common.referee.title": "Árbitro da partida: {name}",
    "common.referee.labelWithCountry": "Árbitro: {name}, {country}",
    "common.referee.label": "Árbitro: {name}",
    "common.referee.openCard": "{label} — abrir card do árbitro",

    // WeatherSuspensionNotice
    "common.weatherSuspension.title": "Abrir o regulamento da FIFA sobre partidas suspensas",
    "common.weatherSuspension.text":
      "Partida paralisada — protocolo da FIFA para suspensão por condições de tempo",

    // AnalysisFreshnessBadge
    "common.freshness.upToDateTitle": "A análise reflete o último jogo",
    "common.freshness.staleTitle": "A análise está atrás do último jogo",
    "common.freshness.upToDate": "Atualizada",
    "common.freshness.stale": "Desatualizada",
  },
  es: {
    // MatchWeatherChip
    "common.weatherChip.title":
      "Ver el pronóstico del tiempo del estadio • Sensación {apparent}° • Humedad {humidity}% • Viento {wind} km/h",
    "common.weatherChip.ariaLabel":
      "Clima en el estadio: {description}, {temperature} grados. Abrir el pronóstico del tiempo.",

    // RefereeChip
    "common.referee.caption": "Árbitro",
    "common.referee.titleWithCountry": "Árbitro del partido: {name} ({country})",
    "common.referee.title": "Árbitro del partido: {name}",
    "common.referee.labelWithCountry": "Árbitro: {name}, {country}",
    "common.referee.label": "Árbitro: {name}",
    "common.referee.openCard": "{label} — abrir la tarjeta del árbitro",

    // WeatherSuspensionNotice
    "common.weatherSuspension.title": "Abrir el reglamento de la FIFA sobre partidos suspendidos",
    "common.weatherSuspension.text":
      "Partido suspendido — protocolo de la FIFA para suspensión por condiciones climáticas",

    // AnalysisFreshnessBadge
    "common.freshness.upToDateTitle": "El análisis refleja el último partido",
    "common.freshness.staleTitle": "El análisis está detrás del último partido",
    "common.freshness.upToDate": "Actualizada",
    "common.freshness.stale": "Desactualizada",
  },
};

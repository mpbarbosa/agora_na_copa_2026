import { stadiums } from "../data/tournament";
import type { Stadium } from "../types";

/** Uppercases, strips accents and trims, so "FILADÉLFIA" matches "filadelfia". */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

// A handful of curated/FIFA match cities don't map 1:1 onto a stadium city.
const CITY_ALIASES: Record<string, string> = {
  "AREA DA BAIA DE SAO FRANCISCO": "SANTA CLARA", // Levi's Stadium
  "NOVA JERSEY": "NEW YORK CITY", // MetLife Stadium (East Rutherford, NJ)
};

// IANA time zone for each of the 16 host stadiums, keyed by normalized city.
const STADIUM_TIME_ZONES: Record<string, string> = {
  "LOS ANGELES": "America/Los_Angeles",
  "SANTA CLARA": "America/Los_Angeles",
  SEATTLE: "America/Los_Angeles",
  VANCOUVER: "America/Vancouver",
  DALLAS: "America/Chicago",
  HOUSTON: "America/Chicago",
  "KANSAS CITY": "America/Chicago",
  "CIDADE DO MEXICO": "America/Mexico_City",
  GUADALAJARA: "America/Mexico_City",
  MONTERREY: "America/Monterrey",
  ATLANTA: "America/New_York",
  BOSTON: "America/New_York",
  FILADELFIA: "America/New_York",
  MIAMI: "America/New_York",
  "NEW YORK CITY": "America/New_York",
  TORONTO: "America/Toronto",
};

export interface VenueRef {
  city: string;
  stadiumName: string;
}

/**
 * Resolves a match's venue to its host Stadium record — by city (with a small
 * alias table for FIFA labels that differ from the curated stadium city), then
 * by stadium name. Returns null when the venue can't be located.
 */
export function resolveStadium(venue: VenueRef): Stadium | null {
  const city = normalize(venue.city);
  const aliased = CITY_ALIASES[city] ?? city;
  const byCity = stadiums.find((s) => normalize(s.city) === aliased);
  if (byCity) return byCity;

  const stadiumName = normalize(venue.stadiumName);
  const byName = stadiums.find(
    (s) => normalize(s.name) === stadiumName || normalize(s.city) === stadiumName,
  );
  return byName ?? null;
}

/** Map coordinates of a match's venue, or null when it can't be located. */
export function resolveVenueCoordinates(venue: VenueRef): { lat: number; lng: number } | null {
  return resolveStadium(venue)?.coordinates ?? null;
}

/** IANA time zone of a match's venue (e.g. "America/New_York"), or null. */
export function resolveVenueTimeZone(venue: VenueRef): string | null {
  const stadium = resolveStadium(venue);
  return stadium ? (STADIUM_TIME_ZONES[normalize(stadium.city)] ?? null) : null;
}

import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveVenueCoordinates,
  resolveVenueTimeZone,
} from "../src/utils/venueCoordinates";
import { FIFA_MATCH_VENUES } from "../src/data/fifaMatchVenues";

test("every curated FIFA match venue resolves to stadium coordinates", () => {
  const unresolved: string[] = [];
  for (const [id, venue] of Object.entries(FIFA_MATCH_VENUES)) {
    if (!resolveVenueCoordinates(venue)) {
      unresolved.push(`${id} (${venue.city} / ${venue.stadiumName})`);
    }
  }
  assert.deepEqual(
    unresolved,
    [],
    `These venues have no stadium coordinates — add a city alias in venueCoordinates.ts:\n${unresolved.join("\n")}`,
  );
});

test("every curated FIFA match venue resolves to an IANA time zone", () => {
  const unresolved: string[] = [];
  for (const [id, venue] of Object.entries(FIFA_MATCH_VENUES)) {
    const tz = resolveVenueTimeZone(venue);
    // Validate it is a real, usable IANA zone.
    if (!tz || !canFormatInZone(tz)) {
      unresolved.push(`${id} (${venue.city}) -> ${tz ?? "null"}`);
    }
  }
  assert.deepEqual(
    unresolved,
    [],
    `These venues have no usable time zone — add it in STADIUM_TIME_ZONES:\n${unresolved.join("\n")}`,
  );
});

test("Nova Jersey resolves to the New York time zone", () => {
  assert.equal(
    resolveVenueTimeZone({ city: "Nova Jersey", stadiumName: "Estádio de Nova York/Nova Jersey" }),
    "America/New_York",
  );
});

function canFormatInZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

test("Nova Jersey resolves to MetLife Stadium (New York City)", () => {
  const coords = resolveVenueCoordinates({
    city: "Nova Jersey",
    stadiumName: "Estádio de Nova York/Nova Jersey",
  });
  assert.ok(coords, "Nova Jersey should resolve");
  assert.equal(coords?.lat, 40.8135);
  assert.equal(coords?.lng, -74.0745);
});

test("an unknown venue resolves to null (graceful hide)", () => {
  assert.equal(
    resolveVenueCoordinates({ city: "Atlântida", stadiumName: "Estádio Submerso" }),
    null,
  );
});

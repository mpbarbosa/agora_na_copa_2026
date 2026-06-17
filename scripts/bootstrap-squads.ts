#!/usr/bin/env tsx
/**
 * One-off script: extract players from matches.json into src/data/squads.json.
 *
 * FIFA IDs are embedded in pictureUrl tails (e.g. "TURNER-Matt_448217").
 * Players without a pictureUrl receive a provisional key "<TEAMCODE>-<number>".
 *
 * Run: npx tsx scripts/bootstrap-squads.ts
 *
 * The output file is the starting point; maintain it directly after this.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

interface RawPlayer {
  id: string;
  name: string;
  number: number;
  position: string;
  x: number;
  y: number;
  club?: string;
  pictureUrl?: string;
  socials?: Record<string, string>;
}

interface RawMatch {
  id: string;
  teamA: { code: string; lineup: RawPlayer[] };
  teamB: { code: string; lineup: RawPlayer[] };
}

const PLAYER_METADATA = [
  {
    teamCode: "KSA",
    aliases: ["Abdulilah Alamri", "Alamri", "Al-Amri"],
    socials: { instagram: "https://instagram.com/aalamri32" },
  },
  {
    teamCode: "IRN",
    aliases: ["Ramin Rezaeian", "Rezaeian", "Ramin"],
    socials: { instagram: "https://instagram.com/raminrezaeian" },
  },
  {
    teamCode: "NOR",
    aliases: ["Erling Haaland", "Haaland", "E. Haaland"],
    socials: { instagram: "https://instagram.com/erling" },
  },
];

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9]+/g, "")
    .toUpperCase();

function getSocialsFromMetadata(
  teamCode: string,
  name: string,
): Record<string, string> | undefined {
  const entry = PLAYER_METADATA.find(
    (m) =>
      m.teamCode === teamCode &&
      m.aliases.some((a) => normalize(a) === normalize(name)),
  );
  return entry?.socials;
}

function extractFifaId(pictureUrl: string): string | null {
  const tail = pictureUrl.split("/").pop() ?? "";
  const match = tail.match(/_(\d+)$/);
  return match ? match[1] : null;
}

function provisionalKey(teamCode: string, number: number): string {
  return `${teamCode}-${number}`;
}

const matches: RawMatch[] = JSON.parse(
  readFileSync(resolve(ROOT, "src/matches.json"), "utf8"),
);

// Key = fifaId (string) or provisional key; value = SquadPlayer record.
const registry: Record<string, object> = {};
let withId = 0;
let withProvisional = 0;

for (const match of matches) {
  for (const side of ["teamA", "teamB"] as const) {
    const teamCode = match[side].code;
    for (const player of match[side].lineup) {
      const fifaId = player.pictureUrl
        ? extractFifaId(player.pictureUrl)
        : null;
      let key = fifaId ?? provisionalKey(teamCode, player.number);

      // If a different player already claimed this FIFA ID, fall back to provisional key.
      if (registry[key]) {
        if (fifaId) key = provisionalKey(teamCode, player.number);
        else continue; // genuine dup (same team + number), skip
      }

      const socials =
        player.socials ?? getSocialsFromMetadata(teamCode, player.name);

      const record: Record<string, unknown> = {
        fifaId: key,
        teamCode,
        name: player.name,
        number: player.number,
        position: player.position,
      };
      if (player.club) record.club = player.club;
      if (player.pictureUrl) record.pictureUrl = player.pictureUrl;
      if (socials) record.socials = socials;

      registry[key] = record;

      if (fifaId) withId++;
      else withProvisional++;
    }
  }
}

const outPath = resolve(ROOT, "src/data/squads.json");
writeFileSync(outPath, JSON.stringify(registry, null, 2) + "\n", "utf8");

console.log(
  `Wrote ${Object.keys(registry).length} players to src/data/squads.json`,
);
console.log(`  ${withId} with real FIFA ID`);
console.log(`  ${withProvisional} with provisional key (<TEAMCODE>-<number>)`);

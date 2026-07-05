// Incident domain helpers for the "Ao Vivo" match view: player-name matching,
// incident → renderable-player selection, incident speech, and the incident
// label / theme-class maps. All pure — no React, no I/O — so they are unit-tested
// in isolation (`tests/match-incidents.test.ts`). Extracted from
// `src/components/MatchDetailView.tsx`.
import {
  CommentaryEvent,
  Match,
  type LineupEntry,
  Position,
  type Player,
} from "../types";

export interface IncidentPlayerSelection {
  player: Player;
  team: Match["teamA"];
  opponentName: string;
}

interface IncidentRenderablePlayer {
  token: string;
  selection: IncidentPlayerSelection;
}

export interface StoredIncidentPlayerKey {
  id?: string;
  name: string;
  pictureUrl?: string;
}

export interface StoredIncidentPlayer {
  playerKey: StoredIncidentPlayerKey;
  team: Match["teamA"];
  opponentName: string;
}

// pt-BR phrase spoken when the per-incident microphone is tapped, e.g.
// "Aos 23 minutos. Vinicius marcou." (the incident text is already pt-BR).
export function buildIncidentSpeech(incident: CommentaryEvent): string {
  const minute = (incident.time || "").replace(/\D/g, "");
  return `${minute ? `Aos ${minute} minutos. ` : ""}${incident.text}`;
}

export function getIncidentLabel(
  type: CommentaryEvent["type"],
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  switch (type) {
    case "GOAL":
      return t("aoVivo.incident.goal");
    case "YELLOW_CARD":
      return t("aoVivo.incident.yellow");
    case "RED_CARD":
      return t("aoVivo.incident.red");
    case "SUBSTITUTION":
      return t("aoVivo.incident.sub");
    default:
      return t("aoVivo.incident.play");
  }
}

export function getIncidentAccentClass(
  type: CommentaryEvent["type"],
  theme: "classic-light" | "stadium-dark",
) {
  if (type === "GOAL") {
    return theme === "classic-light"
      ? "border-[#009c3b]/25 bg-[#009c3b]/10 text-[#007a2f]"
      : "border-[#00e476]/20 bg-[#00e476]/10 text-[#a7e6bf]";
  }

  if (type === "YELLOW_CARD") {
    return theme === "classic-light"
      ? "border-[#d4a017]/25 bg-[#ffd84d]/15 text-[#9a6a00]"
      : "border-[#ffd84d]/20 bg-[#ffd84d]/10 text-[#ffe58b]";
  }

  if (type === "RED_CARD") {
    return theme === "classic-light"
      ? "border-[#c1121f]/25 bg-[#ed2939]/10 text-[#9f1239]"
      : "border-[#ed2939]/20 bg-[#ed2939]/10 text-[#ff9cab]";
  }

  return theme === "classic-light"
    ? "border-slate-200 bg-slate-100 text-slate-700"
    : "border-white/10 bg-white/10 text-slate-200";
}

export function getIncidentCardClass(
  type: CommentaryEvent["type"],
  theme: "classic-light" | "stadium-dark",
) {
  if (type === "GOAL") {
    return theme === "classic-light"
      ? "border-[#009c3b]/30 bg-[linear-gradient(135deg,rgba(0,156,59,0.12),rgba(255,216,77,0.18))] shadow-[0_14px_34px_rgba(0,156,59,0.12)]"
      : "border-[#ffd84d]/25 bg-[linear-gradient(135deg,rgba(255,216,77,0.12),rgba(0,228,118,0.14))] shadow-[0_16px_36px_rgba(255,216,77,0.08)]";
  }

  return theme === "classic-light"
    ? "bg-white border-slate-200"
    : "bg-[#161919] border-white/10";
}

export function getIncidentTextClass(
  type: CommentaryEvent["type"],
  theme: "classic-light" | "stadium-dark",
) {
  if (type === "GOAL") {
    return theme === "classic-light"
      ? "text-slate-900 text-base font-semibold"
      : "text-white text-base font-semibold";
  }

  return theme === "classic-light"
    ? "text-slate-700 text-sm"
    : "text-slate-100 text-sm";
}

export function normalizePlayerLookupText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .toUpperCase();
}

function getNormalizedNameParts(value: string) {
  return normalizePlayerLookupText(value).split(/\s+/).filter(Boolean);
}

export function isIncidentPlayerNameMatch(playerName: string, incidentName: string) {
  const normalizedPlayer = normalizePlayerLookupText(playerName);
  const normalizedIncident = normalizePlayerLookupText(incidentName);
  if (!normalizedPlayer || !normalizedIncident) {
    return false;
  }

  if (
    normalizedPlayer === normalizedIncident ||
    normalizedPlayer.includes(normalizedIncident) ||
    normalizedIncident.includes(normalizedPlayer)
  ) {
    return true;
  }

  const playerParts = getNormalizedNameParts(playerName);
  const incidentParts = getNormalizedNameParts(incidentName);
  if (playerParts.length === 0 || incidentParts.length === 0) {
    return false;
  }

  const playerSurname = playerParts.at(-1);
  const incidentSurname = incidentParts.at(-1);
  if (playerSurname && incidentSurname && playerSurname === incidentSurname) {
    const playerFirst = playerParts[0] || "";
    const incidentFirst = incidentParts[0] || "";
    return (
      playerFirst === incidentFirst ||
      playerFirst.startsWith(incidentFirst) ||
      incidentFirst.startsWith(playerFirst)
    );
  }

  return false;
}

export function getIncidentPlayerTokens(incident: CommentaryEvent) {
  if (incident.type === "GOAL") {
    const match = incident.text.match(/^(.+?) marcou\.$/);
    return match ? [match[1]] : [];
  }

  if (incident.type === "YELLOW_CARD") {
    const match = incident.text.match(/^(.+?) recebeu amarelo\.$/);
    return match ? [match[1]] : [];
  }

  if (incident.type === "RED_CARD") {
    const match = incident.text.match(/^(.+?) foi expulso\.$/);
    return match ? [match[1]] : [];
  }

  if (incident.type === "SUBSTITUTION") {
    const match = incident.text.match(/^Sai (.+?), entra (.+?)\.$/);
    return match ? [match[1], match[2]] : [];
  }

  return [];
}

export function buildIncidentPlayerSelections(
  incident: CommentaryEvent,
  match: Match,
  lineupEntry: { teamA: LineupEntry; teamB: LineupEntry } | undefined,
) {
  if (!incident.team) {
    return [];
  }

  const team = incident.team === "A" ? match.teamA : match.teamB;
  const opponentName = incident.team === "A" ? match.teamB.name : match.teamA.name;
  const lineup =
    incident.team === "A"
      ? lineupEntry?.teamA.players ?? match.teamA.lineup
      : lineupEntry?.teamB.players ?? match.teamB.lineup;
  const incidentTokens = getIncidentPlayerTokens(incident);

  const metadataSelections = (incident.playerMentions ?? [])
    .map((mention, index) => {
      const fallbackPlayer = lineup.find(
        (candidate) =>
          (mention.id && candidate.id === mention.id) ||
          isIncidentPlayerNameMatch(candidate.name, mention.name),
      );

      const player =
        fallbackPlayer ??
        ({
          id: mention.id ?? `${team.code.toLowerCase()}-${normalizePlayerLookupText(mention.name).replace(/\s+/g, "-")}`,
          name: mention.name,
          number: mention.number ?? 0,
          position: mention.position ?? Position.MF,
          x: 50,
          y: 50,
          pictureUrl: mention.pictureUrl,
        } satisfies Player);
      return {
        token: incidentTokens[index] ?? mention.name,
        selection: {
          player: {
            ...player,
            club: player.club ?? fallbackPlayer?.club,
            socials: player.socials ?? fallbackPlayer?.socials,
            pictureUrl: mention.pictureUrl ?? player.pictureUrl ?? fallbackPlayer?.pictureUrl,
          },
          team,
          opponentName,
        },
      } satisfies IncidentRenderablePlayer;
    })
    .filter((entry) => Boolean(entry.selection.player.name));

  if (metadataSelections.length > 0) {
    return metadataSelections;
  }

  return incidentTokens
    .map((token) => {
      const player = lineup.find((candidate) =>
        isIncidentPlayerNameMatch(candidate.name, token),
      );
      if (!player) {
        return null;
      }

      return {
        token,
        selection: {
          player,
          team,
          opponentName,
        },
      } satisfies IncidentRenderablePlayer;
    })
    .filter((entry): entry is IncidentRenderablePlayer => Boolean(entry));
}

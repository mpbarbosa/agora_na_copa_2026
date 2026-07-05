// Renders a live-commentary incident's text with its mentioned player(s) as
// tappable buttons (opening the player overlay). Extracted from
// `src/components/MatchDetailView.tsx`; the selection logic lives in the pure
// `../utils/matchIncidents` helper.
import { CommentaryEvent, Match, type LineupEntry } from "../types";
import { useT } from "../i18n";
import {
  buildIncidentPlayerSelections,
  type IncidentPlayerSelection,
} from "../utils/matchIncidents";

interface IncidentTextProps {
  incident: CommentaryEvent;
  match: Match;
  lineupEntry: { teamA: LineupEntry; teamB: LineupEntry } | undefined;
  theme: "classic-light" | "stadium-dark";
  onSelectPlayer: (selection: IncidentPlayerSelection) => void;
}

export function IncidentText({ incident, match, lineupEntry, theme, onSelectPlayer }: IncidentTextProps) {
  const t = useT();
  const renderablePlayers = buildIncidentPlayerSelections(incident, match, lineupEntry);

  if (renderablePlayers.length === 0) {
    return <>{incident.text}</>;
  }

  const incidentPlayerButtonClasses =
    theme === "classic-light"
      ? "inline-flex items-center rounded-md border border-[#065f2c]/15 bg-[#065f2c]/8 px-1.5 py-0.5 font-semibold text-[#065f2c] underline decoration-[#065f2c]/35 underline-offset-4 transition hover:border-[#065f2c]/30 hover:bg-[#065f2c]/12 hover:text-[#0a7f3f]"
      : "inline-flex items-center rounded-md border border-[#ffd84d]/15 bg-[#ffd84d]/10 px-1.5 py-0.5 font-semibold text-[#ffd84d] underline decoration-[#ffd84d]/35 underline-offset-4 transition hover:border-[#ffd84d]/35 hover:bg-[#ffd84d]/15 hover:text-[#ffe58b]";

  if (
    (incident.type === "GOAL" ||
      incident.type === "YELLOW_CARD" ||
      incident.type === "RED_CARD") &&
    renderablePlayers[0]
  ) {
    const [entry] = renderablePlayers;
    const suffix =
      incident.type === "GOAL"
        ? t("aoVivo.incidentText.scoredSuffix")
        : incident.type === "YELLOW_CARD"
          ? t("aoVivo.incidentText.yellowSuffix")
          : t("aoVivo.incidentText.redSuffix");

    return (
      <>
        <button
          type="button"
          id={`btn-incident-player-${incident.id}-0`}
          onClick={() => onSelectPlayer(entry.selection)}
          className={`transition ${incidentPlayerButtonClasses}`}
        >
          {entry.token}
        </button>
        {suffix}
      </>
    );
  }

  if (incident.type === "SUBSTITUTION" && renderablePlayers.length >= 2) {
    return (
      <>
        {t("aoVivo.incidentText.subOut")}
        <button
          type="button"
          id={`btn-incident-player-${incident.id}-0`}
          onClick={() => onSelectPlayer(renderablePlayers[0].selection)}
          className={`transition ${incidentPlayerButtonClasses}`}
        >
          {renderablePlayers[0].token}
        </button>
        {t("aoVivo.incidentText.subIn")}
        <button
          type="button"
          id={`btn-incident-player-${incident.id}-1`}
          onClick={() => onSelectPlayer(renderablePlayers[1].selection)}
          className={`transition ${incidentPlayerButtonClasses}`}
        >
          {renderablePlayers[1].token}
        </button>
        .
      </>
    );
  }

  return <>{incident.text}</>;
}

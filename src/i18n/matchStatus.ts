// Display-only pt→es localization of the official FIFA match status / period
// label (`MatchStateEntry.officialStatus`). The server builds this label in pt
// from a fixed closed vocabulary (`FIFA_PERIOD_LABELS` / `FIFA_STATUS_LABELS` in
// `fifa-sync-core.ts`) regardless of request language, so the Spanish scoreboard
// maps it at render. Keys are the exact pt strings the server emits; an unmapped
// value passes through unchanged (graceful — worst case the badge stays pt).
import { getActiveLocale, type Locale } from "./locale";

const ES_OFFICIAL_STATUS: Record<string, string> = {
  // Period labels
  Agendado: "Programado",
  "Pré-jogo": "Previa",
  "1º tempo": "1er tiempo",
  Intervalo: "Entretiempo",
  "2º tempo": "2do tiempo",
  Prorrogação: "Prórroga",
  "Prorrogação · 1º tempo": "Prórroga · 1er tiempo",
  "Intervalo da prorrogação": "Descanso de la prórroga",
  "Prorrogação · 2º tempo": "Prórroga · 2do tiempo",
  "Fim de jogo": "Final del partido",
  Pênaltis: "Penales",
  "Pós-jogo": "Pospartido",
  Abandonado: "Abandonado",
  // Terminal / abnormal status labels
  Encerrado: "Finalizado",
  "Escalações divulgadas": "Alineaciones publicadas",
  Adiado: "Aplazado",
  Cancelado: "Cancelado",
  Atrasado: "Retrasado",
  Paralisado: "Suspendido",
};

/**
 * Localize the pt official-status label for the active UI locale. pt returns it
 * unchanged; es maps by the exact pt string, falling back to the input verbatim.
 */
export const localizeOfficialFifaStatus = (
  ptLabel: string,
  locale: Locale = getActiveLocale(),
): string => (locale === "es" ? ES_OFFICIAL_STATUS[ptLabel] ?? ptLabel : ptLabel);

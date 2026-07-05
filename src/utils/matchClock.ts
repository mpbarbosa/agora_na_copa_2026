// Match-clock helpers for the "Ao Vivo" view: kickoff countdown seconds, minute
// labels, and locale-aware time / "updated at" formatting. Pure — the locale is
// read via the React-free `../i18n/locale` — so these are unit-tested in
// isolation (`tests/match-clock.test.ts`). Extracted from
// `src/components/MatchDetailView.tsx`.
import { Match } from "../types";
import { localeToIntlTag, getActiveLocale } from "../i18n/locale";

// The interactive clock-config drawer drives a countdown against this demo
// fixture instead of a real kickoff timestamp.
export const DEMO_MATCH_ID = "bra-mar-2026";

export function getMatchCountdownSeconds(match: Match, now: Date, customSeconds: number) {
  if (match.id === DEMO_MATCH_ID) {
    return Math.max(0, customSeconds);
  }

  if (match.status !== "PRE_GAME") {
    return 0;
  }

  const kickoffTime = new Date(match.kickoffTimestamp).getTime();
  if (Number.isNaN(kickoffTime)) {
    return Math.max(0, match.countdownTargetSeconds);
  }

  return Math.max(0, Math.floor((kickoffTime - now.getTime()) / 1000));
}

export function parseMinuteLabel(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseInt(value.replace(/\D/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatMinuteLabel(minute: number) {
  return `${Math.max(1, minute)}'`;
}

export function formatBrasiliaTime(date: Date) {
  return date.toLocaleTimeString(localeToIntlTag(getActiveLocale()), {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatTimeInZone(date: Date, timeZone: string) {
  return date.toLocaleTimeString(localeToIntlTag(getActiveLocale()), {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatOverlayUpdatedAt(
  value: string | undefined,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  if (!value) {
    return t("aoVivo.overlay.pending");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t("aoVivo.overlay.unavailable");
  }

  return t("aoVivo.overlay.updatedAt", {
    time: date.toLocaleTimeString(localeToIntlTag(getActiveLocale()), {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  });
}

export function formatCountdown(totalSecs: number) {
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const hh = h.toString().padStart(2, "0");
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  if (d > 0) {
    return `${d.toString().padStart(2, "0")}d ${hh}h ${mm}m ${ss}s`;
  }
  return `${hh}h ${mm}m ${ss}s`;
}

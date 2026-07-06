// The Ao Vivo hero scoreboard: the two teams, the clock/score, the penalty
// tally, the group/stage badge, the venue block (Brasília + stadium-local
// clocks, pré-jogo countdown), and the weather/referee/suspension/advisory
// chips. Presentational — the parent owns the match + overlay + simulation
// state and passes the resolved fixture, the derived overlay fields, and the
// current tick down; events (match pick, team-lineup open, group table, referee
// card) go back up via callbacks.
import type { Match, TeamRef, MatchReferee } from "../types";
import type { ProvisionalSlot } from "../standings";
import { useLocale } from "../i18n";
import { localizedStageName } from "../utils/knockoutSlots";
import { localizeOfficialFifaStatus } from "../i18n/matchStatus";
import { resolveTeamDisplay, type ResolvedTeamDisplay } from "../utils/resolveTeamDisplay";
import { resolveVenueTimeZone } from "../utils/venueCoordinates";
import { FlagIcon } from "./FlagIcon";
import { MatchWeatherChip } from "./MatchWeatherChip";
import { RefereeChip } from "./RefereeChip";
import { WeatherSuspensionNotice } from "./WeatherSuspensionNotice";
import { MatchAdvisoryNotice } from "./MatchAdvisoryNotice";
import { MatchSpeechToggle } from "./MatchSpeechToggle";
import type { MatchSpeechControls } from "../hooks/useMatchSpeech";
import {
  formatBrasiliaTime,
  formatTimeInZone,
  formatCountdown,
  formatOverlayUpdatedAt,
} from "../utils/matchClock";
import {
  getMatchGroupLabel,
  getMatchStageLabel,
  formatCountryNameForTooltip,
} from "../utils/matchSelection";
import { MapPin, Zap, Clock } from "lucide-react";

interface MatchScoreboardProps {
  match: Match;
  teamA: ResolvedTeamDisplay;
  teamB: ResolvedTeamDisplay;
  theme: "classic-light" | "stadium-dark";
  currentTime: Date;
  secondsRemaining: number;
  matchSpeech: MatchSpeechControls;
  simultaneousUpcomingMatches: Match[];
  groupPositionMap: Map<string, ProvisionalSlot>;
  officialFifaStatus?: string;
  overlaySourceLabel: string;
  overlayUpdatedAt?: string;
  referee?: MatchReferee;
  matchAdvisory?: string;
  onSelectMatch: (matchId: string) => void;
  onSelectTeamLineup: (team: TeamRef) => void;
  onOpenStandingsGroup: (group: string) => void;
  onOpenReferee: () => void;
}

export function MatchScoreboard({
  match,
  teamA,
  teamB,
  theme,
  currentTime,
  secondsRemaining,
  matchSpeech,
  simultaneousUpcomingMatches,
  groupPositionMap,
  officialFifaStatus,
  overlaySourceLabel,
  overlayUpdatedAt,
  referee,
  matchAdvisory,
  onSelectMatch,
  onSelectTeamLineup,
  onOpenStandingsGroup,
  onOpenReferee,
}: MatchScoreboardProps) {
  const { t, locale } = useLocale();

  const stadiumTimeZone = resolveVenueTimeZone(match);
  const hasScore = Boolean(match.score);
  const scoreText = match.score
    ? `${match.score.teamA} x ${match.score.teamB}`
    : null;
  // Penalty-shootout result, present only on a knockout tie decided on
  // penalties. The team with the higher tally advanced; an equal tally never
  // happens (one side always wins the shootout) but is guarded just in case.
  const penaltyScore = match.penaltyScore;
  const penaltyShootoutWinnerName = penaltyScore
    ? penaltyScore.teamA === penaltyScore.teamB
      ? null
      : penaltyScore.teamA > penaltyScore.teamB
        ? teamA.name
        : teamB.name
    : null;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${match.stadiumName}, ${match.city}`,
  )}`;
  const groupLabel = getMatchGroupLabel(match);
  const stageLabel = getMatchStageLabel(match);
  // Per-match schedule advisory (e.g. a weather kickoff delay the live feed
  // doesn't carry). Hidden once the match is FINISHED so it never lingers.
  const showMatchAdvisory = Boolean(matchAdvisory) && match.status !== "FINISHED";

  // The live/pré-jogo status line: game-state badge + official FIFA status.
  // Shown in the center column on desktop; on mobile it is relocated above the
  // team-A flag. Only the canonical (desktop) copy carries the element ids, so
  // they stay unique across the two render positions.
  const renderMatchStatusLine = (withIds: boolean) => (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
      {/* Game state indicator, driven by the current match's status */}
      <div
        className="flex items-center space-x-1.5"
        {...(withIds ? { id: "game-state-badge" } : {})}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            match.status === "LIVE"
              ? "bg-red-500 animate-pulse"
              : match.status === "SUSPENDED"
                ? "bg-amber-500 animate-pulse"
                : match.status === "FINISHED"
                  ? "bg-slate-400"
                  : "bg-[#00e476] animate-pulse"
          }`}
        ></span>
        <span
          className={`font-mono text-xs font-bold tracking-widest uppercase ${
            match.status === "SUSPENDED"
              ? "text-amber-600 dark:text-amber-400"
              : match.status === "FINISHED"
                ? "text-slate-500 dark:text-slate-300"
                : theme === "classic-light"
                  ? "text-slate-600"
                  : "text-[#a7e6bf]"
          }`}
        >
          {match.status === "LIVE"
            ? match.matchTime
              ? t("aoVivo.status.liveWithTime", { time: match.matchTime })
              : t("aoVivo.status.live")
            : match.status === "SUSPENDED"
              ? t("aoVivo.status.suspended")
              : match.status === "FINISHED"
                ? t("aoVivo.status.finished")
                : t("aoVivo.status.preGame")}
        </span>
      </div>

      {/* Official FIFA match status / period (only when FIFA-sourced) */}
      {officialFifaStatus && (
        <div
          {...(withIds ? { id: "fifa-official-status" } : {})}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${
            theme === "classic-light"
              ? "border-slate-200 bg-slate-100 text-slate-600"
              : "border-white/10 bg-white/5 text-slate-300"
          }`}
          title={t("aoVivo.status.officialFifaTitle")}
        >
          <span>{localizeOfficialFifaStatus(officialFifaStatus, locale)}</span>
        </div>
      )}
    </div>
  );

  // The overlay source/updated line ("Oficial • Atualizado em …").
  // Shown in the center column on desktop; on mobile it is relocated above the
  // team-A flag (directly above it, below the status line).
  const renderOverlaySourceLine = () => (
    <div
      className={`text-center font-mono text-[11px] uppercase tracking-wider ${
        theme === "classic-light" ? "text-slate-500" : "text-slate-300"
      }`}
    >
      {overlaySourceLabel} • {formatOverlayUpdatedAt(overlayUpdatedAt, t)}
    </div>
  );

  return (
    <section
      className="max-w-5xl mx-auto px-4 mt-8"
      id="core-live-scoreboard"
    >
      {/* SCOREBOARD: Match detail box */}
      <div
        className={`p-6 md:p-8 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
          theme === "classic-light"
            ? "bg-white border-slate-200/90 shadow-sm"
            : "bg-gradient-to-br from-[#121414] to-[#1e2020] border-white/5 shadow-2xl"
        }`}
        id="live-jumbo-card"
      >
        {/* Narração toggle + the simultaneous-match alert share one row, so the
            mic sits beside the "Atenção: outro jogo no mesmo horário" banner
            instead of floating alone above it. Either can appear without the
            other: with the banner the mic aligns to its right; without it the
            mic stays pinned right (ml-auto). */}
        {(matchSpeech.supported || simultaneousUpcomingMatches.length > 0) && (
          <div className="mb-5 flex items-center gap-3">
            {/* Simultaneous pré-jogo alert: another game kicks off at the very
                same time (final group round). A bold banner so the simultaneous
                slot is impossible to miss — and each sibling chip jumps to that
                match. Mirrors the live SimultaneousLiveMatches case. */}
            {simultaneousUpcomingMatches.length > 0 && (
              <div
                id="simultaneous-upcoming-matches"
                data-testid="simultaneous-upcoming-matches"
                className={`flex flex-1 flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed px-4 py-3 text-center sm:flex-row sm:gap-3 ${
                  theme === "classic-light"
                    ? "border-amber-300 bg-amber-50"
                    : "border-amber-400/40 bg-amber-400/10"
                }`}
              >
                <span
                  className={`flex items-center gap-2 font-anton text-sm uppercase tracking-wide ${
                    theme === "classic-light" ? "text-amber-700" : "text-amber-300"
                  }`}
                >
                  <Zap size={18} className="shrink-0 animate-pulse" aria-hidden="true" />
                  {simultaneousUpcomingMatches.length === 1
                    ? t("aoVivo.scoreboard.simultaneousOne")
                    : t("aoVivo.scoreboard.simultaneousMany")}
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {simultaneousUpcomingMatches.map((m) => {
                    const a = resolveTeamDisplay(m, m.teamA, groupPositionMap);
                    const b = resolveTeamDisplay(m, m.teamB, groupPositionMap);
                    return (
                    <button
                      key={m.id}
                      type="button"
                      id={`btn-simultaneous-${m.id}`}
                      onClick={() => onSelectMatch(m.id)}
                      title={t("aoVivo.scoreboard.simultaneousTitle", {
                        teamA: formatCountryNameForTooltip(a.name),
                        teamB: formatCountryNameForTooltip(b.name),
                      })}
                      aria-label={t("aoVivo.scoreboard.simultaneousAria", {
                        teamA: formatCountryNameForTooltip(a.name),
                        teamB: formatCountryNameForTooltip(b.name),
                      })}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-anton text-sm uppercase tracking-wide transition ${
                        theme === "classic-light"
                          ? "border-amber-300 bg-white text-slate-800 hover:border-amber-400 hover:bg-amber-100"
                          : "border-amber-400/30 bg-[#1a1c14] text-amber-50 hover:border-amber-300/60 hover:bg-amber-400/15"
                      }`}
                    >
                      <FlagIcon
                        flag={a.flagSvg}
                        className="h-4 w-6 shrink-0 rounded-[2px] object-cover"
                      />
                      <span>{a.code} x {b.code}</span>
                      <FlagIcon
                        flag={b.flagSvg}
                        className="h-4 w-6 shrink-0 rounded-[2px] object-cover"
                      />
                    </button>
                    );
                  })}
                </div>
              </div>
            )}
            {matchSpeech.supported && (
              <div className="ml-auto shrink-0">
                <MatchSpeechToggle
                  enabled={matchSpeech.enabled}
                  onToggle={matchSpeech.toggle}
                  theme={theme}
                />
              </div>
            )}
          </div>
        )}

        <div
          className="flex flex-col items-center justify-between space-y-6 md:space-y-0 md:flex-row md:space-x-8"
          id="scoreboard-grid"
        >
          {/* MOBILE ONLY: the pré-jogo/live status line and the
              source/updated line sit above the team-A flag. Desktop keeps
              both in the center column. */}
          <div className="w-full md:hidden">{renderMatchStatusLine(false)}</div>
          <div className="w-full md:hidden">{renderOverlaySourceLine()}</div>

          {/* LEFT TEAM */}
          <div
            className="flex flex-col items-center space-y-3 flex-1"
            id="team-a-display"
          >
            <div className="w-32 h-24 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-white/80 dark:border-white/10 shadow-lg overflow-hidden transition hover:scale-105 p-3">
              <FlagIcon
                flag={teamA.flagSvg}
                className="w-full h-full object-contain"
                onClick={() => onSelectTeamLineup(teamA.ref)}
              />
            </div>
            <h2
              className={`font-anton text-lg tracking-wider uppercase ${
                theme === "classic-light" ? "text-slate-800" : "text-white"
              }`}
            >
              {teamA.name}
            </h2>
          </div>

          {/* CENTER TIME AND PLAY STATUS INDICATORS */}
          <div
            className="flex flex-col items-center text-center space-y-2 flex-1 min-w-[200px]"
            id="clock-center-display"
          >
            {/* Live status + official FIFA status share a single line.
                On mobile this line is relocated above the team-A flag (see
                the scoreboard grid), so it is shown here only from md up. */}
            <div className="hidden md:block w-full">{renderMatchStatusLine(true)}</div>

            {/* Source/updated line. On mobile it is relocated above the
                team-A flag (see the scoreboard grid), so it shows here only
                from md up. */}
            <div className="hidden md:block w-full">{renderOverlaySourceLine()}</div>

            {/* Main Scoreboard clock time or score line */}
            <div
              className={`font-anton text-7xl md:text-8xl tracking-tight leading-none ${
                theme === "classic-light"
                  ? "text-slate-900"
                  : "text-white glowing-text-gold"
              }`}
              id="scoreboard-clock"
            >
              {hasScore ? scoreText : match.kickoffTime}
            </div>

            {/* Penalty-shootout result, for a knockout tie decided on penalties */}
            {penaltyScore && (
              <div
                className="flex flex-col items-center gap-1"
                id="scoreboard-penalty"
              >
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 font-mono text-xs font-bold uppercase tracking-wider ${
                    theme === "classic-light"
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                  }`}
                  title={t("aoVivo.scoreboard.penaltyTitle")}
                >
                  {t("aoVivo.scoreboard.penaltyLabel", {
                    a: penaltyScore.teamA,
                  })}
                  <span className="opacity-50">x</span>
                  {penaltyScore.teamB}
                </span>
                {penaltyShootoutWinnerName && match.status === "FINISHED" && (
                  <span
                    className={`font-archivo text-[11px] font-semibold uppercase tracking-wide ${
                      theme === "classic-light" ? "text-slate-500" : "text-slate-300"
                    }`}
                  >
                    {t("aoVivo.scoreboard.advancesOnPenalties", {
                      name: penaltyShootoutWinnerName,
                    })}
                  </span>
                )}
              </div>
            )}

            {/* Match date (Ex: "11 Junho, 2026") */}
            <div
              className={`font-archivo text-sm font-semibold tracking-wide uppercase ${
                theme === "classic-light"
                  ? "text-slate-500"
                  : "text-slate-300"
              }`}
              id="scoreboard-date"
            >
              {match.kickoffDate}
            </div>

            {groupLabel && (
              <button
                type="button"
                onClick={() => onOpenStandingsGroup(groupLabel)}
                className={`rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] ${
                  theme === "classic-light"
                    ? "border-slate-200 bg-slate-100 text-slate-700 hover:border-[#009c3b]/30 hover:bg-[#009c3b]/10 hover:text-[#007a2f]"
                    : "border-white/10 bg-white/5 text-slate-100 hover:border-[#00e476]/25 hover:bg-[#00e476]/10 hover:text-[#a7e6bf]"
                }`}
                id="scoreboard-group-label"
                aria-label={t("aoVivo.scoreboard.openGroupTable", {
                  group: groupLabel,
                })}
              >
                {groupLabel}
              </button>
            )}

            {!groupLabel && stageLabel && (
              <span
                className={`rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] ${
                  theme === "classic-light"
                    ? "border-slate-200 bg-slate-100 text-slate-700"
                    : "border-white/10 bg-white/5 text-slate-100"
                }`}
                id="scoreboard-stage-label"
              >
                {localizedStageName(stageLabel)}
              </span>
            )}

          </div>

          {/* RIGHT TEAM */}
          <div
            className="flex flex-col items-center space-y-3 flex-1"
            id="team-b-display"
          >
            <div className="w-32 h-24 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-white/80 dark:border-white/10 shadow-lg overflow-hidden transition hover:scale-105 p-3">
              <FlagIcon
                flag={teamB.flagSvg}
                className="w-full h-full object-contain"
                onClick={() => onSelectTeamLineup(teamB.ref)}
              />
            </div>

            <h2
              className={`font-anton text-lg tracking-wider uppercase ${
                theme === "classic-light" ? "text-slate-800" : "text-white"
              }`}
            >
              {teamB.name}
            </h2>
          </div>
        </div>

        {/* Weather/lightning suspension advisory + link to the FIFA regulations */}
        {match.status === "SUSPENDED" && (
          <div className="mt-5 flex justify-center">
            <WeatherSuspensionNotice theme={theme} />
          </div>
        )}

        {/* Per-match schedule advisory (e.g. weather kickoff delay) */}
        {showMatchAdvisory && (
          <div className="mt-5 flex justify-center">
            <MatchAdvisoryNotice message={matchAdvisory!} theme={theme} />
          </div>
        )}

        {/* Stadium, Location & Capacity details */}
        <div
          className="mt-8 pt-6 border-t border-slate-150 dark:border-white/5 flex items-center justify-center text-center"
          id="stadium-footer-display"
        >
          <div className="flex flex-col items-center text-sm">
            {/* Current local time at the stadium, above its location */}
            {(match.status === "LIVE" || match.status === "SUSPENDED") &&
              stadiumTimeZone && (
                <div
                  id="stadium-local-time"
                  className={`mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider ${
                    theme === "classic-light" ? "text-slate-500" : "text-slate-400"
                  }`}
                  title={t("aoVivo.scoreboard.stadiumLocalTimeTitle")}
                >
                  <Clock size={12} aria-hidden="true" />
                  <span>{t("aoVivo.scoreboard.localTime")}</span>
                  <span className="font-bold tabular-nums text-amber-500">
                    {formatTimeInZone(currentTime, stadiumTimeZone)}
                  </span>
                </div>
              )}

            {/* Countdown ("Faltam: …") — immediately above the Brasília clock */}
            <div className="mb-2 flex flex-col items-center" id="countdown-sub-wrapper">
              {match.status === "PRE_GAME" && (
                <div
                  className={`font-mono text-xs md:text-sm font-semibold tracking-wider ${
                    theme === "classic-light"
                      ? "text-[#009c3b]"
                      : "text-[#00e476] glowing-text-green"
                  }`}
                >
                  {t("aoVivo.scoreboard.countdown")}{" "}
                  <span className="font-bold">
                    {formatCountdown(secondsRemaining)}
                  </span>
                </div>
              )}
            </div>

            {/* HORÁRIO DE BRASÍLIA — immediately above the stadium name and location */}
            {match.status !== "FINISHED" && (
              <span
                className={`mb-2 flex items-center gap-2 text-xs font-mono tracking-widest font-black uppercase ${
                  theme === "classic-light" ? "text-slate-800" : "text-white"
                }`}
              >
                <span className={theme === "classic-light" ? "text-slate-800" : "text-white"}>{t("aoVivo.scoreboard.brasiliaTime")}</span>
                <span className="tabular-nums" id="brasilia-clock">
                  {formatBrasiliaTime(currentTime)}
                </span>
              </span>
            )}

            <div className="flex flex-col sm:flex-row items-center sm:space-x-3">
              <div className="flex items-center space-x-1 text-amber-500 mb-1 sm:mb-0">
                <MapPin size={16} className="text-amber-500 animate-bounce" />
                <span className="font-anton uppercase tracking-widest text-amber-500">
                  {match.city}
                </span>
              </div>
              <span className="hidden sm:inline text-slate-300">|</span>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`font-archivo font-medium underline-offset-4 hover:underline ${
                  theme === "classic-light" ? "text-slate-700" : "text-slate-100"
                }`}
              >
                {match.stadiumName} • {localizedStageName(match.stageName)}
              </a>
            </div>

            {/* Venue weather, right below the stadium location, while the
                match is in progress or paused (a stoppage is often weather-related) */}
            {(match.status === "LIVE" || match.status === "SUSPENDED") && (
              <div className="mt-3">
                <MatchWeatherChip match={match} theme={theme} />
              </div>
            )}

            {/* FIFA-assigned referee, whenever one has been published for the
                match (assigned a day or two before kickoff). */}
            {referee && (
              <div className="mt-3">
                <RefereeChip
                  referee={referee}
                  theme={theme}
                  onClick={onOpenReferee}
                />
              </div>
            )}

            {match.officialMatchUrl && (
              <a
                href={match.officialMatchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-2 text-sm font-archivo underline underline-offset-4 ${
                  theme === "classic-light"
                    ? "text-[#0057b8] hover:text-[#003f86]"
                    : "text-[#8cc8ff] hover:text-white"
                }`}
              >
                {t("aoVivo.scoreboard.fifaMatchPage")}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

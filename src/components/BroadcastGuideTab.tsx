// The Ao Vivo "Onde Assistir" tab (activeTab === "broadcast"): the broadcast
// guide (country picker + FIFA broadcaster strip, or the finished-match videos
// strip), the live-incident feed, and the finished-match rail — plus the paired
// "Equipe para assistir" affiliate strip. Presentational: the parent owns the
// match + overlay + speech state and passes the resolved fixture, broadcasters,
// incidents and the derived overlay fields down; the country pick, an incident
// player tap, and a finished-match pick go back up via callbacks.
import { CommentaryEvent, Match, Broadcaster, type LineupEntry } from "../types";
import { useT } from "../i18n";
import { BroadcastCountrySelect } from "./BroadcastCountrySelect";
import { AffiliateProducts } from "./AffiliateProducts";
import { IncidentText } from "./IncidentText";
import MATCH_VIDEOS from "../data/matchVideos.json";
import type { MatchSpeechControls } from "../hooks/useMatchSpeech";
import { useMatchSelectorRail } from "../hooks/useMatchSelectorRail";
import { formatOverlayUpdatedAt } from "../utils/matchClock";
import {
  getBroadcasterBadgeLabel,
  formatCountryNameForTooltip,
} from "../utils/matchSelection";
import {
  buildIncidentSpeech,
  buildIncidentPlayerSelections,
  getIncidentLabel,
  getIncidentAccentClass,
  getIncidentCardClass,
  getIncidentTextClass,
  type IncidentPlayerSelection,
} from "../utils/matchIncidents";
import { ChevronLeft, ChevronRight, Mic } from "lucide-react";

interface BroadcastGuideTabProps {
  theme: "classic-light" | "stadium-dark";
  match: Match;
  broadcasters: Broadcaster[];
  broadcastCountry: string;
  onCountryChange: (code: string) => void;
  broadcastNote?: string;
  broadcastUpdatedAt?: string;
  incidents: CommentaryEvent[];
  simulated: boolean;
  matchStateSource?: string;
  incidentsUpdatedAt?: string;
  teamACode: string;
  teamBCode: string;
  lineupEntry: { teamA: LineupEntry; teamB: LineupEntry } | undefined;
  matchSpeech: MatchSpeechControls;
  onSelectIncidentPlayer: (selection: IncidentPlayerSelection) => void;
  matches: Match[];
  selectedMatchId: string;
  onSelectMatch: (matchId: string) => void;
}

export function BroadcastGuideTab({
  theme,
  match,
  broadcasters,
  broadcastCountry,
  onCountryChange,
  broadcastNote,
  broadcastUpdatedAt,
  incidents,
  simulated,
  matchStateSource,
  incidentsUpdatedAt,
  teamACode,
  teamBCode,
  lineupEntry,
  matchSpeech,
  onSelectIncidentPlayer,
  matches,
  selectedMatchId,
  onSelectMatch,
}: BroadcastGuideTabProps) {
  const t = useT();
  const { setRailRef, scrollRail } = useMatchSelectorRail(selectedMatchId);
  const shouldScrollIncidents = incidents.length > 6;
  const hasClickableIncidentPlayers = incidents.some(
    (incident) =>
      buildIncidentPlayerSelections(incident, match, lineupEntry).length > 0,
  );

  return (
    <>
      <div
        className={`${
          theme === "classic-light" ? "bg-white" : "bg-transparent"
        }`}
        id="broadcast-layout-grid"
      >
        <div
          className={`rounded-2xl ${
            theme === "classic-light" ? "bg-transparent" : "bg-transparent"
          }`}
          id="broadcaster-rows"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p
              className={`font-anton text-lg md:text-xl uppercase tracking-wide ${
                theme === "classic-light" ? "text-slate-900" : "text-white"
              }`}
              id="broadcast-section-title"
            >
              {t("aoVivo.broadcast.title")}
            </p>
            <BroadcastCountrySelect
              value={broadcastCountry}
              onChange={onCountryChange}
              theme={theme}
              label={t("aoVivo.broadcast.countryLabel")}
            />
          </div>
          <p
            className={`mb-4 font-mono text-[11px] uppercase tracking-wider ${
              theme === "classic-light"
                ? "text-slate-500"
                : "text-slate-300"
            }`}
          >
            {broadcastNote || t("aoVivo.broadcast.loadingNote")} •{" "}
            {formatOverlayUpdatedAt(broadcastUpdatedAt, t)}
          </p>
          {match.status === "FINISHED" &&
          (MATCH_VIDEOS as Record<string, { embedUrl: string; title: string }[]>)[match.id]?.length ? (
            <div className="flex items-center gap-4" id="match-videos-list">
              {/* TV icon — same as broadcaster strip */}
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${
                  theme === "classic-light"
                    ? "bg-white border-slate-200"
                    : "bg-[#161919] border-white/10"
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M8.91634 8.03187V11.2807C8.91634 11.4363 9.08307 11.5313 9.21161 11.4487L11.7423 9.82434C11.8632 9.74672 11.8632 9.56583 11.7423 9.4882L9.21161 7.8638C9.08307 7.78129 8.91634 7.8762 8.91634 8.03187Z" fill="#505B73" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M4.74967 5H15.2497C16.0321 5 16.6663 5.63426 16.6663 6.41667V12.75C16.6663 13.5324 16.0321 14.1667 15.2497 14.1667L13.333 14.1667V15H6.66634V14.1667L4.74967 14.1667C3.96727 14.1667 3.33301 13.5324 3.33301 12.75V6.41667C3.33301 5.63426 3.96727 5 4.74967 5ZM4.74967 6.25C4.65763 6.25 4.58301 6.32462 4.58301 6.41667V12.75C4.58301 12.842 4.65763 12.9167 4.74967 12.9167H15.2497C15.3417 12.9167 15.4163 12.842 15.4163 12.75V6.41667C15.4163 6.32462 15.3417 6.25 15.2497 6.25H4.74967Z" fill="#505B73" />
                </svg>
              </div>
              {/* Small thumbnail cards */}
              <div className="flex items-center gap-2 md:gap-3 overflow-x-auto">
                {(MATCH_VIDEOS as Record<string, { embedUrl: string; title: string }[]>)[match.id].map(
                  (video, idx) => {
                    const videoId = video.embedUrl.match(/\/embed\/([^?/]+)/)?.[1] ?? "";
                    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
                    const thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                    return (
                      <a
                        key={idx}
                        href={watchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative shrink-0 overflow-hidden rounded-xl border transition hover:-translate-y-0.5"
                        style={{ width: 120, height: 68 }}
                        aria-label={t("aoVivo.broadcast.videoAria", {
                          title: video.title,
                        })}
                        title={video.title}
                      >
                        <img
                          src={thumbUrl}
                          alt={video.title}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ff0000] group-hover:scale-110 transition-transform">
                            <svg viewBox="0 0 24 24" className="h-3 w-3 translate-x-px fill-white" aria-hidden="true">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      </a>
                    );
                  },
                )}
              </div>
            </div>
          ) : (
            <div
              className="flex items-center gap-4"
              id="fifa-broadcaster-strip"
            >
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${
                  theme === "classic-light"
                    ? "bg-white border-slate-200"
                    : "bg-[#161919] border-white/10"
                }`}
                id="broadcast-icon-container"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    d="M8.91634 8.03187V11.2807C8.91634 11.4363 9.08307 11.5313 9.21161 11.4487L11.7423 9.82434C11.8632 9.74672 11.8632 9.56583 11.7423 9.4882L9.21161 7.8638C9.08307 7.78129 8.91634 7.8762 8.91634 8.03187Z"
                    fill="#505B73"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M4.74967 5H15.2497C16.0321 5 16.6663 5.63426 16.6663 6.41667V12.75C16.6663 13.5324 16.0321 14.1667 15.2497 14.1667L13.333 14.1667V15H6.66634V14.1667L4.74967 14.1667C3.96727 14.1667 3.33301 13.5324 3.33301 12.75V6.41667C3.33301 5.63426 3.96727 5 4.74967 5ZM4.74967 6.25C4.65763 6.25 4.58301 6.32462 4.58301 6.41667V12.75C4.58301 12.842 4.65763 12.9167 4.74967 12.9167H15.2497C15.3417 12.9167 15.4163 12.842 15.4163 12.75V6.41667C15.4163 6.32462 15.3417 6.25 15.2497 6.25H4.74967Z"
                    fill="#505B73"
                  />
                </svg>
              </div>

              <div
                className="flex min-w-0 flex-1 items-center gap-2 md:gap-3 overflow-x-auto scrollbar-hidden snap-x py-1"
                id="fifa-broadcasters-list"
              >
                {broadcasters.length === 0 && (
                  <span
                    id="broadcast-none-for-country"
                    className={`font-mono text-[11px] uppercase tracking-wider ${
                      theme === "classic-light" ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    {t("aoVivo.broadcast.noneForCountry")}
                  </span>
                )}
                {broadcasters.map((cast) => (
                  <a
                    key={cast.id}
                    id={`link-broadcaster-${cast.id}`}
                    href={cast.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${cast.name} • ${cast.type}`}
                    className={`flex h-[72px] w-[84px] shrink-0 snap-start items-center justify-center rounded-xl border px-2 py-2 transition hover:-translate-y-0.5 ${
                      theme === "classic-light"
                        ? "bg-white border-slate-200 hover:border-slate-300"
                        : "bg-[#161919] border-white/10 hover:border-white/20"
                    }`}
                  >
                    {cast.logoUrl ? (
                      <img
                        src={cast.logoUrl}
                        alt={cast.name}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <span
                        className="font-anton text-xs uppercase tracking-wide text-white"
                        style={{
                          color: cast.iconColor,
                        }}
                      >
                        {getBroadcasterBadgeLabel(cast.name)}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {(match.status !== "PRE_GAME" || incidents.length > 0) && (
            <div
              className={`mt-5 rounded-2xl border px-4 py-4 ${
                theme === "classic-light"
                  ? "bg-slate-50 border-slate-200"
                  : "bg-[#121414]/70 border-white/10"
              }`}
              id="match-incidents-panel"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p
                    className={`font-anton text-base uppercase tracking-wide ${
                      theme === "classic-light" ? "text-slate-900" : "text-white"
                    }`}
                  >
                    {t("aoVivo.incidents.title")}
                  </p>
                  <p
                    className={`mt-1 font-mono text-[11px] uppercase tracking-wider ${
                      theme === "classic-light"
                        ? "text-slate-500"
                        : "text-slate-300"
                    }`}
                  >
                    {simulated
                      ? t("aoVivo.incidents.feedSimulation")
                      : matchStateSource === "fifa"
                      ? t("aoVivo.incidents.feedOfficial")
                      : t("aoVivo.incidents.feedWaiting")}{" "}
                    •{" "}
                    {formatOverlayUpdatedAt(incidentsUpdatedAt, t)}
                  </p>
                  {hasClickableIncidentPlayers && (
                    <p
                      className={`mt-2 font-mono text-[10px] uppercase tracking-wider ${
                        theme === "classic-light"
                          ? "text-[#065f2c]"
                          : "text-[#ffd84d]"
                      }`}
                    >
                      {t("aoVivo.incidents.clickHint")}
                    </p>
                  )}
                </div>
              </div>

              {incidents.length > 0 ? (
                <div
                  className={`mt-4 flex flex-col gap-2 pr-1 ${
                    shouldScrollIncidents
                      ? "max-h-[32rem] overflow-y-auto"
                      : ""
                  }`}
                  id="match-incidents-list"
                  data-scrollable={shouldScrollIncidents ? "true" : "false"}
                >
                  {incidents.map((incident) => (
                    <div
                      key={incident.id}
                      className={`flex items-start justify-between gap-2 rounded-xl border px-3 py-3 transition ${
                        getIncidentCardClass(incident.type, theme)
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`font-mono font-black uppercase tracking-wider ${
                            incident.type === "GOAL"
                              ? theme === "classic-light"
                                ? "text-[#007a2f] text-sm"
                                : "text-[#ffe58b] text-sm"
                              : theme === "classic-light"
                                ? "text-slate-700 text-xs"
                                : "text-slate-100 text-xs"
                          }`}
                        >
                          {incident.time}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] ${getIncidentAccentClass(
                            incident.type,
                            theme,
                          )}`}
                        >
                          {getIncidentLabel(incident.type, t)}
                        </span>
                        {incident.team && (
                          <span
                            className={`rounded-full px-2 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] ${
                              theme === "classic-light"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-white/10 text-slate-200"
                            }`}
                          >
                            {incident.team === "A"
                              ? teamACode
                              : teamBCode}
                          </span>
                        )}
                      </div>
                      <p
                        className={`mt-2 font-archivo leading-6 ${getIncidentTextClass(
                          incident.type,
                          theme,
                        )}`}
                      >
                        <IncidentText
                          incident={incident}
                          match={match}
                          lineupEntry={lineupEntry}
                          theme={theme}
                          onSelectPlayer={onSelectIncidentPlayer}
                        />
                      </p>
                      </div>
                      {matchSpeech.supported && (
                        <button
                          type="button"
                          data-testid="incident-speak"
                          onClick={() => matchSpeech.speak(buildIncidentSpeech(incident))}
                          aria-label={t("aoVivo.incidents.listenPlay")}
                          title={t("aoVivo.incidents.listenPlay")}
                          className={`mt-0.5 shrink-0 rounded-full border p-2 transition ${
                            theme === "classic-light"
                              ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                              : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                          }`}
                        >
                          <Mic size={16} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p
                  className={`mt-4 font-archivo text-sm leading-6 ${
                    theme === "classic-light"
                      ? "text-slate-600"
                      : "text-slate-200"
                  }`}
                >
                  {t("aoVivo.incidents.empty")}
                </p>
              )}
            </div>
          )}

          {(() => {
            const finishedMatches = matches
              .filter((m) => m.status === "FINISHED")
              .sort(
                (a, b) =>
                  new Date(a.kickoffTimestamp).getTime() -
                  new Date(b.kickoffTimestamp).getTime(),
              );

            if (finishedMatches.length === 0) return null;

            return (
              <div
                className={`mt-4 flex flex-col gap-1 rounded-2xl border px-4 py-3 xl:flex-row xl:items-center xl:gap-2 ${
                  theme === "classic-light"
                    ? "bg-slate-50 border-slate-200"
                    : "bg-[#121414]/70 border-white/10"
                }`}
                id="finished-match-bar"
              >
                <span
                  className={`shrink-0 font-mono text-xs font-bold uppercase tracking-wider ${
                    theme === "classic-light"
                      ? "text-slate-700"
                      : "text-slate-100"
                  }`}
                >
                  {t("aoVivo.finished.label")}
                </span>
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => scrollRail("finished", "prev")}
                    className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border md:inline-flex ${
                      theme === "classic-light"
                        ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        : "border-white/10 bg-[#171a1c] text-slate-100 hover:bg-white/10"
                    }`}
                    aria-label={t("aoVivo.finished.prev")}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="relative min-w-0 flex-1">
                    <div
                      className={`pointer-events-none absolute inset-y-1 left-0 z-10 hidden w-6 rounded-l-lg md:block ${
                        theme === "classic-light"
                          ? "bg-gradient-to-r from-slate-50 via-slate-50/90 to-transparent"
                          : "bg-gradient-to-r from-[#121414] via-[#121414]/90 to-transparent"
                      }`}
                    />
                    <div
                      className={`pointer-events-none absolute inset-y-1 right-0 z-10 hidden w-6 rounded-r-lg md:block ${
                        theme === "classic-light"
                          ? "bg-gradient-to-l from-slate-50 via-slate-50/90 to-transparent"
                          : "bg-gradient-to-l from-[#121414] via-[#121414]/90 to-transparent"
                      }`}
                    />
                    <div
                      ref={(node) => setRailRef("finished", node)}
                      className={`flex min-w-0 max-w-full snap-x snap-mandatory flex-nowrap items-center gap-1 overflow-x-auto rounded-lg border p-1 scroll-smooth ${
                        theme === "classic-light"
                          ? "bg-white border-slate-200"
                          : "bg-white/10 border-white/15"
                      }`}
                      id="match-selector-chips-finished"
                    >
                      {finishedMatches.map((m) => (
                        <button
                          key={m.id}
                          id={`btn-match-${m.id}`}
                          onClick={() => onSelectMatch(m.id)}
                          title={t("aoVivo.selector.matchTooltip", {
                            teamA: formatCountryNameForTooltip(m.teamA.name),
                            teamB: formatCountryNameForTooltip(m.teamB.name),
                          })}
                          aria-label={t("aoVivo.selector.matchTooltip", {
                            teamA: formatCountryNameForTooltip(m.teamA.name),
                            teamB: formatCountryNameForTooltip(m.teamB.name),
                          })}
                          className={`shrink-0 snap-center px-3.5 py-2 rounded-md text-[13px] md:text-sm leading-none font-anton transition-all uppercase tracking-wide ${
                            selectedMatchId === m.id
                              ? theme === "classic-light"
                                ? "bg-white text-slate-950 shadow-sm font-semibold"
                                : "bg-[#171a1c] text-[#ffd84d] shadow-sm font-semibold"
                              : theme === "classic-light"
                                ? "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                                : "text-slate-100 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <span>{m.teamA.code}</span>
                            <span>x</span>
                            <span>{m.teamB.code}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => scrollRail("finished", "next")}
                    className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border md:inline-flex ${
                      theme === "classic-light"
                        ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        : "border-white/10 bg-[#171a1c] text-slate-100 hover:bg-white/10"
                    }`}
                    aria-label={t("aoVivo.finished.next")}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* AFFILIATE: "Equipe para assistir" — Amazon Associates gear strip, paired with Onde Assistir */}
      <AffiliateProducts theme={theme} />
    </>
  );
}

import { useMemo, useState } from "react";
import type { Match, MatchStatus, TeamRef } from "../types";
import { FlagIcon } from "./FlagIcon";

interface PartidasViewProps {
  matches: Match[];
  theme: "classic-light" | "stadium-dark";
  onSelectTeamLineup: (team: TeamRef) => void;
  onSelectMatch: (matchId: string) => void;
}

interface MatchFilterOption {
  id: MatchStatus;
  label: string;
  shortLabel: string;
}

interface MatchGroup {
  title: string;
  matches: Match[];
}

const FILTER_OPTIONS: MatchFilterOption[] = [
  { id: "PRE_GAME", label: "Agendadas", shortLabel: "Agenda" },
  { id: "LIVE", label: "Ao vivo", shortLabel: "Ao vivo" },
  { id: "FINISHED", label: "Encerradas", shortLabel: "Resultados" },
];

const STATUS_COPY: Record<
  MatchStatus,
  {
    compactLabel: string;
    accessibleLabel: string;
    stripLight: string;
    stripDark: string;
  }
> = {
  PRE_GAME: {
    compactLabel: "Agenda",
    accessibleLabel: "Agendada",
    stripLight: "bg-sky-500/10 text-sky-700",
    stripDark: "bg-sky-400/10 text-sky-200",
  },
  LIVE: {
    compactLabel: "Ao vivo",
    accessibleLabel: "Ao vivo",
    stripLight: "bg-[#009c3b]/10 text-[#0b7a34]",
    stripDark: "bg-[#00e476]/10 text-[#8dffc3]",
  },
  SUSPENDED: {
    compactLabel: "Paralisado",
    accessibleLabel: "Jogo paralisado",
    stripLight: "bg-amber-500/10 text-amber-700",
    stripDark: "bg-amber-400/10 text-amber-200",
  },
  FINISHED: {
    compactLabel: "FT",
    accessibleLabel: "Encerrada",
    stripLight: "bg-slate-500/10 text-slate-700",
    stripDark: "bg-white/10 text-slate-200",
  },
};

const buildTeamRef = (team: Match["teamA"] | Match["teamB"]): TeamRef => ({
  name: team.name,
  code: team.code,
  flagSvg: team.flagSvg,
  primaryColor: team.primaryColor,
  secondaryColor: team.secondaryColor,
  group: team.group,
});

function matchPoints(scoreA: number, scoreB: number): { a: number; b: number } {
  if (scoreA > scoreB) return { a: 3, b: 0 };
  if (scoreA < scoreB) return { a: 0, b: 3 };
  return { a: 1, b: 1 };
}

function ptLabel(pts: number): string {
  return pts === 1 ? "+1 pt" : pts > 0 ? `+${pts} pts` : "0 pts";
}

const sortMatchesForStatus = (status: MatchStatus, matches: Match[]) => {
  const sorted = [...matches];
  sorted.sort((left, right) => {
    const leftMs = new Date(left.kickoffTimestamp).getTime();
    const rightMs = new Date(right.kickoffTimestamp).getTime();
    return status === "FINISHED" ? rightMs - leftMs : leftMs - rightMs;
  });
  return sorted;
};

const formatGroupTitle = (dateLabel: string) => {
  const [day, month, year] = dateLabel.split(" ");
  return `${day} ${month} ${year}`;
};

const buildMatchGroups = (status: MatchStatus, matches: Match[]): MatchGroup[] => {
  const map = new Map<string, Match[]>();

  for (const match of sortMatchesForStatus(status, matches)) {
    const key = match.kickoffDate;
    const existing = map.get(key);
    if (existing) {
      existing.push(match);
    } else {
      map.set(key, [match]);
    }
  }

  return Array.from(map.entries()).map(([title, groupedMatches]) => ({
    title: formatGroupTitle(title),
    matches: groupedMatches,
  }));
};

const getMatchCenterDisplay = (match: Match) => {
  if (match.status === "PRE_GAME") {
    return {
      top: "Kickoff",
      bottom: match.kickoffTime,
    };
  }

  return {
    top: `${match.score?.teamA ?? 0} x ${match.score?.teamB ?? 0}`,
    bottom:
      match.status === "LIVE"
        ? match.matchTime || "Em jogo"
        : match.status === "SUSPENDED"
          ? "Paralisado"
          : "Final",
  };
};

export function PartidasView({ matches, theme, onSelectTeamLineup, onSelectMatch }: PartidasViewProps) {
  const [activeFilter, setActiveFilter] = useState<MatchStatus>("PRE_GAME");

  const headingClasses = theme === "classic-light" ? "text-slate-900" : "text-white";
  const mutedClasses = theme === "classic-light" ? "text-slate-600" : "text-slate-300";
  const softMutedClasses = theme === "classic-light" ? "text-slate-500" : "text-slate-400";
  const cardClasses =
    theme === "classic-light"
      ? "bg-white border-slate-200 shadow-sm"
      : "bg-[#121414] border-white/10";
  const listCardClasses =
    theme === "classic-light"
      ? "border-slate-200 bg-white hover:border-slate-300"
      : "border-white/10 bg-[#15181a] hover:border-white/20";
  const stripBaseClasses = theme === "classic-light" ? "border-slate-200" : "border-white/10";

  // Suspended matches are in-progress (just stopped), so they live under the
  // "Ao vivo" tab alongside LIVE.
  const isInFilterBucket = (match: Match, filter: MatchStatus) =>
    match.status === filter || (filter === "LIVE" && match.status === "SUSPENDED");

  const counts = useMemo(
    () => ({
      PRE_GAME: matches.filter((match) => isInFilterBucket(match, "PRE_GAME")).length,
      LIVE: matches.filter((match) => isInFilterBucket(match, "LIVE")).length,
      FINISHED: matches.filter((match) => isInFilterBucket(match, "FINISHED")).length,
    }),
    [matches],
  );

  const activeMatches = useMemo(
    () => matches.filter((match) => isInFilterBucket(match, activeFilter)),
    [activeFilter, matches],
  );

  const groupedMatches = useMemo(
    () => buildMatchGroups(activeFilter, activeMatches),
    [activeFilter, activeMatches],
  );

  return (
    <div className="mx-auto mt-8 max-w-5xl px-4" id="partidas-view">
      <div className={`rounded-3xl border p-5 md:p-6 ${cardClasses}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2
              className={`font-anton text-2xl md:text-3xl uppercase tracking-wider ${headingClasses}`}
              id="partidas-view-title"
            >
              Partidas
            </h2>
            <p className={`mt-1 font-archivo text-sm ${mutedClasses}`}>
              Lista compacta inspirada no placar da BBC para navegar a agenda sem poluição visual.
            </p>
          </div>

          <div className="flex flex-wrap gap-2" id="partidas-filter-tabs">
            {FILTER_OPTIONS.map((option) => {
              const isActive = activeFilter === option.id;
              const count = counts[option.id];

              return (
                <button
                  key={option.id}
                  type="button"
                  id={`btn-partidas-filter-${option.id.toLowerCase()}`}
                  onClick={() => setActiveFilter(option.id)}
                  aria-pressed={isActive}
                  className={`rounded-full border px-3 py-2 text-left transition ${
                    isActive
                      ? theme === "classic-light"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-[#ffd84d] bg-[#ffd84d] text-slate-950"
                      : theme === "classic-light"
                        ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20"
                  }`}
                >
                  <span className="block font-anton text-sm uppercase tracking-wide">{option.label}</span>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.2em] opacity-80">
                    {count} jogo{count === 1 ? "" : "s"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 space-y-6" id="partidas-groups">
          {groupedMatches.length === 0 ? (
            <div
              className={`rounded-2xl border border-dashed px-4 py-10 text-center ${
                theme === "classic-light" ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/5"
              }`}
            >
              <p className={`font-archivo text-sm ${mutedClasses}`}>
                Nenhuma partida nesta faixa no momento.
              </p>
            </div>
          ) : (
            groupedMatches.map((group) => (
              <section
                key={`${activeFilter}-${group.title}`}
                id={`partidas-group-${activeFilter.toLowerCase()}-${group.title.replace(/\s+/g, "-").toLowerCase()}`}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className={`font-anton text-lg uppercase tracking-wide ${headingClasses}`}>
                    {group.title}
                  </h3>
                  <span className={`font-mono text-[10px] uppercase tracking-[0.22em] ${softMutedClasses}`}>
                    {FILTER_OPTIONS.find((option) => option.id === activeFilter)?.shortLabel}
                  </span>
                </div>

                <div className="space-y-3" id={`partidas-list-${activeFilter.toLowerCase()}`}>
                  {group.matches.map((match) => {
                    const stripClasses =
                      theme === "classic-light"
                        ? STATUS_COPY[match.status].stripLight
                        : STATUS_COPY[match.status].stripDark;
                    const centerDisplay = getMatchCenterDisplay(match);

                    return (
                      <article
                        key={match.id}
                        id={`partidas-card-${match.id}`}
                        onClick={match.status === "FINISHED" ? () => onSelectMatch(match.id) : undefined}
                        className={`overflow-hidden rounded-2xl border transition ${listCardClasses} ${match.status === "FINISHED" ? "cursor-pointer" : ""}`}
                      >
                        <div
                          className={`flex items-center justify-between gap-3 border-b px-4 py-2 ${stripBaseClasses} ${stripClasses}`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                match.status === "LIVE"
                                  ? theme === "classic-light"
                                    ? "bg-[#009c3b]"
                                    : "bg-[#00e476]"
                                  : match.status === "SUSPENDED"
                                    ? theme === "classic-light"
                                      ? "bg-amber-500"
                                      : "bg-amber-300"
                                    : match.status === "PRE_GAME"
                                      ? theme === "classic-light"
                                        ? "bg-sky-600"
                                        : "bg-sky-300"
                                      : theme === "classic-light"
                                        ? "bg-slate-500"
                                        : "bg-slate-300"
                              }`}
                              id={match.status === "LIVE" ? "partidas-live-indicator" : undefined}
                            />
                            <span className="font-mono text-[10px] uppercase tracking-[0.24em]">
                              {STATUS_COPY[match.status].compactLabel}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] uppercase tracking-[0.24em]">
                            {match.kickoffTime}
                          </span>
                        </div>

                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4">
                          <button
                            type="button"
                            id={`btn-partidas-team-${match.id}-${match.teamA.code.toLowerCase()}`}
                            onClick={(e) => { if (match.status === "FINISHED") e.stopPropagation(); onSelectTeamLineup(buildTeamRef(match.teamA)); }}
                            className="flex min-w-0 items-center gap-3 text-left"
                          >
                            <FlagIcon flag={match.teamA.flagSvg} className="h-8 w-10 shrink-0 rounded-sm object-contain" />
                            <div className="min-w-0">
                              <p className={`truncate font-archivo text-sm font-semibold ${headingClasses}`}>
                                {match.teamA.name}
                              </p>
                              <p className={`font-mono text-[10px] uppercase tracking-[0.22em] ${softMutedClasses}`}>
                                {match.teamA.code}
                              </p>
                              {match.status === "FINISHED" && match.score && (() => {
                                const pts = matchPoints(match.score.teamA, match.score.teamB).a;
                                return (
                                  <p className={`font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${
                                    pts === 3
                                      ? theme === "classic-light" ? "text-[#009c3b]" : "text-[#00e476]"
                                      : pts === 1
                                        ? theme === "classic-light" ? "text-amber-600" : "text-amber-400"
                                        : softMutedClasses
                                  }`}>
                                    {ptLabel(pts)}
                                  </p>
                                );
                              })()}
                            </div>
                          </button>

                          <div
                            className={`min-w-[78px] text-center ${match.status === "FINISHED" ? "group/score" : ""}`}
                            id={`partidas-center-${match.id}`}
                            aria-label={`${STATUS_COPY[match.status].accessibleLabel}: ${centerDisplay.top}`}
                          >
                            <p
                              className={`uppercase ${
                                match.status === "PRE_GAME"
                                  ? `font-mono text-[9px] tracking-[0.28em] ${softMutedClasses}`
                                  : `font-anton text-xl tracking-wider transition-all duration-200 ${headingClasses} ${
                                      match.status === "FINISHED"
                                        ? theme === "classic-light"
                                          ? "group-hover/score:scale-110 group-hover/score:text-[#009c3b] group-hover/score:drop-shadow-[0_0_8px_rgba(0,156,59,0.4)]"
                                          : "group-hover/score:scale-110 group-hover/score:text-[#00e476] group-hover/score:drop-shadow-[0_0_8px_rgba(0,228,118,0.45)]"
                                        : ""
                                    }`
                              }`}
                            >
                              {centerDisplay.top}
                            </p>
                            <p
                              className={`uppercase ${
                                match.status === "PRE_GAME"
                                  ? `mt-1 font-anton text-2xl tracking-wider ${headingClasses}`
                                  : `font-mono text-[10px] tracking-[0.22em] ${softMutedClasses}`
                              }`}
                            >
                              {centerDisplay.bottom}
                            </p>
                          </div>

                          <button
                            type="button"
                            id={`btn-partidas-team-${match.id}-${match.teamB.code.toLowerCase()}`}
                            onClick={(e) => { if (match.status === "FINISHED") e.stopPropagation(); onSelectTeamLineup(buildTeamRef(match.teamB)); }}
                            className="flex min-w-0 items-center justify-end gap-3 text-right"
                          >
                            <div className="min-w-0">
                              <p className={`truncate font-archivo text-sm font-semibold ${headingClasses}`}>
                                {match.teamB.name}
                              </p>
                              <p className={`font-mono text-[10px] uppercase tracking-[0.22em] ${softMutedClasses}`}>
                                {match.teamB.code}
                              </p>
                              {match.status === "FINISHED" && match.score && (() => {
                                const pts = matchPoints(match.score.teamA, match.score.teamB).b;
                                return (
                                  <p className={`font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${
                                    pts === 3
                                      ? theme === "classic-light" ? "text-[#009c3b]" : "text-[#00e476]"
                                      : pts === 1
                                        ? theme === "classic-light" ? "text-amber-600" : "text-amber-400"
                                        : softMutedClasses
                                  }`}>
                                    {ptLabel(pts)}
                                  </p>
                                );
                              })()}
                            </div>
                            <FlagIcon flag={match.teamB.flagSvg} className="h-8 w-10 shrink-0 rounded-sm object-contain" />
                          </button>
                        </div>

                        <div
                          className={`flex flex-wrap items-center gap-x-3 gap-y-2 border-t px-4 py-3 ${
                            theme === "classic-light" ? "border-slate-100 bg-slate-50" : "border-white/5 bg-white/5"
                          }`}
                        >
                          <span className={`font-mono text-[10px] uppercase tracking-[0.22em] ${softMutedClasses}`}>
                            {match.teamA.group}
                          </span>
                          <span className={`font-archivo text-sm ${mutedClasses}`}>
                            {match.stadiumName} • {match.city}
                          </span>
                          {match.officialMatchUrl ? (
                            <a
                              id={`link-partidas-official-${match.id}`}
                              href={match.officialMatchUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`ml-auto rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] transition ${
                                theme === "classic-light"
                                  ? "border-slate-200 text-slate-700 hover:border-slate-300"
                                  : "border-white/10 text-slate-200 hover:border-white/20"
                              }`}
                            >
                              FIFA
                            </a>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

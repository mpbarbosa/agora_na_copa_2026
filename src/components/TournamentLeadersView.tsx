import { useEffect, useState, type ReactNode } from "react";
import { apiUrl, useLocale, useT } from "../i18n";
import { FlagIcon } from "./FlagIcon";
import { PlayerOverlayCard } from "./PlayerOverlayCard";
import { buildPlayerDetailRows } from "../utils/playerDisplay";
import type {
  TeamRef,
  TournamentLeadersResponse,
  TournamentPlayerLeader,
  TournamentTeamLeader,
} from "../types";
import { resolveTeamRefByCode } from "../utils/teamRef";

interface TournamentLeadersViewProps {
  theme: "classic-light" | "stadium-dark";
  onSelectTeamLineup: (team: TeamRef) => void;
}

type LoadStatus = "loading" | "ready" | "error";

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

const formatUpdatedAt = (value: string, t: TranslateFn, intlTag: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t("lideres.updateUnavailable");
  }

  return t("lideres.updatedAt", {
    time: date.toLocaleTimeString(intlTag, {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  });
};

const getPlayerFallbackLabel = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2);

interface LeaderCardProps {
  theme: TournamentLeadersViewProps["theme"];
  title: string;
  subtitle: string;
  children: ReactNode;
}

function LeaderCard({ theme, title, subtitle, children }: LeaderCardProps) {
  const cardClasses =
    theme === "classic-light"
      ? "bg-white border-slate-200 shadow-sm"
      : "bg-[#121414] border-white/10";
  const headingClasses = theme === "classic-light" ? "text-slate-900" : "text-white";
  const mutedClasses = theme === "classic-light" ? "text-slate-600" : "text-slate-300";

  return (
    <section className={`rounded-3xl border p-5 ${cardClasses}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={`font-anton text-xl uppercase tracking-wide ${headingClasses}`}>
            {title}
          </h3>
          <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
            {subtitle}
          </p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

interface EmptyStateProps {
  theme: TournamentLeadersViewProps["theme"];
  text: string;
}

function EmptyState({ theme, text }: EmptyStateProps) {
  return (
    <p
      className={`rounded-2xl border px-4 py-4 font-archivo text-sm leading-6 ${
        theme === "classic-light"
          ? "border-slate-100 bg-slate-50 text-slate-600"
          : "border-white/5 bg-white/5 text-slate-300"
      }`}
    >
      {text}
    </p>
  );
}

interface PlayerLeaderListProps {
  theme: TournamentLeadersViewProps["theme"];
  entries: TournamentPlayerLeader[];
  valueFor: (entry: TournamentPlayerLeader) => string;
  onSelectPlayer: (entry: TournamentPlayerLeader) => void;
  onOpenTeamView: (entry: TournamentPlayerLeader) => void;
}

function PlayerLeaderList({
  theme,
  entries,
  valueFor,
  onSelectPlayer,
  onOpenTeamView,
}: PlayerLeaderListProps) {
  const t = useT();
  if (entries.length === 0) {
    return <EmptyState theme={theme} text={t("lideres.playerEmpty")} />;
  }

  const rowClasses =
    theme === "classic-light"
      ? "border-slate-100 bg-slate-50"
      : "border-white/5 bg-white/5";
  const headingClasses = theme === "classic-light" ? "text-slate-900" : "text-white";
  const mutedClasses = theme === "classic-light" ? "text-slate-600" : "text-slate-300";
  const badgeClasses =
    theme === "classic-light"
      ? "border-slate-200 bg-white text-slate-700"
      : "border-white/10 bg-[#161919] text-slate-100";

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <div
          key={entry.id}
          className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${rowClasses}`}
        >
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-black ${
              index === 0 ? "bg-[#ffd84d] text-slate-950" : "bg-white/10 text-white"
            }`}
          >
            {index + 1}
          </div>

          {entry.pictureUrl ? (
            <img
              src={entry.pictureUrl}
              alt={t("lideres.photoAlt", { name: entry.name })}
              className="h-12 w-12 shrink-0 rounded-2xl border border-white/10 bg-black/20 object-contain p-1"
              loading="lazy"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 font-mono text-xs font-black text-white">
              {getPlayerFallbackLabel(entry.name)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                id={`btn-open-player-team-view-${entry.id}`}
                onClick={() => onOpenTeamView(entry)}
                className="shrink-0 rounded transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#ffd84d]/70"
                aria-label={t("lideres.openTeamPanel", { team: entry.teamName })}
              >
                <FlagIcon flag={entry.teamFlagSvg} className="h-4 w-6 shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => onSelectPlayer(entry)}
                id={`btn-leader-player-${entry.id}`}
                className={`truncate font-anton text-left text-sm uppercase tracking-wide transition hover:opacity-80 ${
                  theme === "classic-light"
                    ? "text-slate-900 hover:text-[#065f2c]"
                    : "text-white hover:text-[#ffd84d]"
                }`}
              >
                {entry.name}
              </button>
            </div>
            <p className={`mt-1 truncate font-archivo text-sm ${mutedClasses}`}>
              <button
                type="button"
                id={`btn-open-player-team-name-${entry.id}`}
                onClick={() => onOpenTeamView(entry)}
                className={`truncate transition hover:opacity-80 ${
                  theme === "classic-light"
                    ? "hover:text-[#065f2c]"
                    : "hover:text-[#ffd84d]"
                }`}
              >
                {entry.teamName}
              </button>
              {typeof entry.shirtNumber === "number" ? ` • ${t("lideres.shirt", { number: entry.shirtNumber })}` : ""}
            </p>
          </div>

          <div className={`shrink-0 rounded-full border px-3 py-1 font-mono text-xs font-black ${badgeClasses}`}>
            {valueFor(entry)}
          </div>
        </div>
      ))}
    </div>
  );
}

interface TeamLeaderListProps {
  theme: TournamentLeadersViewProps["theme"];
  entries: TournamentTeamLeader[];
  valueFor: (entry: TournamentTeamLeader) => string;
  detailFor: (entry: TournamentTeamLeader) => string;
  onOpenTeamView: (entry: TournamentTeamLeader) => void;
}

function TeamLeaderList({
  theme,
  entries,
  valueFor,
  detailFor,
  onOpenTeamView,
}: TeamLeaderListProps) {
  const t = useT();
  if (entries.length === 0) {
    return <EmptyState theme={theme} text={t("lideres.teamEmpty")} />;
  }

  const rowClasses =
    theme === "classic-light"
      ? "border-slate-100 bg-slate-50"
      : "border-white/5 bg-white/5";
  const headingClasses = theme === "classic-light" ? "text-slate-900" : "text-white";
  const mutedClasses = theme === "classic-light" ? "text-slate-600" : "text-slate-300";
  const badgeClasses =
    theme === "classic-light"
      ? "border-slate-200 bg-white text-slate-700"
      : "border-white/10 bg-[#161919] text-slate-100";

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <div
          key={entry.id}
          className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${rowClasses}`}
        >
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-black ${
              index === 0 ? "bg-[#ffd84d] text-slate-950" : "bg-white/10 text-white"
            }`}
          >
            {index + 1}
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              id={`btn-open-team-view-${entry.id}`}
              onClick={() => onOpenTeamView(entry)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white p-2 transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#ffd84d]/70"
              aria-label={t("lideres.openTeamPanel", { team: entry.teamName })}
            >
              <FlagIcon flag={entry.teamFlagSvg} className="h-full w-full object-contain" />
            </button>
            <div className="min-w-0">
              <button
                type="button"
                id={`btn-leader-team-${entry.id}`}
                onClick={() => onOpenTeamView(entry)}
                className={`truncate font-anton text-left text-sm uppercase tracking-wide transition hover:opacity-80 ${
                  theme === "classic-light"
                    ? "text-slate-900 hover:text-[#065f2c]"
                    : "text-white hover:text-[#ffd84d]"
                }`}
              >
                {entry.teamName}
              </button>
              <p className={`mt-1 truncate font-archivo text-sm ${mutedClasses}`}>
                {detailFor(entry)}
              </p>
            </div>
          </div>

          <div className={`shrink-0 rounded-full border px-3 py-1 font-mono text-xs font-black ${badgeClasses}`}>
            {valueFor(entry)}
          </div>
        </div>
      ))}
    </div>
  );
}

const toLeaderTeamRef = (
  entry: Pick<TournamentTeamLeader, "teamCode" | "teamName" | "teamFlagSvg">,
) =>
  resolveTeamRefByCode(entry.teamCode, {
    name: entry.teamName,
    code: entry.teamCode,
    flagSvg: entry.teamFlagSvg,
  });

export function TournamentLeadersView({ theme, onSelectTeamLineup }: TournamentLeadersViewProps) {
  const t = useT();
  const { intlTag } = useLocale();
  const [leaders, setLeaders] = useState<TournamentLeadersResponse | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [selectedPlayer, setSelectedPlayer] = useState<TournamentPlayerLeader | null>(null);
  useEffect(() => {
    let active = true;

    const loadLeaders = async () => {
      try {
        const response = await fetch(apiUrl("/api/tournament-leaders"));
        if (!response.ok) {
          throw new Error(t("lideres.loadError"));
        }

        const data: TournamentLeadersResponse = await response.json();
        if (!active) return;

        setLeaders(data);
        setStatus("ready");
      } catch (error) {
        console.error(error);
        if (!active) return;
        setStatus("error");
      }
    };

    void loadLeaders();

    return () => {
      active = false;
    };
  }, []);

  const headingClasses = theme === "classic-light" ? "text-slate-900" : "text-white";
  const mutedClasses = theme === "classic-light" ? "text-slate-600" : "text-slate-300";
  const badgeClasses =
    theme === "classic-light"
      ? "border-slate-200 bg-slate-50 text-slate-600"
      : "border-white/10 bg-white/5 text-slate-200";

  return (
    <div className="mx-auto mt-8 max-w-7xl px-4 2xl:max-w-[1600px]" id="tournament-leaders-view">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className={`font-anton text-2xl md:text-3xl uppercase tracking-wider ${headingClasses}`}>
            {t("lideres.title")}
          </h2>
          <p className={`mt-1 font-mono text-[11px] uppercase tracking-wider ${mutedClasses}`}>
            {t("lideres.subtitle")}
          </p>
        </div>

        <div className={`inline-flex rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${badgeClasses}`}>
          {leaders ? formatUpdatedAt(leaders.updatedAt, t, intlTag) : t("lideres.updatePending")}
        </div>
      </div>

      {status === "loading" ? (
        <p className={`mt-6 font-archivo text-sm leading-6 ${mutedClasses}`}>
          {t("lideres.loading")}
        </p>
      ) : status === "error" || !leaders ? (
        <p className={`mt-6 font-archivo text-sm leading-6 ${mutedClasses}`}>
          {t("lideres.error")}
        </p>
      ) : (
        <>
          <div className={`mt-6 rounded-2xl border px-4 py-3 font-archivo text-sm leading-6 ${
            theme === "classic-light"
              ? "border-slate-200 bg-white text-slate-700"
              : "border-white/10 bg-[#121414] text-slate-100"
          }`}>
            {leaders.note}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <LeaderCard theme={theme} title={t("lideres.topScorersTitle")} subtitle={t("lideres.topScorersSubtitle")}>
              <PlayerLeaderList
                theme={theme}
                entries={leaders.playerLeaders.topScorers}
                valueFor={(entry) => t(entry.goals === 1 ? "lideres.goalsOne" : "lideres.goalsMany", { count: entry.goals })}

                onSelectPlayer={setSelectedPlayer}
                onOpenTeamView={(entry) => onSelectTeamLineup(toLeaderTeamRef(entry))}
              />
            </LeaderCard>

            <LeaderCard theme={theme} title={t("lideres.yellowCardsTitle")} subtitle={t("lideres.yellowCardsSubtitle")}>
              <PlayerLeaderList
                theme={theme}
                entries={leaders.playerLeaders.yellowCards}
                valueFor={(entry) => t(entry.yellowCards === 1 ? "lideres.yellowsOne" : "lideres.yellowsMany", { count: entry.yellowCards })}

                onSelectPlayer={setSelectedPlayer}
                onOpenTeamView={(entry) => onSelectTeamLineup(toLeaderTeamRef(entry))}
              />
            </LeaderCard>

            <LeaderCard theme={theme} title={t("lideres.redCardsTitle")} subtitle={t("lideres.redCardsSubtitle")}>
              <PlayerLeaderList
                theme={theme}
                entries={leaders.playerLeaders.redCards}
                valueFor={(entry) => t(entry.redCards === 1 ? "lideres.redsOne" : "lideres.redsMany", { count: entry.redCards })}

                onSelectPlayer={setSelectedPlayer}
                onOpenTeamView={(entry) => onSelectTeamLineup(toLeaderTeamRef(entry))}
              />
            </LeaderCard>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <LeaderCard theme={theme} title={t("lideres.bestAttackTitle")} subtitle={t("lideres.bestAttackSubtitle")}>
              <TeamLeaderList
                theme={theme}
                entries={leaders.teamLeaders.bestAttack}
                valueFor={(entry) => t(entry.goalsFor === 1 ? "lideres.goalsOne" : "lideres.goalsMany", { count: entry.goalsFor })}
                detailFor={(entry) =>
                  t("lideres.attackDetail", {
                    matches: t(entry.matchesPlayed === 1 ? "lideres.matchesOne" : "lideres.matchesMany", { count: entry.matchesPlayed }),
                    wins: t(entry.wins === 1 ? "lideres.winsOne" : "lideres.winsMany", { count: entry.wins }),
                  })
                }
                onOpenTeamView={(entry) => onSelectTeamLineup(toLeaderTeamRef(entry))}
              />
            </LeaderCard>

            <LeaderCard theme={theme} title={t("lideres.bestDefenseTitle")} subtitle={t("lideres.bestDefenseSubtitle")}>
              <TeamLeaderList
                theme={theme}
                entries={leaders.teamLeaders.bestDefense}
                valueFor={(entry) => t(entry.goalsAgainst === 1 ? "lideres.concededOne" : "lideres.concededMany", { count: entry.goalsAgainst })}
                detailFor={(entry) =>
                  t("lideres.defenseDetail", {
                    cleanSheets: t(entry.cleanSheets === 1 ? "lideres.cleanSheetOne" : "lideres.cleanSheetMany", { count: entry.cleanSheets }),
                    matches: t(entry.matchesPlayed === 1 ? "lideres.matchesOne" : "lideres.matchesMany", { count: entry.matchesPlayed }),
                  })
                }
                onOpenTeamView={(entry) => onSelectTeamLineup(toLeaderTeamRef(entry))}
              />
            </LeaderCard>

            <LeaderCard theme={theme} title={t("lideres.cleanSheetsTitle")} subtitle={t("lideres.cleanSheetsSubtitle")}>
              <TeamLeaderList
                theme={theme}
                entries={leaders.teamLeaders.cleanSheets}
                valueFor={(entry) => t(entry.cleanSheets === 1 ? "lideres.cleanSheetOne" : "lideres.cleanSheetMany", { count: entry.cleanSheets })}
                detailFor={(entry) =>
                  t("lideres.cleanSheetsDetail", {
                    goalsAgainst: t(entry.goalsAgainst === 1 ? "lideres.goalsOne" : "lideres.goalsMany", { count: entry.goalsAgainst }),
                    plural: entry.goalsAgainst === 1 ? "" : "s",
                    matches: t(entry.matchesPlayed === 1 ? "lideres.matchesOne" : "lideres.matchesMany", { count: entry.matchesPlayed }),
                  })
                }
                onOpenTeamView={(entry) => onSelectTeamLineup(toLeaderTeamRef(entry))}
              />
            </LeaderCard>
          </div>
        </>
      )}

      {selectedPlayer && (
        <PlayerOverlayCard
          id="leaders-player-overlay"
          theme={theme}
          player={{
            name: selectedPlayer.name,
            number: selectedPlayer.shirtNumber,
            position: selectedPlayer.position,
            club: selectedPlayer.club,
            socials: selectedPlayer.socials,
            pictureUrl: selectedPlayer.pictureUrl,
            instagramPostUrl: selectedPlayer.instagramPostUrl,
            instagramPostUrls: selectedPlayer.instagramPostUrls,
          }}
          teamName={selectedPlayer.teamName}
          primaryColor={selectedPlayer.teamPrimaryColor}
          secondaryColor={selectedPlayer.teamSecondaryColor}
          flagSvg={selectedPlayer.teamFlagSvg}
          onOpenTeamView={() => {
            onSelectTeamLineup(toLeaderTeamRef(selectedPlayer));
            setSelectedPlayer(null);
          }}
          stats={[
            {
              label: t("lideres.statGoals"),
              value: selectedPlayer.goals,
              accent: theme === "classic-light" ? "text-[#065f2c]" : "text-[#00e476]",
            },
            {
              label: t("lideres.statYellows"),
              value: selectedPlayer.yellowCards,
              accent: theme === "classic-light" ? "text-[#9a6700]" : "text-[#ffd84d]",
            },
            {
              label: t("lideres.statReds"),
              value: selectedPlayer.redCards,
              accent: theme === "classic-light" ? "text-[#9f1239]" : "text-[#ff879d]",
            },
          ]}
          details={[
            ...buildPlayerDetailRows(selectedPlayer, t),
            {
              value: t("lideres.officialHighlight", { team: selectedPlayer.teamName }),
              fullWidth: true,
            },
          ]}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}

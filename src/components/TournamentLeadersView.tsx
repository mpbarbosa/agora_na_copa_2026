import { useEffect, useState, type ReactNode } from "react";
import { FlagIcon } from "./FlagIcon";
import type {
  TournamentLeadersResponse,
  TournamentPlayerLeader,
  TournamentTeamLeader,
} from "../types";

interface TournamentLeadersViewProps {
  theme: "classic-light" | "stadium-dark";
}

type LoadStatus = "loading" | "ready" | "error";

const formatUpdatedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Atualização indisponível";
  }

  return `Atualizado ${date.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
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
}

function PlayerLeaderList({ theme, entries, valueFor }: PlayerLeaderListProps) {
  if (entries.length === 0) {
    return <EmptyState theme={theme} text="A FIFA ainda não registrou ocorrências suficientes para este ranking." />;
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
              alt={`Foto de ${entry.name}`}
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
              <FlagIcon flag={entry.teamFlagSvg} className="h-4 w-6 shrink-0" />
              <p className={`truncate font-anton text-sm uppercase tracking-wide ${headingClasses}`}>
                {entry.name}
              </p>
            </div>
            <p className={`mt-1 truncate font-archivo text-sm ${mutedClasses}`}>
              {entry.teamName}
              {typeof entry.shirtNumber === "number" ? ` • Camisa ${entry.shirtNumber}` : ""}
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
}

function TeamLeaderList({ theme, entries, valueFor, detailFor }: TeamLeaderListProps) {
  if (entries.length === 0) {
    return <EmptyState theme={theme} text="Ainda não há partidas suficientes para montar este ranking coletivo." />;
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
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white p-2">
              <FlagIcon flag={entry.teamFlagSvg} className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className={`truncate font-anton text-sm uppercase tracking-wide ${headingClasses}`}>
                {entry.teamName}
              </p>
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

export function TournamentLeadersView({ theme }: TournamentLeadersViewProps) {
  const [leaders, setLeaders] = useState<TournamentLeadersResponse | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");

  useEffect(() => {
    let active = true;

    const loadLeaders = async () => {
      try {
        const response = await fetch("/api/tournament-leaders");
        if (!response.ok) {
          throw new Error("Falha ao carregar os líderes da Copa.");
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
            Líderes do Torneio
          </h2>
          <p className={`mt-1 font-mono text-[11px] uppercase tracking-wider ${mutedClasses}`}>
            Artilharia, disciplina e destaques coletivos da Copa
          </p>
        </div>

        <div className={`inline-flex rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${badgeClasses}`}>
          {leaders ? formatUpdatedAt(leaders.updatedAt) : "Atualização pendente"}
        </div>
      </div>

      {status === "loading" ? (
        <p className={`mt-6 font-archivo text-sm leading-6 ${mutedClasses}`}>
          Carregando o radar de líderes oficiais da competição...
        </p>
      ) : status === "error" || !leaders ? (
        <p className={`mt-6 font-archivo text-sm leading-6 ${mutedClasses}`}>
          Não foi possível carregar os líderes do torneio agora.
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
            <LeaderCard theme={theme} title="Artilharia" subtitle="Quem mais balançou as redes">
              <PlayerLeaderList
                theme={theme}
                entries={leaders.playerLeaders.topScorers}
                valueFor={(entry) => `${entry.goals} gol${entry.goals === 1 ? "" : "s"}`}
              />
            </LeaderCard>

            <LeaderCard theme={theme} title="Cartões Amarelos" subtitle="Mais advertidos do torneio">
              <PlayerLeaderList
                theme={theme}
                entries={leaders.playerLeaders.yellowCards}
                valueFor={(entry) => `${entry.yellowCards} amarelo${entry.yellowCards === 1 ? "" : "s"}`}
              />
            </LeaderCard>

            <LeaderCard theme={theme} title="Cartões Vermelhos" subtitle="Expulsões registradas">
              <PlayerLeaderList
                theme={theme}
                entries={leaders.playerLeaders.redCards}
                valueFor={(entry) => `${entry.redCards} vermelho${entry.redCards === 1 ? "" : "s"}`}
              />
            </LeaderCard>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <LeaderCard theme={theme} title="Melhores Ataques" subtitle="Mais gols marcados">
              <TeamLeaderList
                theme={theme}
                entries={leaders.teamLeaders.bestAttack}
                valueFor={(entry) => `${entry.goalsFor} gol${entry.goalsFor === 1 ? "" : "s"}`}
                detailFor={(entry) => `${entry.matchesPlayed} jogo${entry.matchesPlayed === 1 ? "" : "s"} • ${entry.wins} vitória${entry.wins === 1 ? "" : "s"}`}
              />
            </LeaderCard>

            <LeaderCard theme={theme} title="Melhores Defesas" subtitle="Menos gols sofridos">
              <TeamLeaderList
                theme={theme}
                entries={leaders.teamLeaders.bestDefense}
                valueFor={(entry) => `${entry.goalsAgainst} sofrido${entry.goalsAgainst === 1 ? "" : "s"}`}
                detailFor={(entry) => `${entry.cleanSheets} clean sheet${entry.cleanSheets === 1 ? "" : "s"} • ${entry.matchesPlayed} jogo${entry.matchesPlayed === 1 ? "" : "s"}`}
              />
            </LeaderCard>

            <LeaderCard theme={theme} title="Clean Sheets" subtitle="Jogos sem sofrer gols">
              <TeamLeaderList
                theme={theme}
                entries={leaders.teamLeaders.cleanSheets}
                valueFor={(entry) => `${entry.cleanSheets} clean sheet${entry.cleanSheets === 1 ? "" : "s"}`}
                detailFor={(entry) => `${entry.goalsAgainst} gol${entry.goalsAgainst === 1 ? "" : "s"} sofrido${entry.goalsAgainst === 1 ? "" : "s"} • ${entry.matchesPlayed} jogo${entry.matchesPlayed === 1 ? "" : "s"}`}
              />
            </LeaderCard>
          </div>
        </>
      )}
    </div>
  );
}

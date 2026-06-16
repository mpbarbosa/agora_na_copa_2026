import React, { useEffect, useState } from "react";
import type {
  Broadcaster,
  CountryInfoResponse,
  TeamRef,
  TeamViewMatchSummary,
  TeamViewResponse,
  TournamentPlayerLeader,
} from "../types";
import { FlagIcon } from "./FlagIcon";
import { TeamPitchBoard } from "./TeamPitchBoard";
import { ArrowLeft } from "lucide-react";

interface TeamLineupViewProps {
  team: TeamRef;
  theme: "classic-light" | "stadium-dark";
  onBack: () => void;
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

const getStatusLabel = (status: TeamViewMatchSummary["status"]) => {
  if (status === "LIVE") return "AO VIVO";
  if (status === "FINISHED") return "ENCERRADO";
  return "PRÓXIMO JOGO";
};

const getMatchHeadline = (match: TeamViewMatchSummary) => {
  if (match.status === "LIVE" && match.score) {
    return `${match.team.code} ${match.score.team} x ${match.score.opponent} ${match.opponent.code}`;
  }

  if (match.status === "FINISHED" && match.score) {
    return `${match.team.code} ${match.score.team} x ${match.score.opponent} ${match.opponent.code}`;
  }

  return `${match.team.code} x ${match.opponent.code}`;
};

const formatDecimalMetric = (value: number) =>
  value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

const getPerformanceRate = (won: number, drawn: number, played: number) => {
  if (played === 0) return "0%";
  const pointsWon = won * 3 + drawn;
  const maxPoints = played * 3;
  return `${Math.round((pointsWon / maxPoints) * 100)}%`;
};

const getGoalsPerMatch = (goals: number, played: number) => {
  if (played === 0) return "0,0";
  return formatDecimalMetric(goals / played);
};

const metricIdFromLabel = (label: string) =>
  label
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function MatchSummaryCard({
  theme,
  title,
  match,
}: {
  theme: TeamLineupViewProps["theme"];
  title: string;
  match: TeamViewMatchSummary | null;
}) {
  const cardClasses =
    theme === "classic-light"
      ? "border-slate-200 bg-white shadow-sm"
      : "border-white/10 bg-[#121414]";
  const headingClasses = theme === "classic-light" ? "text-slate-900" : "text-white";
  const mutedClasses = theme === "classic-light" ? "text-slate-600" : "text-slate-300";
  const labelClasses =
    match?.status === "LIVE"
      ? "bg-[#00e476] text-[#052814]"
      : theme === "classic-light"
        ? "bg-slate-100 text-slate-700"
        : "bg-white/10 text-white";

  return (
    <div className={`rounded-2xl border p-4 ${cardClasses}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>{title}</p>
          {match ? (
            <h3 className={`mt-2 font-anton text-xl uppercase tracking-wide ${headingClasses}`}>
              {getMatchHeadline(match)}
            </h3>
          ) : (
            <h3 className={`mt-2 font-anton text-xl uppercase tracking-wide ${headingClasses}`}>
              Sem registro
            </h3>
          )}
        </div>
        {match && (
          <span className={`rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${labelClasses}`}>
            {getStatusLabel(match.status)}
          </span>
        )}
      </div>

      {match ? (
        <>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white p-2">
              <FlagIcon flag={match.opponent.flagSvg} className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className={`truncate font-anton text-lg uppercase tracking-wide ${headingClasses}`}>
                {match.opponent.name}
              </p>
              <p className={`mt-1 font-archivo text-sm ${mutedClasses}`}>
                {match.stageName} • {match.stadiumName}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className={`rounded-2xl border px-3 py-3 ${theme === "classic-light" ? "border-slate-100 bg-slate-50" : "border-white/5 bg-white/5"}`}>
              <p className="font-anton text-xl text-[#00e476]">
                {match.matchTime || match.kickoffTime}
              </p>
              <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                {match.status === "LIVE" ? "Relógio da partida" : match.kickoffDate}
              </p>
            </div>
            <div className={`rounded-2xl border px-3 py-3 ${theme === "classic-light" ? "border-slate-100 bg-slate-50" : "border-white/5 bg-white/5"}`}>
              <p className="font-anton text-xl text-[#00e476]">
                {match.city}
              </p>
              <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                Cidade-sede
              </p>
            </div>
          </div>
        </>
      ) : (
        <p className={`mt-4 font-archivo text-sm leading-6 ${mutedClasses}`}>
          Ainda não há jogo suficiente para preencher este bloco da seleção. Assim que a agenda
          ou o resultado oficial aparecer, o painel atualiza automaticamente.
        </p>
      )}
    </div>
  );
}

function LeaderStrip({
  title,
  metricLabel,
  entries,
  metricFor,
  theme,
}: {
  title: string;
  metricLabel: string;
  entries: TournamentPlayerLeader[];
  metricFor: (entry: TournamentPlayerLeader) => number;
  theme: TeamLineupViewProps["theme"];
}) {
  const headingClasses = theme === "classic-light" ? "text-slate-900" : "text-white";
  const mutedClasses = theme === "classic-light" ? "text-slate-600" : "text-slate-300";

  return (
    <div>
      <p className={`font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>{title}</p>
      {entries.length > 0 ? (
        <div className="mt-2 space-y-2">
          {entries.map((entry) => (
            <div
              key={`${title}-${entry.id}`}
              className={`flex items-center justify-between rounded-2xl border px-3 py-2 ${
                theme === "classic-light" ? "border-slate-100 bg-slate-50" : "border-white/5 bg-white/5"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                {entry.pictureUrl ? (
                  <img
                    src={entry.pictureUrl}
                    alt={`Foto de ${entry.name}`}
                    className="h-10 w-10 rounded-2xl border border-white/10 bg-black/20 object-contain p-1"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/20 font-mono text-xs font-bold text-white">
                    {entry.shirtNumber ?? "--"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className={`truncate font-anton text-sm uppercase tracking-wide ${headingClasses}`}>
                    {entry.name}
                  </p>
                  <p className={`mt-1 font-archivo text-sm ${mutedClasses}`}>
                    {typeof entry.shirtNumber === "number" ? `Camisa ${entry.shirtNumber}` : "Sem camisa confirmada"}
                  </p>
                </div>
              </div>
              <span className={`rounded-full border px-3 py-1 font-mono text-xs font-black ${theme === "classic-light" ? "border-slate-200 bg-white text-slate-700" : "border-white/10 bg-[#161919] text-slate-100"}`}>
                {metricFor(entry)} {metricLabel}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className={`mt-2 rounded-2xl border px-3 py-3 font-archivo text-sm ${theme === "classic-light" ? "border-slate-100 bg-slate-50 text-slate-600" : "border-white/5 bg-white/5 text-slate-300"}`}>
          A FIFA ainda não registrou ocorrências deste tipo para a seleção.
        </p>
      )}
    </div>
  );
}

function BroadcasterList({
  broadcasters,
  theme,
}: {
  broadcasters: Broadcaster[];
  theme: TeamLineupViewProps["theme"];
}) {
  const mutedClasses = theme === "classic-light" ? "text-slate-600" : "text-slate-300";

  if (broadcasters.length === 0) {
    return (
      <p className={`font-archivo text-sm leading-6 ${mutedClasses}`}>
        Sem emissoras publicadas no momento para a partida atual ou próxima desta seleção.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {broadcasters.map((broadcaster) => (
        <a
          key={broadcaster.id}
          href={broadcaster.link}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center justify-between rounded-2xl border px-3 py-3 transition ${
            theme === "classic-light"
              ? "border-slate-100 bg-slate-50 hover:bg-slate-100"
              : "border-white/5 bg-white/5 hover:bg-white/10"
          }`}
        >
          <div>
            <p className={theme === "classic-light" ? "font-anton text-sm uppercase tracking-wide text-slate-900" : "font-anton text-sm uppercase tracking-wide text-white"}>
              {broadcaster.name}
            </p>
            <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
              {broadcaster.type}
            </p>
          </div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#00e476]">
            Abrir
          </span>
        </a>
      ))}
    </div>
  );
}

const formatPopulation = (n: number) => {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  }
  return n.toLocaleString("pt-BR");
};

const formatArea = (n: number) =>
  `${Math.round(n).toLocaleString("pt-BR")} km²`;

function CountryInfoCard({
  theme,
  info,
}: {
  theme: TeamLineupViewProps["theme"];
  info: CountryInfoResponse;
}) {
  const mutedClasses = theme === "classic-light" ? "text-slate-600" : "text-slate-300";
  const headingClasses = theme === "classic-light" ? "text-slate-900" : "text-white";
  const pillClasses =
    theme === "classic-light"
      ? "border-slate-100 bg-slate-50"
      : "border-white/5 bg-white/5";
  const divider = theme === "classic-light" ? "border-slate-100" : "border-white/10";

  const truncatedExtract =
    info.extract.length > 420 ? `${info.extract.slice(0, 420).trimEnd()}…` : info.extract;

  const facts = [
    info.capital    ? { label: "Capital",   value: info.capital }                        : null,
    info.population ? { label: "População", value: formatPopulation(info.population) }   : null,
    info.areaSqKm   ? { label: "Área",      value: formatArea(info.areaSqKm) }           : null,
    info.language   ? { label: "Idioma",    value: info.language }                       : null,
    info.government ? { label: "Governo",   value: info.government }                     : null,
    info.currency   ? { label: "Moeda",     value: info.currency }                       : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <section
      className={`rounded-3xl border p-5 ${theme === "classic-light" ? "bg-white border-slate-200 shadow-sm" : "bg-[#121414] border-white/10"}`}
      id="team-view-country-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={`font-anton text-xl uppercase tracking-wide ${headingClasses}`}>
            Sobre o País
          </h3>
          <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
            {info.description}
          </p>
        </div>
        {info.thumbnailUrl && (
          <img
            src={info.thumbnailUrl}
            alt={`Imagem de ${info.code}`}
            className={`h-16 w-16 shrink-0 rounded-2xl border object-cover ${divider}`}
            loading="lazy"
          />
        )}
      </div>

      {facts.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {facts.map((f) => (
            <div key={f.label} className={`rounded-2xl border px-3 py-3 ${pillClasses}`}>
              <p className="font-anton text-base text-[#00e476]">{f.value}</p>
              <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                {f.label}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className={`mt-4 font-archivo text-sm leading-6 ${mutedClasses}`}>
        {truncatedExtract}
      </p>

      <a
        href={info.wikipediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-4 inline-flex rounded-full border px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
          theme === "classic-light"
            ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
            : "border-white/10 bg-white/10 text-white hover:bg-white/15"
        }`}
      >
        Ler mais na Wikipédia
      </a>
    </section>
  );
}

export const TeamLineupView: React.FC<TeamLineupViewProps> = ({ team, theme, onBack }) => {
  const [teamView, setTeamView] = useState<TeamViewResponse | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [countryInfo, setCountryInfo] = useState<CountryInfoResponse | null>(null);

  useEffect(() => {
    let active = true;

    const loadTeamView = async () => {
      if (!active) {
        return;
      }

      try {
        const response = await fetch(`/api/team-view/${encodeURIComponent(team.code)}`);
        if (!response.ok) {
          throw new Error("Falha ao carregar o painel completo da seleção.");
        }

        const data: TeamViewResponse = await response.json();
        if (!active) return;

        setTeamView(data);
        setStatus("ready");
      } catch (error) {
        console.error(error);
        if (!active) return;

        setStatus("error");
      }
    };

    setStatus("loading");
    setTeamView(null);
    void loadTeamView();

    return () => {
      active = false;
    };
  }, [team.code]);

  useEffect(() => {
    let active = true;
    setCountryInfo(null);

    fetch(`/api/country-info/${encodeURIComponent(team.code)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: CountryInfoResponse) => { if (active) setCountryInfo(data); })
      .catch(() => {/* silently skip — country card is decorative */});

    return () => { active = false; };
  }, [team.code]);

  const cardClasses =
    theme === "classic-light"
      ? "bg-white border-slate-200 shadow-sm"
      : "bg-[#121414] border-white/10";
  const headingClasses = theme === "classic-light" ? "text-slate-900" : "text-white";
  const mutedClasses = theme === "classic-light" ? "text-slate-600" : "text-slate-300";
  const backButtonClasses =
    theme === "classic-light"
      ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
      : "bg-white/10 text-white hover:bg-white/15";

  const featuredMatch = teamView?.currentMatch ?? teamView?.nextMatch ?? null;
  const standingsRow = teamView?.standings?.row;
  const performanceMetrics = standingsRow
    ? [
        {
          label: "Aproveitamento",
          value: getPerformanceRate(standingsRow.won, standingsRow.drawn, standingsRow.played),
        },
        {
          label: "Média gols pró",
          value: getGoalsPerMatch(standingsRow.goalsFor, standingsRow.played),
        },
        {
          label: "Média gols contra",
          value: getGoalsPerMatch(standingsRow.goalsAgainst, standingsRow.played),
        },
      ]
    : [];

  return (
    <div className="mx-auto mt-8 max-w-7xl px-4 2xl:max-w-[1600px]" id="team-lineup-view">
      <button
        id="btn-team-lineup-back"
        onClick={onBack}
        className={`mb-6 flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest transition ${backButtonClasses}`}
      >
        <ArrowLeft size={14} />
        Voltar
      </button>

      <section className={`rounded-3xl border p-5 md:p-6 ${cardClasses}`} id="team-lineup-header">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-24 items-center justify-center rounded-2xl border border-white/10 bg-white p-3 shadow-sm">
              <FlagIcon flag={team.flagSvg} className="h-full w-full object-contain" />
            </div>
            <div>
              <h2 className={`font-anton text-2xl md:text-4xl uppercase tracking-wider ${headingClasses}`} id="team-lineup-title">
                {teamView?.team.name ?? team.name}
              </h2>
              <p className={`mt-1 font-mono text-[11px] uppercase tracking-wider ${mutedClasses}`}>
                {team.code} {team.group ? `• Grupo ${team.group.replace("Grupo ", "")}` : ""}
              </p>
              {teamView && (
                <p className={`mt-2 font-archivo text-sm ${mutedClasses}`}>
                  {teamView.note}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:min-w-[320px]">
            <div className={`rounded-2xl border px-3 py-3 ${theme === "classic-light" ? "border-slate-100 bg-slate-50" : "border-white/5 bg-white/5"}`}>
              <p className="font-anton text-xl text-[#00e476]">
                {teamView?.standings ? `${teamView.standings.rank}º` : "--"}
              </p>
              <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                Posição no grupo
              </p>
            </div>
            <div className={`rounded-2xl border px-3 py-3 ${theme === "classic-light" ? "border-slate-100 bg-slate-50" : "border-white/5 bg-white/5"}`}>
              <p className="font-anton text-xl text-[#00e476]">
                {teamView?.leaders.teamSummary?.goalsFor ?? teamView?.standings?.row.goalsFor ?? 0}
              </p>
              <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                Gols pró
              </p>
            </div>
            <div className={`rounded-2xl border px-3 py-3 ${theme === "classic-light" ? "border-slate-100 bg-slate-50" : "border-white/5 bg-white/5"}`}>
              <p className="font-anton text-xl text-[#00e476]">
                {featuredMatch ? getStatusLabel(featuredMatch.status) : "AGENDA"}
              </p>
              <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                Radar da partida
              </p>
            </div>
            <div className={`rounded-2xl border px-3 py-3 ${theme === "classic-light" ? "border-slate-100 bg-slate-50" : "border-white/5 bg-white/5"}`}>
              <p className="font-anton text-sm text-[#00e476]">
                {teamView ? formatUpdatedAt(teamView.updatedAt).replace("Atualizado ", "") : "--:--:--"}
              </p>
              <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                Última atualização
              </p>
            </div>
          </div>
        </div>
      </section>

      {status === "loading" && !teamView ? (
        <div className={`mt-6 rounded-3xl border p-6 ${cardClasses}`}>
          <p className={`font-archivo text-sm ${mutedClasses}`}>Montando o painel completo da seleção...</p>
        </div>
      ) : status === "error" && !teamView ? (
        <div className={`mt-6 rounded-3xl border p-6 ${cardClasses}`}>
          <p className={`font-archivo text-sm ${headingClasses}`}>
            Não foi possível carregar o painel completo da seleção agora.
          </p>
        </div>
      ) : teamView ? (
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3" id="team-view-matches">
              <MatchSummaryCard theme={theme} title="Agora" match={teamView.currentMatch} />
              <MatchSummaryCard theme={theme} title="Próxima" match={teamView.nextMatch} />
              <MatchSummaryCard theme={theme} title="Última" match={teamView.lastMatch} />
            </div>

            <section className={`rounded-3xl border p-4 md:p-6 ${cardClasses}`} id="team-lineup-board-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className={`font-anton text-xl uppercase tracking-wide ${headingClasses}`}>
                    Escalação da seleção
                  </h3>
                  <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                    {teamView.lineup
                      ? teamView.lineup.source === "fifa"
                        ? "Escalação oficial FIFA"
                        : "Escalação estimada (dados locais)"
                      : "Escalação indisponível"}
                  </p>
                </div>
                {teamView.lineup && (
                  <p className={`font-archivo text-sm ${mutedClasses}`}>
                    {teamView.lineup.note}
                  </p>
                )}
              </div>

              {teamView.lineup && teamView.lineup.players.length > 0 ? (
                <div className="mt-5">
                  <TeamPitchBoard
                    team={{ ...teamView.team, lineup: teamView.lineup.players }}
                    opponentName={featuredMatch?.opponent.name}
                    mirror={false}
                    theme={theme}
                  />
                </div>
              ) : (
                <div
                  className={`mt-5 rounded-2xl border p-8 text-center ${theme === "classic-light" ? "border-slate-100 bg-slate-50" : "border-white/5 bg-white/5"}`}
                  id="team-lineup-unavailable"
                >
                  <p className={`font-archivo text-base ${headingClasses}`}>
                    Escalação ainda não disponibilizada pela FIFA para esta seleção. Enquanto isso,
                    o painel aguarda a confirmação oficial ou a próxima atualização local.
                  </p>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className={`rounded-3xl border p-5 ${cardClasses}`} id="team-view-standings-card">
              <h3 className={`font-anton text-xl uppercase tracking-wide ${headingClasses}`}>
                Campanha no grupo
              </h3>
              {teamView.standings ? (
                <>
                  <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                    {teamView.standings.row.group} • {teamView.standings.rank}º de {teamView.standings.groupSize}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {[
                      { label: "Pontos", value: teamView.standings.row.points },
                      { label: "Jogos", value: teamView.standings.row.played },
                      { label: "Vitórias", value: teamView.standings.row.won },
                      { label: "Empates", value: teamView.standings.row.drawn },
                      { label: "Derrotas", value: teamView.standings.row.lost },
                      { label: "Saldo", value: teamView.standings.row.goalDifference },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className={`rounded-2xl border px-3 py-3 ${theme === "classic-light" ? "border-slate-100 bg-slate-50" : "border-white/5 bg-white/5"}`}
                      >
                        <p className="font-anton text-2xl text-[#00e476]">{stat.value}</p>
                        <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className={`mt-4 font-archivo text-sm ${mutedClasses}`}>
                  A classificação do grupo ainda não foi montada para esta seleção.
                </p>
              )}
            </section>

            <section className={`rounded-3xl border p-5 ${cardClasses}`} id="team-view-summary-card">
              <h3 className={`font-anton text-xl uppercase tracking-wide ${headingClasses}`}>
                Resumo coletivo
              </h3>
              {teamView.leaders.teamSummary ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { label: "Jogos", value: teamView.leaders.teamSummary.matchesPlayed },
                    { label: "Vitórias", value: teamView.leaders.teamSummary.wins },
                    { label: "Gols pró", value: teamView.leaders.teamSummary.goalsFor },
                    { label: "Gols contra", value: teamView.leaders.teamSummary.goalsAgainst },
                    { label: "Clean sheets", value: teamView.leaders.teamSummary.cleanSheets },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className={`rounded-2xl border px-3 py-3 ${theme === "classic-light" ? "border-slate-100 bg-slate-50" : "border-white/5 bg-white/5"}`}
                    >
                      <p className="font-anton text-2xl text-[#00e476]">{stat.value}</p>
                      <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`mt-4 font-archivo text-sm ${mutedClasses}`}>
                  A campanha coletiva ainda está em formação, sem métricas suficientes para destacar a seleção.
                </p>
              )}
            </section>

            <section className={`rounded-3xl border p-5 ${cardClasses}`} id="team-view-performance-card">
              <h3 className={`font-anton text-xl uppercase tracking-wide ${headingClasses}`}>
                Leitura de desempenho
              </h3>
              {performanceMetrics.length > 0 ? (
                <div className="mt-4 grid grid-cols-1 gap-3">
                  {performanceMetrics.map((stat) => (
                    <div
                      key={stat.label}
                      className={`rounded-2xl border px-4 py-3 ${
                        theme === "classic-light" ? "border-slate-100 bg-slate-50" : "border-white/5 bg-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className={`font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                          {stat.label}
                        </p>
                        <p className="font-anton text-2xl text-[#00e476]" id={`team-performance-${metricIdFromLabel(stat.label)}`}>
                          {stat.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`mt-4 font-archivo text-sm leading-6 ${mutedClasses}`}>
                  A seleção ainda não estreou ou não tem resultados suficientes para calcular o
                  aproveitamento e as médias do torneio.
                </p>
              )}
            </section>

            <section className={`rounded-3xl border p-5 ${cardClasses}`} id="team-view-leaders-card">
              <h3 className={`font-anton text-xl uppercase tracking-wide ${headingClasses}`}>
                Destaques da seleção
              </h3>
              <div className="mt-4 space-y-5">
                <LeaderStrip
                  title="Artilharia"
                  metricLabel="gol"
                  entries={teamView.leaders.topScorers}
                  metricFor={(entry) => entry.goals}
                  theme={theme}
                />
                <LeaderStrip
                  title="Cartões amarelos"
                  metricLabel="amarelo"
                  entries={teamView.leaders.yellowCards}
                  metricFor={(entry) => entry.yellowCards}
                  theme={theme}
                />
                <LeaderStrip
                  title="Cartões vermelhos"
                  metricLabel="vermelho"
                  entries={teamView.leaders.redCards}
                  metricFor={(entry) => entry.redCards}
                  theme={theme}
                />
              </div>
            </section>

            <section className={`rounded-3xl border p-5 ${cardClasses}`} id="team-view-broadcast-card">
              <h3 className={`font-anton text-xl uppercase tracking-wide ${headingClasses}`}>
                Onde acompanhar
              </h3>
              <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                {teamView.broadcastGuide?.source === "fifa"
                  ? "Dados oficiais do Onde Assistir da FIFA"
                  : "Lista local do aplicativo"}
              </p>
              <div className="mt-4">
                <BroadcasterList broadcasters={teamView.broadcastGuide?.broadcasters ?? []} theme={theme} />
              </div>
              {(teamView.currentMatch?.officialMatchUrl || teamView.nextMatch?.officialMatchUrl) && (
                <a
                  href={teamView.currentMatch?.officialMatchUrl || teamView.nextMatch?.officialMatchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-4 inline-flex rounded-full border px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                    theme === "classic-light"
                      ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                      : "border-white/10 bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  Abrir página oficial da partida
                </a>
              )}
            </section>

            {countryInfo && (
              <CountryInfoCard theme={theme} info={countryInfo} />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

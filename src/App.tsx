import { useEffect, useState } from "react";
import packageInfo from "../package.json";
import matchesData from "./matches.json";
import type { Match, TeamRef } from "./types";
import { MatchDetailView } from "./components/MatchDetailView";
import { StandingsView } from "./components/StandingsView";
import { TeamsView } from "./components/TeamsView";
import { TournamentLeadersView } from "./components/TournamentLeadersView";
import { VenueMapView } from "./components/VenueMapView";
import { NewsView } from "./components/NewsView";
import { BracketView } from "./components/BracketView";
import { FanZoneView } from "./components/FanZoneView";
import { TeamLineupView } from "./components/TeamLineupView";
import type { TeamLineupsMap } from "./utils/teamLineup";
import { NAV_ITEMS } from "./navigation";
import { Sun, Moon } from "lucide-react";

const APP_VERSION = packageInfo.version;
const TEAM_LINEUPS_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

interface TeamLineupsApiResponse {
  refreshAfterMs: number;
  lineups: TeamLineupsMap;
}

export default function App() {
  const [theme, setTheme] = useState<"classic-light" | "stadium-dark">(
    "classic-light",
  );
  const [matches, setMatches] = useState<Match[]>(() => matchesData as Match[]);
  const [activeNavId, setActiveNavId] = useState<string>(NAV_ITEMS[0].id);
  const [lineupTeam, setLineupTeam] = useState<TeamRef | null>(null);
  const [teamLineups, setTeamLineups] = useState<TeamLineupsMap>({});
  const [standingsFocusGroup, setStandingsFocusGroup] = useState<string | null>(null);
  const isPartidasViewActive = activeNavId === "partidas" && lineupTeam === null;

  const handleSelectNav = (navId: string) => {
    setActiveNavId(navId);
    setStandingsFocusGroup(null);
  };

  const handleOpenStandingsGroup = (group: string) => {
    setStandingsFocusGroup(group);
    setActiveNavId("grupos");
  };

  useEffect(() => {
    if (!isPartidasViewActive) {
      return;
    }

    let active = true;
    let timeoutId: number | undefined;
    let requestInFlight = false;

    const clearScheduledLoad = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };

    const isPageVisible = () =>
      typeof document === "undefined" || document.visibilityState === "visible";

    const scheduleNextLoad = (refreshAfterMs?: number) => {
      if (!isPageVisible()) {
        return;
      }

      const delay =
        typeof refreshAfterMs === "number" && refreshAfterMs > 0
          ? refreshAfterMs
          : TEAM_LINEUPS_REFRESH_INTERVAL_MS;

      clearScheduledLoad();
      timeoutId = window.setTimeout(() => {
        void loadTeamLineups();
      }, delay);
    };

    const loadTeamLineups = async () => {
      if (!active || requestInFlight) {
        return;
      }

      requestInFlight = true;

      try {
        const response = await fetch("/api/team-lineups");
        if (!response.ok) {
          throw new Error("Falha ao atualizar escalações da FIFA.");
        }

        const data: TeamLineupsApiResponse = await response.json();
        if (!active) return;

        setTeamLineups(data.lineups);
        scheduleNextLoad(data.refreshAfterMs);
      } catch (error) {
        console.error(error);
        scheduleNextLoad();
      } finally {
        requestInFlight = false;
      }
    };

    const handlePageVisible = () => {
      if (!active || !isPageVisible()) {
        return;
      }

      clearScheduledLoad();
      void loadTeamLineups();
    };

    void loadTeamLineups();
    window.addEventListener("focus", handlePageVisible);
    document.addEventListener("visibilitychange", handlePageVisible);

    return () => {
      active = false;
      clearScheduledLoad();
      window.removeEventListener("focus", handlePageVisible);
      document.removeEventListener("visibilitychange", handlePageVisible);
    };
  }, [isPartidasViewActive]);

  const activeNavItem =
    NAV_ITEMS.find((item) => item.id === activeNavId) || NAV_ITEMS[0];

  const renderActiveView = () => {
    switch (activeNavItem.id) {
      case "partidas":
        return (
          <MatchDetailView
            matches={matches}
            setMatches={setMatches}
            theme={theme}
            onSelectTeamLineup={setLineupTeam}
            onOpenStandingsGroup={handleOpenStandingsGroup}
            teamLineups={teamLineups}
          />
        );
      case "grupos":
      return (
        <StandingsView
          matches={matches}
          theme={theme}
          onSelectTeamLineup={setLineupTeam}
          focusGroup={standingsFocusGroup}
        />
      );
      case "selecoes":
        return <TeamsView matches={matches} theme={theme} onSelectTeamLineup={setLineupTeam} />;
      case "lideres":
        return <TournamentLeadersView theme={theme} onSelectTeamLineup={setLineupTeam} />;
      case "estadios":
        return <VenueMapView matches={matches} theme={theme} onSelectTeamLineup={setLineupTeam} />;
      case "noticias":
        return <NewsView theme={theme} />;
      case "chaveamento":
        return <BracketView theme={theme} />;
      case "fanzone":
        return <FanZoneView theme={theme} />;
      default:
        return (
          <MatchDetailView
            matches={matches}
            setMatches={setMatches}
            theme={theme}
            onSelectTeamLineup={setLineupTeam}
            onOpenStandingsGroup={handleOpenStandingsGroup}
            teamLineups={teamLineups}
          />
        );
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-500 pb-12 ${
        theme === "classic-light"
          ? "bg-[#f4f7f6] text-slate-800"
          : "bg-[#0a0c0c] text-slate-100"
      }`}
      id="main-layout-container"
    >
      {/* HEADER SECTION */}
      <header
        className={`border-b ${
          theme === "classic-light"
            ? "bg-white border-slate-200"
            : "bg-[#121414]/90 border-white/10 backdrop-blur-md"
        } sticky top-0 z-50`}
        id="app-header"
      >
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Branding */}
          <div className="flex items-center" id="app-branding">
            <span
              className={`font-anton text-lg uppercase tracking-wider ${
                theme === "classic-light" ? "text-slate-900" : "text-white"
              }`}
            >
              Agora na Copa{" "}
              <span
                className={
                  theme === "classic-light"
                    ? "text-[#009c3b]"
                    : "text-[#00e476]"
                }
              >
                26
              </span>
            </span>
          </div>

          {/* Main Navigation */}
          <nav
            className={`flex flex-wrap items-center gap-1 rounded-lg border p-1 ${
              theme === "classic-light"
                ? "bg-slate-100 border-slate-200"
                : "bg-white/10 border-white/15"
            }`}
            id="main-nav"
          >
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                id={`btn-nav-${item.id}`}
                onClick={() => handleSelectNav(item.id)}
                className={`px-3.5 py-2 min-h-11 rounded-md text-[13px] md:text-sm leading-none font-anton transition-all uppercase tracking-wide ${
                  activeNavId === item.id
                    ? theme === "classic-light"
                      ? "bg-white text-slate-950 shadow-sm font-semibold"
                      : "bg-[#171a1c] text-[#ffd84d] shadow-sm font-semibold"
                    : theme === "classic-light"
                      ? "text-slate-700 hover:bg-white hover:text-slate-950"
                      : "text-slate-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Theme Toggle */}
          <button
            id="btn-toggle-theme"
            onClick={() =>
              setTheme(
                theme === "classic-light" ? "stadium-dark" : "classic-light",
              )
            }
            title="Alternar estilo visual"
            className="p-2 rounded-lg bg-[#1e2020]/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition"
          >
            {theme === "classic-light" ? (
              <div className="flex items-center space-x-1.5">
                <Moon size={14} className="text-indigo-600" />
                <span className="text-xs font-mono font-bold uppercase">
                  Escuro (Arena)
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5">
                <Sun size={14} className="text-amber-400" />
                <span className="text-xs font-mono font-bold uppercase text-amber-300">
                  Claro (Estúdio)
                </span>
              </div>
            )}
          </button>
        </div>
      </header>

      {/* VIEW AREA RESPONDING TO SELECTED NAV ITEM */}
      <main id="view-container">
        {lineupTeam ? (
          <TeamLineupView
            team={lineupTeam}
            theme={theme}
            onBack={() => setLineupTeam(null)}
          />
        ) : (
          renderActiveView()
        )}
      </main>

      {/* FOOTER METADATA DETAIL */}
      <footer
        className="mt-16 text-center max-w-5xl mx-auto px-4 text-sm font-mono leading-6"
        id="app-footer"
      >
        <p className={theme === "classic-light" ? "text-slate-500" : "text-slate-300"}>
          © 2026 Agora na Copa 26. Todos os direitos reservados. FIFA World Cup,
          marcas e logos são de propriedade de seus respectivos donos.
        </p>
        <p className={`mt-2 ${theme === "classic-light" ? "text-slate-600" : "text-slate-200"}`}>
          Desenvolvido com carinho para o fanático por dados esportivos.
        </p>
        <p className={`mt-2 ${theme === "classic-light" ? "text-slate-600" : "text-slate-200"}`}>
          Créditos:{" "}
          <a
            href="https://github.com/rezarahiminia/worldcup2026"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:no-underline"
          >
            rezarahiminia/worldcup2026
          </a>
        </p>
        <p className={`mt-2 ${theme === "classic-light" ? "text-slate-500" : "text-slate-300"}`}>
          Versão da página: {APP_VERSION}
        </p>
      </footer>
    </div>
  );
}

import { useState, useEffect, useRef, useMemo } from "react";
import packageInfo from "../package.json";
import { APP_MATCHES } from "./appMatches";
import { buildTeamMetaMap } from "./utils/teamCountdown";
import type { Match, TeamRef } from "./types";
import { MatchDetailView } from "./components/MatchDetailView";
import { StandingsView } from "./components/StandingsView";
import { TeamsView } from "./components/TeamsView";
import { TournamentLeadersView } from "./components/TournamentLeadersView";
import { VenueMapView } from "./components/VenueMapView";
import { NewsView } from "./components/NewsView";
import { BracketView } from "./components/BracketView";
import { FanZoneView } from "./components/FanZoneView";
import { SocialMediasView } from "./components/SocialMediasView";
import { JogadoresView } from "./components/JogadoresView";
import { TeamLineupView } from "./components/TeamLineupView";
import { PartidasView } from "./components/PartidasView";
import { DashboardView } from "./components/DashboardView";
import { TeamCountdownBadge } from "./components/TeamCountdownBadge";
import { GoalFireworks } from "./components/GoalFireworks";
import { CookieConsentBanner } from "./components/CookieConsentBanner";
import { AdSlot } from "./components/AdSlot";
import { useTeamLineups } from "./hooks/useTeamLineups";
import { useVersionCheck } from "./hooks/useVersionCheck";
import { VersionCheckTimer } from "./components/VersionCheckTimer";
import { useAnalytics } from "./hooks/useAnalytics";
import { useFeatureTour } from "./hooks/useFeatureTour";
import { useFavoriteTeam } from "./hooks/useFavoriteTeam";
import { useTipTour } from "./hooks/useTipTour";
import { DonationPix } from "./components/DonationPix";
import { ShareButton } from "./components/ShareButton";
import { OnlineCountBadge } from "./components/OnlineCountBadge";
import { NAV_ITEMS } from "./navigation";
import { useLocale, type Locale } from "./i18n";
import { Sun, Moon, HelpCircle, Settings, Languages } from "lucide-react";

const APP_VERSION = packageInfo.version;

const getGroupSlug = (group: string) => group.replace(/\s+/g, "-").toLowerCase();

export default function App() {
  const { t, locale, setLocale } = useLocale();
  const [theme, setTheme] = useState<"classic-light" | "stadium-dark">(
    "classic-light",
  );
  const [matches, setMatches] = useState<Match[]>(() => APP_MATCHES);
  // The national team the supporter follows in the countdown badge. Locale-aware default:
  // pt → Brazil; es (LATAM) → none, so the badge invites the visitor to pick their team.
  const [favoriteTeam, selectFavoriteTeam] = useFavoriteTeam(
    locale === "pt" ? "BRA" : null,
  );
  const favoriteTeamColors = useMemo(() => {
    const meta = favoriteTeam
      ? buildTeamMetaMap(matches).get(favoriteTeam)
      : undefined;
    return {
      primary: meta?.primaryColor,
      secondary: meta?.secondaryColor,
    };
  }, [matches, favoriteTeam]);
  const [activeNavId, setActiveNavId] = useState<string>("ao-vivo");
  const [lineupTeam, setLineupTeam] = useState<TeamRef | null>(null);
  const [standingsFocusGroupSlug, setStandingsFocusGroupSlug] = useState<string | null>(null);
  const [aoVivoMatchId, setAoVivoMatchId] = useState<string | null>(null);
  const isAoVivoViewActive = activeNavId === "ao-vivo" && lineupTeam === null;
  const teamLineups = useTeamLineups(isAoVivoViewActive);
  const hasLiveMatch = matches.some((match) => match.status === "LIVE");
  const versionCheck = useVersionCheck(APP_VERSION);
  const newVersionAvailable = versionCheck.updateAvailable;

  // Fireworks when the followed team scores during a live match
  const [fireworksActive, setFireworksActive] = useState(false);
  const favoriteMatchRef = useRef<{ matchId: string; score: number } | null>(null);
  const fireworksTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!favoriteTeam) {
      favoriteMatchRef.current = null;
      return;
    }

    const liveMatch = matches.find(
      (m) =>
        m.status === "LIVE" &&
        (m.teamA.code === favoriteTeam || m.teamB.code === favoriteTeam),
    );

    if (!liveMatch) {
      favoriteMatchRef.current = null;
      return;
    }

    const favoriteScore =
      liveMatch.teamA.code === favoriteTeam
        ? (liveMatch.score?.teamA ?? 0)
        : (liveMatch.score?.teamB ?? 0);

    const prev = favoriteMatchRef.current;
    const sameMatch = prev?.matchId === liveMatch.id;

    if (sameMatch && prev !== null && favoriteScore > prev.score) {
      setFireworksActive(true);
      clearTimeout(fireworksTimerRef.current);
      // 11s matches the shader duration: 12 bursts, the last starting at 6.05s and
      // fading out by ~10.65s.
      fireworksTimerRef.current = setTimeout(() => setFireworksActive(false), 11000);
    }

    favoriteMatchRef.current = { matchId: liveMatch.id, score: favoriteScore };
  }, [matches, favoriteTeam]);

  useEffect(() => {
    return () => clearTimeout(fireworksTimerRef.current);
  }, []);

  useEffect(() => {
    document.getElementById(`btn-nav-${activeNavId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeNavId]);

  // Keep the rich home title on the default view (what Googlebot renders on "/"),
  // and give other views a distinct "<label> — <brand>" for tab clarity + native
  // shares. Deep entity state has no URL yet, so this stays view-level for now.
  useEffect(() => {
    document.title =
      activeNavId === "ao-vivo"
        ? t("meta.homeTitle")
        : `${t(`nav.${activeNavId}.label`)} — ${t("meta.titleSuffix")}`;
  }, [activeNavId, t]);

  const handleSelectNav = (navId: string) => {
    setActiveNavId(navId);
    if (navId !== "grupos") {
      setStandingsFocusGroupSlug(null);
    }
    if (navId !== "ao-vivo" || activeNavId === "ao-vivo") {
      setAoVivoMatchId(null);
    }
  };

  const handleSelectMatch = (matchId: string) => {
    setAoVivoMatchId(matchId);
    setActiveNavId("ao-vivo");
  };

  const handleOpenStandingsGroup = (group: string) => {
    const groupSlug = getGroupSlug(group);
    setStandingsFocusGroupSlug(groupSlug);
    if (typeof window !== "undefined") {
      window.location.hash = `standings-group-${groupSlug}`;
    }
    setActiveNavId("grupos");
  };

  const activeNavItem =
    NAV_ITEMS.find((item) => item.id === activeNavId) || NAV_ITEMS[0];

  useAnalytics(`/${activeNavItem.id}`, t(`nav.${activeNavItem.id}.label`));
  const { startTour } = useFeatureTour(theme);
  useTipTour(theme);

  const renderActiveView = () => {
    switch (activeNavItem.id) {
      case "dashboard":
        return <DashboardView theme={theme} matches={matches} />;
      case "ao-vivo":
        return (
          <MatchDetailView
            matches={matches}
            setMatches={setMatches}
            theme={theme}
            onSelectTeamLineup={setLineupTeam}
            onOpenStandingsGroup={handleOpenStandingsGroup}
            teamLineups={teamLineups}
            initialMatchId={aoVivoMatchId ?? undefined}
          />
        );
      case "partidas":
        return (
          <PartidasView
            matches={matches}
            theme={theme}
            onSelectTeamLineup={setLineupTeam}
            onSelectMatch={handleSelectMatch}
          />
        );
      case "grupos":
        return (
          <StandingsView
            matches={matches}
            theme={theme}
            onSelectTeamLineup={setLineupTeam}
            onSelectMatch={handleSelectMatch}
            focusGroupSlug={standingsFocusGroupSlug}
          />
        );
      case "selecoes":
        return <TeamsView matches={matches} theme={theme} onSelectTeamLineup={setLineupTeam} />;
      case "jogadores":
        return <JogadoresView theme={theme} onSelectTeamLineup={setLineupTeam} />;
      case "lideres":
        return <TournamentLeadersView theme={theme} onSelectTeamLineup={setLineupTeam} />;
      case "estadios":
        return <VenueMapView matches={matches} theme={theme} onSelectTeamLineup={setLineupTeam} />;
      case "noticias":
        return <NewsView theme={theme} />;
      case "chaveamento":
        return <BracketView theme={theme} matches={matches} onSelectTeamLineup={setLineupTeam} onSelectMatch={handleSelectMatch} />;
      case "fanzone":
        return <FanZoneView theme={theme} />;
      case "social-medias":
        return <SocialMediasView theme={theme} />;
      default:
        return (
          <MatchDetailView
            matches={matches}
            setMatches={setMatches}
            theme={theme}
            onSelectTeamLineup={setLineupTeam}
            onOpenStandingsGroup={handleOpenStandingsGroup}
            teamLineups={teamLineups}
            initialMatchId={aoVivoMatchId ?? undefined}
          />
        );
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-500 pb-64 md:pb-12 ${
        theme === "classic-light"
          ? "bg-[#f4f7f6] text-slate-800"
          : "bg-[#0a0c0c] text-slate-100"
      }`}
      id="main-layout-container"
    >
      {/* NEW VERSION BANNER */}
      {newVersionAvailable && (
        <div
          id="new-version-banner"
          className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-3 bg-[#ffd84d] px-4 py-2 shadow-md"
        >
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#111]">
            {t("shell.newVersion")}
          </span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-[#111] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#ffd84d] transition hover:bg-[#333]"
          >
            {t("shell.updateNow")}
          </button>
        </div>
      )}

      {/* HEADER SECTION */}
      <header
        className={`border-b ${
          theme === "classic-light"
            ? "bg-white border-slate-200"
            : "bg-[#121414]/90 border-white/10 backdrop-blur-md"
        } sticky top-0 z-50`}
        id="app-header"
      >
        <div className="max-w-7xl mx-auto px-4">
          {/* Row 1: Branding + Theme Toggle */}
          <div className="py-3 flex items-center justify-between gap-4">
            {/* Branding */}
            <div className="flex min-w-0 items-center gap-2" id="app-branding">
              <span
                className={`truncate font-anton text-lg uppercase tracking-wider ${
                  theme === "classic-light" ? "text-slate-900" : "text-white"
                }`}
              >
                {t("shell.brandName")}{" "}
                <span
                  className={
                    theme === "classic-light"
                      ? "text-[#007a2e]"
                      : "text-[#00e476]"
                  }
                >
                  26
                </span>
              </span>
              <VersionCheckTimer
                status={versionCheck}
                onForceCheck={versionCheck.checkNow}
                theme={theme}
              />
              <OnlineCountBadge theme={theme} />
            </div>

            <div className="flex items-center gap-2">
            {/* Mudar Relógio — toggles the Ao Vivo match clock-config drawer (via window event) */}
            <button
              id="btn-edit-match"
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("toggle-match-clock-config"))}
              title={t("shell.editClock")}
              aria-label={t("shell.editClock")}
              className="p-2 rounded-lg bg-[#1e2020]/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition"
            >
              <Settings size={14} strokeWidth={2.5} />
            </button>

            {/* Share the app */}
            <ShareButton theme={theme} />

            {/* Feature-discovery tour replay */}
            <button
              id="btn-feature-tour"
              onClick={startTour}
              title={t("shell.howToUse")}
              aria-label={t("shell.howToUse")}
              className="p-2 rounded-lg bg-[#1e2020]/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition"
            >
              <HelpCircle
                size={14}
                strokeWidth={2.5}
                className={theme === "classic-light" ? "text-[#007a2e]" : "text-[#00e476]"}
              />
            </button>

            {/* Theme Toggle */}
            <button
              id="btn-toggle-theme"
              onClick={() =>
                setTheme(
                  theme === "classic-light" ? "stadium-dark" : "classic-light",
                )
              }
              title={t("shell.toggleTheme")}
              aria-label={t("shell.toggleTheme")}
              className="p-2 rounded-lg bg-[#1e2020]/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition"
            >
              {theme === "classic-light" ? (
                <Moon size={14} strokeWidth={2.5} className="text-indigo-600" />
              ) : (
                <Sun size={14} strokeWidth={2.5} className="text-amber-400" />
              )}
            </button>

            {/* Language switcher — pt (default) / es (LATAM) / en (US). Persists to localStorage. */}
            <div className="relative flex items-center rounded-lg bg-[#1e2020]/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition">
              <Languages size={14} strokeWidth={2.5} className="pointer-events-none absolute left-2" aria-hidden="true" />
              <select
                id="btn-switch-language"
                value={locale}
                onChange={(event) => setLocale(event.target.value as Locale)}
                title={t("shell.switchLanguage")}
                aria-label={t("shell.switchLanguage")}
                className="cursor-pointer appearance-none bg-transparent py-2 pl-7 pr-2 font-mono text-[10px] font-bold uppercase tracking-wider focus:outline-none"
              >
                <option value="pt">PT</option>
                <option value="es">ES</option>
                <option value="en">EN</option>
              </select>
            </div>
            </div>
          </div>

          {/* Row 2: Scrollable Nav */}
          <div className="pb-2 overflow-x-auto scrollbar-hidden">
            <nav
              className={`flex items-center gap-1 rounded-lg border p-1 w-max min-w-full ${
                theme === "classic-light"
                  ? "bg-slate-100 border-slate-200"
                  : "bg-white/10 border-white/15"
              }`}
              id="main-nav"
            >
              {NAV_ITEMS.map((item) => (
                (() => {
                  const isActive = activeNavId === item.id;
                  const hasLiveAttention = item.id === "ao-vivo" && hasLiveMatch;

                  return (
                    <button
                      key={item.id}
                      id={`btn-nav-${item.id}`}
                      onClick={() => handleSelectNav(item.id)}
                      data-live-attention={hasLiveAttention ? "true" : "false"}
                      className={`relative px-3.5 py-2 min-h-11 rounded-md text-[13px] md:text-sm leading-none font-anton transition-all uppercase tracking-wide ${
                        isActive
                          ? theme === "classic-light"
                            ? "bg-white text-slate-950 shadow-sm font-semibold"
                            : "bg-[#171a1c] text-[#ffd84d] shadow-sm font-semibold"
                          : theme === "classic-light"
                            ? "text-slate-700 hover:bg-white hover:text-slate-950"
                            : "text-slate-100 hover:bg-white/10 hover:text-white"
                      } ${
                        hasLiveAttention
                          ? theme === "classic-light"
                            ? "ring-1 ring-[#009c3b]/25 shadow-[0_0_0_1px_rgba(0,156,59,0.08),0_0_18px_rgba(0,156,59,0.18)]"
                            : "ring-1 ring-[#00e476]/25 shadow-[0_0_0_1px_rgba(0,228,118,0.1),0_0_18px_rgba(0,228,118,0.2)]"
                          : ""
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        {hasLiveAttention && (
                          <span className="relative flex h-2.5 w-2.5" id="nav-live-indicator">
                            <span
                              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                                theme === "classic-light" ? "bg-[#009c3b]" : "bg-[#00e476]"
                              }`}
                            ></span>
                            <span
                              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                                theme === "classic-light" ? "bg-[#009c3b]" : "bg-[#00e476]"
                              }`}
                            ></span>
                          </span>
                        )}
                        <span className={hasLiveAttention ? "animate-pulse" : ""}>{t(`nav.${item.id}.label`)}</span>
                      </span>
                    </button>
                  );
                })()
              ))}
            </nav>
          </div>
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

      <TeamCountdownBadge
        matches={matches}
        favoriteTeam={favoriteTeam}
        onSelectTeam={selectFavoriteTeam}
      />
      <GoalFireworks
        active={fireworksActive}
        primaryColor={favoriteTeamColors.primary}
        secondaryColor={favoriteTeamColors.secondary}
      />

      {/* Responsive AdSense unit — dormant until a real publisher id + ads consent. */}
      <AdSlot theme={theme} />

      {/* FOOTER METADATA DETAIL */}
      <footer
        className="mt-16 text-center max-w-5xl mx-auto px-4 text-sm font-mono leading-6"
        id="app-footer"
      >
        <p className={theme === "classic-light" ? "text-slate-500" : "text-slate-300"}>
          {t("footer.rights")}
        </p>
        <p className={`mt-2 ${theme === "classic-light" ? "text-slate-600" : "text-slate-200"}`}>
          {t("footer.madeWith")}
        </p>
        <p className={`mt-2 ${theme === "classic-light" ? "text-slate-600" : "text-slate-200"}`}>
          {t("footer.credits")}{" "}
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
          <a
            href="/privacidade.html"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:no-underline"
          >
            {t("footer.privacy")}
          </a>
        </p>
        <DonationPix theme={theme} variant="compact" />
        <p className={`mt-3 ${theme === "classic-light" ? "text-slate-500" : "text-slate-300"}`}>
          {t("footer.pageVersion")} {APP_VERSION}
        </p>
      </footer>

      <CookieConsentBanner theme={theme} />
    </div>
  );
}

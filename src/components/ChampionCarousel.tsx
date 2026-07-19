import { useMemo } from "react";
import { useT } from "../i18n";
import { localizeTeamName } from "../i18n/teamNames";
import { stageWinnerCodes } from "../dashboardStats";
import { standings } from "../data/tournament";
import { getTeamSquad } from "../data/playerRegistry";
import { FlagIcon } from "./FlagIcon";
import type { SquadPlayer, TeamRef } from "../types";

interface ChampionCarouselProps {
  theme: "classic-light" | "stadium-dark";
  /** Open the champion team's page when the banner or a player tile is clicked. */
  onSelectTeam: (team: TeamRef) => void;
}

const SECONDS_PER_TILE = 1.05;

/** Two-letter initials fallback shown if a FIFA photo fails to load. */
const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// A celebratory banner + auto-scrolling photo carousel of the World Cup champion's
// squad, shown at the top of the Ao Vivo page once the Final is decided.
//
// Fully DATA-DRIVEN — the champion is the Final winner (stageWinnerCodes("F")),
// never a hard-coded team — so this appears only when a real champion exists and
// always names the actual winner (currently Espanha). Reuses the `.ig-marquee-*`
// CSS (index.css): seamless loop via a duplicated, `mr-3`-spaced flat track that
// translates -50%; pauses on hover/focus and honours prefers-reduced-motion.
export function ChampionCarousel({ theme, onSelectTeam }: ChampionCarouselProps) {
  const t = useT();
  const champion = useMemo(() => {
    const code = stageWinnerCodes("F")[0];
    if (!code) return null;
    const team = standings.find((r) => r.code === code);
    if (!team) return null;
    const players = getTeamSquad(code).filter((p) => p.pictureUrl);
    if (players.length === 0) return null;
    return { team, players };
  }, []);

  if (!champion) return null;
  const { team, players } = champion;
  const isLight = theme === "classic-light";
  const name = localizeTeamName(team.name, team.code);

  const shellClasses = isLight
    ? "border-amber-300 bg-gradient-to-b from-amber-50 to-white"
    : "border-amber-400/30 bg-gradient-to-b from-amber-500/10 to-[#121414]";
  const titleClasses = isLight ? "text-slate-900" : "text-white";
  const subClasses = isLight ? "text-amber-700" : "text-amber-300";
  const tileClasses = isLight
    ? "bg-white border-amber-200 hover:border-amber-300"
    : "bg-white/5 border-amber-400/20 hover:border-amber-400/40";
  const nameClasses = isLight ? "text-slate-800" : "text-white";
  const photoBg = isLight ? "bg-amber-50" : "bg-black/30";
  const numberClasses = isLight ? "bg-amber-500/90 text-white" : "bg-amber-400/90 text-black";

  const renderTile = (player: SquadPlayer, duplicate: boolean) => (
    <button
      key={`${duplicate ? "dup-" : ""}${player.fifaId}`}
      type="button"
      tabIndex={duplicate ? -1 : undefined}
      aria-hidden={duplicate || undefined}
      onClick={() => onSelectTeam(team)}
      aria-label={t("champion.tileAria", { name: player.name })}
      title={player.name}
      className={`group relative mr-3 flex w-24 shrink-0 flex-col overflow-hidden rounded-2xl border transition ${tileClasses} ${
        duplicate ? "ig-marquee-dup" : ""
      }`}
    >
      <div className={`relative aspect-[3/4] w-full overflow-hidden ${photoBg}`}>
        <span
          aria-hidden="true"
          className={`absolute inset-0 flex items-center justify-center font-anton text-2xl tracking-wide ${
            isLight ? "text-amber-200" : "text-white/20"
          }`}
        >
          {initialsOf(player.name)}
        </span>
        <img
          src={player.pictureUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
          className="relative h-full w-full object-contain object-bottom p-1 transition-transform duration-300 group-hover:scale-105"
        />
        <span
          className={`absolute left-1.5 top-1.5 rounded px-1 py-0.5 font-mono text-[9px] font-bold ${numberClasses}`}
        >
          #{player.number}
        </span>
      </div>
      <span
        className={`truncate px-2 py-1.5 text-center font-archivo text-[11px] font-semibold ${nameClasses}`}
      >
        {player.name}
      </span>
    </button>
  );

  return (
    <section
      id="champion-carousel"
      aria-label={t("champion.subtitle")}
      className={`mb-4 overflow-hidden rounded-3xl border p-4 ${shellClasses}`}
    >
      <button
        type="button"
        onClick={() => onSelectTeam(team)}
        className="flex w-full items-center justify-center gap-3"
      >
        <span aria-hidden="true" className="text-2xl">
          🏆
        </span>
        <FlagIcon flag={team.flagSvg} className="h-6 w-9 shrink-0 rounded-[2px] shadow-sm" />
        <span className="min-w-0 text-left">
          <span className={`block font-anton text-lg uppercase tracking-wide ${titleClasses}`}>
            {t("champion.title", { name })}
          </span>
          <span className={`block font-mono text-[10px] uppercase tracking-wider ${subClasses}`}>
            {t("champion.subtitle")}
          </span>
        </span>
      </button>

      <div className="ig-marquee-viewport mt-4 overflow-hidden">
        <div
          className="ig-marquee-track flex w-max"
          style={{ ["--ig-marquee-duration" as string]: `${players.length * SECONDS_PER_TILE}s` }}
        >
          {players.map((p) => renderTile(p, false))}
          {players.map((p) => renderTile(p, true))}
        </div>
      </div>
    </section>
  );
}

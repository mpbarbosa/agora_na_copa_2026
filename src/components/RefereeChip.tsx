import type { MatchReferee } from "../types";

type Theme = "classic-light" | "stadium-dark";

/**
 * Match referee chip for the scoreboard: shows the FIFA-assigned main referee
 * (name + nationality) for a match. FIFA only assigns referees a day or two
 * before kickoff and reliably publishes just the main referee, so this renders
 * nothing until a referee is available — never an empty placeholder.
 */
export function RefereeChip({
  referee,
  theme,
}: {
  referee: MatchReferee | undefined;
  theme: Theme;
}) {
  if (!referee?.name) return null;

  const isLight = theme === "classic-light";
  return (
    <span
      id="match-referee-chip"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${
        isLight
          ? "border-slate-200 bg-slate-100 text-slate-700"
          : "border-white/10 bg-white/5 text-slate-100"
      }`}
      title={
        referee.country
          ? `Árbitro da partida: ${referee.name} (${referee.country})`
          : `Árbitro da partida: ${referee.name}`
      }
      aria-label={
        referee.country
          ? `Árbitro: ${referee.name}, ${referee.country}`
          : `Árbitro: ${referee.name}`
      }
    >
      <span className="text-base leading-none" aria-hidden="true">
        🧑‍⚖️
      </span>
      <span
        className={`font-archivo text-[11px] font-semibold uppercase tracking-wide ${
          isLight ? "text-slate-500" : "text-slate-300"
        }`}
      >
        Árbitro
      </span>
      <span className="font-archivo text-sm font-bold leading-none">{referee.name}</span>
      {referee.country && (
        <span className="font-mono text-[11px] font-bold leading-none opacity-70">
          {referee.country}
        </span>
      )}
    </span>
  );
}

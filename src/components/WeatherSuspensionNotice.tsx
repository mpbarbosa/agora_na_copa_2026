import { CloudLightning, ExternalLink } from "lucide-react";

// Official FIFA World Cup 2026 regulations (PDF) — these govern when a match is
// suspended/abandoned, including for adverse weather. Same source the standings
// rules card links to. Not a standalone "weather protocol" document (FIFA does not
// publish one); the regulations are the authoritative reference.
const FIFA_REGULATIONS_URL =
  "https://digitalhub.fifa.com/m/636f5c9c6f29771f/original/FWC2026_regulations_EN.pdf";

interface WeatherSuspensionNoticeProps {
  theme: "classic-light" | "stadium-dark";
  className?: string;
}

/**
 * Advisory shown when a match is SUSPENDED ("Paralisado") — e.g. a weather/lightning
 * stoppage — linking to the FIFA regulations that govern suspended matches.
 */
export function WeatherSuspensionNotice({ theme, className = "" }: WeatherSuspensionNoticeProps) {
  const isLight = theme === "classic-light";

  return (
    <a
      href={FIFA_REGULATIONS_URL}
      target="_blank"
      rel="noopener noreferrer"
      id="weather-suspension-notice"
      data-testid="weather-suspension-notice"
      title="Abrir o regulamento da FIFA sobre partidas suspensas"
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider transition ${
        isLight
          ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
          : "border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20"
      } ${className}`}
    >
      <CloudLightning size={14} aria-hidden="true" />
      <span className="normal-case tracking-normal">
        Partida paralisada — protocolo da FIFA para suspensão por condições de tempo
      </span>
      <ExternalLink size={12} aria-hidden="true" />
    </a>
  );
}

import { FlagIcon } from "./FlagIcon";
import { WorldCupNoteCarousel } from "./WorldCupNoteCarousel";
import { useEscapeKey } from "../hooks/useEscapeKey";
import type { CoachRecord } from "../utils/coachRecord";
import type { TeamTournamentStatus } from "../utils/teamTournamentStatus";

interface CoachCardProps {
  theme: "classic-light" | "stadium-dark";
  coachName: string;
  teamName: string;
  flagSvg?: string;
  primaryColor?: string;
  /** The team's record under this coach (group + knockout), from `coachRecord`. */
  record: CoachRecord;
  /** Concluded/derived tournament status ("Classificado para …", "Eliminada …"), reused from the team header. */
  status: TeamTournamentStatus | null;
  /** Optional editorial "Leitura do treinador" note (`## Section` markdown). Omitted when absent. */
  note?: string;
  onClose: () => void;
  id?: string;
}

// First letters of the first two name words, e.g. "Carlo Ancelotti" → "CA".
function coachInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toLocaleUpperCase("pt-BR") ?? "")
    .join("");
}

/**
 * Coach overlay card — the manager analogue of `PlayerOverlayCard`. Mirrors its visual shell
 * (accent bar, header, editorial-block stat tiles, swipeable note) but is driven only by data
 * the app actually has or can derive: the coach's name, the team, the team's tournament record
 * (computed from real results), the same tournament-status pill the team header shows, and an
 * optional authored note. No photo — coaches have none in our data — so the avatar is the
 * coach's initials (the player card uses the same no-photo fallback shape).
 */
export function CoachCard({
  theme,
  coachName,
  teamName,
  flagSvg,
  primaryColor,
  record,
  status,
  note,
  onClose,
  id,
}: CoachCardProps) {
  useEscapeKey(onClose);

  const accent = primaryColor ?? "#00e476";
  const isLight = theme === "classic-light";
  const cardBg = isLight ? "bg-white text-slate-900" : "bg-[#0c0d0e] text-white";
  const borderColor = isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)";
  const mutedClasses = isLight ? "text-slate-500" : "text-slate-400";
  const closeClasses = isLight
    ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
    : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10";

  const goalDifference = record.goalsFor - record.goalsAgainst;
  const tiles = [
    { label: "Jogos", value: record.played },
    { label: "Vitórias", value: record.wins },
    { label: "Empates", value: record.draws },
    { label: "Derrotas", value: record.losses },
  ];

  const statusToneClasses =
    status?.tone === "eliminated"
      ? isLight
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-rose-400/30 bg-rose-400/10 text-rose-300"
      : status?.tone === "champion"
        ? isLight
          ? "border-amber-300 bg-amber-50 text-amber-700"
          : "border-amber-400/30 bg-amber-400/10 text-amber-300"
        : isLight
          ? "border-[#009c3b]/30 bg-[#009c3b]/10 text-[#065f2c]"
          : "border-[#00e476]/25 bg-[#00e476]/10 text-[#a7e6bf]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 p-0 backdrop-blur-md sm:items-center sm:p-4"
      id={id}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-t-2xl border shadow-2xl sm:max-h-[90vh] sm:rounded-xl ${cardBg}`}
        style={{ borderColor }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Top accent bar — team colour */}
        <div className="h-1 w-full" style={{ background: accent }} />

        {/* Header */}
        <div className="relative overflow-hidden border-b px-4 py-3 sm:px-5 sm:py-4" style={{ borderColor }}>
          <button
            type="button"
            id={id ? `btn-close-${id}` : undefined}
            onClick={onClose}
            className={`absolute right-4 top-4 z-10 rounded border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition ${closeClasses}`}
          >
            Fechar
          </button>

          <p className={`font-mono text-[10px] uppercase tracking-[0.25em] ${mutedClasses}`}>
            Card do treinador
          </p>

          <div className="mt-2 flex items-center gap-3 pr-16 sm:pr-20">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-anton text-lg leading-none sm:h-14 sm:w-14 sm:text-xl"
              style={{ background: `${accent}1f`, color: accent, border: `2px solid ${accent}55` }}
              aria-hidden="true"
            >
              {coachInitials(coachName)}
            </div>
            <div className="min-w-0">
              <h4 className="font-anton text-2xl uppercase leading-none tracking-wide sm:text-4xl">
                {coachName}
              </h4>
              <p className={`mt-1.5 flex items-center gap-1.5 font-archivo text-sm ${mutedClasses}`}>
                {flagSvg && <FlagIcon flag={flagSvg} className="h-3.5 w-5 shrink-0" />}
                <span>Técnico • {teamName}</span>
              </p>
            </div>
          </div>

          {status && (
            <p
              id={id ? `${id}-status` : undefined}
              data-status-tone={status.tone}
              className={`mt-3 inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${statusToneClasses}`}
            >
              {status.label}
            </p>
          )}
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5">
          {/* Record tiles — editorial left-border blocks (mirrors the player card) */}
          <div className="grid grid-cols-4 gap-2" id={id ? `${id}-record` : undefined}>
            {tiles.map((tile) => (
              <div
                key={tile.label}
                className="min-w-0 border-l-[3px] pl-3 py-1.5"
                style={{ borderLeftColor: accent }}
              >
                <p
                  className="font-anton text-2xl uppercase leading-none break-words"
                  style={{ color: accent }}
                >
                  {tile.value}
                </p>
                <p className={`mt-1 font-mono text-[9px] uppercase tracking-wider ${mutedClasses}`}>
                  {tile.label}
                </p>
              </div>
            ))}
          </div>

          {/* Goals for / against / difference */}
          <div className="mt-5 border-t font-archivo text-sm" style={{ borderColor }}>
            <div className="flex items-center justify-between border-b py-2.5" style={{ borderColor }}>
              <span className={`font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                Gols (pró / contra)
              </span>
              <span className="font-semibold tabular-nums">
                {record.goalsFor} / {record.goalsAgainst}
              </span>
            </div>
            <div className="flex items-center justify-between border-b py-2.5" style={{ borderColor }}>
              <span className={`font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                Saldo
              </span>
              <span className="font-semibold tabular-nums">
                {goalDifference > 0 ? `+${goalDifference}` : goalDifference}
              </span>
            </div>
          </div>

          {/* Editorial coach note — swipeable section carousel, when authored */}
          {note && (
            <div className="mt-5">
              <WorldCupNoteCarousel
                note={note}
                isLight={isLight}
                mutedClasses={mutedClasses}
                id={id ? `${id}-leitura` : undefined}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

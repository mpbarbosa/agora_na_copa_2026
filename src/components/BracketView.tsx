import { useMemo } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { KNOCKOUT_MATCHES } from "../data/knockoutBracket";
import type { KnockoutMatch, Match } from "../types";
import { computeStandings, groupStandings } from "../standings";
import type { QualificationStatus } from "../standings";
import { FlagIcon } from "./FlagIcon";

interface BracketViewProps {
  theme: "classic-light" | "stadium-dark";
  matches: Match[];
}

type Stage = KnockoutMatch["stage"];
type Slot = "A" | "B";

const STAGE_ORDER: Stage[] = ["R32", "R16", "QF", "SF", "TP", "F"];

const STAGE_LABELS: Record<Stage, string> = {
  R32: "16 avos",
  R16: "Oitavas",
  QF: "Quartas",
  SF: "Semifinais",
  TP: "3º lugar",
  F: "Final",
};

interface TeamMeta {
  name: string;
  code: string;
  flagSvg: string;
}

interface ProvisionalSlot {
  team: TeamMeta;
  status: QualificationStatus;
}

// Brasília-time kickoff, e.g. "28 jun · 16:00". Module-level formatters avoid
// re-allocating per render and never read Date.now (safe in this codebase).
const DAY_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "America/Sao_Paulo",
});
const TIME_FMT = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function formatKickoff(iso: string): string {
  const date = new Date(iso);
  const day = DAY_FMT.format(date).replace(" de ", " ").replace(".", "");
  return `${day} · ${TIME_FMT.format(date)}`;
}

// Humanize an official FIFA slot label into pt-BR:
//   "1A" → "1º A", "2B" → "2º B", "3EHIJK" → "3º E/H/I/J/K",
//   "W74" → "Vencedor #74", "RU101" → "Perdedor #101".
function humanizeSlot(slot: string): string {
  const groupPos = slot.match(/^([12])([A-L])$/);
  if (groupPos) return `${groupPos[1]}º ${groupPos[2]}`;
  const bestThird = slot.match(/^3([A-L]{2,})$/);
  if (bestThird) return `3º ${bestThird[1].split("").join("/")}`;
  const winner = slot.match(/^W(\d+)$/);
  if (winner) return `Vencedor #${winner[1]}`;
  const loser = slot.match(/^RU(\d+)$/);
  if (loser) return `Perdedor #${loser[1]}`;
  return slot;
}

// All 48 teams keyed by code, for resolving a confirmed knockout team's flag/name.
function buildTeamMetaMap(matches: Match[]): Map<string, TeamMeta> {
  const map = new Map<string, TeamMeta>();
  for (const row of computeStandings(matches)) {
    map.set(row.code, { name: row.name, code: row.code, flagSvg: row.flagSvg });
  }
  return map;
}

// Map official R32 group-position slots ("1A","2B",…) to the team currently holding
// that spot, from live standings. Best-third combo slots ("3EHIJK") and winner/loser
// refs ("W74","RU101") are intentionally NOT resolved — their official allocation is
// only fixed once results come in, so those labels render verbatim rather than
// inventing a pairing (data accuracy is a hard requirement).
function buildGroupPositionMap(matches: Match[]): Map<string, ProvisionalSlot> {
  const rows = computeStandings(matches);
  const groups = groupStandings(rows, matches);
  const map = new Map<string, ProvisionalSlot>();

  for (const { group, rows: groupRows, qualification } of groups) {
    const letterMatch = group.match(/Grupo ([A-L])/);
    if (!letterMatch) continue;
    const letter = letterMatch[1];

    groupRows.slice(0, 2).forEach((row, idx) => {
      const status = qualification.get(row.code) ?? "contention";
      if (status === "eliminated") return;
      map.set(`${idx + 1}${letter}`, {
        team: { name: row.name, code: row.code, flagSvg: row.flagSvg },
        status,
      });
    });
  }

  return map;
}

// --- Sub-components ---

interface BracketSlotRowProps {
  matchNumber: number;
  slot: Slot;
  rawSlot: string;
  confirmed: TeamMeta | null;
  provisional: ProvisionalSlot | null;
  theme: "classic-light" | "stadium-dark";
}

function BracketSlotRow({
  matchNumber,
  slot,
  rawSlot,
  confirmed,
  provisional,
  theme,
}: BracketSlotRowProps) {
  const isLight = theme === "classic-light";
  const team = confirmed ?? provisional?.team ?? null;
  const isConfirmed = !!confirmed;
  const isQualified = provisional?.status === "qualified";

  const rowClasses = team
    ? isConfirmed
      ? isLight
        ? "border-[#009c3b]/30 bg-[#009c3b]/5 text-[#065f2c]"
        : "border-[#00e476]/25 bg-[#00e476]/5 text-[#a7e6bf]"
      : isQualified
        ? isLight
          ? "border-[#009c3b]/30 bg-[#009c3b]/5 text-[#065f2c]"
          : "border-[#00e476]/25 bg-[#00e476]/5 text-[#a7e6bf]"
        : isLight
          ? "border-dashed border-amber-400/60 bg-amber-50/40 text-slate-700"
          : "border-dashed border-[#ffd84d]/35 bg-[#ffd84d]/5 text-slate-200"
    : isLight
      ? "border-slate-200 bg-slate-50 text-slate-500"
      : "border-white/10 bg-white/5 text-slate-400";

  return (
    <div
      id={`bracket-slot-${matchNumber}-${slot.toLowerCase()}`}
      className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2 font-archivo text-sm leading-5 ${rowClasses}`}
    >
      {team ? (
        <>
          <span className="flex min-w-0 items-center gap-2">
            <FlagIcon flag={team.flagSvg} className="h-4 w-6 shrink-0 rounded-[2px]" />
            <span className="truncate">{team.name}</span>
          </span>
          {isConfirmed ? null : isQualified ? (
            <span
              className={`shrink-0 font-mono text-[9px] font-bold ${
                isLight ? "text-[#009c3b]" : "text-[#00e476]"
              }`}
            >
              ✓
            </span>
          ) : (
            <span
              className={`shrink-0 rounded border px-1 py-0.5 font-mono text-[8px] uppercase tracking-wider ${
                isLight ? "border-amber-400/60 text-amber-700" : "border-[#ffd84d]/40 text-[#ffd84d]/70"
              }`}
            >
              prov.
            </span>
          )}
        </>
      ) : (
        <span className="truncate font-mono text-[11px] uppercase tracking-wider opacity-80">
          {humanizeSlot(rawSlot)}
        </span>
      )}
    </div>
  );
}

interface BracketMatchCardProps {
  match: KnockoutMatch;
  theme: "classic-light" | "stadium-dark";
  teamMeta: Map<string, TeamMeta>;
  groupPositions: Map<string, ProvisionalSlot>;
}

function BracketMatchCard({ match, theme, teamMeta, groupPositions }: BracketMatchCardProps) {
  const isLight = theme === "classic-light";
  const cardClasses = isLight ? "bg-white border-slate-200" : "bg-[#161919] border-white/10";
  const subtleClasses = isLight ? "text-slate-500" : "text-slate-400";

  const resolveConfirmed = (ref: KnockoutMatch["teamA"]): TeamMeta | null => {
    if (!ref) return null;
    const meta = teamMeta.get(ref.code);
    return meta ?? { name: ref.name, code: ref.code, flagSvg: ref.code.toLowerCase() };
  };

  // Provisional group-position resolution only applies to R32 group slots and only
  // when the team isn't already confirmed.
  const resolveProvisional = (rawSlot: string, confirmed: TeamMeta | null): ProvisionalSlot | null =>
    confirmed ? null : (groupPositions.get(rawSlot) ?? null);

  const confirmedA = resolveConfirmed(match.teamA);
  const confirmedB = resolveConfirmed(match.teamB);

  return (
    <article
      id={`bracket-match-${match.matchNumber}`}
      className={`rounded-2xl border p-3 ${cardClasses}`}
    >
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider ${subtleClasses}`}>
        <span className="font-bold">#{match.matchNumber}</span>
        <span className="inline-flex items-center gap-1">
          <CalendarDays size={11} /> {formatKickoff(match.dateUtc)}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin size={11} /> {match.city}
        </span>
      </div>

      <div className="mt-2.5 flex flex-col gap-2">
        <BracketSlotRow
          matchNumber={match.matchNumber}
          slot="A"
          rawSlot={match.slotA}
          confirmed={confirmedA}
          provisional={resolveProvisional(match.slotA, confirmedA)}
          theme={theme}
        />
        <BracketSlotRow
          matchNumber={match.matchNumber}
          slot="B"
          rawSlot={match.slotB}
          confirmed={confirmedB}
          provisional={resolveProvisional(match.slotB, confirmedB)}
          theme={theme}
        />
      </div>

      <p className={`mt-2 truncate font-mono text-[9px] uppercase tracking-wider ${subtleClasses}`}>
        {match.stadium}
      </p>
    </article>
  );
}

interface BracketStageColumnProps {
  stage: Stage;
  matches: KnockoutMatch[];
  theme: "classic-light" | "stadium-dark";
  teamMeta: Map<string, TeamMeta>;
  groupPositions: Map<string, ProvisionalSlot>;
}

function BracketStageColumn({ stage, matches, theme, teamMeta, groupPositions }: BracketStageColumnProps) {
  const isLight = theme === "classic-light";
  const stageClasses = isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10";
  const headingClasses = isLight ? "text-slate-900" : "text-white";
  const subtleClasses = isLight ? "text-slate-500" : "text-slate-400";

  return (
    <section
      id={`bracket-stage-${stage.toLowerCase()}`}
      className={`h-full rounded-3xl border p-4 ${stageClasses}`}
    >
      <div className="mb-4">
        <h3 className={`font-anton text-lg uppercase tracking-wide ${headingClasses}`}>
          {STAGE_LABELS[stage]}
        </h3>
        <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${subtleClasses}`}>
          {stage === "F"
            ? "Grande final em East Rutherford"
            : stage === "TP"
              ? "Disputa do 3º lugar"
              : `${matches.length} confrontos`}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {matches.map((match) => (
          <div key={match.matchNumber}>
            <BracketMatchCard
              match={match}
              theme={theme}
              teamMeta={teamMeta}
              groupPositions={groupPositions}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

// --- Main component ---

export function BracketView({ theme, matches }: BracketViewProps) {
  const teamMeta = useMemo(() => buildTeamMetaMap(matches), [matches]);
  const groupPositions = useMemo(() => buildGroupPositionMap(matches), [matches]);

  const matchesByStage = useMemo(() => {
    const grouped = new Map<Stage, KnockoutMatch[]>();
    for (const stage of STAGE_ORDER) grouped.set(stage, []);
    for (const match of KNOCKOUT_MATCHES) grouped.get(match.stage)?.push(match);
    for (const list of grouped.values()) list.sort((a, b) => a.matchNumber - b.matchNumber);
    return grouped;
  }, []);

  const isLight = theme === "classic-light";
  const shellClasses = isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#121414] border-white/10";
  const headingClasses = isLight ? "text-slate-900" : "text-white";
  const mutedClasses = isLight ? "text-slate-600" : "text-slate-300";

  return (
    <div className="mx-auto mt-8 max-w-7xl px-4 2xl:max-w-[1700px]" id="bracket-view">
      <div className="flex flex-col gap-1">
        <h2
          className={`font-anton text-2xl md:text-3xl uppercase tracking-wider ${headingClasses}`}
          id="bracket-title"
        >
          Chaveamento do Mata-Mata
        </h2>
        <p className={`font-mono text-[11px] uppercase tracking-wider ${mutedClasses}`}>
          Tabela oficial da FIFA • datas no horário de Brasília • vagas dos 16 avos preenchidas
          provisoriamente pela classificação atual
        </p>
      </div>

      <div className={`mt-6 rounded-3xl border p-4 md:p-5 ${shellClasses}`} id="bracket-shell">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className={`font-anton text-lg uppercase tracking-wide ${headingClasses}`}>
              Rota até MetLife Stadium
            </p>
            <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
              East Rutherford • 16 avos → final • inclui a disputa do 3º lugar
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
                isLight
                  ? "border-[#009c3b]/30 bg-[#009c3b]/5 text-[#009c3b]"
                  : "border-[#00e476]/25 bg-[#00e476]/5 text-[#00e476]"
              }`}
            >
              <span className="font-bold">✓</span> Classificado
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
                isLight
                  ? "border-dashed border-amber-400/60 text-amber-700"
                  : "border-dashed border-[#ffd84d]/40 text-[#ffd84d]/80"
              }`}
            >
              prov. Provisório
            </span>
            <span
              className={`inline-flex rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
                isLight
                  ? "border-slate-200 bg-slate-50 text-slate-600"
                  : "border-white/10 bg-white/5 text-slate-200"
              }`}
            >
              Demais vagas: rótulos oficiais
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6 2xl:gap-5" id="bracket-stage-grid">
          {STAGE_ORDER.map((stage) => (
            <div key={stage}>
              <BracketStageColumn
                stage={stage}
                matches={matchesByStage.get(stage) ?? []}
                theme={theme}
                teamMeta={teamMeta}
                groupPositions={groupPositions}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useMemo, useRef, useState } from "react";
import { CalendarDays, MapPin, Medal } from "lucide-react";
import { KNOCKOUT_MATCHES } from "../data/knockoutBracket";
import type { KnockoutMatch, Match, TeamRef } from "../types";
import { computeStandings, buildGroupPositionMap } from "../standings";
import type { QualificationStatus, ProvisionalSlot } from "../standings";
import { humanizeSlot, describeBestThirdSlot, bestThirdGroups } from "../utils/knockoutSlots";
import { FlagIcon } from "./FlagIcon";
import { BracketPredictorPanel } from "./BracketPredictorPanel";
import type { PredictableFixture, ResolvedSlotTeam } from "./BracketPredictorPanel";

interface BracketViewProps {
  theme: "classic-light" | "stadium-dark";
  matches: Match[];
  onSelectTeamLineup: (team: TeamRef) => void;
  onSelectMatch: (matchId: string) => void;
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
  primaryColor: string;
  secondaryColor: string;
  group: string;
}

const NEUTRAL_COLORS = { primaryColor: "#64748b", secondaryColor: "#94a3b8", group: "" };

// A slot's resolved team (confirmed or provisional) as a TeamRef, for opening its page.
function toTeamRef(team: TeamMeta | ProvisionalSlot["team"]): TeamRef {
  return {
    name: team.name,
    code: team.code,
    flagSvg: team.flagSvg,
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
    group: team.group,
  };
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

// Map a knockout fixture's FIFA match number → the corresponding APP_MATCHES id
// (knockout ids are "ko-<matchNumber>-<year>"), so a bracket card can open the
// real match page. Parsed from the ids rather than hard-coding the year suffix.
function buildKnockoutMatchIdByNumber(matches: Match[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const match of matches) {
    const n = /^ko-(\d+)-/.exec(match.id);
    if (n) map.set(Number(n[1]), match.id);
  }
  return map;
}

// A later-round slot references its feeder fixture by number — "W74" (winner of #74),
// "RU101" (runner-up / loser of #101). Parse those out so hovering a card can highlight
// the matches that feed it. Group / best-third slots ("2A", "3ABCDF") have no feeder.
function feederMatchNumbers(match: KnockoutMatch): number[] {
  const numbers: number[] = [];
  for (const slot of [match.slotA, match.slotB]) {
    const parsed = /^(?:W|RU|L)(\d+)$/.exec(slot);
    if (parsed) numbers.push(Number(parsed[1]));
  }
  return numbers;
}

// The set of feeder fixtures to spotlight when a card is hovered: their match numbers
// and the stage (column) they live in, so only that column is filtered.
interface FeederHighlight {
  stage: Stage;
  numbers: Set<number>;
}

// All 48 teams keyed by code, for resolving a confirmed knockout team's flag/name.
function buildTeamMetaMap(matches: Match[]): Map<string, TeamMeta> {
  const map = new Map<string, TeamMeta>();
  for (const row of computeStandings(matches)) {
    map.set(row.code, {
      name: row.name,
      code: row.code,
      flagSvg: row.flagSvg,
      primaryColor: row.primaryColor,
      secondaryColor: row.secondaryColor,
      group: row.group,
    });
  }
  return map;
}

// Resolve a knockout slot to a team — confirmed ref (filled by results) first, then
// the provisional group-position holder from current standings. Best-third combo and
// winner/loser refs have no entry in either map, so they resolve to null. Mirrors the
// resolution BracketMatchCard renders, but flattened to the shape the predictor needs.
function resolveSlotTeam(
  rawSlot: string,
  confirmedRef: KnockoutMatch["teamA"],
  teamMeta: Map<string, TeamMeta>,
  groupPositions: Map<string, ProvisionalSlot>,
): ResolvedSlotTeam | null {
  if (confirmedRef) {
    const meta = teamMeta.get(confirmedRef.code);
    return meta
      ? { code: meta.code, name: meta.name, flagSvg: meta.flagSvg }
      : { code: confirmedRef.code, name: confirmedRef.name, flagSvg: confirmedRef.code.toLowerCase() };
  }
  const provisional = groupPositions.get(rawSlot)?.team;
  return provisional
    ? { code: provisional.code, name: provisional.name, flagSvg: provisional.flagSvg }
    : null;
}

// The knockout fixtures whose BOTH sides are already resolved (confirmed or provisional)
// — the only ones the match predictor can forecast. Ties with an unresolved slot (a
// best-third combo or a not-yet-played winner ref) are skipped.
function buildPredictableFixtures(
  teamMeta: Map<string, TeamMeta>,
  groupPositions: Map<string, ProvisionalSlot>,
): PredictableFixture[] {
  const fixtures: PredictableFixture[] = [];
  for (const match of KNOCKOUT_MATCHES) {
    const home = resolveSlotTeam(match.slotA, match.teamA, teamMeta, groupPositions);
    const away = resolveSlotTeam(match.slotB, match.teamB, teamMeta, groupPositions);
    if (!home || !away) continue;
    fixtures.push({
      matchNumber: match.matchNumber,
      stageLabel: STAGE_LABELS[match.stage],
      kickoff: formatKickoff(match.dateUtc),
      home,
      away,
    });
  }
  return fixtures.sort((a, b) => a.matchNumber - b.matchNumber);
}

// --- Sub-components ---

interface BracketSlotRowProps {
  matchNumber: number;
  slot: Slot;
  rawSlot: string;
  confirmed: TeamMeta | null;
  provisional: ProvisionalSlot | null;
  theme: "classic-light" | "stadium-dark";
  onSelectTeamLineup: (team: TeamRef) => void;
}

function BracketSlotRow({
  matchNumber,
  slot,
  rawSlot,
  confirmed,
  provisional,
  theme,
  onSelectTeamLineup,
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

  const id = `bracket-slot-${matchNumber}-${slot.toLowerCase()}`;
  const baseClassName = `flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2 font-archivo text-sm leading-5 ${rowClasses}`;
  // Best-third combo slots ("3CDFGH") render as a terse "Melhor 3º · …" label;
  // spell out what it means for screen readers and on hover. Null for other slots.
  const bestThirdDescription = team ? null : describeBestThirdSlot(rawSlot);

  const content = team ? (
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
    (() => {
      const label = (
        <span className="whitespace-normal break-words leading-tight font-mono text-[11px] uppercase tracking-wider opacity-80">
          {humanizeSlot(rawSlot)}
        </span>
      );
      // A best-third combo slot gets a bronze medal badge so it reads as a
      // "3rd-place qualifier" berth at a glance — distinct from a plain
      // winner/loser feeder ("Vencedor #79"), which keeps the bare label. The
      // badge already conveys "Melhor 3º", so the label is just the group
      // shortlist (the differentiating bit), avoiding a redundant prefix.
      const groups = bestThirdGroups(rawSlot);
      if (!groups) return label;
      return (
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={`inline-flex shrink-0 items-center rounded border px-1 py-0.5 ${
              isLight
                ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
                : "border-amber-400/30 bg-amber-400/10 text-amber-300"
            }`}
            aria-hidden="true"
          >
            <Medal size={11} />
          </span>
          <span className="whitespace-normal break-words leading-tight font-mono text-[11px] uppercase tracking-wider opacity-80">
            {groups}
          </span>
        </span>
      );
    })()
  );

  // A resolved team (confirmed or provisional) is clickable → opens its team page.
  // Undecided slots (winner/loser refs, best-third combos) render as a plain label.
  if (team) {
    return (
      <button
        type="button"
        id={id}
        onClick={(e) => {
          // The card itself opens the match page; a team row opens that team's page.
          e.stopPropagation();
          onSelectTeamLineup(toTeamRef(team));
        }}
        aria-label={`Ver seleção ${team.name}`}
        className={`${baseClassName} w-full cursor-pointer text-left transition hover:brightness-95`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      id={id}
      className={baseClassName}
      title={bestThirdDescription ?? undefined}
      aria-label={bestThirdDescription ?? undefined}
    >
      {content}
    </div>
  );
}

interface BracketMatchCardProps {
  match: KnockoutMatch;
  theme: "classic-light" | "stadium-dark";
  teamMeta: Map<string, TeamMeta>;
  groupPositions: Map<string, ProvisionalSlot>;
  /** APP_MATCHES id for this fixture, when present — enables opening its match page. */
  matchId: string | null;
  /** Active feeder spotlight (from a hovered later-round card), or null. */
  feederHighlight: FeederHighlight | null;
  /** The currently spotlighted match number (hover/focus/tap), or null. */
  hoveredMatch: number | null;
  onHoverMatch: (matchNumber: number | null) => void;
  onSelectTeamLineup: (team: TeamRef) => void;
  onSelectMatch: (matchId: string) => void;
}

function BracketMatchCard({ match, theme, teamMeta, groupPositions, matchId, feederHighlight, hoveredMatch, onHoverMatch, onSelectTeamLineup, onSelectMatch }: BracketMatchCardProps) {
  const isLight = theme === "classic-light";
  const cardClasses = isLight ? "bg-white border-slate-200" : "bg-[#161919] border-white/10";
  const subtleClasses = isLight ? "text-slate-500" : "text-slate-400";

  // When another card is hovered, spotlight the fixtures that feed it: ring the feeders
  // and hide the rest of that same column (kept in the layout via visibility:hidden so the
  // feeders stay aligned with their connectors). Cards in other columns are left untouched.
  const isFeeder = feederHighlight?.numbers.has(match.matchNumber) ?? false;
  const isHidden = !!feederHighlight && feederHighlight.stage === match.stage && !isFeeder;
  const highlightState = isFeeder ? "feeder" : isHidden ? "hidden" : "none";
  const feederRingClass = isFeeder
    ? isLight
      ? "ring-2 ring-[#009c3b]"
      : "ring-2 ring-[#00e476]"
    : "";
  const hideClass = isHidden ? "invisible" : "";

  // Two-stage tap: on touch, the first tap on a feeder-bearing card reveals its feeders
  // (no navigation); a second tap on the already-spotlighted card opens its match. We
  // snapshot the active state and pointer type at pointerdown — before any focus/emulated
  // mouse events fire — so the first tap can never be mistaken for the second.
  const hasFeeders = feederMatchNumbers(match).length > 0;
  const pointerTypeRef = useRef("mouse");
  const wasActiveAtDownRef = useRef(false);

  const resolveConfirmed = (ref: KnockoutMatch["teamA"]): TeamMeta | null => {
    if (!ref) return null;
    const meta = teamMeta.get(ref.code);
    return meta ?? { name: ref.name, code: ref.code, flagSvg: ref.code.toLowerCase(), ...NEUTRAL_COLORS };
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
      data-feeder-highlight={highlightState}
      // Mouse spotlights on hover and opens on click; keyboard spotlights on focus (Tab)
      // and opens on Enter (click detail 0); touch uses the two-stage tap below. tabIndex
      // makes the card focusable for keyboard users and a visible focus ring. Hover is
      // driven by POINTER events guarded to a real mouse — the emulated mouseenter/leave
      // a tap fires would otherwise clear the spotlight the tap just set.
      tabIndex={0}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") onHoverMatch(match.matchNumber);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") onHoverMatch(null);
      }}
      onFocus={() => onHoverMatch(match.matchNumber)}
      onBlur={() => onHoverMatch(null)}
      onPointerDown={(event) => {
        pointerTypeRef.current = event.pointerType || "mouse";
        wasActiveAtDownRef.current = hoveredMatch === match.matchNumber;
      }}
      onClick={(event) => {
        const isTouch = pointerTypeRef.current === "touch" || pointerTypeRef.current === "pen";
        // First touch tap on a feeder-bearing card: reveal feeders, keep focus, don't open.
        if (event.detail !== 0 && isTouch && hasFeeders && !wasActiveAtDownRef.current) {
          onHoverMatch(match.matchNumber);
          event.currentTarget.focus({ preventScroll: true });
          return;
        }
        if (matchId) onSelectMatch(matchId);
      }}
      className={`rounded-2xl border p-3 outline-none transition focus-visible:ring-2 focus-visible:ring-sky-400 ${cardClasses} ${feederRingClass} ${hideClass} ${matchId ? "cursor-pointer hover:brightness-95" : ""}`}
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
          onSelectTeamLineup={onSelectTeamLineup}
        />
        <BracketSlotRow
          matchNumber={match.matchNumber}
          slot="B"
          rawSlot={match.slotB}
          confirmed={confirmedB}
          provisional={resolveProvisional(match.slotB, confirmedB)}
          theme={theme}
          onSelectTeamLineup={onSelectTeamLineup}
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
  matchIdByNumber: Map<number, string>;
  feederHighlight: FeederHighlight | null;
  hoveredMatch: number | null;
  onHoverMatch: (matchNumber: number | null) => void;
  onSelectTeamLineup: (team: TeamRef) => void;
  onSelectMatch: (matchId: string) => void;
}

function BracketStageColumn({ stage, matches, theme, teamMeta, groupPositions, matchIdByNumber, feederHighlight, hoveredMatch, onHoverMatch, onSelectTeamLineup, onSelectMatch }: BracketStageColumnProps) {
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
              matchId={matchIdByNumber.get(match.matchNumber) ?? null}
              feederHighlight={feederHighlight}
              hoveredMatch={hoveredMatch}
              onHoverMatch={onHoverMatch}
              onSelectTeamLineup={onSelectTeamLineup}
              onSelectMatch={onSelectMatch}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

// --- Main component ---

export function BracketView({ theme, matches, onSelectTeamLineup, onSelectMatch }: BracketViewProps) {
  const teamMeta = useMemo(() => buildTeamMetaMap(matches), [matches]);
  const groupPositions = useMemo(() => buildGroupPositionMap(matches), [matches]);
  const matchIdByNumber = useMemo(() => buildKnockoutMatchIdByNumber(matches), [matches]);
  const predictableFixtures = useMemo(
    () => buildPredictableFixtures(teamMeta, groupPositions),
    [teamMeta, groupPositions],
  );

  const matchesByStage = useMemo(() => {
    const grouped = new Map<Stage, KnockoutMatch[]>();
    for (const stage of STAGE_ORDER) grouped.set(stage, []);
    for (const match of KNOCKOUT_MATCHES) grouped.get(match.stage)?.push(match);
    for (const list of grouped.values()) list.sort((a, b) => a.matchNumber - b.matchNumber);
    return grouped;
  }, []);

  // Hovering a card spotlights the fixtures that feed it in the previous column
  // (e.g. an Oitavas tie highlights its two 16-avos feeders, hiding the rest).
  const [hoveredMatch, setHoveredMatch] = useState<number | null>(null);
  const feederHighlight = useMemo<FeederHighlight | null>(() => {
    if (hoveredMatch === null) return null;
    const match = KNOCKOUT_MATCHES.find((m) => m.matchNumber === hoveredMatch);
    if (!match) return null;
    const numbers = feederMatchNumbers(match);
    if (numbers.length === 0) return null;
    const feederStage = KNOCKOUT_MATCHES.find((m) => m.matchNumber === numbers[0])?.stage;
    if (!feederStage) return null;
    return { stage: feederStage, numbers: new Set(numbers) };
  }, [hoveredMatch]);

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
          Mata-mata da Copa
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
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
                isLight
                  ? "border-amber-500/40 bg-amber-500/5 text-amber-700"
                  : "border-amber-400/30 bg-amber-400/5 text-amber-300"
              }`}
            >
              <Medal size={11} /> Melhor 3º
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
                matchIdByNumber={matchIdByNumber}
                feederHighlight={feederHighlight}
                hoveredMatch={hoveredMatch}
                onHoverMatch={setHoveredMatch}
                onSelectTeamLineup={onSelectTeamLineup}
                onSelectMatch={onSelectMatch}
              />
            </div>
          ))}
        </div>
      </div>

      <BracketPredictorPanel theme={theme} fixtures={predictableFixtures} />
    </div>
  );
}

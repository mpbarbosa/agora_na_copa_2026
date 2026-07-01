import { useMemo } from "react";
import { Trophy, RotateCw } from "lucide-react";
import { KNOCKOUT_MATCHES } from "../data/knockoutBracket";
import type { KnockoutMatch, TeamRef } from "../types";
import type { ProvisionalSlot } from "../standings";
import { feederNumbersOf } from "../utils/knockoutFeeders";
import { humanizeSlot } from "../utils/knockoutSlots";
import { FlagIcon } from "./FlagIcon";

type Theme = "classic-light" | "stadium-dark";
type Slot = "A" | "B";

interface TeamMeta {
  name: string;
  code: string;
  flagSvg: string;
  primaryColor: string;
  secondaryColor: string;
  group: string;
}

interface FullBracketViewProps {
  theme: Theme;
  teamMeta: Map<string, TeamMeta>;
  feederTeamBySlot: Map<string, NonNullable<KnockoutMatch["teamA"]>>;
  groupPositions: Map<string, ProvisionalSlot>;
  winnerSlotByNumber: Map<number, Slot>;
  onSelectTeamLineup: (team: TeamRef) => void;
}

// Roots of the two halves of the draw (the two semifinals feeding the final #104).
const LEFT_SF = 101;
const RIGHT_SF = 102;
const FINAL = 104;

// Short pt-BR round label per stage, for the column headers along the top of the bracket.
const STAGE_SHORT: Record<KnockoutMatch["stage"], string> = {
  R32: "16-avos",
  R16: "Oitavas",
  QF: "Quartas",
  SF: "Semis",
  TP: "3º lugar",
  F: "Final",
};

// Rounds of one half, OUTER (R32, 8 ties) → INNER (SF, 1), by walking the feeder tree down
// from the half's semifinal. Bottoms out at R32 (feederNumbersOf returns [] there).
function halfRoundsOuterToInner(sfNumber: number): number[][] {
  const levels: number[][] = [[sfNumber]];
  let level = [sfNumber];
  for (;;) {
    const next = level.flatMap(feederNumbersOf);
    if (next.length === 0) break;
    levels.push(next);
    level = next;
  }
  return levels.reverse();
}

interface SlotDisplay {
  flagSvg: string;
  code: string;
  name: string;
  ref: TeamRef | null;
  /** True while the tie is undecided and no concrete team fills the slot yet. */
  blank: boolean;
  /** True once the tie finished and THIS slot is the side that lost (dimmed). */
  lost: boolean;
}

export function FullBracketView({
  theme,
  teamMeta,
  feederTeamBySlot,
  groupPositions,
  winnerSlotByNumber,
  onSelectTeamLineup,
}: FullBracketViewProps) {
  const isLight = theme === "classic-light";
  const line = isLight ? "#cbd5e1" : "#3a3f3f";
  const mutedClasses = isLight ? "text-slate-500" : "text-slate-400";
  const cellBg = isLight ? "bg-white border-slate-200" : "bg-[#161919] border-white/10";
  const blankBg = isLight ? "bg-slate-50 border-dashed border-slate-200" : "bg-white/5 border-dashed border-white/10";

  const byNumber = useMemo(() => new Map(KNOCKOUT_MATCHES.map((m) => [m.matchNumber, m])), []);
  const leftRounds = useMemo(() => halfRoundsOuterToInner(LEFT_SF), []);
  const rightRounds = useMemo(() => halfRoundsOuterToInner(RIGHT_SF), []);

  const slotDisplay = (matchNumber: number, slot: Slot): SlotDisplay => {
    const km = byNumber.get(matchNumber);
    const empty = { flagSvg: "", code: "", name: "", ref: null, blank: true, lost: false };
    if (!km) return empty;
    const rawSlot = slot === "A" ? km.slotA : km.slotB;
    const lost = winnerSlotByNumber.has(matchNumber) && winnerSlotByNumber.get(matchNumber) !== slot;
    const ref = (slot === "A" ? km.teamA : km.teamB) ?? feederTeamBySlot.get(rawSlot) ?? null;
    if (ref) {
      const meta = teamMeta.get(ref.code);
      const team: TeamRef = meta
        ? { name: meta.name, code: meta.code, flagSvg: meta.flagSvg, primaryColor: meta.primaryColor, secondaryColor: meta.secondaryColor, group: meta.group }
        : { name: ref.name, code: ref.code, flagSvg: ref.code.toLowerCase(), primaryColor: "#64748b", secondaryColor: "#94a3b8", group: "" };
      return { flagSvg: team.flagSvg, code: team.code, name: team.name, ref: team, blank: false, lost };
    }
    const prov = groupPositions.get(rawSlot);
    if (prov) {
      const t = prov.team;
      const team: TeamRef = { name: t.name, code: t.code, flagSvg: t.flagSvg, primaryColor: t.primaryColor, secondaryColor: t.secondaryColor, group: t.group };
      return { flagSvg: t.flagSvg, code: t.code, name: t.name, ref: team, blank: false, lost };
    }
    return { ...empty, name: humanizeSlot(rawSlot) };
  };

  // One flag cell (a single knockout slot). Blank slots render a dashed placeholder box.
  const SlotCell = ({ d }: { d: SlotDisplay }) => {
    const base = `flex h-7 w-11 xl:h-8 xl:w-[52px] items-center justify-center rounded-md border p-0.5 transition ${d.blank ? blankBg : cellBg} ${d.lost ? "opacity-40" : ""}`;
    if (d.blank || !d.ref) return <div className={base} aria-hidden="true" />;
    const team = d.ref;
    return (
      <button
        type="button"
        title={d.name}
        aria-label={`Abrir seleção ${d.name}`}
        onClick={() => onSelectTeamLineup(team)}
        className={`${base} hover:brightness-95`}
      >
        <FlagIcon flag={d.flagSvg} className="h-full w-full rounded-sm object-contain" />
      </button>
    );
  };

  // A match box = its two stacked slot cells. flex-1 so each box centres in its row band and
  // sibling boxes' shared boundary lands on the parent's centre (a balanced binary tree).
  const MatchBox = ({ matchNumber }: { matchNumber: number }) => (
    <div className="flex flex-col justify-center gap-1">
      <SlotCell d={slotDisplay(matchNumber, "A")} />
      <SlotCell d={slotDisplay(matchNumber, "B")} />
    </div>
  );

  // The elbow that joins a box to what it feeds. `dir` points toward the parent column: for the
  // left half the parent is inward (right); for the right half it's inward (left). `single` is
  // the SF → final link (a lone horizontal line, no pair join). Otherwise the top child (even
  // index) drops a half-vertical to the pair midpoint and the bottom child (odd) raises one.
  const Connector = ({ index, single, dir }: { index: number; single: boolean; dir: "right" | "left" }) => {
    const isTop = index % 2 === 0;
    const hEdge = dir === "right" ? { left: 0, right: 0 } : { left: 0, right: 0 };
    const vEdge = dir === "right" ? { right: 0 } : { left: 0 };
    return (
      <div className="relative w-3 self-stretch" aria-hidden="true">
        <span className="absolute top-1/2 -translate-y-1/2 border-t-2" style={{ borderColor: line, ...hEdge }} />
        {!single && (
          <span
            className={`absolute border-l-2 ${isTop ? "top-1/2 bottom-0" : "top-0 bottom-1/2"}`}
            style={{ borderColor: line, ...vEdge }}
          />
        )}
      </div>
    );
  };

  const headerClasses = `mb-2 text-center font-mono text-[9px] uppercase tracking-widest ${mutedClasses}`;

  // One round column for a half: a stage header, then the match boxes filling the height.
  // `dir` is the side the connector points (toward center).
  const renderRound = (round: number[], key: string, isInnermost: boolean, dir: "right" | "left") => {
    const stage = byNumber.get(round[0])?.stage;
    return (
      <div key={key} className="flex flex-col">
        <p className={headerClasses}>{stage ? STAGE_SHORT[stage] : ""}</p>
        <div className="flex flex-1 flex-col justify-around">
          {round.map((matchNumber, index) => (
            <div key={matchNumber} className="flex flex-1 items-center">
              {dir === "left" && <Connector index={index} single={isInnermost} dir="left" />}
              <MatchBox matchNumber={matchNumber} />
              {dir === "right" && <Connector index={index} single={isInnermost} dir="right" />}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div id="bracket-full">
      {/* Mobile portrait: the full bracket is too wide — ask to rotate. */}
      <div
        className={`hidden max-md:portrait:flex flex-col items-center gap-3 rounded-2xl border px-6 py-12 text-center ${blankBg}`}
        id="bracket-full-rotate-hint"
      >
        <RotateCw size={28} className={mutedClasses} />
        <p className={`font-mono text-xs uppercase tracking-wider ${mutedClasses}`}>
          Gire o celular para o modo horizontal para ver a chave completa
        </p>
      </div>

      {/* Bracket (hidden on mobile portrait; scrolls horizontally if the viewport is narrow). */}
      <div className="max-md:portrait:hidden overflow-x-auto pb-2">
        <div className="mx-auto flex min-w-[920px] items-stretch justify-center gap-1" style={{ minHeight: 560 }}>
          {leftRounds.map((round, i) => renderRound(round, `l${i}`, i === leftRounds.length - 1, "right"))}

          {/* Center: the final + trophy. */}
          <div className="flex flex-col px-2">
            <p className={headerClasses}>{STAGE_SHORT.F}</p>
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <MatchBox matchNumber={FINAL} />
              <Trophy size={40} className={isLight ? "text-amber-500" : "text-amber-300"} />
            </div>
          </div>

          {[...rightRounds].reverse().map((round, i) => renderRound(round, `r${i}`, i === 0, "left"))}
        </div>
      </div>
    </div>
  );
}

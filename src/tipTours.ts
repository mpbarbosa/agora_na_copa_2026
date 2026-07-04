import { driver, type Side, type Alignment } from "driver.js";
import "driver.js/dist/driver.css";
import { startMessiTour } from "./messiTour";
import { clearBracketSpotlight } from "./bracketHover";
import { translate, getActiveLocale } from "./i18n";

type Theme = "classic-light" | "stadium-dark";

/** Resolve a `tours.` key against the active locale at call time. */
const t = (key: string, params?: Record<string, string | number>) =>
  translate(getActiveLocale(), key, params);

/** Poll until `selector` exists (or timeout), then run cb — for awaiting async navigation/render. */
function waitForElement(selector: string, cb: () => void, timeoutMs = 3000) {
  const start = Date.now();
  const tick = () => {
    if (document.querySelector(selector) || Date.now() - start > timeoutMs) {
      cb();
      return;
    }
    requestAnimationFrame(tick);
  };
  tick();
}

// One step of an action-driven walkthrough. On "Próximo", `act` performs the real
// UI action (navigate / open) and, if `waitFor` is set, the tour advances only once
// that element has rendered — so the user watches the actual path happen.
interface ActionStep {
  element?: string;
  title: string;
  description: string;
  side?: Side;
  align?: Alignment;
  act?: () => void;
  waitFor?: string;
}

// Shared driver builder for the action-driven tip walkthroughs (same look/behaviour
// as the Messi tour: forward-only, real actions on each "Próximo", `onEnd` once).
function runActionTour(theme: Theme, steps: ActionStep[], onEnd?: () => void): void {
  const popoverClass =
    theme === "classic-light" ? "agora-tour agora-tour-light" : "agora-tour agora-tour-dark";

  // Run the teardown exactly once, whichever close path fires. Driver.js skips its
  // `onDestroyed` hook when a step transition hasn't committed `__activeStep` yet (which
  // happens under CPU load when Escape lands mid-transition) — yet it still removes the
  // popover. So we drive teardown from `onDestroyStarted`, which fires reliably on Escape /
  // X-close before the popover is torn down, and keep `onDestroyed` for the "Entendi"
  // completion path (which routes through `d.destroy()`, bypassing `onDestroyStarted`).
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    onEnd?.();
  };

  const d = driver({
    showProgress: true,
    progressText: "{{current}} de {{total}}",
    showButtons: ["next", "close"],
    nextBtnText: "Próximo",
    doneBtnText: "Entendi",
    allowClose: true,
    popoverClass,
    steps: steps.map((s) => ({
      element: s.element,
      popover: { title: s.title, description: s.description, side: s.side, align: s.align },
    })),
    onNextClick: () => {
      const i = d.getActiveIndex() ?? 0;
      if (i >= steps.length - 1) {
        d.destroy();
        return;
      }
      const step = steps[i];
      step.act?.();
      if (step.waitFor) waitForElement(step.waitFor, () => d.moveNext());
      else d.moveNext();
    },
    onDestroyStarted: () => {
      finish();
      d.destroy();
    },
    onDestroyed: () => finish(),
  });

  d.drive();
}

const BRAZIL_TEAM_CARD = "#btn-team-card-bra";

/** "Como abrir o elenco de uma seleção" — Seleções → team card → lineup page. */
function startTeamLineupTour(theme: Theme, onEnd?: () => void): void {
  runActionTour(
    theme,
    [
      {
        element: "#btn-nav-selecoes",
        title: t("tours.teamLineup.step1.title"),
        description: t("tours.teamLineup.step1.description"),
        side: "bottom",
        align: "start",
        act: () => document.getElementById("btn-nav-selecoes")?.click(),
        waitFor: BRAZIL_TEAM_CARD,
      },
      {
        element: BRAZIL_TEAM_CARD,
        title: t("tours.teamLineup.step2.title"),
        description: t("tours.teamLineup.step2.description"),
        side: "bottom",
        align: "start",
        act: () => document.querySelector<HTMLElement>(BRAZIL_TEAM_CARD)?.click(),
        waitFor: "#team-lineup-view",
      },
      {
        element: "#team-lineup-header",
        title: t("tours.teamLineup.step3.title"),
        description: t("tours.teamLineup.step3.description"),
        side: "bottom",
        align: "center",
      },
    ],
    onEnd,
  );
}

/** "Como achar os Melhores terceiros colocados" — Grupos → scroll past the 12 groups → ranked thirds table. */
function startBestThirdsTour(theme: Theme, onEnd?: () => void): void {
  runActionTour(
    theme,
    [
      {
        element: "#btn-nav-grupos",
        title: t("tours.bestThirds.step1.title"),
        description: t("tours.bestThirds.step1.description"),
        side: "bottom",
        align: "start",
        act: () => document.getElementById("btn-nav-grupos")?.click(),
        waitFor: "#standings-grid",
      },
      {
        element: "#standings-grid",
        title: t("tours.bestThirds.step2.title"),
        description: t("tours.bestThirds.step2.description"),
        side: "top",
        align: "center",
        act: () =>
          document
            .getElementById("third-place-ranking")
            ?.scrollIntoView({ behavior: "smooth", block: "center" }),
        waitFor: "#third-place-ranking",
      },
      {
        element: "#third-place-ranking",
        title: t("tours.bestThirds.step3.title"),
        description: t("tours.bestThirds.step3.description"),
        side: "top",
        align: "center",
      },
    ],
    onEnd,
  );
}

/** "O caminho do mata-mata" — Chaveamento → bracket grid. */
function startBracketTour(theme: Theme, onEnd?: () => void): void {
  runActionTour(
    theme,
    [
      {
        element: "#btn-nav-chaveamento",
        title: t("tours.bracket.step1.title"),
        description: t("tours.bracket.step1.description"),
        side: "bottom",
        align: "start",
        act: () => document.getElementById("btn-nav-chaveamento")?.click(),
        waitFor: "#bracket-stage-grid",
      },
      {
        element: "#bracket-stage-grid",
        title: t("tours.bracket.step2.title"),
        description: t("tours.bracket.step2.description"),
        side: "top",
        align: "center",
      },
    ],
    onEnd,
  );
}

// An Oitavas tie whose two 16-avos feeders are confirmed numbers (#74 and #77), used to
// demo the feeder spotlight. The spotlight is hover-driven in BracketView; we trigger it
// with a synthetic MOUSE pointer event (never focus) so it survives the tour popover taking
// focus. We CLEAR it imperatively (clearBracketSpotlight) rather than via a synthetic
// pointerleave: the teardown runs while Driver.js destroys its popover, and under CPU load
// React isn't guaranteed to process a synthesized leave in time — leaving the feeders stuck
// lit. The direct clear is deterministic regardless of host load.
const FEEDER_DEMO_MATCH = 89;

function dispatchMousePointer(card: HTMLElement, types: string[]): void {
  for (const type of types) {
    card.dispatchEvent(new PointerEvent(type, { pointerType: "mouse", bubbles: true, cancelable: true }));
  }
}

function spotlightTie(matchNumber: number): void {
  const card = document.getElementById(`bracket-match-${matchNumber}`);
  if (card) dispatchMousePointer(card, ["pointerover", "pointerenter"]);
}

function clearTieSpotlight(): void {
  clearBracketSpotlight();
}

/** "Quem decide o adversário" — Chaveamento → hover an Oitavas tie → spotlight its 16-avos feeders. */
function startBracketFeederTour(theme: Theme, onEnd?: () => void): void {
  const OITAVAS = `#bracket-match-${FEEDER_DEMO_MATCH}`;
  const FEEDER = "#bracket-match-74";
  const FEEDER_ACTIVE = '#bracket-stage-r32 [data-feeder-highlight="feeder"]';
  runActionTour(
    theme,
    [
      {
        element: "#btn-nav-chaveamento",
        title: t("tours.bracketFeeder.step1.title"),
        description: t("tours.bracketFeeder.step1.description"),
        side: "bottom",
        align: "start",
        act: () => document.getElementById("btn-nav-chaveamento")?.click(),
        waitFor: "#bracket-stage-grid",
      },
      {
        element: OITAVAS,
        title: t("tours.bracketFeeder.step2.title"),
        description: t("tours.bracketFeeder.step2.description"),
        side: "bottom",
        align: "center",
        act: () => spotlightTie(FEEDER_DEMO_MATCH),
        waitFor: FEEDER_ACTIVE,
      },
      {
        element: FEEDER,
        title: t("tours.bracketFeeder.step3.title"),
        description: t("tours.bracketFeeder.step3.description"),
        side: "bottom",
        align: "center",
      },
    ],
    () => {
      clearTieSpotlight();
      onEnd?.();
    },
  );
}

/** "Histórico de jogos do grupo" — Grupos → open a group card's match-history details. */
function startGroupHistoryTour(theme: Theme, onEnd?: () => void): void {
  const HISTORY = "#standings-group-history-grupo-a";
  runActionTour(
    theme,
    [
      {
        element: "#btn-nav-grupos",
        title: t("tours.groupHistory.step1.title"),
        description: t("tours.groupHistory.step1.description"),
        side: "bottom",
        align: "start",
        act: () => document.getElementById("btn-nav-grupos")?.click(),
        waitFor: HISTORY,
      },
      {
        element: HISTORY,
        title: t("tours.groupHistory.step2.title"),
        description: t("tours.groupHistory.step2.description"),
        side: "top",
        align: "center",
        act: () => {
          const details = document.getElementById("standings-group-history-grupo-a");
          if (details instanceof HTMLDetailsElement) {
            details.open = true;
            details.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        },
        waitFor: HISTORY,
      },
      {
        element: HISTORY,
        title: t("tours.groupHistory.step3.title"),
        description: t("tours.groupHistory.step3.description"),
        side: "top",
        align: "center",
      },
    ],
    onEnd,
  );
}

/** "A chave completa" — Chaveamento → toggle "Chave completa" → the symmetric poster bracket. */
function startFullBracketTour(theme: Theme, onEnd?: () => void): void {
  runActionTour(
    theme,
    [
      {
        element: "#btn-nav-chaveamento",
        title: t("tours.fullBracket.step1.title"),
        description: t("tours.fullBracket.step1.description"),
        side: "bottom",
        align: "start",
        act: () => document.getElementById("btn-nav-chaveamento")?.click(),
        waitFor: "#bracket-view-toggle",
      },
      {
        element: "#bracket-view-toggle",
        title: t("tours.fullBracket.step2.title"),
        description: t("tours.fullBracket.step2.description"),
        side: "bottom",
        align: "end",
        act: () => document.getElementById("bracket-view-toggle-full")?.click(),
        waitFor: "#bracket-full",
      },
      {
        element: "#bracket-full",
        title: t("tours.fullBracket.step3.title"),
        description: t("tours.fullBracket.step3.description"),
        side: "top",
        align: "center",
      },
    ],
    onEnd,
  );
}

// One self-contained guided walkthrough that can be played per session.
export interface TipTour {
  id: string;
  start: (theme: Theme, onEnd?: () => void) => void;
}

// The rotating set of tip walkthroughs. One plays per eligible session, advancing
// through this list carousel-style from a random starting point (see useTipTour).
// `full-bracket` leads the rotation to promote the newest view; index pins in the
// tip-tour / messi-tour e2e specs follow this order.
export const TIP_TOURS: TipTour[] = [
  { id: "full-bracket", start: startFullBracketTour },
  { id: "messi-card", start: startMessiTour },
  { id: "team-lineup", start: startTeamLineupTour },
  { id: "best-thirds", start: startBestThirdsTour },
  { id: "bracket", start: startBracketTour },
  { id: "group-history", start: startGroupHistoryTour },
  { id: "bracket-feeder", start: startBracketFeederTour },
];

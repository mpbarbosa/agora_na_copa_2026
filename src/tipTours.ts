import { driver, type Side, type Alignment } from "driver.js";
import "driver.js/dist/driver.css";
import { startMessiTour } from "./messiTour";

type Theme = "classic-light" | "stadium-dark";

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
    onDestroyed: () => onEnd?.(),
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
        title: "Veja o elenco de cada seleção 🌎",
        description:
          'Todas as 48 seleções têm uma página completa. Tudo começa na aba Seleções — toque em "Próximo".',
        side: "bottom",
        align: "start",
        act: () => document.getElementById("btn-nav-selecoes")?.click(),
        waitFor: BRAZIL_TEAM_CARD,
      },
      {
        element: BRAZIL_TEAM_CARD,
        title: "Toque na bandeira",
        description: 'Toque no escudo da seleção para abrir o elenco completo. Vamos abrir o Brasil.',
        side: "bottom",
        align: "start",
        act: () => document.querySelector<HTMLElement>(BRAZIL_TEAM_CARD)?.click(),
        waitFor: "#team-lineup-view",
      },
      {
        element: "#team-lineup-header",
        title: "Elenco completo ✓",
        description:
          "Pronto! Escalação titular, comissão técnica e histórico de jogos — é assim que você abre qualquer seleção.",
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
        title: "8 dos 12 terceiros avançam 🧮",
        description:
          'Nem todo 3º colocado está fora — e dá para ver quem passa. Vamos achar essa tabela: abra a aba Grupos no "Próximo".',
        side: "bottom",
        align: "start",
        act: () => document.getElementById("btn-nav-grupos")?.click(),
        waitFor: "#standings-grid",
      },
      {
        element: "#standings-grid",
        title: "Role até o fim da página ⬇️",
        description:
          'A seção "Melhores 3º colocados" fica no rodapé desta página, logo abaixo das 12 chaves. Toque em "Próximo" que eu te levo até lá.',
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
        title: "Achou: Melhores 3º colocados ✓",
        description:
          "É aqui. Os 12 terceiros colocados são ranqueados por pontos, saldo, gols e fair play. A linha verde marca o corte: os 8 de cima avançam ao mata-mata.",
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
        title: "O caminho até a final 🏆",
        description:
          'Acompanhe todo o mata-mata, dos 16 avos à decisão, na aba Mata-mata — toque em "Próximo".',
        side: "bottom",
        align: "start",
        act: () => document.getElementById("btn-nav-chaveamento")?.click(),
        waitFor: "#bracket-stage-grid",
      },
      {
        element: "#bracket-stage-grid",
        title: "Mata-mata da Copa",
        description:
          "A cada fase, o cruzamento se monta com os classificados — incluindo as vagas dos 8 melhores terceiros colocados.",
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
// focus — and clear it with the matching leave event when the tour ends.
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

function clearTieSpotlight(matchNumber: number): void {
  const card = document.getElementById(`bracket-match-${matchNumber}`);
  if (card) dispatchMousePointer(card, ["pointerout", "pointerleave"]);
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
        title: "Quem decide o adversário? 🔍",
        description:
          'No Mata-mata, cada confronto nasce de dois jogos da fase anterior — e dá para ver quais. Abra a aba Mata-mata no "Próximo".',
        side: "bottom",
        align: "start",
        act: () => document.getElementById("btn-nav-chaveamento")?.click(),
        waitFor: "#bracket-stage-grid",
      },
      {
        element: OITAVAS,
        title: "Aponte para um jogo das Oitavas",
        description:
          'Passe o mouse (ou toque, no celular) num confronto das Oitavas. No "Próximo" eu faço isso por você.',
        side: "bottom",
        align: "center",
        act: () => spotlightTie(FEEDER_DEMO_MATCH),
        waitFor: FEEDER_ACTIVE,
      },
      {
        element: FEEDER,
        title: "Os 2 jogos das 16 avos ✓",
        description:
          "Prontinho! As 16 avos acendem os dois jogos que decidem quem chega a este confronto — destacados e lado a lado. O resto da coluna some para focar no caminho.",
        side: "bottom",
        align: "center",
      },
    ],
    () => {
      clearTieSpotlight(FEEDER_DEMO_MATCH);
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
        title: "Todos os jogos do grupo 📅",
        description:
          'Resultados e próximos jogos de cada chave ficam no card do grupo. Abra a aba Grupos no "Próximo".',
        side: "bottom",
        align: "start",
        act: () => document.getElementById("btn-nav-grupos")?.click(),
        waitFor: HISTORY,
      },
      {
        element: HISTORY,
        title: "Histórico de jogos",
        description:
          'Cada grupo tem uma seção "Histórico de jogos". Toque em "Próximo" que eu abro para você.',
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
        title: "Resultados e próximos jogos ✓",
        description:
          "Pronto! Os jogos já disputados aparecem com o placar e os próximos com o horário — em ordem, sem sair da tabela.",
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
// Keep `messi-card` first so existing gating/tests that pin index 0 stay stable.
export const TIP_TOURS: TipTour[] = [
  { id: "messi-card", start: startMessiTour },
  { id: "team-lineup", start: startTeamLineupTour },
  { id: "best-thirds", start: startBestThirdsTour },
  { id: "bracket", start: startBracketTour },
  { id: "group-history", start: startGroupHistoryTour },
  { id: "bracket-feeder", start: startBracketFeederTour },
];

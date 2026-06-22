import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const MESSI_FIFA_ID = "229397";
const MESSI_CARD_ID = `jogador-card-${MESSI_FIFA_ID}`;

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

/**
 * Guided, action-driven tour of how to open Lionel Messi's player card:
 * Jogadores tab → select Messi → open the card. Each "Próximo" performs the next
 * action (navigate / open) and advances once the target has rendered, so the user
 * watches the real path happen. Forward-only (no Previous). `onEnd` fires once on close.
 */
export function startMessiTour(theme: "classic-light" | "stadium-dark", onEnd?: () => void): void {
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
    steps: [
      {
        element: "#btn-nav-jogadores",
        popover: {
          title: "Conheça o maior craque ⭐",
          description:
            'Lionel Messi é a estrela da Copa. Vamos abrir o card dele — tudo começa na aba Jogadores. Toque em "Próximo".',
          side: "bottom",
          align: "start",
        },
      },
      {
        element: `#${MESSI_CARD_ID}`,
        popover: {
          title: "Lionel Messi",
          description: 'Aqui está o Messi entre os jogadores. Toque em "Próximo" para abrir o card completo.',
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#jogadores-player-overlay",
        popover: {
          title: "Card completo do Messi ✓",
          description:
            "Pronto! Estatísticas, análise e redes oficiais — é assim que você abre o card de qualquer jogador.",
          side: "left",
          align: "center",
        },
      },
    ],
    onNextClick: () => {
      const i = d.getActiveIndex();
      if (i === 0) {
        document.getElementById("btn-nav-jogadores")?.click();
        waitForElement(`#${MESSI_CARD_ID}`, () => d.moveNext());
      } else if (i === 1) {
        document.getElementById(MESSI_CARD_ID)?.click();
        waitForElement("#jogadores-player-overlay", () => d.moveNext());
      } else {
        d.destroy();
      }
    },
    onDestroyed: () => onEnd?.(),
  });

  d.drive();
}

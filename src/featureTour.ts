import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

// Feature-discovery tour steps (pt-BR), targeting stable nav IDs. Keep it short —
// a welcome popover + the under-discovered tabs + the theme toggle. Tune the list
// from GA4 data once a real measurement id is live (see ADR 0003).
export const TOUR_STEPS: DriveStep[] = [
  {
    popover: {
      title: "Bem-vindo ao Agora na Copa 26 ⚽",
      description:
        "Um tour rápido pelas principais áreas do app — leva menos de 30 segundos.",
    },
  },
  {
    element: "#btn-nav-ao-vivo",
    popover: {
      title: "Ao Vivo",
      description:
        "Placar, onde assistir (Globo, SporTV, CazéTV, FIFA+) e as escalações de cada jogo.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#btn-nav-jogadores",
    popover: {
      title: "Jogadores",
      description:
        "Busque qualquer jogador e abra o perfil completo tocando no nome.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#btn-nav-lideres",
    popover: {
      title: "Líderes",
      description: "Artilheiros, cartões e as estatísticas que decidem o Mundial.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#btn-nav-chaveamento",
    popover: {
      title: "Mata-mata",
      description: "Acompanhe o caminho do mata-mata até a final.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#btn-nav-social-medias",
    popover: {
      title: "Redes Sociais",
      description: "Tendências e o feed social da Copa, num só lugar.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#btn-toggle-theme",
    popover: {
      title: "Tema claro ou escuro",
      description: "Toque aqui para alternar o visual quando quiser.",
      side: "left",
      align: "start",
    },
  },
];

/** Build and immediately run the tour. `onEnd(completed)` fires once when it closes. */
export function startFeatureTour(
  theme: "classic-light" | "stadium-dark",
  onEnd: (completed: boolean) => void,
): void {
  let completed = true;
  const tour = driver({
    showProgress: true,
    progressText: "{{current}} de {{total}}",
    nextBtnText: "Próximo",
    prevBtnText: "Voltar",
    doneBtnText: "Entendi",
    popoverClass:
      theme === "classic-light" ? "agora-tour agora-tour-light" : "agora-tour agora-tour-dark",
    steps: TOUR_STEPS,
    onCloseClick: () => {
      completed = false;
      tour.destroy();
    },
    onDestroyed: () => onEnd(completed),
  });
  tour.drive();
}

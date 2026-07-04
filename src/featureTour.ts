import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { translate, getActiveLocale } from "./i18n";

// Feature-discovery tour steps, targeting stable nav IDs. Keep it short —
// a welcome popover + the under-discovered tabs + the theme toggle. Tune the list
// from GA4 data once a real measurement id is live (see ADR 0003). Built per-call
// (inside startFeatureTour) so the popover copy re-reads the active locale each run.
function buildTourSteps(
  t: (key: string, params?: Record<string, string | number>) => string,
): DriveStep[] {
  return [
    {
      popover: {
        title: t("tours.feature.welcome.title"),
        description: t("tours.feature.welcome.description"),
      },
    },
    {
      element: "#btn-nav-ao-vivo",
      popover: {
        title: t("tours.feature.aoVivo.title"),
        description: t("tours.feature.aoVivo.description"),
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "#btn-nav-jogadores",
      popover: {
        title: t("tours.feature.jogadores.title"),
        description: t("tours.feature.jogadores.description"),
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "#btn-nav-lideres",
      popover: {
        title: t("tours.feature.lideres.title"),
        description: t("tours.feature.lideres.description"),
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "#btn-nav-chaveamento",
      popover: {
        title: t("tours.feature.chaveamento.title"),
        description: t("tours.feature.chaveamento.description"),
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "#btn-nav-social-medias",
      popover: {
        title: t("tours.feature.social.title"),
        description: t("tours.feature.social.description"),
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "#btn-toggle-theme",
      popover: {
        title: t("tours.feature.theme.title"),
        description: t("tours.feature.theme.description"),
        side: "left",
        align: "start",
      },
    },
  ];
}

/** Build and immediately run the tour. `onEnd(completed)` fires once when it closes. */
export function startFeatureTour(
  theme: "classic-light" | "stadium-dark",
  onEnd: (completed: boolean) => void,
): void {
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(getActiveLocale(), key, params);
  let completed = true;
  const tour = driver({
    showProgress: true,
    progressText: "{{current}} de {{total}}",
    nextBtnText: "Próximo",
    prevBtnText: "Voltar",
    doneBtnText: "Entendi",
    popoverClass:
      theme === "classic-light" ? "agora-tour agora-tour-light" : "agora-tour agora-tour-dark",
    steps: buildTourSteps(t),
    onCloseClick: () => {
      completed = false;
      tour.destroy();
    },
    onDestroyed: () => onEnd(completed),
  });
  tour.drive();
}

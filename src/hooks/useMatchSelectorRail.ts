import { useEffect, useRef } from "react";

// Shared behavior for the horizontal match-selector rails in the Ao Vivo view:
// registers each rail element by key, exposes a prev/next scroll, and auto-scrolls
// the currently-selected match chip (`#btn-match-<id>`) into view when the
// selection changes. Each hook instance owns its own set of rails, so the
// selected match is scrolled by whichever instance actually renders it (the
// others find no matching chip and no-op). Used by MatchSelectorBar (the
// live/upcoming rails) and the "finished matches" rail in MatchDetailView.
export function useMatchSelectorRail(selectedMatchId: string) {
  const railRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const setRailRef = (railKey: string, node: HTMLDivElement | null) => {
    if (node) {
      railRefs.current[railKey] = node;
      return;
    }

    delete railRefs.current[railKey];
  };

  const scrollRail = (railKey: string, direction: "prev" | "next") => {
    const rail = railRefs.current[railKey];
    if (!rail) {
      return;
    }

    const offset = Math.max(rail.clientWidth * 0.72, 180);
    rail.scrollBy({
      left: direction === "next" ? offset : -offset,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    for (const rail of Object.values(railRefs.current) as Array<
      HTMLDivElement | null
    >) {
      const selectedButton = rail?.querySelector<HTMLButtonElement>(
        `#btn-match-${selectedMatchId}`,
      );
      if (!selectedButton) {
        continue;
      }

      selectedButton.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      return;
    }
  }, [selectedMatchId]);

  return { setRailRef, scrollRail };
}

import { type Page } from "@playwright/test";

/**
 * Seed a deterministic Ao Vivo live state: no live overlays and no live match
 * states. With nothing live, the view never enters the "Os dois" simultaneous
 * overview (which mutually-excludes the single-match detail), so the focus block
 * — scoreboard, match selector, tabs, incidents, chat — is always mounted. Use
 * in specs that drive those controls so they do not race the ambient live-match
 * count (2+ simultaneous live games would otherwise boot the page into overview).
 */
export async function stubLiveApis(page: Page): Promise<void> {
  await page.route("**/api/match-overlays", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ refreshAfterMs: 60000, overlays: {} }),
    }),
  );
  await page.route("**/api/match-states", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ states: {}, refreshAfterMs: 60000 }),
    }),
  );
}

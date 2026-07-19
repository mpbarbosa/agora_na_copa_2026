import { test, expect } from "@playwright/test";

// The Partidas list prints a phase header ("Fase de Grupos", "Oitavas de Final",
// … "Final") to separate the rounds it spans. The 2026 tournament is complete, so
// the results ("Encerradas") list is what now spans every phase; it is asserted
// generically on the presence of multiple phase headers and on one being a knockout
// round, rather than a fixed round name. On "Encerradas" each phase is expanded by
// default (results-first) and collapses on click — the inverse of the scheduled list.
test.describe("Partidas list — phase separators", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
  });

  test("separates the finished list by phase, with a knockout-round header", async ({ page }) => {
    // Pin statuses to the seed (empty overlays) so the list is deterministic regardless
    // of the wall clock — every match keeps its curated status, and the completed
    // tournament's results span all phases.
    await page.route("**/api/match-overlays", (route) =>
      route.fulfill({
        json: {
          overlays: {},
          refreshAfterMs: 60000,
          source: "fifa",
          note: "",
          updatedAt: "2026-06-25T00:00:00.000Z",
        },
      }),
    );

    await page.goto("/");
    await page.click("#btn-consent-accept").catch(() => {});
    await page.click("#btn-nav-partidas");
    await page.click("#btn-partidas-filter-finished");

    await expect(page.locator("#partidas-view")).toBeVisible();

    // The finished results span several phases → more than one phase header.
    const phaseHeaders = page.getByTestId("partidas-phase-header");
    await expect(phaseHeaders.first()).toBeVisible();
    expect(await phaseHeaders.count()).toBeGreaterThan(1);

    // A knockout separator (16 Avos / Oitavas / Quartas / … / Disputa do 3º Lugar /
    // Final) sits above its first match card.
    const koHeader = phaseHeaders
      .filter({ hasNotText: /Fase de Grupos/i })
      .first();
    await expect(koHeader).toBeVisible();
    await expect(koHeader).toContainText(/avos|oitavas|quartas|semifinais|disputa|lugar|final/i);

    // On "Encerradas" each phase is expanded by default (results-first): cards shown,
    // no "ocultos" hint.
    const koDetails = koHeader.locator("xpath=ancestor::details[1]");
    expect(await koDetails.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(true);
    const hiddenHint = koHeader.getByTestId("partidas-phase-hidden-hint");
    await expect(hiddenHint).toBeHidden();
    await expect(koDetails.locator('[id^="partidas-card-"]').first()).toBeVisible();

    // Collapsing the phase hides its cards and reveals the "ocultos" hint.
    await koHeader.click();
    expect(await koDetails.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
    await expect(hiddenHint).toBeVisible();
    await expect(hiddenHint).toContainText(/ocultos?/i);
  });
});

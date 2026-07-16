import { test, expect } from "@playwright/test";

// The Partidas "Agendadas" list prints a phase header ("Fase de Grupos",
// "Oitavas de Final", … "Final") to separate the rounds it spans. Which rounds
// remain scheduled shifts as the tournament advances — early on it mixes the
// group stage with "16 Avos de Final"; late on only the last knockout rounds are
// left (now the 3rd-place match and the Final). So this asserts generically on
// the presence of multiple phase headers and on the first one being a knockout
// round, rather than a fixed round name that goes stale once that round finishes.
test.describe("Partidas list — phase separators", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
  });

  test("separates the scheduled list by phase, with a knockout-round header", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-consent-accept").catch(() => {});
    await page.click("#btn-nav-partidas");
    await page.click("#btn-partidas-filter-pre_game");

    await expect(page.locator("#partidas-view")).toBeVisible();

    // The scheduled fixtures span several phases → more than one phase header.
    const phaseHeaders = page.getByTestId("partidas-phase-header");
    await expect(phaseHeaders.first()).toBeVisible();
    expect(await phaseHeaders.count()).toBeGreaterThan(1);

    // The first knockout separator — the next scheduled round, whatever it is
    // (16 Avos / Oitavas / Quartas / … / Disputa do 3º Lugar / Final) — sits above
    // its first match card.
    const koHeader = phaseHeaders
      .filter({ hasNotText: /Fase de Grupos/i })
      .first();
    await expect(koHeader).toBeVisible();
    await expect(koHeader).toContainText(/avos|oitavas|quartas|semifinais|disputa|lugar|final/i);

    // Collapsed by default, with a visible hint that its matches are hidden.
    const koDetails = koHeader.locator("xpath=ancestor::details[1]");
    expect(await koDetails.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
    const hiddenHint = koHeader.getByTestId("partidas-phase-hidden-hint");
    await expect(hiddenHint).toBeVisible();
    await expect(hiddenHint).toContainText(/ocultos?/i);
    // Expanding hides the "ocultos" hint and reveals the cards.
    await koHeader.click();
    await expect(hiddenHint).toBeHidden();
    await expect(koDetails.locator('[id^="partidas-card-"]').first()).toBeVisible();
  });
});

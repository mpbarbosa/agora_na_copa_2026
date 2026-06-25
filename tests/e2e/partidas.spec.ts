import { test, expect } from "@playwright/test";

// The Partidas "Agendadas" list mixes group-stage and knockout fixtures, so it
// prints a phase header ("Fase de Grupos", "16 Avos de Final", …) to separate the
// rounds. The knockout fixtures are static, so at least the knockout phases — and
// thus multiple phase headers — are always present regardless of live data.
test.describe("Partidas list — phase separators", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
  });

  test("separates the scheduled list by phase, with a 16 Avos de Final header", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-consent-accept").catch(() => {});
    await page.click("#btn-nav-partidas");
    await page.click("#btn-partidas-filter-pre_game");

    await expect(page.locator("#partidas-view")).toBeVisible();

    // The knockout fixtures span several phases → more than one phase header.
    const phaseHeaders = page.getByTestId("partidas-phase-header");
    await expect(phaseHeaders.first()).toBeVisible();
    expect(await phaseHeaders.count()).toBeGreaterThan(1);

    // The "16 Avos de Final" separator is present and sits above the first R32 card.
    const koHeader = page.locator("#partidas-phase-pre_game-16-avos-de-final");
    await expect(koHeader).toBeVisible();
    await expect(koHeader).toContainText(/16 avos de final/i);

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

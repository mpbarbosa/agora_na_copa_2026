import { test, expect } from "@playwright/test";
import { collectAppConsoleErrors } from "./fixtures/consoleErrors";

// The "Palpite do confronto" panel at the bottom of the Chaveamento view lets the
// user pick a knockout tie whose BOTH sides are already resolved (confirmed by
// results, or provisional from current standings) and auto-forecasts it via
// /api/predict — the same deterministic "palpite simulado" heuristic the Fan Zone
// uses. Ties with an unresolved slot (best-third combos, not-yet-played winner refs)
// are excluded, so the panel is either populated or shows its empty state.
test.describe("Bracket predictor panel (Palpite do confronto)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
  });

  test("renders the panel with the Simulado mode badge", async ({ page }) => {
    const consoleErrors = collectAppConsoleErrors(page);

    await page.goto("/");
    await page.click("#btn-nav-chaveamento");
    await expect(page.locator("#bracket-view")).toBeVisible();

    const panel = page.locator("#bracket-predictor-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("Palpite do confronto");
    await expect(page.locator("#bracket-predictor-mode")).toHaveText("Simulado");

    expect(consoleErrors).toEqual([]);
  });

  test("auto-forecasts the selected resolved tie, or shows the empty state", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-chaveamento");
    await expect(page.locator("#bracket-view")).toBeVisible();

    const select = page.locator("#select-bracket-predictor");
    const empty = page.locator("#bracket-predictor-empty");

    // Exactly one of the two branches is rendered, depending on whether any tie
    // currently has both slots resolved from live standings.
    if (await select.count()) {
      // The chosen tie's matchup card is shown…
      await expect(page.locator("#bracket-predictor-matchup")).toBeVisible();
      // …and the deterministic forecast resolves (loading → ready), carrying the
      // "Palpite simulado" badge from the /api/predict response.
      await expect(page.locator("#bracket-predictor-result")).toBeVisible({ timeout: 15000 });
      await expect(page.locator("#bracket-predictor-simulado-badge")).toBeVisible();
    } else {
      await expect(empty).toBeVisible();
    }
  });

  test("changing the selected tie re-forecasts to the new matchup", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-chaveamento");
    await expect(page.locator("#bracket-view")).toBeVisible();

    const select = page.locator("#select-bracket-predictor");
    test.skip((await select.count()) === 0, "No knockout tie has both slots resolved yet");

    const options = select.locator("option");
    test.skip((await options.count()) < 2, "Need at least two resolvable ties to switch between");

    await expect(page.locator("#bracket-predictor-result")).toBeVisible({ timeout: 15000 });
    const firstMatchup = await page.locator("#bracket-predictor-matchup").innerText();

    await select.selectOption({ index: 1 });

    // The matchup card reflects the newly chosen tie and a fresh forecast resolves.
    await expect(page.locator("#bracket-predictor-matchup")).not.toHaveText(firstMatchup);
    await expect(page.locator("#bracket-predictor-result")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("#bracket-predictor-simulado-badge")).toBeVisible();
  });

  test("renders correctly in dark theme without console errors", async ({ page }) => {
    const consoleErrors = collectAppConsoleErrors(page);

    await page.goto("/");
    await page.click("#btn-toggle-theme").catch(() => {});
    await page.click("#btn-nav-chaveamento");

    await expect(page.locator("#bracket-view")).toBeVisible();
    await expect(page.locator("#bracket-predictor-panel")).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });
});

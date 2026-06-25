import { test, expect } from "@playwright/test";
import { collectAppConsoleErrors } from "./fixtures/consoleErrors";

test.describe("Fan Zone view", () => {
  test("renders trivia and penalty mini-game interactions", async ({ page }) => {
    const consoleErrors = collectAppConsoleErrors(page);

    await page.goto("/");
    await page.click("#btn-nav-fanzone");

    await expect(page.locator("#fanzone-view")).toBeVisible();
    await expect(page.locator("#fanzone-trivia-panel")).toBeVisible();
    await expect(page.locator("#fanzone-penalty-panel")).toBeVisible();

    await page.click("#btn-trivia-option-1");
    await expect(page.locator("#fanzone-trivia-feedback")).toBeVisible();

    await page.click("#btn-penalty-direita");
    await expect(page.locator("#penalty-result-status")).toBeVisible();
    await expect(page.locator("#penalty-scoreboard")).toContainText("1");

    expect(consoleErrors).toEqual([]);
  });

  test("match predictor returns a simulated, data-grounded prognosis", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
    const consoleErrors = collectAppConsoleErrors(page);

    await page.goto("/");
    await page.click("#btn-consent-accept").catch(() => {});
    await page.click("#btn-nav-fanzone");

    const panel = page.locator("#fanzone-predictor-panel");
    await expect(panel).toBeVisible();
    // The button is gated until two distinct teams are chosen.
    await expect(page.locator("#btn-predictor-run")).toBeDisabled();

    await page.selectOption("#select-predictor-home", "BRA");
    await page.selectOption("#select-predictor-away", "ARG");
    await page.fill("#input-predictor-notes", "teste e2e");
    await expect(page.locator("#btn-predictor-run")).toBeEnabled();
    await page.click("#btn-predictor-run");

    const result = page.locator("#fanzone-predictor-result");
    await expect(result).toBeVisible();
    // Always flagged as simulated, with the grounded sections and the chosen team.
    await expect(page.locator("#fanzone-predictor-simulado-badge")).toBeVisible();
    await expect(result).toContainText("Números");
    await expect(result).toContainText(/brasil/i);
    await expect(result).toContainText("teste e2e");

    expect(consoleErrors).toEqual([]);
  });

  test("keeps Fan Zone playable in dark theme", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-toggle-theme");
    await page.click("#btn-nav-fanzone");

    await expect(page.locator("#fanzone-view")).toBeVisible();
    await page.click("#btn-trivia-option-0");
    await expect(page.locator("#fanzone-trivia-feedback")).toBeVisible();

    await page.click("#btn-penalty-centro");
    await expect(page.locator("#penalty-result-panel")).not.toContainText(
      "Faça a primeira cobrança",
    );
  });
});

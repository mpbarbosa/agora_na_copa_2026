import { test, expect } from "@playwright/test";
import { collectAppConsoleErrors } from "./fixtures/consoleErrors";

test.describe("Bracket view (Chaveamento)", () => {
  test("advances one full path to a champion and resets", async ({ page }) => {
    const consoleErrors = collectAppConsoleErrors(page);

    await page.goto("/");
    await page.click("#btn-nav-chaveamento");

    await expect(page.locator("#bracket-view")).toBeVisible();

    await page.click("#bracket-pick-R32-1-a");
    await page.click("#bracket-pick-R16-1-a");
    await page.click("#bracket-pick-QF-1-a");
    await page.click("#bracket-pick-SF-1-a");
    await page.click("#bracket-pick-F-1-a");

    await expect(page.locator("#bracket-champion-callout")).toBeVisible();
    await expect(page.locator("#bracket-champion-name")).toHaveText("MÉXICO");

    await page.click("#bracket-reset-button");

    await expect(page.locator("#bracket-champion-callout")).toHaveCount(0);
    await expect(page.locator("#bracket-pick-R16-1-a")).toContainText(
      "Aguardando classificado",
    );

    expect(consoleErrors).toEqual([]);
  });

  test("fills the best-third knockout slots provisionally from current standings", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-chaveamento");

    await expect(page.locator("#bracket-view")).toBeVisible();

    // R32-13 holds the "Melhor 3º colocado #1/#2" placeholders. With group-stage
    // results in, these slots are now seeded with the current best-third teams
    // (shown as provisional) instead of the empty "Aguardando classificado".
    const bestThirdPick = page.locator("#bracket-pick-R32-13-a");
    await expect(bestThirdPick).toBeEnabled();
    await expect(bestThirdPick).not.toContainText("Aguardando classificado");
    await expect(bestThirdPick).toContainText("prov.");
  });
});

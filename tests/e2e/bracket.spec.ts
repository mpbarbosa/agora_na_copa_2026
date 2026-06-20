import { test, expect } from "@playwright/test";

test.describe("Bracket view (Chaveamento)", () => {
  test("advances one full path to a champion and resets", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

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
});

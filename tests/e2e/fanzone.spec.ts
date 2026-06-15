import { test, expect } from "@playwright/test";

test.describe("Fan Zone view", () => {
  test("renders trivia and penalty mini-game interactions", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

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

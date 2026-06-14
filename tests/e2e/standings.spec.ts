import { test, expect } from "@playwright/test";

const GROUP_IDS = Array.from({ length: 12 }, (_, index) => {
  const letter = String.fromCharCode("a".charCodeAt(0) + index);
  return `grupo-${letter}`;
});

test.describe("Standings view (Grupos)", () => {
  test("renders all 12 group tables with headers and rows", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");
    await page.click("#btn-nav-grupos");

    await expect(page.locator("#standings-view")).toBeVisible();
    await expect(page.locator('[id^="standings-group-grupo-"]')).toHaveCount(12);

    for (const groupId of GROUP_IDS) {
      const card = page.locator(`#standings-group-${groupId}`);

      await expect(card).toBeVisible();
      await expect(card.locator("thead th")).toHaveCount(9);
      await expect(card.locator("tbody tr")).toHaveCount(4);
    }

    expect(consoleErrors).toEqual([]);
  });

  test("renders correctly in dark theme", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");
    await page.click("#btn-nav-grupos");
    await page.click("#btn-toggle-theme");

    await expect(page.locator("#standings-view")).toBeVisible();
    await expect(page.locator("#standings-group-grupo-a")).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });
});

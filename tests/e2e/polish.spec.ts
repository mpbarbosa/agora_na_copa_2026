import { expect, test } from "@playwright/test";

test.describe("Phase 7 polish", () => {
  test("320px layouts keep Grupos e Chaveamento usable", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto("/");

    await page.locator("#btn-nav-grupos").dispatchEvent("click");
    await expect(page.locator("#standings-view")).toBeVisible();
    await expect(page.locator("#standings-grid")).toBeVisible();
    await expect(page.locator("#standings-group-grupo-a")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);

    await page.goto("/");
    await page.click("#btn-nav-chaveamento");
    await expect(page.locator("#bracket-view")).toBeVisible();
    await expect(page.locator("#bracket-stage-grid")).toBeVisible();
    await expect(page.locator("#bracket-stage-r32")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });

  test("ultra-wide layouts expand the standings and bracket grids", async ({ page }) => {
    await page.setViewportSize({ width: 1720, height: 1080 });
    await page.goto("/");

    await page.click("#btn-nav-grupos");
    await expect(page.locator("#standings-grid")).toBeVisible();
    expect(
      await page.locator("#standings-grid").evaluate((node) => {
        return window.getComputedStyle(node).gridTemplateColumns.split(" ").length;
      }),
    ).toBe(4);

    await page.click("#btn-nav-estadios");
    await expect(page.locator("#venue-map-canvas")).toBeVisible();
    await expect(page.locator("#venue-detail-panel")).toBeVisible();

    await page.click("#btn-nav-chaveamento");
    await expect(page.locator("#bracket-stage-grid")).toBeVisible();
    expect(
      await page.locator("#bracket-stage-grid").evaluate((node) => {
        return window.getComputedStyle(node).gridTemplateColumns.split(" ").length;
      }),
    ).toBe(5);
  });
});

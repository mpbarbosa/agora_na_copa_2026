import { test, expect } from "@playwright/test";

test.describe("Venue map view (Estádios)", () => {
  test("clicking a pin populates the venue details panel", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");
    await page.click("#btn-nav-estadios");

    await expect(page.locator("#venue-map-view")).toBeVisible();
    await expect(page.locator("#venue-map-canvas")).toBeVisible();
    await expect(page.locator('.venue-map-marker[data-venue-id="vancouver"]')).toBeVisible();

    await page
      .locator('.venue-map-marker[data-venue-id="vancouver"]')
      .evaluate((element) => {
        (element.closest(".leaflet-marker-icon") as HTMLElement | null)?.click();
      });

    await expect(page.locator("#venue-detail-title")).toHaveText("BC Place de Vancouver");
    await expect(page.locator("#venue-hosted-match-aus-tur-2026")).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test("clicking a pin works in dark theme too", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");
    await page.click("#btn-toggle-theme");
    await page.click("#btn-nav-estadios");

    await expect(page.locator("#venue-map-view")).toBeVisible();
    await expect(page.locator('.venue-map-marker[data-venue-id="seattle"]')).toBeVisible();
    await page
      .locator('.venue-map-marker[data-venue-id="seattle"]')
      .evaluate((element) => {
        (element.closest(".leaflet-marker-icon") as HTMLElement | null)?.click();
      });

    await expect(page.locator("#venue-detail-title")).toHaveText("Estádio de Seattle");
    await expect(page.locator("#venue-hosted-matches")).toContainText(
      "ainda não recebeu nenhuma das partidas em destaque",
    );

    expect(consoleErrors).toEqual([]);
  });
});

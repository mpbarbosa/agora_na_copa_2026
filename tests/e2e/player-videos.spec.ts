import { expect, test } from "@playwright/test";

test.describe("Player video carousel (Player Card)", () => {
  test("shows a YouTube video rail in Messi's player card", async ({ page }) => {
    await page.route("**/api/player-stats/**", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ goals: 0, yellowCards: 0, redCards: 0 }),
      });
    });

    await page.goto("/");
    await page.click("#btn-nav-jogadores");
    await expect(page.locator("#jogadores-view")).toBeVisible();

    // Leo Messi — FIFA registry ID 229397 — has curated videos in playerVideos.json
    await page.click("#jogador-card-229397");

    const overlay = page.locator("#jogadores-player-overlay");
    await expect(overlay).toBeVisible();

    const rail = overlay.locator("#jogadores-player-overlay-videos");
    await expect(rail).toBeVisible();
    await expect(rail).toContainText("Vídeos do jogador");

    // The rail holds at least one clickable thumbnail opening YouTube in a new tab.
    const items = rail.locator('[data-testid="jogadores-player-overlay-videos-item"]');
    expect(await items.count()).toBeGreaterThan(0);

    const first = items.first();
    await expect(first).toHaveAttribute("href", /youtube\.com\/watch\?v=/);
    await expect(first).toHaveAttribute("target", "_blank");
    await expect(first).toHaveAttribute("rel", /noopener/);
  });

  test("hides the video rail for a player with no curated videos", async ({ page }) => {
    await page.route("**/api/player-stats/**", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ goals: 0, yellowCards: 0, redCards: 0 }),
      });
    });

    await page.goto("/");
    await page.click("#btn-nav-jogadores");
    await expect(page.locator("#jogadores-view")).toBeVisible();

    // Vinicius Jr (405742) has no entry in playerVideos.json → no rail.
    await page.click("#jogador-card-405742");
    await expect(page.locator("#jogadores-player-overlay")).toBeVisible();
    await expect(page.locator("#jogadores-player-overlay-videos")).toHaveCount(0);
  });
});

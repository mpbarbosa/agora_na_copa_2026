import { expect, test } from "@playwright/test";

test.describe("Jogadores view — player overlay stats", () => {
  test("shows goal and card stats when the API returns them", async ({ page }) => {
    await page.route("**/api/player-stats/**", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ goals: 3, yellowCards: 1, redCards: 0 }),
      });
    });

    await page.goto("/");
    await page.click("#btn-nav-jogadores");
    await expect(page.locator("#jogadores-view")).toBeVisible();

    // Vinicius Jr — FIFA registry ID 405742
    await page.click("#jogador-card-405742");

    const overlay = page.locator("#jogadores-player-overlay");
    await expect(overlay).toBeVisible();

    const stats = overlay.locator("#jogadores-player-overlay-stats");
    await expect(stats).toContainText("Gols");
    await expect(stats).toContainText("3");
    await expect(stats).toContainText("Amarelos");
    await expect(stats).toContainText("1");
    // redCards: 0 — cell must be absent
    await expect(stats).not.toContainText("Vermelhos");
  });

  test("hides goal and card cells when the player is not in the tournament leaders", async ({
    page,
  }) => {
    await page.route("**/api/player-stats/**", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "Jogador não encontrado nos líderes do torneio" }),
      });
    });

    await page.goto("/");
    await page.click("#btn-nav-jogadores");
    await expect(page.locator("#jogadores-view")).toBeVisible();

    await page.click("#jogador-card-405742");

    const overlay = page.locator("#jogadores-player-overlay");
    await expect(overlay).toBeVisible();

    // Camisa and Posição always render — they come from the player object itself
    const stats = overlay.locator("#jogadores-player-overlay-stats");
    await expect(stats).toContainText("Camisa");
    await expect(stats).toContainText("Posição");

    // Tournament stats must NOT appear when there are no goals or cards
    await expect(stats).not.toContainText("Gols");
    await expect(stats).not.toContainText("Amarelos");
    await expect(stats).not.toContainText("Vermelhos");
  });

  test("Vinicius Jr (Brazil) with 1 goal shows Gols cell in overlay", async ({ page }) => {
    await page.route("**/api/player-stats/BRA/**", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ goals: 1, yellowCards: 0, redCards: 0 }),
      });
    });

    await page.goto("/");
    await page.click("#btn-nav-jogadores");
    await expect(page.locator("#jogadores-view")).toBeVisible();

    await page.click("#jogador-card-405742");

    const overlay = page.locator("#jogadores-player-overlay");
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText("Vinicius Jr");

    const stats = overlay.locator("#jogadores-player-overlay-stats");
    await expect(stats).toContainText("Gols");
    await expect(stats).toContainText("1");
    await expect(stats).not.toContainText("Amarelos");
    await expect(stats).not.toContainText("Vermelhos");
  });

  test("fetches stats for the correct team and player", async ({ page }) => {
    const capturedUrls: string[] = [];

    await page.route("**/api/player-stats/**", async (route) => {
      capturedUrls.push(route.request().url());
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ goals: 1, yellowCards: 0, redCards: 0 }),
      });
    });

    await page.goto("/");
    await page.click("#btn-nav-jogadores");
    await expect(page.locator("#jogadores-view")).toBeVisible();

    await page.click("#jogador-card-405742");
    await expect(page.locator("#jogadores-player-overlay")).toBeVisible();

    expect(capturedUrls.length).toBeGreaterThan(0);
    const statsUrl = capturedUrls[0];
    expect(statsUrl).toContain("/api/player-stats/BRA/");
    expect(statsUrl).toContain("Vinicius");
  });
});

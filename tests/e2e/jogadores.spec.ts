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

    // Camisa always renders as a stat tile; Posição is a categorical value, so it
    // renders in the details rows (not the numeric tile grid). Both come from the
    // player object itself, independent of the tournament-stats API.
    const stats = overlay.locator("#jogadores-player-overlay-stats");
    await expect(stats).toContainText("Camisa");
    await expect(overlay.locator("#jogadores-player-overlay-details")).toContainText("Posição");

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
    await page.route("**/api/player-stats/**", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ goals: 1, yellowCards: 0, redCards: 0 }),
      });
    });

    await page.goto("/");
    await page.click("#btn-nav-jogadores");
    await expect(page.locator("#jogadores-view")).toBeVisible();

    // Start waiting for the request before clicking so we don't miss it
    const statsRequestPromise = page.waitForRequest("**/api/player-stats/**");
    await page.click("#jogador-card-405742");
    await expect(page.locator("#jogadores-player-overlay")).toBeVisible();

    const statsRequest = await statsRequestPromise;
    expect(statsRequest.url()).toContain("/api/player-stats/BRA/");
    expect(statsRequest.url()).toContain("Vinicius");
  });

  test("shows 'Destaque no Instagram' in the Jogadores player overlay (jogadores-player-overlay)", async ({
    page,
  }) => {
    const instagramPostUrl = "https://www.instagram.com/reel/DZno5Zsxo6V/";

    await page.route("**/api/player-stats/**", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ goals: 0, yellowCards: 0, redCards: 0 }),
      });
    });

    // Instagram's embed.js rewrites <blockquote class="instagram-media"> into an
    // <iframe> once it loads and resolves a *real* permalink. This reel is real,
    // so on a network-connected host the blockquote is replaced before the
    // assertion runs (it survives only in the isolated Docker run, where the
    // script can't load) — a host-dependent flake. Stub embed.js to a no-op so the
    // blockquote stays in the DOM and the assertion is deterministic everywhere.
    await page.route(/embed\.js/, (route) =>
      route.fulfill({ contentType: "application/javascript", body: "" }),
    );

    await page.goto("/");
    await page.click("#btn-nav-jogadores");
    await expect(page.locator("#jogadores-view")).toBeVisible();

    // Vozinha (CPV GK, fifaId 364752) has instagramPostUrl in squads.json
    await page.click("#jogador-card-364752");
    await expect(page.locator("#jogadores-player-overlay")).toBeVisible();

    const toggle = page.locator("#jogadores-player-overlay-ig-toggle");
    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText("Destaque no Instagram");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    const panel = page.locator("#jogadores-player-overlay-ig-panel");
    await expect(panel).toBeVisible();
    await expect(page.locator("#jogadores-player-overlay-ig-embed-0")).toHaveAttribute(
      "src",
      `${instagramPostUrl}embed/`,
    );
    await expect(page.locator("#jogadores-player-overlay-ig-open-0")).toHaveAttribute(
      "href",
      instagramPostUrl,
    );
  });

  test("'Craques da Copa' filter narrows the list to star players and clears", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-jogadores");
    const view = page.locator("#jogadores-view");
    await expect(view).toBeVisible();

    const cards = page.locator('[id^="jogador-card-"]');
    const toggle = page.locator("#btn-filter-stars");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    const fullCount = await cards.count();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(view).toContainText(/atletas? encontrados?/i);

    const starCount = await cards.count();
    expect(starCount).toBeGreaterThan(0);
    expect(starCount).toBeLessThan(fullCount);

    // "Ver todas" clears the filter and restores the full list.
    await page.getByText("Ver todas", { exact: false }).click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(await cards.count()).toBe(fullCount);
  });
});

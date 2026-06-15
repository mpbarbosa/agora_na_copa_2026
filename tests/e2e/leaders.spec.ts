import { expect, test } from "@playwright/test";

test.describe("Leaders view (Líderes)", () => {
  test("opens the player overlay with the player picture", async ({ page }) => {
    await page.route("**/api/tournament-leaders", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          updatedAt: "2026-06-15T18:00:00.000Z",
          source: "fifa",
          note: "Teste do overlay de líderes.",
          playerLeaders: {
            topScorers: [
              {
                id: "arg-messi",
                name: "LIONEL MESSI",
                teamCode: "ARG",
                teamName: "ARGENTINA",
                teamFlagSvg: "argentina",
                shirtNumber: 10,
                pictureUrl: "https://images.fifa.test/messi.png",
                goals: 3,
                yellowCards: 1,
                redCards: 0,
              },
            ],
            yellowCards: [],
            redCards: [],
          },
          teamLeaders: {
            bestAttack: [],
            bestDefense: [],
            cleanSheets: [],
          },
        }),
      });
    });

    await page.goto("/");
    await page.click("#btn-nav-lideres");

    await expect(page.locator("#tournament-leaders-view")).toBeVisible();
    await page.click("#btn-leader-player-arg-messi");

    await expect(page.locator("#leaders-player-overlay")).toBeVisible();
    await expect(page.locator("#leaders-player-overlay-hero-image")).toBeVisible();
    await expect(page.locator("#leaders-player-overlay-avatar-image")).toBeVisible();
    await expect(page.locator("#leaders-player-overlay-hero-image")).toHaveAttribute(
      "src",
      "https://images.fifa.test/messi.png",
    );
    await expect(page.locator("#leaders-player-overlay-avatar-image")).toHaveAttribute(
      "src",
      "https://images.fifa.test/messi.png",
    );
  });
});

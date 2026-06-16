import { expect, test } from "@playwright/test";

test.describe("Incident player metadata", () => {
  test("shows Ramin Rezaeian Instagram from metadata supplements", async ({ page }) => {
    await page.route("**/api/team-lineups", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          refreshAfterMs: 60000,
          lineups: {},
        }),
      });
    });

    await page.route("**/api/match-overlays", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          refreshAfterMs: 60000,
          overlays: {
            "irn-nzl-2026": {
              broadcastGuide: {
                broadcasters: [],
                source: "fallback",
                note: "Teste do enriquecimento social por metadados.",
                updatedAt: "2026-06-15T23:00:00.000Z",
              },
              matchState: {
                status: "LIVE",
                incidents: [
                  {
                    id: "irn-yellow-ramin",
                    time: "18'",
                    type: "YELLOW_CARD",
                    text: "Ramin Rezaeian recebeu amarelo.",
                    team: "A",
                    playerMentions: [
                      {
                        name: "Ramin Rezaeian",
                        number: 23,
                        position: "DF",
                      },
                    ],
                  },
                ],
                source: "fifa",
                note: "Feed oficial da FIFA.",
                updatedAt: "2026-06-15T23:00:00.000Z",
              },
            },
          },
        }),
      });
    });

    await page.goto("/");
    await page.click("#btn-match-irn-nzl-2026");

    await expect(page.locator("#match-incidents-panel")).toContainText(
      "Ramin Rezaeian recebeu amarelo.",
    );

    await page.click("#btn-incident-player-irn-yellow-ramin-0");

    await expect(page.locator("#match-incident-player-overlay")).toBeVisible();
    await expect(page.locator("#match-incident-player-overlay")).toContainText(
      "Ramin Rezaeian",
    );
    await expect(
      page.locator("#match-incident-player-overlay-social-link-instagram"),
    ).toHaveAttribute("href", "https://instagram.com/raminrezaeian");
  });
});

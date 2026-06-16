import { expect, test } from "@playwright/test";

test.describe("Teams view (Seleções)", () => {
  test("renders the teams browser between Grupos and Líderes and opens a team page", async ({
    page,
  }) => {
    await page.route("**/api/team-view/*", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          updatedAt: "2026-06-15T19:00:00.000Z",
          refreshAfterMs: 60000,
          source: "fifa",
          note: "Painel completo da seleção em teste.",
          team: {
            name: "BRASIL",
            code: "BRA",
            flagSvg: "brazil",
            primaryColor: "#009c3b",
            secondaryColor: "#ffdf00",
            group: "Grupo C",
          },
          standings: {
            rank: 2,
            groupSize: 4,
            row: {
              id: "bra",
              name: "BRASIL",
              code: "BRA",
              flagSvg: "brazil",
              primaryColor: "#009c3b",
              secondaryColor: "#ffdf00",
              group: "Grupo C",
              points: 1,
              played: 1,
              won: 0,
              drawn: 1,
              lost: 0,
              goalsFor: 1,
              goalsAgainst: 1,
              goalDifference: 0,
              dataSource: "result",
            },
          },
          currentMatch: null,
          nextMatch: null,
          lastMatch: null,
          lineup: {
            players: [],
            source: "fallback",
            note: "Escalação local.",
            updatedAt: "2026-06-15T19:00:00.000Z",
          },
          leaders: {
            topScorers: [],
            yellowCards: [],
            redCards: [],
            teamSummary: null,
          },
          broadcastGuide: null,
        }),
      });
    });

    await page.goto("/");

    const navButtons = page.locator("#main-nav button");
    await expect(navButtons.nth(2)).toHaveText("Grupos");
    await expect(navButtons.nth(3)).toHaveText("Seleções");
    await expect(navButtons.nth(4)).toHaveText("Jogadores");
    await expect(navButtons.nth(5)).toHaveText("Líderes");

    await page.click("#btn-nav-selecoes");

    await expect(page.locator("#teams-view")).toBeVisible();
    await expect(page.locator('[id^="teams-group-grupo-"]')).toHaveCount(12);
    await expect(page.locator("#btn-team-card-bra")).toContainText("BRASIL");

    await page.click("#btn-team-card-bra");

    await expect(page.locator("#team-lineup-view")).toBeVisible();
    await expect(page.locator("#team-lineup-title")).toContainText("BRASIL");
  });
});

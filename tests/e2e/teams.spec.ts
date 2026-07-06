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
    await expect(navButtons.nth(3)).toHaveText("Mata-mata");
    await expect(navButtons.nth(4)).toHaveText("Grupos");
    await expect(navButtons.nth(5)).toHaveText("Seleções");
    await expect(navButtons.nth(6)).toHaveText("Jogadores");
    await expect(navButtons.nth(7)).toHaveText("Líderes");

    await page.click("#btn-nav-selecoes");

    await expect(page.locator("#teams-view")).toBeVisible();
    await expect(page.locator('[id^="teams-group-grupo-"]')).toHaveCount(12);
    await expect(page.locator("#btn-team-card-bra")).toContainText("BRASIL");

    await page.click("#btn-team-card-bra");

    await expect(page.locator("#team-lineup-view")).toBeVisible();
    await expect(page.locator("#team-lineup-title")).toContainText("BRASIL");
  });

  test("marks teams that have qualified for the knockout phase", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-selecoes");
    await expect(page.locator("#teams-view")).toBeVisible();

    // México has mathematically secured a top-2 spot, so its card carries the
    // qualified badge; a team still in contention does not.
    await expect(page.getByTestId("team-qualified-mex")).toBeVisible();
    await expect(page.getByTestId("team-qualified-mex")).toContainText("Classificada");
    await expect(page.locator("#btn-team-card-mex")).toContainText("✓");
  });

  test("marks teams that can no longer qualify for the knockout phase", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-selecoes");
    await expect(page.locator("#teams-view")).toBeVisible();

    // Haiti is mathematically out of a top-2 finish, so its card carries the
    // eliminated badge. A qualified team must not also show it.
    await expect(page.getByTestId("team-eliminated-hai")).toBeVisible();
    await expect(page.getByTestId("team-eliminated-hai")).toContainText("Eliminada");
    await expect(page.locator("#btn-team-card-hai")).toContainText("✕");
    await expect(page.getByTestId("team-eliminated-mex")).toHaveCount(0);
  });

  test("resolves a 3rd-placed team's fate by the best-thirds ranking", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-selecoes");
    await expect(page.locator("#teams-view")).toBeVisible();

    // With every group finished, a 3rd-placed team is decided by the cross-group
    // best-thirds cut (Art. 12.5) — the same resolution the Grupos view applies.
    // KOR finished 3rd in Grupo A and falls outside the 8 best thirds, so it is
    // eliminated (not left badge-less in "contention").
    await expect(page.getByTestId("team-eliminated-kor")).toBeVisible();
    await expect(page.getByTestId("team-eliminated-kor")).toContainText("Eliminada");

    // SEN finished 3rd in Grupo I but ranks inside the 8 best thirds, so it
    // carries the qualified badge.
    await expect(page.getByTestId("team-qualified-sen")).toBeVisible();
    await expect(page.getByTestId("team-qualified-sen")).toContainText("Classificada");
  });
});

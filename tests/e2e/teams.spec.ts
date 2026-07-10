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

  test("names the round a team advanced to", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-selecoes");
    await expect(page.locator("#teams-view")).toBeVisible();

    // França keeps advancing in the bracket, so its badge names the knockout
    // round it reached with the still-in-it ✓, not a group verdict. Matched
    // round-agnostically so the test survives further progression (oitavas →
    // quartas → semifinais → final) as the tournament plays on.
    await expect(page.getByTestId("team-qualified-fra")).toBeVisible();
    await expect(page.getByTestId("team-qualified-fra")).toContainText(
      /oitavas|quartas|semifinais|final/i,
    );
    await expect(page.locator("#btn-team-card-fra")).toContainText("✓");
    await expect(page.getByTestId("team-eliminated-fra")).toHaveCount(0);
  });

  test("names the round a team was knocked out in", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-selecoes");
    await expect(page.locator("#teams-view")).toBeVisible();

    // Brasil qualified from its group but lost in the Oitavas, so its current
    // status is the round it exited — not the (now redundant) group verdict.
    await expect(page.getByTestId("team-eliminated-bra")).toBeVisible();
    await expect(page.getByTestId("team-eliminated-bra")).toContainText("oitavas");
    await expect(page.locator("#btn-team-card-bra")).toContainText("✕");
    await expect(page.getByTestId("team-qualified-bra")).toHaveCount(0);

    // Haiti never left the group stage — its exit round is the group phase.
    await expect(page.getByTestId("team-eliminated-hai")).toBeVisible();
    await expect(page.getByTestId("team-eliminated-hai")).toContainText("fase de grupos");
  });

  test("a 3rd-placed team's exit round shows whether it reached the bracket", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-selecoes");
    await expect(page.locator("#teams-view")).toBeVisible();

    // KOR finished 3rd in Grupo A, outside the 8 best thirds — it never reached
    // the knockout bracket, so it exited in the group phase.
    await expect(page.getByTestId("team-eliminated-kor")).toBeVisible();
    await expect(page.getByTestId("team-eliminated-kor")).toContainText("fase de grupos");

    // SEN finished 3rd but ranked inside the 8 best thirds, so it reached the
    // 16-avos before losing there — a deeper exit round than a group-phase exit,
    // proving the best-thirds cut (Art. 12.5) placed it in the bracket.
    await expect(page.getByTestId("team-eliminated-sen")).toBeVisible();
    await expect(page.getByTestId("team-eliminated-sen")).toContainText("16 avos");
  });
});

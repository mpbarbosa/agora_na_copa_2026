import { expect, test, type Page } from "@playwright/test";

async function mockTeamView(page: Page) {
  await page.route("**/api/team-view/*", async (route) => {
    const url = new URL(route.request().url());
    const teamCode = url.pathname.split("/").pop()?.toUpperCase() || "BRA";

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        updatedAt: "2026-06-15T19:00:00.000Z",
        refreshAfterMs: 60000,
        source: "fifa",
        note: "Painel completo da seleção em teste.",
        team: {
          name: `SELEÇÃO ${teamCode}`,
          code: teamCode,
          flagSvg: "brazil",
          primaryColor: "#009c3b",
          secondaryColor: "#ffdf00",
          group: "Grupo C",
        },
        standings: {
          rank: 1,
          groupSize: 4,
          row: {
            id: teamCode.toLowerCase(),
            name: `SELEÇÃO ${teamCode}`,
            code: teamCode,
            flagSvg: "brazil",
            primaryColor: "#009c3b",
            secondaryColor: "#ffdf00",
            group: "Grupo C",
            points: 4,
            played: 2,
            won: 1,
            drawn: 1,
            lost: 0,
            goalsFor: 3,
            goalsAgainst: 1,
            goalDifference: 2,
            dataSource: "result",
          },
        },
        currentMatch: {
          matchId: "bra-mar-2026",
          team: {
            name: `SELEÇÃO ${teamCode}`,
            code: teamCode,
            flagSvg: "brazil",
            primaryColor: "#009c3b",
            secondaryColor: "#ffdf00",
            group: "Grupo C",
          },
          opponent: {
            name: "MARROCOS",
            code: "MAR",
            flagSvg: "morocco",
            primaryColor: "#c1272d",
            secondaryColor: "#006233",
            group: "Grupo C",
          },
          stageName: "Group Stage",
          stadiumName: "Estádio de Los Angeles",
          city: "LOS ANGELES",
          kickoffTime: "21:30",
          kickoffDate: "15 Junho, 2026",
          kickoffTimestamp: "2026-06-15T21:30:00-03:00",
          officialMatchUrl: "https://example.com/match",
          status: "LIVE",
          matchTime: "44'",
          score: {
            team: 2,
            opponent: 1,
          },
          broadcasters: [
            {
              id: "globo",
              type: "TV ABERTA",
              name: "Globo",
              iconColor: "#ffffff",
              link: "https://globoplay.globo.com/",
            },
          ],
          source: "fifa",
          note: "Dados oficiais da FIFA.",
          fifaMatchId: "fifa-bra-mar",
          updatedAt: "2026-06-15T19:00:00.000Z",
        },
        nextMatch: null,
        lastMatch: null,
        lineup: {
          players: [
            {
              id: `${teamCode.toLowerCase()}-gk`,
              name: "Goleiro Teste",
              number: 1,
              position: "GK",
              x: 50,
              y: 90,
              club: "Clube Teste",
              pictureUrl: "https://images.fifa.test/gk.png",
            },
            {
              id: `${teamCode.toLowerCase()}-fw`,
              name: "Atacante Teste",
              number: 9,
              position: "FW",
              x: 50,
              y: 18,
              club: "Clube Teste",
              pictureUrl: "https://images.fifa.test/fw.png",
            },
          ],
          source: "fifa",
          note: "Escalação oficial FIFA.",
          fifaMatchId: "fifa-bra-mar",
          updatedAt: "2026-06-15T19:00:00.000Z",
        },
        leaders: {
          topScorers: [
            {
              id: `${teamCode.toLowerCase()}-fw`,
              name: "Atacante Teste",
              teamCode,
              teamName: `SELEÇÃO ${teamCode}`,
              teamFlagSvg: "brazil",
              shirtNumber: 9,
              pictureUrl: "https://images.fifa.test/fw.png",
              goals: 2,
              yellowCards: 0,
              redCards: 0,
            },
          ],
          yellowCards: [],
          redCards: [],
          teamSummary: {
            id: teamCode.toLowerCase(),
            teamCode,
            teamName: `SELEÇÃO ${teamCode}`,
            teamFlagSvg: "brazil",
            matchesPlayed: 2,
            wins: 1,
            goalsFor: 3,
            goalsAgainst: 1,
            cleanSheets: 1,
          },
        },
        broadcastGuide: {
          broadcasters: [
            {
              id: "globo",
              type: "TV ABERTA",
              name: "Globo",
              iconColor: "#ffffff",
              link: "https://globoplay.globo.com/",
            },
          ],
          source: "fifa",
          note: "Onde assistir da FIFA.",
          fifaMatchId: "fifa-bra-mar",
          updatedAt: "2026-06-15T19:00:00.000Z",
        },
      }),
    });
  });
}

test.describe("Team view", () => {
  test("opens the full team page from a match flag click", async ({ page }) => {
    await mockTeamView(page);

    await page.goto("/");
    await page.click("#team-a-display button[aria-label^='Ver escalação']");

    await expect(page.locator("#team-lineup-view")).toBeVisible();
    await expect(page.locator("#team-view-matches")).toBeVisible();
    await expect(page.locator("#team-view-standings-card")).toBeVisible();
    await expect(page.locator("#team-view-summary-card")).toBeVisible();
    await expect(page.locator("#team-view-performance-card")).toBeVisible();
    await expect(page.locator("#team-view-leaders-card")).toBeVisible();
    await expect(page.locator("#team-view-broadcast-card")).toBeVisible();
    await expect(page.locator("#team-lineup-board-card")).toContainText("Escalação da seleção");
    await expect(page.locator("#team-performance-aproveitamento")).toHaveText("67%");

    await page.click("#btn-team-lineup-back");
    await expect(page.locator("#match-detail-view")).toBeVisible();
  });

  test("opens the full team page from the standings table", async ({ page }) => {
    await mockTeamView(page);

    await page.goto("/");
    await page.click("#btn-nav-grupos");
    await page.click("#standings-row-bra button[aria-label^='Ver escalação']");

    await expect(page.locator("#team-lineup-view")).toBeVisible();
    await expect(page.locator("#team-lineup-title")).toContainText("SELEÇÃO BRA");
    await expect(page.locator("#team-view-performance-card")).toBeVisible();
    await expect(page.locator("#team-performance-media-gols-pro")).toHaveText("1,5");
    await expect(page.locator("#team-performance-media-gols-contra")).toHaveText("0,5");
  });

  test("opens the full team page from the venue hosted matches list", async ({ page }) => {
    await mockTeamView(page);

    await page.goto("/");
    await page.click("#btn-nav-estadios");

    await expect(page.locator("#venue-map-view")).toBeVisible();
    await expect(page.locator('.venue-map-marker[data-venue-id="vancouver"]')).toBeVisible();

    await page
      .locator('.venue-map-marker[data-venue-id="vancouver"]')
      .evaluate((element) => {
        (element.closest(".leaflet-marker-icon") as HTMLElement | null)?.click();
      });

    await expect(page.locator("#venue-hosted-match-aus-tur-2026")).toBeVisible();
    await page.click("#venue-hosted-match-aus-tur-2026 button[aria-label^='Ver escalação']");

    await expect(page.locator("#team-lineup-view")).toBeVisible();
    await expect(page.locator("#team-view-standings-card")).toBeVisible();
    await expect(page.locator("#team-view-performance-card")).toBeVisible();
  });
});

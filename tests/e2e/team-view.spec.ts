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

async function mockBelgiumFallbackTeamView(page: Page) {
  await page.route("**/api/team-view/BEL", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        updatedAt: "2026-06-15T19:00:00.000Z",
        refreshAfterMs: 60000,
        source: "fallback",
        note: "Painel da Bélgica com enriquecimento FIFA sobre dados locais.",
        team: {
          name: "BÉLGICA",
          code: "BEL",
          flagSvg: "belgium",
          primaryColor: "#000000",
          secondaryColor: "#fae042",
          group: "Grupo H",
        },
        standings: {
          rank: 2,
          groupSize: 4,
          row: {
            id: "bel",
            name: "BÉLGICA",
            code: "BEL",
            flagSvg: "belgium",
            primaryColor: "#000000",
            secondaryColor: "#fae042",
            group: "Grupo H",
            points: 3,
            played: 1,
            won: 1,
            drawn: 0,
            lost: 0,
            goalsFor: 2,
            goalsAgainst: 1,
            goalDifference: 1,
            dataSource: "result",
          },
        },
        currentMatch: null,
        nextMatch: null,
        lastMatch: null,
        lineup: {
          players: [
            {
              id: "bel-1",
              name: "Koen Casteels",
              number: 1,
              position: "GK",
              x: 50,
              y: 90,
            },
            {
              id: "bel-4",
              name: "Wout Faes",
              number: 4,
              position: "DF",
              x: 35,
              y: 72,
            },
            {
              id: "bel-11",
              name: "Jérémy Doku",
              number: 11,
              position: "FW",
              x: 24,
              y: 26,
              pictureUrl: "https://digitalhub.fifa.com/transform/df41be47-900d-41fe-90eb-b493f7609869/DOKU-Jeremy_448341",
            },
            {
              id: "bel-9",
              name: "Romelu Lukaku",
              number: 9,
              position: "FW",
              x: 50,
              y: 18,
              pictureUrl: "https://digitalhub.fifa.com/transform/302b7fb7-6964-4a52-8db4-9c12778b80fa/LUKAKU-Romelu_358112",
            },
            {
              id: "bel-10",
              name: "Leandro Trossard",
              number: 10,
              position: "MF",
              x: 65,
              y: 30,
              pictureUrl: "https://digitalhub.fifa.com/transform/78476568-5abb-4047-b6c0-fd9651e0f39d/TROSSARD-Leandro_448355",
            },
          ],
          source: "fallback",
          note: "Escalação oficial da FIFA ainda não divulgada; exibindo dados locais.",
          fifaMatchId: "400021478",
          updatedAt: "2026-06-15T19:00:00.000Z",
        },
        leaders: {
          topScorers: [],
          yellowCards: [],
          redCards: [],
          teamSummary: {
            id: "bel",
            teamCode: "BEL",
            teamName: "BÉLGICA",
            teamFlagSvg: "belgium",
            matchesPlayed: 1,
            wins: 1,
            goalsFor: 2,
            goalsAgainst: 1,
            cleanSheets: 0,
          },
        },
        broadcastGuide: null,
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

  test("renders corrected FIFA-enriched Belgium fallback lineup data in the team view", async ({
    page,
  }) => {
    await mockBelgiumFallbackTeamView(page);

    await page.goto("/");
    await page.click("#btn-nav-grupos");
    await page.click("#standings-row-bel button[aria-label^='Ver escalação']");

    await expect(page.locator("#team-lineup-view")).toBeVisible();
    await expect(page.locator("#team-lineup-title")).toContainText("BÉLGICA");
    await expect(page.locator("#team-lineup-board-card")).toContainText(
      "Escalação estimada (dados locais)",
    );

    await expect(page.locator("#squad-player-row-bel-9")).toContainText("9");
    await expect(page.locator("#squad-player-row-bel-9")).toContainText("Romelu Lukaku");
    await expect(page.locator("#squad-player-row-bel-10")).toContainText("10");
    await expect(page.locator("#squad-player-row-bel-10")).toContainText("Leandro Trossard");
    await expect(page.locator("#squad-player-row-bel-11")).toContainText("11");
    await expect(page.locator("#squad-player-row-bel-11")).toContainText("Jérémy Doku");

    await expect(page.locator("#squad-player-row-bel-9 img")).toHaveAttribute(
      "src",
      /LUKAKU-Romelu_358112/,
    );
    await expect(page.locator("#squad-player-row-bel-10 img")).toHaveAttribute(
      "src",
      /TROSSARD-Leandro_448355/,
    );
    await expect(page.locator("#squad-player-row-bel-11 img")).toHaveAttribute(
      "src",
      /DOKU-Jeremy_448341/,
    );

    await expect(page.locator("#squad-player-row-bel-1 img")).toHaveCount(0);
    await expect(page.locator("#squad-player-row-bel-4 img")).toHaveCount(0);

    await page.click("#squad-player-row-bel-9");
    await expect(page.locator("#selected-player-info")).toContainText("Romelu Lukaku");
    await expect(page.locator("#player-meta-grid")).toContainText("Atacante");
    await expect(page.locator("#btn-expand-player-picture")).toBeVisible();

    await page.click("#btn-expand-player-picture");
    await expect(page.locator("#player-picture-overlay")).toBeVisible();
    await expect(page.locator("#player-picture-overlay img")).toHaveAttribute(
      "src",
      /LUKAKU-Romelu_358112/,
    );
  });
});

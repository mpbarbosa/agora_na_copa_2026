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

  test("opens the full team page from a player team reference", async ({ page }) => {
    await page.route("**/api/tournament-leaders", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          updatedAt: "2026-06-15T18:00:00.000Z",
          source: "fifa",
          note: "Teste da navegação do time no card do jogador.",
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

    await page.route("**/api/team-view/*", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          updatedAt: "2026-06-15T19:00:00.000Z",
          refreshAfterMs: 60000,
          source: "fifa",
          note: "Painel completo da seleção em teste.",
          team: {
            name: "ARGENTINA",
            code: "ARG",
            flagSvg: "argentina",
            primaryColor: "#74acdf",
            secondaryColor: "#ffffff",
            group: "Grupo J",
          },
          standings: {
            rank: 1,
            groupSize: 4,
            row: {
              id: "arg",
              name: "ARGENTINA",
              code: "ARG",
              flagSvg: "argentina",
              primaryColor: "#74acdf",
              secondaryColor: "#ffffff",
              group: "Grupo J",
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
                id: "arg-10",
                name: "LIONEL MESSI",
                number: 10,
                position: "FW",
                x: 50,
                y: 20,
                club: "Inter Miami",
              },
            ],
            source: "fallback",
            note: "Escalação local.",
            updatedAt: "2026-06-15T19:00:00.000Z",
          },
          leaders: {
            topScorers: [],
            yellowCards: [],
            redCards: [],
            teamSummary: {
              id: "arg",
              teamCode: "ARG",
              teamName: "ARGENTINA",
              teamFlagSvg: "argentina",
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

    await page.goto("/");
    await page.click("#btn-nav-lideres");
    await page.click("#btn-open-player-team-name-arg-messi");

    await expect(page.locator("#team-lineup-view")).toBeVisible();
    await expect(page.locator("#team-lineup-title")).toContainText("ARGENTINA");
    await expect(page.locator("#team-view-standings-card")).toBeVisible();
  });

  test("opens the full team page from the leaders team overlay", async ({ page }) => {
    await page.route("**/api/tournament-leaders", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          updatedAt: "2026-06-15T18:00:00.000Z",
          source: "fifa",
          note: "Teste do overlay coletivo.",
          playerLeaders: {
            topScorers: [],
            yellowCards: [],
            redCards: [],
          },
          teamLeaders: {
            bestAttack: [
              {
                id: "bra",
                teamCode: "BRA",
                teamName: "BRASIL",
                teamFlagSvg: "brazil",
                matchesPlayed: 2,
                wins: 1,
                goalsFor: 3,
                goalsAgainst: 1,
                cleanSheets: 1,
              },
            ],
            bestDefense: [],
            cleanSheets: [],
          },
        }),
      });
    });

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
            rank: 1,
            groupSize: 4,
            row: {
              id: "bra",
              name: "BRASIL",
              code: "BRA",
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
          currentMatch: null,
          nextMatch: null,
          lastMatch: null,
          lineup: {
            players: [
              {
                id: "bra-gk",
                name: "Goleiro Teste",
                number: 1,
                position: "GK",
                x: 50,
                y: 90,
                club: "Clube Teste",
              },
            ],
            source: "fallback",
            note: "Escalação local.",
            updatedAt: "2026-06-15T19:00:00.000Z",
          },
          leaders: {
            topScorers: [],
            yellowCards: [],
            redCards: [],
            teamSummary: {
              id: "bra",
              teamCode: "BRA",
              teamName: "BRASIL",
              teamFlagSvg: "brazil",
              matchesPlayed: 2,
              wins: 1,
              goalsFor: 3,
              goalsAgainst: 1,
              cleanSheets: 1,
            },
          },
          broadcastGuide: null,
        }),
      });
    });

    await page.goto("/");
    await page.click("#btn-nav-lideres");
    await page.click("#btn-leader-team-bra");

    await expect(page.locator("#leaders-team-overlay")).toBeVisible();
    await page.click("#btn-open-team-view-from-leaders-overlay");

    await expect(page.locator("#team-lineup-view")).toBeVisible();
    await expect(page.locator("#team-lineup-title")).toContainText("BRASIL");
    await expect(page.locator("#team-view-standings-card")).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";

import { NAV_ITEMS } from "../../src/navigation";

const NAV_VIEW_IDS: Record<string, string> = {
  partidas: "#match-detail-view",
  grupos: "#standings-view",
  selecoes: "#teams-view",
  lideres: "#tournament-leaders-view",
  chaveamento: "#bracket-view",
  estadios: "#venue-map-view",
  noticias: "#news-view",
  fanzone: "#fanzone-view",
};

test.describe("Navigation shell", () => {
  test("loads with the Ao Vivo view by default", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");

    await expect(page.locator("#btn-nav-partidas")).toHaveClass(/font-semibold/);
    await expect(page.locator("#match-detail-view")).toBeVisible();
    await expect(page.locator("#core-live-scoreboard")).toBeVisible();
    await expect(page.locator("#scoreboard-group-label")).toContainText(/Grupo [A-L]/);
    await expect(page.locator("#broadcast-section-title")).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test("Ao Vivo nav draws attention when there is a live match", async ({ page }) => {
    await page.route("**/api/match-overlays", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          refreshAfterMs: 60000,
          overlays: {
            "bra-mar-2026": {
              broadcastGuide: {
                broadcasters: [],
                source: "fallback",
                note: "Teste do destaque ao vivo.",
                updatedAt: "2026-06-15T20:30:00.000Z",
              },
              matchState: {
                status: "LIVE",
                score: {
                  teamA: 1,
                  teamB: 0,
                },
                matchTime: "12'",
                source: "fifa",
                note: "Partida em andamento.",
                updatedAt: "2026-06-15T20:30:00.000Z",
              },
            },
          },
        }),
      });
    });

    await page.goto("/");

    await expect(page.locator("#btn-nav-partidas")).toHaveAttribute(
      "data-live-attention",
      "true",
    );
    await expect(page.locator("#btn-nav-partidas #nav-live-indicator")).toBeVisible();
  });

  test("match selector switches the active match", async ({ page }) => {
    await page.goto("/");

    const chips = page.locator('#match-selector-groups [id^="btn-match-"]');
    const chipCount = await chips.count();
    expect(chipCount).toBeGreaterThan(1);

    let target = null;
    for (let i = 0; i < chipCount; i++) {
      const chip = chips.nth(i);
      const classAttr = await chip.getAttribute("class");
      if (!classAttr?.includes("font-semibold")) {
        target = chip;
        break;
      }
    }

    expect(target).not.toBeNull();
    const targetId = await target!.getAttribute("id");
    await target!.click();

    await expect(page.locator(`#match-selector-groups #${targetId}`)).toHaveClass(/font-semibold/);
    await expect(page.locator("#scoreboard-clock")).toBeVisible();
  });

  test("bra-mar custom countdown demo still works", async ({ page }) => {
    await page.route("**/api/match-overlays", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          refreshAfterMs: 60000,
          overlays: {},
        }),
      });
    });

    await page.goto("/");
    await page.click("#match-selector-chips-finished #btn-match-bra-mar-2026");
    await page.click("#btn-edit-match");
    await page.fill("#input-kickoff-time", "21:30");
    await page.fill("#input-countdown-seconds", "123");
    await page.click("#btn-apply-match-config");

    await expect(page.locator("#scoreboard-clock")).toHaveText("21:30");
    await expect(page.locator("#countdown-sub-wrapper")).toContainText("00:02:03");
    await expect(page.locator("#game-state-badge")).toContainText("PRÉ-JOGO");
  });

  test("all live nav tabs open in both themes without console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");

    for (const item of NAV_ITEMS) {
      const viewSelector = NAV_VIEW_IDS[item.id];

      await page.click(`#btn-nav-${item.id}`);
      await expect(page.locator(viewSelector)).toBeVisible();

      await page.click("#btn-toggle-theme");
      await expect(page.locator(viewSelector)).toBeVisible();
      await page.click("#btn-toggle-theme");
      await expect(page.locator(viewSelector)).toBeVisible();
    }

    expect(consoleErrors).toEqual([]);
  });

  test("scoreboard group badge opens Grupos focused on the current group", async ({ page }) => {
    await page.route("**/api/match-overlays", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          refreshAfterMs: 60000,
          overlays: {},
        }),
      });
    });

    await page.goto("/");
    await page.click("#match-selector-chips-finished #btn-match-bra-mar-2026");
    await expect(page.locator("#scoreboard-group-label")).toHaveText("Grupo C");

    await page.click("#scoreboard-group-label");

    await expect(page.locator("#btn-nav-grupos")).toHaveClass(/font-semibold/);
    await expect(page.locator("#standings-view")).toBeVisible();
    await expect(page.locator("#standings-group-grupo-c")).toHaveAttribute(
      "data-focused",
      "true",
    );
  });

  test("renders the FIFA-style incidents feed and opens player overlays from highlighted names", async ({
    page,
  }) => {
    await page.route("**/api/team-lineups", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          refreshAfterMs: 60000,
          lineups: {
            "ksa-uru-2026": {
              teamA: {
                players: [
                  {
                    id: "ksa-gk",
                    name: "Mohammed Al-Owais",
                    number: 21,
                    position: "GK",
                    x: 50,
                    y: 88,
                    club: "Al-Hilal",
                    socials: {
                      instagram: "https://instagram.com/alowais_33",
                    },
                  },
                  {
                    id: "ksa-alamri",
                    name: "Abdulilah Alamri",
                    number: 4,
                    position: "DF",
                    x: 38,
                    y: 75,
                    club: "Al-Nassr",
                    pictureUrl: "https://images.fifa.test/alamri.png",
                  },
                  {
                    id: "ksa-kanno",
                    name: "Mohamed Kanno",
                    number: 23,
                    position: "MF",
                    x: 50,
                    y: 44,
                    club: "Al-Hilal",
                  },
                ],
                source: "fifa",
                note: "Escalação oficial FIFA em teste.",
                updatedAt: "2026-06-15T20:00:00.000Z",
              },
              teamB: {
                players: [
                  {
                    id: "uru-vina",
                    name: "Matias Vina",
                    number: 17,
                    position: "DF",
                    x: 15,
                    y: 30,
                    club: "Flamengo",
                  },
                  {
                    id: "uru-darwin",
                    name: "Darwin Nunez",
                    number: 9,
                    position: "FW",
                    x: 50,
                    y: 85,
                    club: "Liverpool",
                  },
                ],
                source: "fifa",
                note: "Escalação oficial FIFA em teste.",
                updatedAt: "2026-06-15T20:16:44.000Z",
              },
            },
          },
        }),
      });
    });

    await page.route("**/api/match-overlays", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          refreshAfterMs: 60000,
          overlays: {
            "ksa-uru-2026": {
              broadcastGuide: {
                broadcasters: [],
                source: "fallback",
                note: "Teste do overlay de jogador nos lances.",
                updatedAt: "2026-06-15T20:16:44.000Z",
              },
              matchState: {
                status: "LIVE",
                incidents: [
                  {
                    id: "uru-sub-vina-sanabria",
                    time: "--'",
                    type: "SUBSTITUTION",
                    text: "Sai Matias VINA, entra Juan Manuel SANABRIA.",
                    team: "B",
                    playerMentions: [
                      {
                        id: "uru-vina",
                        name: "Matias Vina",
                        number: 17,
                        position: "DF",
                      },
                      {
                        id: "uru-sanabria",
                        name: "Juan Manuel Sanabria",
                        number: 6,
                        position: "MF",
                      },
                    ],
                  },
                  {
                    id: "uru-sub-darwin-canobbio",
                    time: "--'",
                    type: "SUBSTITUTION",
                    text: "Sai Darwin NUNEZ, entra Agustin CANOBBIO.",
                    team: "B",
                    playerMentions: [
                      {
                        id: "uru-darwin",
                        name: "Darwin Nunez",
                        number: 9,
                        position: "FW",
                      },
                      {
                        id: "uru-canobbio",
                        name: "Agustin Canobbio",
                        number: 14,
                        position: "FW",
                        pictureUrl: "https://images.fifa.test/canobbio.png",
                      },
                    ],
                  },
                  {
                    id: "ksa-yellow-alamri",
                    time: "44'",
                    type: "YELLOW_CARD",
                    text: "ALAMRI recebeu amarelo.",
                    team: "A",
                    playerMentions: [
                      {
                        id: "ksa-alamri",
                        name: "Abdulilah Alamri",
                        number: 4,
                        position: "DF",
                        pictureUrl: "https://images.fifa.test/alamri.png",
                      },
                    ],
                  },
                  {
                    id: "ksa-goal-alamri",
                    time: "41'",
                    type: "GOAL",
                    text: "ALAMRI marcou.",
                    team: "A",
                    playerMentions: [
                      {
                        id: "ksa-alamri",
                        name: "Abdulilah Alamri",
                        number: 4,
                        position: "DF",
                        pictureUrl: "https://images.fifa.test/alamri.png",
                      },
                    ],
                  },
                ],
                source: "fifa",
                note: "Feed oficial da FIFA.",
                updatedAt: "2026-06-15T23:16:44.000Z",
              },
            },
          },
        }),
      });
    });

    await page.goto("/");
    await page.click("#btn-match-ksa-uru-2026");
    await expect(page.locator("#match-incidents-panel")).toContainText("Feed oficial da FIFA");
    await expect(page.locator("#match-incidents-panel")).toContainText("Atualizado 20:16:44");
    await expect(page.locator("#match-incidents-panel")).toContainText(
      "Clique no nome destacado para abrir o card do jogador",
    );
    await expect(page.locator("#match-incidents-panel")).toContainText(
      "Sai Matias VINA, entra Juan Manuel SANABRIA.",
    );
    await expect(page.locator("#match-incidents-panel")).toContainText(
      "Sai Darwin NUNEZ, entra Agustin CANOBBIO.",
    );
    await expect(page.locator("#match-incidents-panel")).toContainText(
      "ALAMRI recebeu amarelo.",
    );
    await expect(page.locator("#match-incidents-panel")).toContainText("ALAMRI marcou.");

    await page.click("#btn-incident-player-ksa-goal-alamri-0");

    await expect(page.locator("#match-incident-player-overlay")).toBeVisible();
    await expect(page.locator("#match-incident-player-overlay")).toContainText("Abdulilah Alamri");
    await expect(page.locator("#btn-open-match-incident-player-picture")).toBeVisible();
    await expect(page.locator("#match-incident-player-overlay")).toContainText("ARÁBIA SAUDITA");
    await expect(
      page.locator("#match-incident-player-overlay-social-link-instagram"),
    ).toHaveAttribute("href", "https://instagram.com/aalamri32");
    await expect(page.locator("#match-incident-player-overlay img")).toHaveAttribute(
      "src",
      /images\.fifa\.test\/alamri\.png/,
    );

    await page.click("#btn-close-match-incident-player-overlay");
    await page.click("#btn-incident-player-uru-sub-darwin-canobbio-1");

    await expect(page.locator("#match-incident-player-overlay")).toBeVisible();
    await expect(page.locator("#match-incident-player-overlay")).toContainText("Agustin Canobbio");
    await expect(page.locator("#match-incident-player-overlay")).toContainText("URUGUAI");
    await expect(page.locator("#match-incident-player-overlay img")).toHaveAttribute(
      "src",
      /images\.fifa\.test\/canobbio\.png/,
    );
  });

  test("simulated incidents also expose a visible player link", async ({ page }) => {
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
          overlays: {},
        }),
      });
    });

    await page.goto("/");
    await page.click("#match-selector-chips-finished #btn-match-bra-mar-2026");
    await page.click("#btn-edit-match");
    await page.click("#btn-sim-start-live");
    await page.click("#btn-sim-goal-a");

    await expect(page.locator("#match-incidents-panel")).toContainText(
      "Clique no nome destacado para abrir o card do jogador",
    );
    await expect(page.locator('[id^="btn-incident-player-sim-bra-mar-2026-GOAL-A-"]')).toBeVisible();
  });
});

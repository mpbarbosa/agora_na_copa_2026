import { test, expect } from "@playwright/test";
import { collectAppConsoleErrors } from "./fixtures/consoleErrors";
import { stubLiveApis } from "./fixtures/aoVivo";

import { NAV_ITEMS } from "../../src/navigation";

const NAV_VIEW_IDS: Record<string, string> = {
  dashboard: "#dashboard-view",
  "ao-vivo": "#match-detail-view",
  partidas: "#partidas-view",
  grupos: "#standings-view",
  selecoes: "#teams-view",
  jogadores: "#jogadores-view",
  lideres: "#tournament-leaders-view",
  chaveamento: "#bracket-view",
  estadios: "#venue-map-view",
  noticias: "#news-view",
  fanzone: "#fanzone-view",
  "social-medias": "#social-medias-view",
};

test.describe("Navigation shell", () => {
  test("loads with the Ao Vivo view by default", async ({ page }) => {
    const consoleErrors = collectAppConsoleErrors(page);

    // Seed a no-live state so Ao Vivo lands on the single-match focus detail
    // (the "Os dois" overview only appears with 2+ simultaneous live games),
    // keeping the default-view scoreboard assertions deterministic.
    await stubLiveApis(page);
    await page.goto("/");

    await expect(page.locator("#btn-nav-ao-vivo")).toHaveClass(/font-semibold/);
    await expect(page.locator("#match-detail-view")).toBeVisible();
    await expect(page.locator("#core-live-scoreboard")).toBeVisible();
    // The scoreboard carries a stage label: "Grupo X" for group games, or the
    // round name for knockout fixtures. The default (next upcoming) match is a
    // group game during the group stage and a knockout fixture afterwards, so
    // accept either — whichever the current phase makes the default.
    await expect(
      page.locator("#scoreboard-group-label, #scoreboard-stage-label"),
    ).toContainText(
      /Grupo [A-L]|16 Avos de Final|Oitavas de Final|Quartas de Final|Semifinal|Disputa do 3º Lugar|Final/,
    );
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

    await expect(page.locator("#btn-nav-ao-vivo")).toHaveAttribute(
      "data-live-attention",
      "true",
    );
    await expect(page.locator("#btn-nav-ao-vivo #nav-live-indicator")).toBeVisible();
  });

  test("Partidas nav sits between Ao Vivo and Grupos and opens the full fixtures viewer", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator("#main-nav")).toContainText("Ao Vivo");
    await expect(page.locator("#main-nav")).toContainText("Partidas");
    await expect(page.locator("#main-nav")).toContainText("Grupos");

    const navLabels = await page.locator("#main-nav > button").evaluateAll((buttons) =>
      buttons.map((button) => button.textContent?.replace(/\s+/g, " ").trim() ?? ""),
    );
    const aoVivoIndex = navLabels.indexOf("Ao Vivo");
    const partidasIndex = navLabels.indexOf("Partidas");
    const gruposIndex = navLabels.indexOf("Grupos");

    expect(aoVivoIndex).toBeGreaterThanOrEqual(0);
    expect(partidasIndex).toBe(aoVivoIndex + 1);
    expect(gruposIndex).toBe(partidasIndex + 1);

    await page.click("#btn-nav-partidas");

    await expect(page.locator("#partidas-view")).toBeVisible();
    await expect(page.locator("#btn-partidas-filter-pre_game")).toContainText("Agendadas");
    await expect(page.locator("#btn-partidas-filter-live")).toContainText("Ao vivo");
    await expect(page.locator("#btn-partidas-filter-finished")).toContainText("Encerradas");

    await page.click("#btn-partidas-filter-finished");
    await expect(page.locator('[id^="partidas-card-"]').first()).toBeVisible();
    await expect(page.locator("#partidas-card-ksa-uru-2026")).toBeVisible();
  });

  test("match selector switches the active match", async ({ page }) => {
    // No live games → Ao Vivo stays on the focus detail, so the match-selector
    // chips rail is mounted (the "Os dois" overview would unmount it).
    await stubLiveApis(page);
    await page.goto("/");

    // Use the finished chips rail — always has multiple chips regardless of live/upcoming state
    const chips = page.locator('#match-selector-chips-finished [id^="btn-match-"]');
    await expect(chips.first()).toBeVisible();
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

    await expect(page.locator(`#match-selector-chips-finished #${targetId}`)).toHaveClass(/font-semibold/);
    await expect(page.locator("#scoreboard-clock")).toBeVisible();
  });

  test("shows the match analysis panel for a match that has one", async ({ page }) => {
    // Pin match statuses to the curated seed (no live overlays) so this test does
    // not depend on the wall-clock date: with empty overlays every match keeps its
    // src/data/fifaScheduledMatches.ts status, so the finished/upcoming rails stay
    // deterministic regardless of which fixtures happen to be live when the suite runs.
    await page.route("**/api/match-overlays", (route) =>
      route.fulfill({
        json: { overlays: {}, refreshAfterMs: 60000, source: "fifa", note: "", updatedAt: "2026-06-25T00:00:00.000Z" },
      }),
    );

    await page.goto("/");

    await page.click("#match-selector-chips-finished #btn-match-esp-cpv-2026");

    // The analysis lives under its own "Pré-jogo" tab next to Escalação.
    await page.click("#btn-tab-pregame");
    const analysis = page.getByTestId("match-analysis");
    await expect(analysis).toBeVisible();
    await expect(analysis).toContainText("Destaques da partida");
    await expect(analysis).toContainText("Cabo Verde");
    await expect(analysis).toContainText("Leitura");

    // A match without an analysis entry exposes neither the tab nor the panel.
    // Every FINISHED match now carries a recap, so the negative case uses the
    // tournament Final (ko-104-2026): a knockout fixture that is PRE_GAME in the
    // seed for the whole tournament and has no analysis entry, so this stays
    // deterministic as group games finish. Reached from the always-visible header
    // "Próximos jogos" selector.
    await page.click("#btn-tab-broadcast");
    await page.click("#match-selector-chips-PRE_GAME #btn-match-ko-104-2026");
    await expect(page.locator("#btn-tab-pregame")).toHaveCount(0);
    await expect(page.getByTestId("match-analysis")).toHaveCount(0);
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
    await expect(page.locator("#countdown-sub-wrapper")).toContainText("00h 02m 03s");
    await expect(page.locator("#game-state-badge")).toContainText("PRÉ-JOGO");
  });

  test("all live nav tabs open in both themes without console errors", async ({ page }) => {
    // This smoke test walks every nav tab and toggles the theme twice per tab.
    // With 12 tabs it runs long under Docker load, so give it extra headroom
    // beyond the 30s default.
    test.setTimeout(90_000);
    // Ignores transient transport-level network blips and third-party widget noise
    // (e.g. the Instagram embed on "Redes Sociais") while gating on our own errors.
    const consoleErrors = collectAppConsoleErrors(page);

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
    // Intercept test image URLs so onError never fires and the <img> stays in the DOM.
    // The 1×1 transparent PNG is the minimal valid response; real URL resolution would
    // trigger React's onError handler and unmount the <img> before the assertion runs.
    const png1x1 = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQ" +
        "AABjkB6QAAAABJRU5ErkJggg==",
      "base64",
    );
    await page.route("https://images.fifa.test/**", async (route) => {
      await route.fulfill({ contentType: "image/png", body: png1x1 });
    });

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
                    socials: { instagram: "https://instagram.com/aalamri32" },
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

  test("shows the full incidents feed and enables scrolling for long lists", async ({
    page,
  }) => {
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
                note: "Feed longo para teste.",
                updatedAt: "2026-06-15T21:00:00.000Z",
              },
              matchState: {
                status: "LIVE",
                incidents: [
                  { id: "i1", time: "10'", type: "COMMENT", text: "Primeiro lance do feed.", team: "A" },
                  { id: "i2", time: "12'", type: "COMMENT", text: "Segundo lance do feed.", team: "B" },
                  { id: "i3", time: "15'", type: "YELLOW_CARD", text: "KANNO recebeu amarelo.", team: "A" },
                  { id: "i4", time: "21'", type: "COMMENT", text: "Quarto lance do feed.", team: "B" },
                  { id: "i5", time: "27'", type: "COMMENT", text: "Quinto lance do feed.", team: "A" },
                  { id: "i6", time: "33'", type: "COMMENT", text: "Sexto lance do feed.", team: "B" },
                  { id: "i7", time: "41'", type: "GOAL", text: "ALAMRI marcou.", team: "A" },
                  { id: "i8", time: "44'", type: "YELLOW_CARD", text: "ALAMRI recebeu amarelo.", team: "A" },
                  { id: "i9", time: "--'", type: "SUBSTITUTION", text: "Sai Darwin NUNEZ, entra Agustin CANOBBIO.", team: "B" },
                  { id: "i10", time: "--'", type: "SUBSTITUTION", text: "Sai Matias VINA, entra Juan Manuel SANABRIA.", team: "B" },
                ],
                source: "fifa",
                note: "Feed oficial da FIFA.",
                updatedAt: "2026-06-15T21:00:00.000Z",
              },
            },
          },
        }),
      });
    });

    await page.goto("/");
    await page.click("#btn-match-ksa-uru-2026");

    await expect(page.locator("#match-incidents-list")).toHaveAttribute(
      "data-scrollable",
      "true",
    );
    await expect(page.locator("#match-incidents-panel")).toContainText("Primeiro lance do feed.");
    await expect(page.locator("#match-incidents-panel")).toContainText(
      "Sai Matias VINA, entra Juan Manuel SANABRIA.",
    );
    await expect(page.locator("#match-incidents-list > div")).toHaveCount(10);
  });

  test("shows 'Destaque no Instagram' in the match incident player overlay (match-incident-player-overlay)", async ({
    page,
  }) => {
    const instagramPostUrl = "https://www.instagram.com/p/test-alamri-post/";

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
                    id: "ksa-alamri",
                    name: "Abdulilah Alamri",
                    number: 4,
                    position: "DF",
                    x: 38,
                    y: 75,
                    club: "Al-Nassr",
                    instagramPostUrl,
                  },
                ],
                source: "fifa",
                note: "Escalação teste.",
                updatedAt: "2026-06-15T20:00:00.000Z",
              },
              teamB: { players: [], source: "fallback", note: "", updatedAt: "2026-06-15T20:00:00.000Z" },
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
                note: "Teste do Destaque no Instagram nos lances.",
                updatedAt: "2026-06-15T20:00:00.000Z",
              },
              matchState: {
                status: "LIVE",
                incidents: [
                  {
                    id: "ksa-goal-alamri",
                    time: "41'",
                    type: "GOAL",
                    text: "ALAMRI marcou.",
                    team: "A",
                    playerMentions: [
                      { id: "ksa-alamri", name: "Abdulilah Alamri", number: 4, position: "DF" },
                    ],
                  },
                ],
                source: "fifa",
                note: "Feed oficial da FIFA.",
                updatedAt: "2026-06-15T20:00:00.000Z",
              },
            },
          },
        }),
      });
    });

    await page.goto("/");
    await page.click("#btn-match-ksa-uru-2026");
    await expect(page.locator("#match-incidents-panel")).toBeVisible();

    await page.click("#btn-incident-player-ksa-goal-alamri-0");
    await expect(page.locator("#match-incident-player-overlay")).toBeVisible();
    await expect(page.locator("#match-incident-player-overlay")).toContainText("Abdulilah Alamri");

    // Toggle button must be visible and initially collapsed
    const toggle = page.locator("#match-incident-player-overlay-ig-toggle");
    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText("Destaque no Instagram");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    // Expand the section
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    // Panel shows the script-free /embed/ iframe and redirect link
    const panel = page.locator("#match-incident-player-overlay-ig-panel");
    await expect(panel).toBeVisible();
    await expect(page.locator("#match-incident-player-overlay-ig-embed-0")).toHaveAttribute(
      "src",
      `${instagramPostUrl}embed/`,
    );
    await expect(page.locator("#match-incident-player-overlay-ig-open-0")).toHaveAttribute(
      "href",
      instagramPostUrl,
    );
  });
});

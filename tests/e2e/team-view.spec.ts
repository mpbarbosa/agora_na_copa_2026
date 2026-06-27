import { expect, test, type Page } from "@playwright/test";
import { stubLiveApis } from "./fixtures/aoVivo";

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
        matchHistory: [
          {
            matchId: "bra-rsa-2026",
            team: {
              name: `SELEÇÃO ${teamCode}`,
              code: teamCode,
              flagSvg: "brazil",
              primaryColor: "#009c3b",
              secondaryColor: "#ffdf00",
              group: "Grupo C",
            },
            opponent: {
              name: "ÁFRICA DO SUL",
              code: "RSA",
              flagSvg: "south-africa",
              primaryColor: "#007a4d",
              secondaryColor: "#ffb612",
              group: "Grupo C",
            },
            stageName: "Group Stage",
            stadiumName: "Estádio de Los Angeles",
            city: "LOS ANGELES",
            kickoffTime: "18:00",
            kickoffDate: "11 Junho, 2026",
            kickoffTimestamp: "2026-06-11T18:00:00-03:00",
            status: "FINISHED",
            score: { team: 1, opponent: 0 },
            broadcasters: [],
            source: "fifa",
            note: "Dados oficiais da FIFA.",
            updatedAt: "2026-06-15T19:00:00.000Z",
          },
          {
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
            status: "LIVE",
            matchTime: "44'",
            score: { team: 2, opponent: 1 },
            broadcasters: [],
            source: "fifa",
            note: "Dados oficiais da FIFA.",
            updatedAt: "2026-06-15T19:00:00.000Z",
          },
        ],
        teamAnalysis:
          "## Leitura\nSeleção madura e candidata ao título no jogo de teste.\n## Números\nJ1 · 1 vitória · clean sheet.",
        teamAnalysisUpdatedAt: "2026-06-15T19:00:00.000Z",
        teamAnalysisUpToDate: true,
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
              socials: {
                instagram: "https://instagram.com/atacanteteste",
                x: "https://x.com/atacanteteste",
              },
              instagramPostUrl: "https://www.instagram.com/p/test-fw-post/",
              worldCupNote: "## Desempenho\nGrande atuação no jogo de teste.\n## Leitura\nPeça-chave da seleção no Mundial.",
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

async function mockIranTeamView(page: Page) {
  await page.route("**/api/team-view/IRN", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        updatedAt: "2026-06-15T19:00:00.000Z",
        refreshAfterMs: 60000,
        source: "fifa",
        note: "Painel do Irã com enriquecimento social por metadados.",
        team: {
          name: "IRÃ",
          code: "IRN",
          flagSvg: "iran",
          primaryColor: "#239f40",
          secondaryColor: "#da0000",
          group: "Grupo G",
        },
        standings: {
          rank: 2,
          groupSize: 4,
          row: {
            id: "irn",
            name: "IRÃ",
            code: "IRN",
            flagSvg: "iran",
            primaryColor: "#239f40",
            secondaryColor: "#da0000",
            group: "Grupo G",
            points: 1,
            played: 1,
            won: 0,
            drawn: 1,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            dataSource: "result",
          },
        },
        currentMatch: null,
        nextMatch: {
          matchId: "irn-nzl-2026",
          team: {
            name: "IRÃ",
            code: "IRN",
            flagSvg: "iran",
            primaryColor: "#239f40",
            secondaryColor: "#da0000",
            group: "Grupo G",
          },
          opponent: {
            name: "NOVA ZELÂNDIA",
            code: "NZL",
            flagSvg: "newzealand",
            primaryColor: "#00247d",
            secondaryColor: "#c8102e",
            group: "Grupo G",
          },
          stageName: "Group Stage",
          stadiumName: "Estádio de Los Angeles",
          city: "LOS ANGELES",
          kickoffTime: "22:00",
          kickoffDate: "15 Junho, 2026",
          kickoffTimestamp: "2026-06-15T22:00:00-03:00",
          officialMatchUrl: "https://example.com/irn-nzl",
          status: "PRE_GAME",
          source: "fifa",
          note: "Dados oficiais da FIFA.",
          fifaMatchId: "fifa-irn-nzl",
          updatedAt: "2026-06-15T19:00:00.000Z",
        },
        lastMatch: null,
        lineup: {
          players: [
            {
              id: "irn-ramin",
              name: "Ramin Rezaeian",
              number: 23,
              position: "DF",
              x: 85,
              y: 70,
              club: "Esteghlal",
              socials: { instagram: "https://instagram.com/raminrezaeian" },
            },
          ],
          source: "fifa",
          note: "Escalação oficial FIFA.",
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
}

test.describe("Team view", () => {
  test("opens the full team page from a match flag click", async ({ page }) => {
    await mockTeamView(page);

    // No live games → Ao Vivo stays on the single-match focus detail, so the
    // scoreboard's team display (the entry point to the team page) is mounted
    // (the "Os dois" overview would unmount it).
    await stubLiveApis(page);
    await page.goto("/");
    await page.click("#team-a-display button[aria-label^='Ver escalação']");

    await expect(page.locator("#team-lineup-view")).toBeVisible();
    await expect(page.locator("#team-view-matches")).toBeVisible();
    await expect(page.locator("#team-view-campanha-card")).toBeVisible();
    await expect(page.locator("#team-view-leaders-card")).toBeVisible();
    await expect(page.locator("#team-view-broadcast-card")).toBeVisible();
    await expect(page.locator("#team-lineup-board-card")).toContainText("Escalação da seleção");
    await expect(page.locator("#team-performance-aproveitamento")).toHaveText("67%");

    await page.click("#btn-team-lineup-back");
    await expect(page.locator("#match-detail-view")).toBeVisible();
  });

  test("shows the compact World Cup match-history table with results and live state", async ({ page }) => {
    await mockTeamView(page);

    // No live games → Ao Vivo stays on the single-match focus detail, so the
    // scoreboard's team display (the entry point to the team page) is mounted
    // (the "Os dois" overview would unmount it).
    await stubLiveApis(page);
    await page.goto("/");
    await page.click("#team-a-display button[aria-label^='Ver escalação']");

    const history = page.locator("#team-view-match-history");
    await expect(history).toBeVisible();
    await expect(history).toContainText("Histórico na Copa 2026");
    // Finished fixture: opponent code, score and a win/draw/loss chip.
    await expect(history).toContainText("RSA");
    await expect(history).toContainText("1 x 0");
    await expect(history.locator("tbody tr")).toHaveCount(2);
    // Live fixture surfaces a "Vivo" badge instead of a result letter.
    await expect(history).toContainText("MAR");
    await expect(history).toContainText("Vivo");
  });

  test("shows the editorial team analysis (Análise da seleção) when one is authored", async ({ page }) => {
    await mockTeamView(page);

    // No live games → Ao Vivo stays on the single-match focus detail, so the
    // scoreboard's team display (the entry point to the team page) is mounted
    // (the "Os dois" overview would unmount it).
    await stubLiveApis(page);
    await page.goto("/");
    await page.click("#team-a-display button[aria-label^='Ver escalação']");

    const analysis = page.getByTestId("team-analysis");
    await expect(analysis).toBeVisible();
    await expect(analysis).toContainText("Análise da seleção");
    await expect(analysis).toContainText("Leitura");
    await expect(analysis).toContainText("candidata ao título");
    await expect(analysis).toContainText("Números");
  });

  test("flags whether the team analysis is up to date with the last match", async ({ page }) => {
    await mockTeamView(page);

    // No live games → Ao Vivo stays on the single-match focus detail, so the
    // scoreboard's team display (the entry point to the team page) is mounted
    // (the "Os dois" overview would unmount it).
    await stubLiveApis(page);
    await page.goto("/");
    await page.click("#team-a-display button[aria-label^='Ver escalação']");

    const analysis = page.getByTestId("team-analysis");
    await expect(analysis).toBeVisible();

    // The mock marks the analysis current → "Atualizada" badge + "Atualizado em …" line.
    const badge = analysis.getByTestId(/^team-analysis-freshness-/);
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute("data-fresh", "true");
    await expect(badge).toContainText("Atualizada");

    await expect(analysis.getByTestId(/^team-analysis-updated-/)).toContainText("Atualizado em");
  });

  test("shows the team's match videos (full game and highlights)", async ({ page }) => {
    await mockTeamView(page);

    // No live games → Ao Vivo stays on the single-match focus detail, so the
    // scoreboard's team display (the entry point to the team page) is mounted
    // (the "Os dois" overview would unmount it).
    await stubLiveApis(page);
    await page.goto("/");
    await page.click("#team-a-display button[aria-label^='Ver escalação']");

    const videos = page.locator("#team-view-match-videos");
    await expect(videos).toBeVisible();
    await expect(videos).toContainText("Vídeos das partidas");
    // The bra-mar-2026 fixture has both a full game and a highlights video.
    await expect(page.getByTestId("team-video-bra-mar-2026-fullgame")).toBeVisible();
    await expect(page.getByTestId("team-video-bra-mar-2026-highlights")).toBeVisible();
    await expect(page.getByTestId("team-video-bra-mar-2026-fullgame")).toHaveAttribute(
      "href",
      /youtube\.com\/watch/,
    );
    // bra-rsa-2026 is FINISHED but has no videos yet → "waiting for Cazé TV" note.
    await expect(videos).toContainText("Aguardando a Cazé TV");
  });

  test("opens the full team page from the standings table", async ({ page }) => {
    await mockTeamView(page);

    await page.goto("/");
    await page.click("#btn-nav-grupos");
    await page.click("#standings-row-bra button[aria-label^='Ver escalação']");

    await expect(page.locator("#team-lineup-view")).toBeVisible();
    await expect(page.locator("#team-lineup-title")).toContainText("SELEÇÃO BRA");
    await expect(page.locator("#team-view-campanha-card")).toBeVisible();
    await expect(page.locator("#team-performance-aproveitamento")).toHaveText("67%");
  });

  test("shows the federation logo linking to the official site for Brazil and Mexico", async ({ page }) => {
    await mockTeamView(page);

    const openTeam = async (code: string) => {
      await page.click("#btn-nav-grupos");
      await page.click(`#standings-row-${code} button[aria-label^='Ver escalação']`);
      await expect(page.locator("#team-lineup-view")).toBeVisible();
    };

    await page.goto("/");

    // Brazil → CBF
    await openTeam("bra");
    const fedLink = page.locator("#team-lineup-federation-link");
    await expect(fedLink).toBeVisible();
    await expect(fedLink).toHaveAttribute("href", "https://www.cbf.com.br/");
    await expect(fedLink).toHaveAttribute("data-federation", "CBF");
    await expect(fedLink.locator("img")).toHaveAttribute("alt", "Confederação Brasileira de Futebol");
    await page.click("#btn-team-lineup-back");

    // Mexico → FMF (logo image)
    await openTeam("mex");
    await expect(fedLink).toBeVisible();
    await expect(fedLink).toHaveAttribute("href", "https://fmf.mx");
    await expect(fedLink).toHaveAttribute("data-federation", "FMF");
    await expect(fedLink.locator("img")).toHaveAttribute("alt", "Federación Mexicana de Fútbol");
    await page.click("#btn-team-lineup-back");

    // Morocco → FRMF has no free Commons crest, so it renders a text-only badge
    // (the link is still present and points to the official site).
    await openTeam("mar");
    await expect(fedLink).toBeVisible();
    await expect(fedLink).toHaveAttribute("href", "https://www.frmf.ma");
    await expect(fedLink).toHaveAttribute("data-federation", "FRMF");
    await expect(fedLink.locator("img")).toHaveCount(0);
    await expect(fedLink).toContainText("FRMF");
  });

  test("shows the head coach in the team header for Mexico", async ({ page }) => {
    await mockTeamView(page);

    const openTeam = async (code: string) => {
      await page.click("#btn-nav-grupos");
      await page.click(`#standings-row-${code} button[aria-label^='Ver escalação']`);
      await expect(page.locator("#team-lineup-view")).toBeVisible();
    };

    await page.goto("/");

    await openTeam("mex");
    await expect(page.locator("#team-lineup-coach")).toBeVisible();
    await expect(page.locator("#team-lineup-coach")).toContainText("Técnico");
    await expect(page.locator("#team-lineup-coach")).toContainText("Javier Aguirre");
    await page.click("#btn-team-lineup-back");

    // Another team resolves its own coach from the lookup.
    await openTeam("mar");
    await expect(page.locator("#team-lineup-coach")).toBeVisible();
    await expect(page.locator("#team-lineup-coach")).toContainText("Walid Regragui");
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
    await expect(page.locator("#team-view-campanha-card")).toBeVisible();
  });

  test("shows player social links in the player card when they are available", async ({
    page,
  }) => {
    await mockTeamView(page);

    // No live games → Ao Vivo stays on the single-match focus detail, so the
    // scoreboard's team display (the entry point to the team page) is mounted
    // (the "Os dois" overview would unmount it).
    await stubLiveApis(page);
    await page.goto("/");
    await page.click("#team-a-display button[aria-label^='Ver escalação']");
    await expect(page.locator("#team-lineup-view")).toBeVisible();
    await page.locator('[id^="squad-player-row-"]').filter({ hasText: "Atacante Teste" }).click();

    await expect(page.locator("#selected-player-info")).toContainText("Atacante Teste");
    await expect(page.locator("#player-social-links")).toBeVisible();
    await expect(page.locator("#player-social-link-instagram")).toHaveAttribute(
      "href",
      "https://instagram.com/atacanteteste",
    );
    await expect(page.locator("#player-social-link-x")).toHaveAttribute(
      "href",
      "https://x.com/atacanteteste",
    );
  });

  test("shows metadata-supplemented socials in the regular player card", async ({
    page,
  }) => {
    await mockIranTeamView(page);

    await page.goto("/");
    await page.click("#btn-nav-selecoes");
    await page.click("#btn-team-card-irn");
    await expect(page.locator("#team-lineup-view")).toBeVisible();

    await page.click("#player-irn-ramin");

    await expect(page.locator("#selected-player-info")).toContainText("Ramin Rezaeian");
    await expect(page.locator("#player-social-links")).toBeVisible();
    await expect(page.locator("#player-social-link-instagram")).toHaveAttribute(
      "href",
      "https://instagram.com/raminrezaeian",
    );
  });

  test("opens the full player overlay card from the selected player panel", async ({
    page,
  }) => {
    await mockTeamView(page);

    await page.goto("/");
    await page.click("#btn-nav-selecoes");
    await page.click("#btn-team-card-bra");
    await expect(page.locator("#team-lineup-view")).toBeVisible();

    await page.locator('[id^="squad-player-row-"]').filter({ hasText: "Atacante Teste" }).click();
    await expect(page.locator("#selected-player-info")).toContainText("Atacante Teste");

    await page.click("#btn-open-player-overlay-card");
    await expect(page.locator("#player-feature-overlay")).toBeVisible();
    await expect(page.locator("#player-feature-overlay")).toContainText("Atacante Teste");
    // The match-context line title-cases the opponent ("MARROCOS" → "Marrocos").
    await expect(page.locator("#player-feature-overlay")).toContainText("Marrocos");
    await expect(page.locator("#player-feature-overlay-social-link-instagram")).toHaveAttribute(
      "href",
      "https://instagram.com/atacanteteste",
    );
    // Editorial note renders its labeled sections when the player has a worldCupNote.
    await expect(page.locator("#player-feature-overlay-leitura")).toBeVisible();
    await expect(page.locator("#player-feature-overlay-leitura")).toContainText("Desempenho");
    await expect(page.locator("#player-feature-overlay-leitura")).toContainText("Leitura");
    await expect(page.locator("#player-feature-overlay-leitura")).toContainText("Peça-chave da seleção");
    await expect(page.locator("#btn-open-player-feature-picture")).toBeVisible();
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

  test("shows 'Destaque no Instagram' in the squad player overlay card (player-feature-overlay)", async ({
    page,
  }) => {
    const instagramPostUrl = "https://www.instagram.com/p/test-fw-post/";

    await mockTeamView(page);

    await page.goto("/");
    await page.click("#btn-nav-selecoes");
    await page.click("#btn-team-card-bra");
    await expect(page.locator("#team-lineup-view")).toBeVisible();

    await page.locator('[id^="squad-player-row-"]').filter({ hasText: "Atacante Teste" }).click();
    await expect(page.locator("#selected-player-info")).toContainText("Atacante Teste");

    await page.click("#btn-open-player-overlay-card");
    await expect(page.locator("#player-feature-overlay")).toBeVisible();

    // Toggle button must be visible and initially collapsed
    const toggle = page.locator("#player-feature-overlay-ig-toggle");
    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText("Destaque no Instagram");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    // Expand the section
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    // Panel shows the embed blockquote and redirect link
    const panel = page.locator("#player-feature-overlay-ig-panel");
    await expect(panel).toBeVisible();
    await expect(panel.locator("blockquote.instagram-media")).toHaveAttribute(
      "data-instgrm-permalink",
      instagramPostUrl,
    );
    await expect(page.locator("#player-feature-overlay-ig-open-0")).toHaveAttribute(
      "href",
      instagramPostUrl,
    );
  });
});

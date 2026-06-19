import { test, expect } from "@playwright/test";

const GROUP_IDS = Array.from({ length: 12 }, (_, index) => {
  const letter = String.fromCharCode("a".charCodeAt(0) + index);
  return `grupo-${letter}`;
});

type GroupExpectation = {
  group: string;
  id: string;
  teamCodes: string[];
};

const GROUP_EXPECTATIONS: GroupExpectation[] = [
  { group: "Grupo A", id: "standings-group-grupo-a", teamCodes: ["CZE", "KOR", "MEX", "RSA"] },
  { group: "Grupo B", id: "standings-group-grupo-b", teamCodes: ["BIH", "CAN", "QAT", "SUI"] },
  { group: "Grupo C", id: "standings-group-grupo-c", teamCodes: ["BRA", "HAI", "MAR", "SCO"] },
  { group: "Grupo D", id: "standings-group-grupo-d", teamCodes: ["AUS", "PAR", "TUR", "USA"] },
  { group: "Grupo E", id: "standings-group-grupo-e", teamCodes: ["CIV", "CUW", "ECU", "GER"] },
  { group: "Grupo F", id: "standings-group-grupo-f", teamCodes: ["JPN", "NED", "SWE", "TUN"] },
  { group: "Grupo G", id: "standings-group-grupo-g", teamCodes: ["BEL", "EGY", "IRN", "NZL"] },
  { group: "Grupo H", id: "standings-group-grupo-h", teamCodes: ["CPV", "ESP", "KSA", "URU"] },
  { group: "Grupo I", id: "standings-group-grupo-i", teamCodes: ["FRA", "IRQ", "NOR", "SEN"] },
  { group: "Grupo J", id: "standings-group-grupo-j", teamCodes: ["ALG", "ARG", "AUT", "JOR"] },
  { group: "Grupo K", id: "standings-group-grupo-k", teamCodes: ["COD", "COL", "POR", "UZB"] },
  { group: "Grupo L", id: "standings-group-grupo-l", teamCodes: ["CRO", "ENG", "GHA", "PAN"] },
];

test.describe("Standings view (Grupos)", () => {
  test("refreshes the group table after a match update", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.route("**/api/match-overlays", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          refreshAfterMs: 60000,
          overlays: {
            "arg-alg-2026": {
              broadcastGuide: {
                broadcasters: [],
                source: "fallback",
                note: "Sem novas emissoras neste teste.",
                updatedAt: "2026-06-14T22:00:00.000Z",
              },
              matchState: {
                status: "LIVE",
                score: { teamA: 2, teamB: 1 },
                matchTime: "62'",
                source: "fifa",
                note: "Teste de atualização da tabela.",
                updatedAt: "2026-06-14T22:00:00.000Z",
              },
            },
          },
        }),
      });
    });

    await page.goto("/");
    await expect(
      page.locator("#match-selector-chips-LIVE #btn-match-arg-alg-2026"),
    ).toBeVisible();

    await page.click("#btn-nav-grupos");

    await expect(page.locator("#standings-view")).toBeVisible();
    await expect(page.locator("#standings-cell-arg-played")).toHaveText("1");
    await expect(page.locator("#standings-cell-arg-points")).toHaveText("3");
    await expect(page.locator("#standings-cell-alg-points")).toHaveText("0");

    expect(consoleErrors).toEqual([]);
  });

  test("manual simulator events update Grupos immediately", async ({ page }) => {
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
    await page.fill("#input-kickoff-time", "21:00");
    await page.fill("#input-countdown-seconds", "600");
    await page.click("#btn-apply-match-config");

    await page.click("#btn-sim-start-live");
    await page.click("#btn-sim-goal-a");
    await page.click("#btn-sim-yellow-a");
    await page.click("#btn-sim-red-b");

    await expect(page.locator("#match-incidents-panel")).toContainText("GOL");
    await expect(page.locator("#match-incidents-panel")).toContainText("AM");
    await expect(page.locator("#match-incidents-panel")).toContainText("VM");

    await page.click("#btn-nav-grupos");

    await expect(page.locator("#standings-cell-bra-played")).toHaveText("1");
    await expect(page.locator("#standings-cell-bra-points")).toHaveText("3");
    await expect(page.locator("#standings-cell-bra-goalsFor")).toHaveText("1");
    await expect(page.locator("#standings-cell-mar-points")).toHaveText("0");
  });

  test("renders all 12 group tables with headers and rows", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");
    await page.click("#btn-nav-grupos");

    await expect(page.locator("#standings-view")).toBeVisible();
    await expect(page.locator('[id^="standings-group-grupo-"]')).toHaveCount(12);

    for (const groupId of GROUP_IDS) {
      const card = page.locator(`#standings-group-${groupId}`);
      const expectation = GROUP_EXPECTATIONS.find(
        (groupExpectation) => groupExpectation.id === `standings-group-${groupId}`,
      );

      await expect(card).toBeVisible();
      await expect(card.locator("thead th")).toHaveCount(10);
      await expect(card.locator("tbody tr")).toHaveCount(expectation?.teamCodes.length ?? 0);
    }

    expect(consoleErrors).toEqual([]);
  });

  test("renders the expected team set for every group", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-grupos");

    await expect(page.locator("#standings-view")).toBeVisible();

    for (const expectation of GROUP_EXPECTATIONS) {
      const card = page.locator(`#${expectation.id}`);

      await expect(card).toBeVisible();
      await expect(card.locator("h3")).toHaveText(expectation.group);

      const teamCells = card.locator('tbody tr td:nth-child(2) span[title]');
      await expect(teamCells).toHaveCount(expectation.teamCodes.length);

      const renderedCodes = await teamCells.evaluateAll((nodes) =>
        nodes.map((node) => node.textContent?.trim() || ""),
      );

      expect(renderedCodes.slice().sort()).toEqual(expectation.teamCodes);
    }
  });

  test("renders correctly in dark theme", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");
    await page.click("#btn-nav-grupos");
    await page.click("#btn-toggle-theme");

    await expect(page.locator("#standings-view")).toBeVisible();
    await expect(page.locator("#standings-group-grupo-a")).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });
});

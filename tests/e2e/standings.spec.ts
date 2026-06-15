import { test, expect } from "@playwright/test";

const GROUP_IDS = Array.from({ length: 12 }, (_, index) => {
  const letter = String.fromCharCode("a".charCodeAt(0) + index);
  return `grupo-${letter}`;
});

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

      await expect(card).toBeVisible();
      await expect(card.locator("thead th")).toHaveCount(9);
      await expect(card.locator("tbody tr")).toHaveCount(4);
    }

    expect(consoleErrors).toEqual([]);
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

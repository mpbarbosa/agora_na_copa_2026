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
  test("loads with the Partidas view by default", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");

    await expect(page.locator("#btn-nav-partidas")).toHaveClass(/font-semibold/);
    await expect(page.locator("#match-detail-view")).toBeVisible();
    await expect(page.locator("#core-live-scoreboard")).toBeVisible();
    await expect(page.locator("#broadcast-section-title")).toBeVisible();

    expect(consoleErrors).toEqual([]);
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
});

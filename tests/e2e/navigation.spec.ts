import { test, expect } from "@playwright/test";

import { NAV_ITEMS } from "../../src/navigation";

const COMING_SOON_ITEMS = NAV_ITEMS.filter((item) => item.status === "comingSoon");

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

  for (const item of COMING_SOON_ITEMS) {
    test(`renders the ComingSoonView for ${item.label} in both themes`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      await page.goto("/");
      await page.click(`#btn-nav-${item.id}`);

      await expect(page.locator("#coming-soon-view")).toBeVisible();
      await expect(page.locator("#coming-soon-title")).toHaveText(item.label);

      await page.click("#btn-toggle-theme");
      await expect(page.locator("#coming-soon-view")).toBeVisible();

      expect(consoleErrors).toEqual([]);
    });
  }
});

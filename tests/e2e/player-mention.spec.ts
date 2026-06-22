import { test, expect } from "@playwright/test";

test.describe("Player mention (Messi) in the match analysis", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
  });

  test("'Messi' links to a compact player-card preview", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-consent-accept").catch(() => {});
    // ARG x AUT (finished) — Messi scored both goals, so the recap mentions him.
    await page.click("#btn-match-arg-aut-2026");
    await page.click("#btn-tab-pregame");
    await expect(page.locator("#match-analysis-panel")).toBeVisible();

    const mention = page
      .locator('#match-analysis-panel button[aria-label="Ver card de Leo Messi"]')
      .first();
    await expect(mention).toBeVisible();

    // Hovering the mention reveals the compact card (portaled to <body>).
    await mention.hover();
    await expect(page.getByText("Inter Miami")).toBeVisible();
    await expect(page.getByText("Craque da Copa")).toBeVisible();
  });
});

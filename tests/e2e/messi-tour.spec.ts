import { test, expect } from "@playwright/test";

test.describe("Messi tour (gated to the 2nd session onward)", () => {
  test("does NOT run on the first session", async ({ page }) => {
    // feature-tour-seen suppresses the general tour; no session-count → this load
    // counts as session 1, so the Messi tour must stay dormant.
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
    await page.goto("/");
    await page.click("#btn-consent-accept").catch(() => {});
    await page.waitForTimeout(1300);
    await expect(page.locator(".driver-popover")).toHaveCount(0);
  });

  test("runs on the 2nd session and walks Jogadores → Messi → open card", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("feature-tour-seen", "1");
      localStorage.setItem("agora-session-count", "1"); // → becomes 2 on this load
    });
    await page.goto("/");
    await page.click("#btn-consent-accept").catch(() => {});

    const pop = page.locator(".driver-popover");
    await expect(pop).toBeVisible({ timeout: 6000 });
    await expect(pop).toContainText("craque"); // step 1 — Jogadores tab

    await page.click(".driver-popover-next-btn"); // navigates to Jogadores, highlights Messi
    await expect(pop).toContainText("Messi", { timeout: 6000 });
    await expect(page.locator("#jogadores-view")).toBeVisible();

    await page.click(".driver-popover-next-btn"); // opens Messi's card
    await expect(page.locator("#jogadores-player-overlay")).toBeVisible({ timeout: 6000 });
    await expect(pop).toContainText("Card completo");
  });
});

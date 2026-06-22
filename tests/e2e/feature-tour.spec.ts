import { test, expect } from "@playwright/test";

test.describe("Feature-discovery tour", () => {
  test.beforeEach(async ({ page }) => {
    // Suppress the first-visit auto-start so we deterministically test the manual
    // "?" trigger (auto-start is gated on consent and the "seen" flag separately).
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
  });

  test("the '?' button starts the tour, which advances and closes", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-feature-tour");

    const popover = page.locator(".driver-popover");
    await expect(popover).toBeVisible();
    await expect(popover).toContainText("Agora na Copa"); // welcome step

    await page.click(".driver-popover-next-btn");
    await expect(page.locator(".driver-popover")).toBeVisible(); // advanced to step 2

    await page.locator(".driver-popover-close-btn").click();
    await expect(page.locator(".driver-popover")).toHaveCount(0); // tour closed
  });
});

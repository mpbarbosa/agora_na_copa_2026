import { test, expect } from "@playwright/test";

test.describe("Version-check timer (header)", () => {
  test("shows a discreet countdown right of the title", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
    await page.goto("/");
    await page.click("#btn-consent-accept").catch(() => {});

    const timer = page.locator("#version-check-timer");
    await expect(timer).toBeVisible();
    // Either a m:ss countdown (e.g. "5:00") or the "nova versão" hint.
    await expect(timer).toHaveText(/(\d+:\d{2}|nova versão)/);
    // It lives inside the branding cluster, beside the title.
    await expect(page.locator("#app-branding #version-check-timer")).toBeVisible();

    // A discreet force-check button sits immediately to its right.
    const forceBtn = page.locator("#btn-version-check-now");
    await expect(forceBtn).toBeVisible();
    // Forcing a check now re-polls and resets the countdown; UI stays intact.
    await forceBtn.click();
    await expect(timer).toBeVisible();
    await expect(timer).toHaveText(/(\d+:\d{2}|nova versão)/);
  });
});

import { test, expect } from "@playwright/test";

test.describe("Share button", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("copies the link with a confirmation when Web Share is unavailable", async ({ page }) => {
    // Force the clipboard fallback deterministically (headless has no Web Share,
    // but make it explicit so the test doesn't depend on the environment).
    await page.addInitScript(() => {
      delete navigator.share;
    });
    await page.goto("/");

    const btn = page.locator("#btn-share");
    await expect(btn).toBeVisible();
    await btn.click();

    await expect(page.getByText("Link copiado!")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("copa2026.mpbarbosa.com");
  });
});

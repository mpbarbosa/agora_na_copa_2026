import { test, expect } from "@playwright/test";

// Each test gets a fresh browser context (empty localStorage), so the consent
// banner appears on first load.
test.describe("LGPD consent + privacy policy", () => {
  test("consent banner shows, Accept dismisses it, and the choice persists", async ({ page }) => {
    await page.goto("/");
    const banner = page.locator("#cookie-consent-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("cookies");

    await page.click("#btn-consent-accept");
    await expect(banner).toBeHidden();

    await page.reload();
    await expect(page.locator("#cookie-consent-banner")).toBeHidden();
  });

  test("'Apenas essenciais' also dismisses the banner", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#cookie-consent-banner")).toBeVisible();
    await page.click("#btn-consent-essential");
    await expect(page.locator("#cookie-consent-banner")).toBeHidden();
  });

  test("ad slot stays dormant until a real ad-unit id is configured, even after consent", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-consent-accept");
    // Publisher id is set, but the ad-slot id is still a placeholder → AdSlot
    // renders nothing (no script, no unit) until a real unit id is configured.
    await expect(page.locator("#adsense-slot")).toHaveCount(0);
  });

  test("analytics (GA4) stays dormant with the placeholder id, even after consent", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-consent-accept");
    // No real G- measurement id → gtag.js is never injected.
    await expect(page.locator('script[data-ga4="1"]')).toHaveCount(0);
  });

  test("footer links to the privacy policy, which serves as a real page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('#app-footer a[href="/privacidade.html"]')).toBeVisible();

    const resp = await page.request.get("/privacidade.html");
    expect(resp.status()).toBe(200);
    expect(await resp.text()).toContain("Política de Privacidade");
  });

  test("ads.txt is served", async ({ page }) => {
    const resp = await page.request.get("/ads.txt");
    expect(resp.status()).toBe(200);
    expect(await resp.text()).toContain("google.com");
  });
});

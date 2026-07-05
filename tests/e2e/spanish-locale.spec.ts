import { test, expect } from "@playwright/test";

// The Spanish (LATAM) "thin shell": the same app served in es (normally via the
// es.copa2026 subdomain, but locally selectable via localStorage / ?lang=es).
// It renders a Spanish UI + Spanish FIFA data, hides the hand-written pt-BR
// editorial, and keeps all structured/live data. These specs pin the locale
// through localStorage (what the in-app switcher and the subdomain both set) so
// they don't depend on a Host header the local dev server can't distinguish.

test.describe("Spanish (LATAM) locale — es shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("agora-locale", "es");
      localStorage.setItem("feature-tour-seen", "1");
    });
  });

  test("boots in Spanish: html lang, brand, nav labels, switcher", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-consent-accept").catch(() => {});

    await expect(page.locator("html")).toHaveAttribute("lang", "es-419");
    await expect(page.locator("#app-branding")).toContainText(/ahora en el mundial/i);
    await expect(page.locator("#btn-nav-ao-vivo")).toContainText(/en vivo/i);
    await expect(page.locator("#btn-nav-partidas")).toContainText(/partidos/i);
    await expect(page.locator("#btn-nav-selecoes")).toContainText(/selecciones/i);
    await expect(page.locator("#btn-nav-chaveamento")).toContainText(/eliminatorias/i);
    // In es the language picker reflects the active locale.
    await expect(page.locator("#btn-switch-language")).toHaveValue("es");
  });

  test("hides the group editorial but keeps the standings table", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-consent-accept").catch(() => {});
    await page.click("#btn-nav-grupos");

    // The structured standings view renders (with its group sections)…
    await expect(page.locator("#standings-view")).toBeVisible();
    await expect(page.locator('[id^="standings-group-"]').first()).toBeVisible();
    // …but the hand-written "Análise do grupo" editorial is omitted in es.
    await expect(page.locator('[data-testid^="group-analysis-"]')).toHaveCount(0);
  });

  test("the language switcher toggles es → pt live", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-consent-accept").catch(() => {});

    await page.selectOption("#btn-switch-language", "pt");

    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.locator("#app-branding")).toContainText(/agora na copa/i);
    await expect(page.locator("#btn-nav-ao-vivo")).toContainText(/ao vivo/i);
    // Back in pt the group editorial reappears.
    await page.click("#btn-nav-grupos");
    await expect(page.locator('[data-testid^="group-analysis-"]').first()).toBeVisible();
  });
});

test.describe("Spanish locale via ?lang=es", () => {
  test("the query param boots Spanish and persists to localStorage", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
    await page.goto("/?lang=es");
    await page.click("#btn-consent-accept").catch(() => {});

    await expect(page.locator("html")).toHaveAttribute("lang", "es-419");
    await expect(page.locator("#app-branding")).toContainText(/ahora en el mundial/i);
    // resolveInitialLocale persists the query choice so it survives a reload.
    expect(await page.evaluate(() => localStorage.getItem("agora-locale"))).toBe("es");
  });
});

import { test, expect } from "@playwright/test";

// The English (US) shell: the same app served in en (normally via the
// en.copa2026 subdomain, but locally selectable via localStorage / ?lang=en).
// It renders a US-English UI + English FIFA data AND — unlike the Spanish shell,
// which hides the editorial — shows the editorial translated to English. These
// specs pin the locale through localStorage (what the in-app switcher and the
// subdomain both set) so they don't depend on a Host header the local dev server
// can't distinguish. Non-default locales append `?language=en` to FIFA fetches,
// so — like the Spanish spec — these avoid bare-path route mocks and assert on
// the rendered UI instead.

test.describe("English (US) locale — en shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("agora-locale", "en");
      localStorage.setItem("feature-tour-seen", "1");
    });
  });

  test("boots in English: html lang, brand, nav labels, switcher", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-consent-accept").catch(() => {});

    await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
    await expect(page.locator("#app-branding")).toContainText(/now at the world cup/i);
    await expect(page.locator("#btn-nav-ao-vivo")).toContainText(/live/i);
    await expect(page.locator("#btn-nav-partidas")).toContainText(/matches/i);
    await expect(page.locator("#btn-nav-selecoes")).toContainText(/teams/i);
    await expect(page.locator("#btn-nav-chaveamento")).toContainText(/knockout/i);
    // The language picker reflects the active locale.
    await expect(page.locator("#btn-switch-language")).toHaveValue("en");
  });

  test("shows the group editorial translated to English (not hidden)", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-consent-accept").catch(() => {});
    await page.click("#btn-nav-grupos");

    await expect(page.locator("#standings-view")).toBeVisible();
    await expect(page.locator('[id^="standings-group-"]').first()).toBeVisible();
    // Unlike es (which hides it), en renders the editorial — in English.
    await expect(page.locator('[data-testid^="group-analysis-"]').first()).toBeVisible();
    await expect(page.locator("#standings-view")).toContainText(/group analysis/i);
  });

  test("the language switcher toggles en → pt live", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-consent-accept").catch(() => {});

    await page.selectOption("#btn-switch-language", "pt");

    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.locator("#app-branding")).toContainText(/agora na copa/i);
    await expect(page.locator("#btn-nav-ao-vivo")).toContainText(/ao vivo/i);
  });
});

test.describe("English locale via ?lang=en", () => {
  test("the query param boots English and persists to localStorage", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
    await page.goto("/?lang=en");
    await page.click("#btn-consent-accept").catch(() => {});

    await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
    await expect(page.locator("#app-branding")).toContainText(/now at the world cup/i);
    // resolveInitialLocale persists the query choice so it survives a reload.
    expect(await page.evaluate(() => localStorage.getItem("agora-locale"))).toBe("en");
  });
});

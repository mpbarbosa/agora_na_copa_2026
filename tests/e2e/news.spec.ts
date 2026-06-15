import { test, expect } from "@playwright/test";

const FILTERS = ["sedes", "ingressos", "equipes", "geral"] as const;

test.describe("News view (Notícias)", () => {
  test("category filters render at least one card per category", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");
    await page.click("#btn-nav-noticias");

    await expect(page.locator("#news-view")).toBeVisible();
    await expect(page.locator("#news-card-grid article")).toHaveCount(7);

    for (const filter of FILTERS) {
      await page.click(`#btn-news-filter-${filter}`);

      const cards = page.locator("#news-card-grid article");
      const matchingCards = page.locator(
        `#news-card-grid article[data-news-category="${filter === "sedes" ? "Sedes" : filter === "ingressos" ? "Ingressos" : filter === "equipes" ? "Equipes" : "Geral"}"]`,
      );

      const totalCount = await cards.count();
      const matchingCount = await matchingCards.count();

      expect(matchingCount).toBeGreaterThan(0);
      expect(totalCount).toBe(matchingCount);
    }

    expect(consoleErrors).toEqual([]);
  });

  test("filters keep working in dark theme", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-toggle-theme");
    await page.click("#btn-nav-noticias");

    await expect(page.locator("#news-view")).toBeVisible();
    await page.click("#btn-news-filter-geral");
    await expect(
      page.locator('#news-card-grid article[data-news-category="Geral"]'),
    ).toHaveCount(1);
  });
});

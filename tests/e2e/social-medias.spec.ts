import { test, expect } from "@playwright/test";

test.describe("Redes Sociais view", () => {
  test("filters, likes and comments work without console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");
    await page.click("#btn-nav-social-medias");

    await expect(page.locator("#social-medias-view")).toBeVisible();
    await expect(page.locator("#social-medias-feed")).toBeVisible();
    await expect(page.locator("#social-medias-tendencias")).toBeVisible();

    // Category filter: only photo posts remain after picking "Fotos".
    const fotoPost = page.getByTestId("social-post-post-foto-mosaico");
    const noticiaPost = page.getByTestId("social-post-post-noticia-escalacao");
    await expect(fotoPost).toBeVisible();
    await expect(noticiaPost).toBeVisible();

    await page.getByTestId("social-filtro-foto").click();
    await expect(fotoPost).toBeVisible();
    await expect(noticiaPost).toHaveCount(0);

    // Back to all, then filter by a trending hashtag.
    await page.getByTestId("social-filtro-tudo").click();
    await page.getByTestId("social-tendencia-MaracanaLotado").click();
    await expect(fotoPost).toBeVisible();
    await expect(noticiaPost).toHaveCount(0);
    await page.getByTestId("social-limpar-tag").click();
    await expect(noticiaPost).toBeVisible();

    // Like toggles the incremental counter.
    const likeCount = page.getByTestId("social-curtidas-post-selecao-treino");
    const before = (await likeCount.textContent())?.replace(/\D/g, "");
    await page.getByTestId("social-curtir-post-selecao-treino").click();
    const after = (await likeCount.textContent())?.replace(/\D/g, "");
    expect(Number(after)).toBe(Number(before) + 1);

    // Nested comments: open, add a local comment in real time.
    await page.getByTestId("social-comentar-post-selecao-treino").click();
    const commentList = page.getByTestId("social-comentarios-post-selecao-treino");
    await expect(commentList).toBeVisible();
    await page
      .getByTestId("social-comentario-input-post-selecao-treino")
      .fill("Vai dar bom, Brasil! 🇧🇷");
    await page.getByTestId("social-comentario-enviar-post-selecao-treino").click();
    await expect(commentList).toContainText("Vai dar bom, Brasil!");

    expect(consoleErrors).toEqual([]);
  });

  test("shows the official FIFA World Cup Instagram profile card linking to the account", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-social-medias");

    const card = page.getByTestId("social-fifa-profile");
    await expect(card).toBeVisible();
    await expect(card).toContainText("FIFA World Cup");
    await expect(card).toContainText("@fifaworldcup");
    await expect(card).toHaveAttribute("href", "https://www.instagram.com/fifaworldcup");
    await expect(card).toHaveAttribute("target", "_blank");
    await expect(card).toHaveAttribute("rel", /noopener/);

    // The card also embeds the official FIFA reel via the Instagram embed blockquote.
    // (The blockquote is hydrated by Instagram's embed.js at runtime, so we assert it
    // is present in the DOM with the correct permalink rather than visually rendered.)
    const reel = page.getByTestId("social-fifa-reel");
    await expect(reel).toBeAttached();
    await expect(reel.locator("blockquote.instagram-media")).toHaveAttribute(
      "data-instgrm-permalink",
      "https://www.instagram.com/reel/DZ0HLA4iZDN/",
    );
  });

  test("shows the Google Trends card at the top from the API", async ({ page }) => {
    await page.route("**/api/google-trends", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          source: "google-trends",
          note: "Buscas em alta no Brasil • Google Trends",
          updatedAt: "2026-06-20T12:00:00.000Z",
          topics: [
            {
              title: "donyell malen",
              traffic: "1000+",
              pictureUrl: null,
              news: { title: "Malen no WK", url: "https://news.example.com/malen", source: "Sporza" },
              categories: [17],
            },
            { title: "países baixos", traffic: "500+", pictureUrl: null, news: null, categories: [11] },
          ],
        }),
      });
    });

    await page.goto("/");
    await page.click("#btn-nav-social-medias");

    const card = page.locator("#social-medias-google-trends");
    await expect(card).toBeVisible();
    await expect(card).toContainText("Em alta no Google");
    await expect(page.getByTestId("social-trend-0")).toContainText("donyell malen");
    await expect(page.getByTestId("social-trend-0")).toHaveAttribute(
      "href",
      "https://news.example.com/malen",
    );
    // Topic without a news item falls back to a Google search link.
    await expect(page.getByTestId("social-trend-1")).toHaveAttribute(
      "href",
      /google\.com\/search\?q=/,
    );
  });

  test("the 'Só esportes' toggle filters trends to the sports category", async ({ page }) => {
    await page.route("**/api/google-trends", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          source: "google-trends",
          note: "Buscas em alta no Brasil • Google Trends",
          updatedAt: "2026-06-20T12:00:00.000Z",
          topics: [
            { title: "brasil x haiti", traffic: "2 mi+", pictureUrl: null, news: null, categories: [17] },
            { title: "defesa civil", traffic: "500 mil+", pictureUrl: null, news: null, categories: [11] },
          ],
        }),
      });
    });

    await page.goto("/");
    await page.click("#btn-nav-social-medias");

    const toggle = page.getByTestId("social-trend-sports-toggle");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    // Both topics shown before filtering.
    await expect(page.getByTestId("social-trend-1")).toContainText("defesa civil");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    // Only the sports topic remains.
    await expect(page.getByTestId("social-trend-0")).toContainText("brasil x haiti");
    await expect(page.getByTestId("social-trend-1")).toHaveCount(0);
  });

  test("hides the Google Trends card when the API returns no topics", async ({ page }) => {
    await page.route("**/api/google-trends", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          source: "fallback",
          note: "Tendências indisponíveis — Google Trends inacessível.",
          updatedAt: "2026-06-20T12:00:00.000Z",
          topics: [],
        }),
      });
    });

    await page.goto("/");
    await page.click("#btn-nav-social-medias");

    await expect(page.locator("#social-medias-view")).toBeVisible();
    await expect(page.locator("#social-medias-google-trends")).toHaveCount(0);
  });

  test("renders in dark theme", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-toggle-theme");
    await page.click("#btn-nav-social-medias");

    await expect(page.locator("#social-medias-view")).toBeVisible();
    await page.getByTestId("social-filtro-oficial").click();
    await expect(page.getByTestId("social-post-post-selecao-treino")).toBeVisible();
    await expect(page.getByTestId("social-post-post-foto-mosaico")).toHaveCount(0);
  });
});

import { test, expect } from "@playwright/test";

test.describe("Redes Sociais view", () => {
  test("filters, likes and comments work without console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");
    await page.click("#btn-nav-redes-sociais");

    await expect(page.locator("#redes-sociais-view")).toBeVisible();
    await expect(page.locator("#redes-sociais-feed")).toBeVisible();
    await expect(page.locator("#redes-sociais-tendencias")).toBeVisible();

    // Category filter: only photo posts remain after picking "Fotos".
    const fotoPost = page.getByTestId("redes-post-post-foto-mosaico");
    const noticiaPost = page.getByTestId("redes-post-post-noticia-escalacao");
    await expect(fotoPost).toBeVisible();
    await expect(noticiaPost).toBeVisible();

    await page.getByTestId("redes-filtro-foto").click();
    await expect(fotoPost).toBeVisible();
    await expect(noticiaPost).toHaveCount(0);

    // Back to all, then filter by a trending hashtag.
    await page.getByTestId("redes-filtro-tudo").click();
    await page.getByTestId("redes-tendencia-MaracanaLotado").click();
    await expect(fotoPost).toBeVisible();
    await expect(noticiaPost).toHaveCount(0);
    await page.getByTestId("redes-limpar-tag").click();
    await expect(noticiaPost).toBeVisible();

    // Like toggles the incremental counter.
    const likeCount = page.getByTestId("redes-curtidas-post-cazetv-abertura");
    const before = (await likeCount.textContent())?.replace(/\D/g, "");
    await page.getByTestId("redes-curtir-post-cazetv-abertura").click();
    const after = (await likeCount.textContent())?.replace(/\D/g, "");
    expect(Number(after)).toBe(Number(before) + 1);

    // Nested comments: open, add a local comment in real time.
    await page.getByTestId("redes-comentar-post-selecao-treino").click();
    const commentList = page.getByTestId("redes-comentarios-post-selecao-treino");
    await expect(commentList).toBeVisible();
    await page
      .getByTestId("redes-comentario-input-post-selecao-treino")
      .fill("Vai dar bom, Brasil! 🇧🇷");
    await page.getByTestId("redes-comentario-enviar-post-selecao-treino").click();
    await expect(commentList).toContainText("Vai dar bom, Brasil!");

    expect(consoleErrors).toEqual([]);
  });

  test("renders in dark theme", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-toggle-theme");
    await page.click("#btn-nav-redes-sociais");

    await expect(page.locator("#redes-sociais-view")).toBeVisible();
    await page.getByTestId("redes-filtro-oficial").click();
    await expect(page.getByTestId("redes-post-post-cazetv-abertura")).toBeVisible();
    await expect(page.getByTestId("redes-post-post-foto-mosaico")).toHaveCount(0);
  });
});

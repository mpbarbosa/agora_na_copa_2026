import { test, expect } from "@playwright/test";
import { collectAppConsoleErrors } from "./fixtures/consoleErrors";

// The "Destaques no Instagram" feed on the Redes Sociais tab lists real player
// highlights from squads.json. Each card mounts its Instagram embed lazily — only
// the first is open by default, the rest load on tap — so the page never spins up
// many Instagram iframes at once. We assert on OUR markup (the blockquote +
// permalink + the "Abrir no Instagram" link), never on Instagram's network-loaded
// iframe content, which is third-party and offline-fragile.
test.describe("Instagram highlights feed (Redes Sociais)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
    // Stub embed.js to a no-op so the as-authored blockquote stays in the DOM and
    // the assertions are deterministic with or without network access.
    await page.route(/embed\.js/, (route) =>
      route.fulfill({ contentType: "application/javascript", body: "" }),
    );
  });

  test("renders the feed section with at least one player card", async ({ page }) => {
    const consoleErrors = collectAppConsoleErrors(page);

    await page.goto("/");
    await page.click("#btn-nav-social-medias");
    await expect(page.locator("#social-medias-view")).toBeVisible();

    const feed = page.locator("#instagram-highlights-feed");
    await expect(feed).toBeVisible();
    await expect(feed).toContainText("Destaques no Instagram");
    await expect(feed.locator('[id^="ig-highlight-card-"]').first()).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test("only the first card is expanded; others mount their embed on tap", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-social-medias");
    await expect(page.locator("#social-medias-view")).toBeVisible();

    const toggles = page.locator('[id^="ig-highlight-toggle-"]');
    const count = await toggles.count();
    expect(count).toBeGreaterThan(0);

    // First card open by default → exactly one embed mounted initially.
    await expect(toggles.first()).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#instagram-highlights-feed blockquote.instagram-media")).toHaveCount(1);

    if (count > 1) {
      const second = toggles.nth(1);
      await expect(second).toHaveAttribute("aria-expanded", "false");
      await second.click();
      await expect(second).toHaveAttribute("aria-expanded", "true");
      // A second embed mounts only after the tap.
      await expect(page.locator("#instagram-highlights-feed blockquote.instagram-media")).toHaveCount(2);
    }
  });

  test("an expanded card embeds the post and links out to Instagram", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-social-medias");
    await expect(page.locator("#social-medias-view")).toBeVisible();

    const firstCard = page.locator('[id^="ig-highlight-card-"]').first();
    const blockquote = firstCard.locator("blockquote.instagram-media");
    await expect(blockquote).toBeAttached();

    const permalink = await blockquote.getAttribute("data-instgrm-permalink");
    expect(permalink).toMatch(/^https:\/\/www\.instagram\.com\//);

    const openLink = firstCard.locator('[id^="ig-highlight-open-"]');
    await expect(openLink).toHaveAttribute("href", permalink ?? "");
    await expect(openLink).toHaveAttribute("target", "_blank");
    await expect(openLink).toHaveAttribute("rel", /noopener/);
  });

  test("renders correctly in dark theme without console errors", async ({ page }) => {
    const consoleErrors = collectAppConsoleErrors(page);

    await page.goto("/");
    await page.click("#btn-toggle-theme");
    await page.click("#btn-nav-social-medias");

    await expect(page.locator("#instagram-highlights-feed")).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });
});

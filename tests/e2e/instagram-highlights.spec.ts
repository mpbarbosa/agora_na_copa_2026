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

// The animated photo carousel (`InstagramHighlightsCarousel`) that leads into the
// feed above: an auto-scrolling marquee of every highlight player's photo, each
// tile opening that player's real IG post. Assertions target OUR markup (tile
// anchors, the marquee track, aria-hidden duplicate) — never the network-loaded
// FIFA images — so they hold offline.
test.describe("Instagram highlights carousel (Redes Sociais)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
    // Stub embed.js to a no-op so an expanded card's blockquote stays in the DOM.
    await page.route(/embed\.js/, (route) =>
      route.fulfill({ contentType: "application/javascript", body: "" }),
    );
  });

  test("animated marquee: tiles duplicated for a seamless loop, aria-safe", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-social-medias");

    const carousel = page.locator("#ig-highlights-carousel");
    await expect(carousel).toBeVisible();

    // Every highlight player gets a tile, mirrored once (aria-hidden) to close the loop.
    const primaryTiles = carousel.locator('a[id^="ig-carousel-tile-"]');
    const dupTiles = carousel.locator(".ig-marquee-dup");
    const n = await primaryTiles.count();
    expect(n).toBeGreaterThan(0);
    expect(await dupTiles.count()).toBe(n);

    // The marquee animation is applied to the track.
    const animName = await carousel
      .locator(".ig-marquee-track")
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(animName).toBe("ig-marquee");

    // Each tile is an in-page anchor to that player's card in the feed below.
    await expect(primaryTiles.first()).toHaveAttribute("href", /^#ig-highlight-card-/);

    // The duplicate set is hidden from assistive tech so each player is read once.
    await expect(dupTiles.first()).toHaveAttribute("aria-hidden", "true");
  });

  test("clicking a tile expands + scrolls to that player's card in the feed below", async ({
    page,
  }) => {
    // Stop the marquee (via the reduced-motion CSS) so the tile is a stable click
    // target — Playwright won't click a continuously-animating element. The
    // click → expand → scroll behavior is identical whether or not it animates.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.click("#btn-nav-social-medias");

    const carousel = page.locator("#ig-highlights-carousel");
    await expect(carousel).toBeVisible();

    // Pick a tile that is NOT the first feed card (that one is expanded by default),
    // so the click's expand + scroll is meaningfully observable.
    const tile = carousel.locator('a[id^="ig-carousel-tile-"]').nth(3);
    const href = await tile.getAttribute("href");
    const fifaId = (href ?? "").replace("#ig-highlight-card-", "");
    expect(fifaId).not.toBe("");

    const card = page.locator(`#ig-highlight-card-${fifaId}`);
    const toggle = page.locator(`#ig-highlight-toggle-${fifaId}`);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await tile.click();

    // The target card expands (its embed mounts) and is scrolled into view.
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(card.locator("blockquote.instagram-media")).toHaveCount(1);
    await expect(card).toBeInViewport();
  });
});

test.describe("Instagram highlights carousel — reduced motion", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
  });

  test("no auto-scroll and duplicate tiles are removed from the flow", async ({ page }) => {
    // Emulate the media feature explicitly (the `reducedMotion` context option does
    // not take effect against the pinned system Chromium used here).
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.click("#btn-nav-social-medias");

    const carousel = page.locator("#ig-highlights-carousel");
    await expect(carousel).toBeVisible();

    // The marquee animation is disabled for reduced-motion users…
    const animName = await carousel
      .locator(".ig-marquee-track")
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(animName).toBe("none");

    // …the real tiles remain, but the duplicate loop-closing set is display:none.
    await expect(carousel.locator('a[id^="ig-carousel-tile-"]').first()).toBeVisible();
    await expect(carousel.locator(".ig-marquee-dup").first()).toBeHidden();
  });
});

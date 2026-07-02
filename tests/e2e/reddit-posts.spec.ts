import { test, expect } from "@playwright/test";
import { collectAppConsoleErrors } from "./fixtures/consoleErrors";

// The "Repercussão no Reddit" feed on the Redes Sociais tab reads /api/reddit —
// curated posts (src/data/redditPosts.json) enriched with live Reddit data, or
// the curated seed when Reddit is unreachable / credentials are unset. In CI
// there are no REDDIT_* env vars, so the endpoint deterministically returns the
// fallback seed, which is exactly what we assert on (never Reddit's network).
test.describe("Reddit posts feed (Redes Sociais)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
  });

  test("GET /api/reddit returns the resilience shape with curated posts", async ({ request }) => {
    const res = await request.get("/api/reddit");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(["reddit", "fallback"]).toContain(body.source);
    expect(typeof body.note).toBe("string");
    expect(typeof body.updatedAt).toBe("string");
    expect(Array.isArray(body.posts)).toBeTruthy();
    expect(body.posts.length).toBeGreaterThan(0);
    const post = body.posts[0];
    expect(typeof post.id).toBe("string");
    expect(post.url).toMatch(/^https:\/\/www\.reddit\.com\//);
    expect(post.subreddit).toMatch(/^r\//);
    expect(typeof post.title).toBe("string");
  });

  test("renders the feed section with at least one link card", async ({ page }) => {
    const consoleErrors = collectAppConsoleErrors(page);

    await page.goto("/");
    await page.click("#btn-nav-social-medias");
    await expect(page.locator("#social-medias-view")).toBeVisible();

    const feed = page.locator("#reddit-posts-feed");
    await expect(feed).toBeVisible();
    await expect(feed).toContainText("Repercussão no Reddit");

    const firstCard = feed.locator('[id^="reddit-post-card-"]').first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard).toHaveAttribute("href", /^https:\/\/www\.reddit\.com\//);
    await expect(firstCard).toHaveAttribute("target", "_blank");
    await expect(firstCard).toHaveAttribute("rel", /noopener/);

    expect(consoleErrors).toEqual([]);
  });

  test("renders correctly in dark theme without console errors", async ({ page }) => {
    const consoleErrors = collectAppConsoleErrors(page);

    await page.goto("/");
    await page.click("#btn-toggle-theme");
    await page.click("#btn-nav-social-medias");

    await expect(page.locator("#reddit-posts-feed")).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });
});

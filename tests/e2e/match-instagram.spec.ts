import { test, expect } from "@playwright/test";

// The per-match "Instagram" tab on the Ao Vivo match page. A match with a
// configured Instagram post (src/data/matchInstagram.json) gains an extra tab to
// the right of the Pré-jogo/Pós-jogo tab; opening it shows the embedded post.
// We assert on OUR markup (the tab button + the blockquote.instagram-media
// permalink + the "Abrir no Instagram" link), never on Instagram's
// network-loaded iframe, which is third-party and offline-fragile.
test.describe("Match Instagram tab (Ao Vivo)", () => {
  // GER x PAR (16-avos) — the match seeded with an Instagram post.
  const MATCH_ID = "ko-74-2026";
  const PERMALINK = "https://www.instagram.com/p/DaME26jDuIC/";

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
    // Stub embed.js to a no-op so the as-authored blockquote stays in the DOM and
    // the assertions are deterministic with or without network access.
    await page.route(/embed\.js/, (route) =>
      route.fulfill({ contentType: "application/javascript", body: "" }),
    );
  });

  test("shows an Instagram tab and embeds the post for a match with one", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.click("#btn-consent-accept").catch(() => {});

    // Land on the GER x PAR match via the Ao Vivo match selector.
    await page.click(`#btn-match-${MATCH_ID}`);

    // The Instagram tab sits to the right of the Pré-jogo/Pós-jogo tab.
    const instagramTab = page.locator("#btn-tab-instagram");
    await expect(instagramTab).toBeVisible();
    await expect(instagramTab).toContainText("Instagram");

    await instagramTab.click();

    const panel = page.getByTestId("match-instagram");
    await expect(panel).toBeVisible();
    await expect(panel.locator("blockquote.instagram-media")).toHaveAttribute(
      "data-instgrm-permalink",
      PERMALINK,
    );

    const openLink = page.locator("#match-instagram-open-0");
    await expect(openLink).toHaveAttribute("href", PERMALINK);
    await expect(openLink).toHaveAttribute("target", "_blank");
    await expect(openLink).toContainText("Abrir no Instagram");
  });
});

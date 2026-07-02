import { test, expect } from "@playwright/test";
import { collectAppConsoleErrors } from "./fixtures/consoleErrors";

// Stubs a FIFA-assigned referee onto a live match and drives the scoreboard
// chip → RefereeCard → Instagram highlight. The stubbed name carries an extra
// surname part ("… Villalpando") to exercise the tolerant name match in
// resolveRefereeInstagram against the curated key ("katia itzel garcia").
// We assert on OUR markup (chip, card, the "Abrir no Instagram" link), never on
// Instagram's network-loaded iframe, so the test is fully offline.
test.describe("Referee card (Ao Vivo)", () => {
  test("clicking the referee chip opens the card with the Instagram highlight", async ({ page }) => {
    const consoleErrors = collectAppConsoleErrors(page);
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));

    // Keep the Instagram embed iframe offline-safe.
    await page.route(/instagram\.com\/.*\/embed/, (route) =>
      route.fulfill({ contentType: "text/html", body: "" }),
    );

    await page.route("**/api/match-overlays", async (route) => {
      const now = new Date().toISOString();
      await route.fulfill({
        json: {
          overlays: {
            "bra-mar-2026": {
              matchState: {
                status: "LIVE",
                score: { teamA: 1, teamB: 0 },
                matchTime: "57'",
                officialStatus: "2º tempo",
                referee: { name: "Katia Itzel Garcia Villalpando", country: "MEX" },
                incidents: [],
                source: "fifa",
                note: "",
                updatedAt: now,
              },
              broadcastGuide: { broadcasters: [], source: "fifa", note: "", updatedAt: now },
            },
          },
          source: "fifa",
          note: "",
          updatedAt: now,
        },
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.click("#btn-consent-accept").catch(() => {});
    await page.click("#btn-nav-ao-vivo").catch(() => {});

    const chip = page.locator("#match-referee-chip");
    await expect(chip).toBeVisible({ timeout: 10000 });
    await expect(chip).toContainText("Katia Itzel Garcia Villalpando");

    await chip.click();

    const card = page.locator("#referee-card");
    await expect(card).toBeVisible();
    await expect(card).toContainText("Card do árbitro");
    await expect(card).toContainText("Katia Itzel Garcia Villalpando");
    await expect(card).toContainText("MEX");

    // Expand the Instagram highlight and assert the outbound link markup.
    await card.locator("#referee-card-ig-toggle").click();
    const openLink = card.locator("#referee-card-ig-open-0");
    await expect(openLink).toHaveAttribute("href", /instagram\.com/);
    await expect(openLink).toHaveAttribute("target", "_blank");
    await expect(openLink).toHaveAttribute("rel", /noopener/);

    // Close.
    await card.locator("#btn-close-referee-card").click();
    await expect(card).toBeHidden();

    expect(consoleErrors).toEqual([]);
  });
});

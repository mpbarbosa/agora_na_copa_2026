import { test, expect } from "@playwright/test";

// Forces one match to SUSPENDED via the live-overlay feed and checks the Ao Vivo
// scoreboard surfaces the FIFA suspension-regulations link. Fully offline.
test.describe("Weather suspension notice (Ao Vivo)", () => {
  test("a suspended match links to the FIFA regulations on suspended matches", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));

    await page.route("**/api/match-overlays", async (route) => {
      const now = new Date().toISOString();
      await route.fulfill({
        json: {
          overlays: {
            "bra-mar-2026": {
              matchState: {
                status: "SUSPENDED",
                score: { teamA: 1, teamB: 1 },
                matchTime: "57'",
                officialStatus: "Paralisado",
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

    const notice = page.getByTestId("weather-suspension-notice");
    await expect(notice).toBeVisible({ timeout: 10000 });
    await expect(notice).toContainText(/protocolo da FIFA/i);
    await expect(notice).toContainText(/suspens/i);
    await expect(notice).toHaveAttribute("href", /FWC2026_regulations.*\.pdf$/);
    await expect(notice).toHaveAttribute("target", "_blank");
    await expect(notice).toHaveAttribute("rel", /noopener/);
  });
});

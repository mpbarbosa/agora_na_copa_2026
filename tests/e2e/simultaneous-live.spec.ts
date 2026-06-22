import { test, expect } from "@playwright/test";

// Forces two matches LIVE at once by stubbing the live-overlay feed, then checks
// the Ao Vivo page alerts about simultaneous matches and surfaces a quick-switch
// chip for each. Fully offline (synthetic response, no upstream call).
test.describe("Simultaneous live matches (Ao Vivo)", () => {
  const LIVE_IDS = ["fra-sen-2026", "irq-nor-2026"]; // curated Group I fixtures

  test("alerts and lists every match when two are live at once", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));

    await page.route("**/api/match-overlays", async (route) => {
      const now = new Date().toISOString();
      const overlays: Record<string, unknown> = {};
      for (const id of LIVE_IDS) {
        overlays[id] = {
          matchState: {
            status: "LIVE",
            score: { teamA: 1, teamB: 0 },
            matchTime: "30'",
            officialStatus: "1º tempo",
            incidents: [],
            source: "fifa",
            note: "",
            updatedAt: now,
          },
          broadcastGuide: { broadcasters: [], source: "fifa", note: "", updatedAt: now },
        };
      }
      await route.fulfill({ json: { overlays, source: "fifa", note: "", updatedAt: now } });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.click("#btn-consent-accept").catch(() => {});

    const alert = page.locator("#simultaneous-live-alert");
    await expect(alert).toBeVisible({ timeout: 10000 });
    await expect(alert).toContainText(/jogos ao vivo agora/i);
    await expect(alert).toContainText(/simult/i);

    // Both live matches have a quick-switch chip.
    for (const id of LIVE_IDS) {
      await expect(page.locator(`#btn-simultaneous-${id}`)).toBeVisible();
    }

    // Switching chips selects that match (chip becomes pressed).
    const second = page.locator(`#btn-simultaneous-${LIVE_IDS[1]}`);
    await second.click();
    await expect(second).toHaveAttribute("aria-pressed", "true");
  });
});

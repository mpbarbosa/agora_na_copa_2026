import { expect, test } from "@playwright/test";

// Records every utterance text into window.__utterances and fires onend so the
// speech manager's queue drains. Installed before app scripts run.
async function stubSpeech(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    (window as unknown as { __utterances: string[] }).__utterances = [];
    const synth = {
      speak: (u: SpeechSynthesisUtterance) => {
        (window as unknown as { __utterances: string[] }).__utterances.push(String(u.text));
        if (typeof u.onend === "function") {
          window.setTimeout(() => (u.onend as () => void)(), 0);
        }
      },
      cancel: () => {},
      pause: () => {},
      resume: () => {},
      getVoices: () => [],
      onvoiceschanged: null,
    };
    Object.defineProperty(window, "speechSynthesis", { configurable: true, get: () => synth });
  });
}

async function stubLiveApis(page: import("@playwright/test").Page) {
  await page.route("**/api/match-overlays", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ refreshAfterMs: 60000, overlays: {} }),
    }),
  );
  await page.route("**/api/match-states", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ states: {}, refreshAfterMs: 60000 }),
    }),
  );
}

const utterances = (page: import("@playwright/test").Page) =>
  page.evaluate(() => (window as unknown as { __utterances: string[] }).__utterances);

test.describe("Live-match speech narration (Ao Vivo)", () => {
  test("narrates a simulated goal when 'Narração' is enabled", async ({ page }) => {
    await stubSpeech(page);
    await stubLiveApis(page);

    await page.goto("/");
    await page.click("#match-selector-chips-finished #btn-match-bra-mar-2026");

    // The narration toggle lives on the scoreboard (no drawer needed to enable).
    const toggle = page.locator("#btn-toggle-narration");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click(); // enabling speaks a confirmation within the click gesture
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => utterances(page)).toContain("Narração ativada.");

    // Drive a live goal through the manual simulator (in the clock drawer).
    await page.click("#btn-edit-match");
    await page.fill("#input-kickoff-time", "21:00");
    await page.fill("#input-countdown-seconds", "600");
    await page.click("#btn-apply-match-config");
    await page.click("#btn-sim-start-live");
    await page.click("#btn-sim-goal-a");

    await expect
      .poll(() => utterances(page).then((list) => list.some((t) => /gol/i.test(t))))
      .toBe(true);
  });

  test("stays silent when 'Narração' is off (default)", async ({ page }) => {
    await stubSpeech(page);
    await stubLiveApis(page);

    await page.goto("/");
    await page.click("#match-selector-chips-finished #btn-match-bra-mar-2026");
    await page.click("#btn-edit-match");
    await expect(page.locator("#btn-toggle-narration")).toHaveAttribute("aria-pressed", "false");

    await page.fill("#input-kickoff-time", "21:00");
    await page.fill("#input-countdown-seconds", "600");
    await page.click("#btn-apply-match-config");
    await page.click("#btn-sim-start-live");
    await page.click("#btn-sim-goal-a");

    // Incidents render, but nothing is spoken.
    await expect(page.locator("#match-incidents-panel")).toContainText("GOL");
    expect(await utterances(page)).toHaveLength(0);
  });
});

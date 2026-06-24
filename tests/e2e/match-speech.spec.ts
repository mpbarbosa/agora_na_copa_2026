import { expect, test, type Page } from "@playwright/test";

// The speech engine is now vendored and bundled (no CDN), so it runs for real in
// the test. We stub window.speechSynthesis to (a) record each utterance's text into
// window.__utterances and (b) drive the engine's queue by firing onstart/onend, so
// queued cues advance exactly as on a real device.
async function stubSpeechSynthesis(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __utterances: string[] }).__utterances = [];
    const synth = {
      speaking: false,
      paused: false,
      pending: false,
      cancel() {},
      resume() {},
      pause() {},
      getVoices: () => [] as SpeechSynthesisVoice[],
      speak(u: SpeechSynthesisUtterance) {
        (window as unknown as { __utterances: string[] }).__utterances.push(String(u.text));
        if (typeof u.onstart === "function")
          window.setTimeout(() => (u.onstart as (e?: unknown) => void)(), 0);
        if (typeof u.onend === "function")
          window.setTimeout(() => (u.onend as (e?: unknown) => void)(), 5);
      },
      onvoiceschanged: null,
    };
    Object.defineProperty(window, "speechSynthesis", { configurable: true, get: () => synth });
  });
}

async function stubLiveApis(page: Page) {
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

const utterances = (page: Page) =>
  page.evaluate(() => (window as unknown as { __utterances: string[] }).__utterances);

test.describe("Live-match speech narration (Ao Vivo)", () => {
  test("narrates a simulated goal when 'Narração' is enabled", async ({ page }) => {
    await stubSpeechSynthesis(page);
    await stubLiveApis(page);

    await page.goto("/");
    await page.click("#match-selector-chips-finished #btn-match-bra-mar-2026");

    // The narration toggle lives on the scoreboard (no drawer needed to enable).
    const toggle = page.locator("#btn-toggle-narration");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click(); // enabling speaks a confirmation
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

  test("the per-incident microphone speaks that incident on demand", async ({ page }) => {
    await stubSpeechSynthesis(page);
    await stubLiveApis(page);

    await page.goto("/");
    await page.click("#match-selector-chips-finished #btn-match-bra-mar-2026");

    // Produce an incident via the simulator (Narração toggle stays OFF).
    await page.click("#btn-edit-match");
    await page.fill("#input-kickoff-time", "21:00");
    await page.fill("#input-countdown-seconds", "600");
    await page.click("#btn-apply-match-config");
    await page.click("#btn-sim-start-live");
    await page.click("#btn-sim-goal-a");

    // Nothing spoken yet (toggle off), then the incident's mic speaks on click.
    expect(await utterances(page)).toHaveLength(0);
    const mic = page.getByTestId("incident-speak").first();
    await expect(mic).toBeVisible();
    await mic.click();
    await expect.poll(() => utterances(page).then((l) => l.length)).toBeGreaterThan(0);
  });

  test("the setup drawer shows the speech status readout", async ({ page }) => {
    await stubSpeechSynthesis(page);
    await stubLiveApis(page);

    await page.goto("/");
    await page.click("#match-selector-chips-finished #btn-match-bra-mar-2026");
    await page.click("#btn-edit-match");

    const info = page.getByTestId("speech-status-info");
    await expect(info).toBeVisible();
    await expect(info).toContainText("Status da narração");
    await expect(info).toContainText("Disponível");
    await expect(info).toContainText("Carregado"); // engine constructed locally (no CDN)
  });

  test("'Testar voz' runs a direct device speech test and reports the outcome", async ({ page }) => {
    // The shared stub fires onstart→onend, so the direct test reports "concluído".
    await stubSpeechSynthesis(page);
    await stubLiveApis(page);

    await page.goto("/");
    await page.click("#match-selector-chips-finished #btn-match-bra-mar-2026");
    await page.click("#btn-edit-match");

    await page.getByTestId("btn-test-narration").click();
    // Direct test reports its result on screen (here: completed via the stub).
    await expect(page.getByTestId("speech-test-result")).toContainText("concluído");
  });

  test("stays silent when 'Narração' is off (default)", async ({ page }) => {
    await stubSpeechSynthesis(page);
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

import { expect, test, type Page } from "@playwright/test";

// A tiny ESM module standing in for the CDN-loaded catas_altas_speech engine.
// Its SpeechSynthesisManager records spoken text into window.__utterances.
const CATAS_STUB = `
  window.__utterances = window.__utterances || [];
  export class SpeechSynthesisManager {
    speak(text){ window.__utterances.push(String(text)); }
    stop(){}
    destroy(){}
  }
  export default SpeechSynthesisManager;
  export const SPEECH_PRIORITY = { PERIODIC:0, LOGRADOURO:1, BAIRRO:2, FIRST_ADDRESS:2.5, MUNICIPIO:3 };
`;

async function mockSpeechEngine(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __utterances: string[] }).__utterances = [];
  });
  // Intercept the runtime dynamic import of the engine from jsDelivr.
  await page.route(/catas_altas_speech/, (route) =>
    route.fulfill({
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      contentType: "text/javascript",
      body: CATAS_STUB,
    }),
  );
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
    await mockSpeechEngine(page);
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
    await mockSpeechEngine(page);
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
    await mockSpeechEngine(page);
    await stubLiveApis(page);

    await page.goto("/");
    await page.click("#match-selector-chips-finished #btn-match-bra-mar-2026");
    await page.click("#btn-edit-match");

    const info = page.getByTestId("speech-status-info");
    await expect(info).toBeVisible();
    await expect(info).toContainText("Status da narração");
    await expect(info).toContainText("Disponível");
    await expect(info).toContainText("Carregado"); // engine loaded from the (mocked) CDN
  });

  test("stays silent when 'Narração' is off (default)", async ({ page }) => {
    await mockSpeechEngine(page);
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

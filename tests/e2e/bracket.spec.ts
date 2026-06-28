import { test, expect } from "@playwright/test";
import { collectAppConsoleErrors } from "./fixtures/consoleErrors";

// The Chaveamento view renders the OFFICIAL FIFA knockout bracket from
// src/data/knockoutBracket.json — read-only. R32 group slots ("2A") resolve
// provisionally from current standings; later-round slots show official winner/
// loser refs ("Vencedor #74", "Perdedor #101"). These assertions target the
// deterministic official labels, dates and venues, not the volatile provisional
// team resolution.
test.describe("Bracket view (Chaveamento)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
  });

  test("renders the official bracket: six stages, all 32 fixtures, 3rd-place match", async ({ page }) => {
    const consoleErrors = collectAppConsoleErrors(page);

    await page.goto("/");
    await page.click("#btn-nav-chaveamento");

    await expect(page.locator("#bracket-view")).toBeVisible();

    // All six official stages, including the 3rd-place play-off (TP).
    for (const stage of ["r32", "r16", "qf", "sf", "tp", "f"]) {
      await expect(page.locator(`#bracket-stage-${stage}`)).toBeVisible();
    }

    // 32 knockout fixtures (matchNumber 73–104).
    await expect(page.locator('#bracket-view [id^="bracket-match-"]')).toHaveCount(32);

    expect(consoleErrors).toEqual([]);
  });

  test("shows official winner/loser slot labels, real dates and venues", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-chaveamento");
    await expect(page.locator("#bracket-view")).toBeVisible();

    // R16 #89 is fed by the winners of R32 #74 and #77 — deterministic official refs.
    const r16 = page.locator("#bracket-match-89");
    await expect(r16.locator("#bracket-slot-89-a")).toContainText("Vencedor #74");
    await expect(r16.locator("#bracket-slot-89-b")).toContainText("Vencedor #77");

    // The 3rd-place match (#103, TP) is fed by the two semifinal losers.
    const thirdPlace = page.locator("#bracket-stage-tp #bracket-match-103");
    await expect(thirdPlace).toBeVisible();
    await expect(thirdPlace).toContainText("Perdedor #101");
    await expect(thirdPlace).toContainText("Perdedor #102");
    await expect(thirdPlace).toContainText("Miami");

    // The final (#104) in New Jersey, with the localized Brasília kickoff (19:00Z → 16:00).
    const final = page.locator("#bracket-stage-f #bracket-match-104");
    await expect(final).toContainText("New Jersey");
    await expect(final).toContainText("16:00");
    await expect(final.locator("#bracket-slot-104-a")).toContainText("Vencedor #101");
  });

  test("clicking a resolved bracket slot opens the team page", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-chaveamento");
    await expect(page.locator("#bracket-view")).toBeVisible();

    // A confirmed team slot (Canadá in R32 #73) is a clickable button…
    const canadaSlot = page.locator("#bracket-slot-73-b");
    await expect(canadaSlot).toContainText(/canad/i);
    expect(await canadaSlot.evaluate((el) => el.tagName)).toBe("BUTTON");
    // …while an undecided winner-ref slot is a plain, non-clickable label.
    const labelSlot = page.locator("#bracket-slot-89-a");
    await expect(labelSlot).toContainText("Vencedor #74");
    expect(await labelSlot.evaluate((el) => el.tagName)).toBe("DIV");

    // Clicking the resolved slot opens that national team's page.
    await canadaSlot.click();
    await expect(page.locator("#team-lineup-view")).toBeVisible();
  });

  test("hovering an Oitavas card spotlights its 16-avos feeders and dims the rest", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-chaveamento");
    await expect(page.locator("#bracket-view")).toBeVisible();

    // R16 #89 is fed by R32 #74 and #77; #73 is an unrelated 16-avos fixture.
    const oitavas = page.locator("#bracket-stage-r16 #bracket-match-89");
    const feederA = page.locator("#bracket-stage-r32 #bracket-match-74");
    const feederB = page.locator("#bracket-stage-r32 #bracket-match-77");
    const unrelated = page.locator("#bracket-stage-r32 #bracket-match-73");

    // Idle: no spotlight anywhere.
    await expect(feederA).toHaveAttribute("data-feeder-highlight", "none");

    await oitavas.hover();

    // The two feeders are highlighted; the unrelated 16-avos card is dimmed.
    await expect(feederA).toHaveAttribute("data-feeder-highlight", "feeder");
    await expect(feederB).toHaveAttribute("data-feeder-highlight", "feeder");
    await expect(unrelated).toHaveAttribute("data-feeder-highlight", "dimmed");

    // Moving the cursor away clears the spotlight.
    await page.locator("#bracket-title").hover();
    await expect(feederA).toHaveAttribute("data-feeder-highlight", "none");
    await expect(unrelated).toHaveAttribute("data-feeder-highlight", "none");
  });

  test("keyboard focus spotlights the feeders (no hover)", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-chaveamento");
    await expect(page.locator("#bracket-view")).toBeVisible();

    const oitavas = page.locator("#bracket-stage-r16 #bracket-match-89");
    const feederA = page.locator("#bracket-stage-r32 #bracket-match-74");
    const unrelated = page.locator("#bracket-stage-r32 #bracket-match-73");

    // Tabbing to the card (focus) lights up its feeders…
    await oitavas.focus();
    await expect(feederA).toHaveAttribute("data-feeder-highlight", "feeder");
    await expect(unrelated).toHaveAttribute("data-feeder-highlight", "dimmed");

    // …and blurring it clears the spotlight.
    await oitavas.blur();
    await expect(feederA).toHaveAttribute("data-feeder-highlight", "none");
  });
});

// Every knockout card also opens its match page on tap, so on touch the spotlight uses a
// two-stage tap: the first tap reveals the feeders, a second tap on the same card opens
// the match. Needs a touch-capable context (no hover), so it lives in its own group.
test.describe("Bracket feeder spotlight on touch (two-stage tap)", () => {
  test.use({ hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
  });

  test("first tap previews the 16-avos feeders, second tap opens the match", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-chaveamento");
    await expect(page.locator("#bracket-view")).toBeVisible();

    const oitavas = page.locator("#bracket-stage-r16 #bracket-match-89");
    const feederA = page.locator("#bracket-stage-r32 #bracket-match-74");
    const feederB = page.locator("#bracket-stage-r32 #bracket-match-77");
    const unrelated = page.locator("#bracket-stage-r32 #bracket-match-73");

    // First tap spotlights the feeders WITHOUT leaving the bracket.
    await oitavas.tap();
    await expect(feederA).toHaveAttribute("data-feeder-highlight", "feeder");
    await expect(feederB).toHaveAttribute("data-feeder-highlight", "feeder");
    await expect(unrelated).toHaveAttribute("data-feeder-highlight", "dimmed");
    await expect(page.locator("#bracket-view")).toBeVisible();

    // Second tap on the same card opens its match page.
    await oitavas.tap();
    await expect(page.locator("#match-detail-view")).toBeVisible();
  });

  test("renders correctly in dark theme without console errors", async ({ page }) => {
    const consoleErrors = collectAppConsoleErrors(page);

    await page.goto("/");
    await page.click("#btn-toggle-theme").catch(() => {});
    await page.click("#btn-nav-chaveamento");

    await expect(page.locator("#bracket-view")).toBeVisible();
    await expect(page.locator("#bracket-stage-tp")).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });
});

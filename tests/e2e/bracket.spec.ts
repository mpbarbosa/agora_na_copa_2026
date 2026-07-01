import { test, expect } from "@playwright/test";
import { collectAppConsoleErrors } from "./fixtures/consoleErrors";
import { stubLiveApis } from "./fixtures/aoVivo";

// The Chaveamento view renders the OFFICIAL FIFA knockout bracket from
// src/data/knockoutBracket.json — read-only. R32 group slots ("2A") resolve
// provisionally from current standings; later-round slots show official winner/
// loser refs ("Vencedor #74", "Perdedor #101"). These assertions target the
// deterministic official labels, dates and venues, not the volatile provisional
// team resolution.
test.describe("Bracket view (Chaveamento)", () => {
  test.beforeEach(async ({ page }) => {
    // Stub the live overlay empty so the bracket resolves only from the static
    // seed (group standings + KNOCKOUT_RESULTS). The feeders used here (#86/#88)
    // are still-unplayed ties; were the prod fallback to report one finished it
    // would resolve its winner-ref slot ("Vencedor #86" → the team that advanced,
    // a clickable team link), making the feeder/undecided assertions race live data.
    await stubLiveApis(page);
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

    // R16 #95 is fed by the winners of R32 #86 and #88 — still-unplayed ties, so both
    // slots stay official winner-refs (deterministic, independent of any seeded result).
    const r16 = page.locator("#bracket-match-95");
    await expect(r16.locator("#bracket-slot-95-a")).toContainText("Vencedor #86");
    await expect(r16.locator("#bracket-slot-95-b")).toContainText("Vencedor #88");

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
    const labelSlot = page.locator("#bracket-slot-95-a");
    await expect(labelSlot).toContainText("Vencedor #86");
    expect(await labelSlot.evaluate((el) => el.tagName)).toBe("DIV");

    // Clicking the resolved slot opens that national team's page.
    await canadaSlot.click();
    await expect(page.locator("#team-lineup-view")).toBeVisible();
  });

  test("hovering an Oitavas card spotlights its 16-avos feeders and hides the rest", async ({ page }) => {
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

    // The two feeders are highlighted; the unrelated 16-avos card is hidden.
    await expect(feederA).toHaveAttribute("data-feeder-highlight", "feeder");
    await expect(feederB).toHaveAttribute("data-feeder-highlight", "feeder");
    await expect(unrelated).toHaveAttribute("data-feeder-highlight", "hidden");
    await expect(unrelated).toBeHidden();
    await expect(feederA).toBeVisible();

    // The two feeders slide together (≈12px gap-3 apart) and centre on the hovered card,
    // instead of staying several rows apart in their column.
    await expect
      .poll(async () => {
        const a = await feederA.boundingBox();
        const b = await feederB.boundingBox();
        return a && b ? Math.round(b.y - (a.y + a.height)) : null;
      })
      .toBeLessThanOrEqual(14);
    const aBox = await feederA.boundingBox();
    const bBox = await feederB.boundingBox();
    const oBox = await oitavas.boundingBox();
    // The hovered card's centre falls within the grouped pair's vertical span — i.e. the
    // pair sits right beside what it feeds (centred on it when the column edges allow).
    const pairTop = aBox!.y;
    const pairBottom = bBox!.y + bBox!.height;
    const cardCentre = oBox!.y + oBox!.height / 2;
    expect(cardCentre).toBeGreaterThanOrEqual(pairTop - 4);
    expect(cardCentre).toBeLessThanOrEqual(pairBottom + 4);

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
    await expect(unrelated).toHaveAttribute("data-feeder-highlight", "hidden");

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
    // Stub the live overlay empty so the bracket resolves only from the static
    // seed (group standings + KNOCKOUT_RESULTS). The feeders used here (#86/#88)
    // are still-unplayed ties; were the prod fallback to report one finished it
    // would resolve its winner-ref slot ("Vencedor #86" → the team that advanced,
    // a clickable team link), making the feeder/undecided assertions race live data.
    await stubLiveApis(page);
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
  });

  test("first tap previews the 16-avos feeders, second tap opens the match", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-chaveamento");
    await expect(page.locator("#bracket-view")).toBeVisible();

    const oitavas = page.locator("#bracket-stage-r16 #bracket-match-95");
    const feederA = page.locator("#bracket-stage-r32 #bracket-match-86");
    const feederB = page.locator("#bracket-stage-r32 #bracket-match-88");
    const unrelated = page.locator("#bracket-stage-r32 #bracket-match-77");

    // First tap spotlights the feeders WITHOUT leaving the bracket.
    await oitavas.tap();
    await expect(feederA).toHaveAttribute("data-feeder-highlight", "feeder");
    await expect(feederB).toHaveAttribute("data-feeder-highlight", "feeder");
    await expect(unrelated).toHaveAttribute("data-feeder-highlight", "hidden");
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

// On the mobile (narrow) layout, selecting a tie collapses the bracket to that tie's context:
// the unselected siblings in its own column AND the unrelated cards in the feeder column are
// removed from the flow (display:none) so only the selected card + its two feeders remain.
test.describe("Bracket feeder spotlight on mobile (collapses the columns)", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    // Stub the live overlay empty so the bracket resolves only from the static
    // seed (group standings + KNOCKOUT_RESULTS). The feeders used here (#86/#88)
    // are still-unplayed ties; were the prod fallback to report one finished it
    // would resolve its winner-ref slot ("Vencedor #86" → the team that advanced,
    // a clickable team link), making the feeder/undecided assertions race live data.
    await stubLiveApis(page);
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
  });

  test("selecting an Oitavas tie hides its siblings and the unrelated 16-avos cards", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-chaveamento");
    await expect(page.locator("#bracket-view")).toBeVisible();

    const selected = page.locator("#bracket-stage-r16 #bracket-match-95");
    const sibling = page.locator("#bracket-stage-r16 #bracket-match-96"); // another Oitavas tie
    const feederA = page.locator("#bracket-stage-r32 #bracket-match-86");
    const feederB = page.locator("#bracket-stage-r32 #bracket-match-88");
    const unrelated = page.locator("#bracket-stage-r32 #bracket-match-77");
    // The visible (mobile) count in each column's subheading.
    const r16Count = page.locator("#bracket-stage-r16-summary span:visible");
    const r32Count = page.locator("#bracket-stage-r32-summary span:visible");

    // Idle: the whole column is visible, full tally shown.
    await expect(sibling).toBeVisible();
    await expect(unrelated).toBeVisible();
    await expect(r16Count).toHaveText("8 confrontos");
    await expect(r32Count).toHaveText("16 confrontos");

    // First tap collapses everything but the selected tie and its two feeders.
    await selected.tap();
    await expect(selected).toBeVisible();
    await expect(feederA).toBeVisible();
    await expect(feederB).toBeVisible();
    await expect(sibling).toBeHidden(); // display:none — out of the flow
    await expect(unrelated).toBeHidden();
    // …and the subheadings follow the collapse: just the tie, just its two feeders.
    await expect(r16Count).toHaveText("1 confronto");
    await expect(r32Count).toHaveText("2 confrontos");

    // Second tap on the selected card still opens its match page.
    await selected.tap();
    await expect(page.locator("#match-detail-view")).toBeVisible();
  });
});

// The "Chave completa" toggle swaps the per-stage columns for the symmetric flag
// bracket (FullBracketView); on a portrait phone it asks the user to rotate.
test.describe("Bracket view — full-bracket toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
  });

  test("toggles between the columns view and the full symmetric bracket", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-chaveamento");
    await expect(page.locator("#bracket-view")).toBeVisible();

    // Default is the per-stage columns.
    await expect(page.locator("#bracket-stage-grid")).toBeVisible();
    await expect(page.locator("#bracket-full")).toHaveCount(0);

    // Switch to the full bracket: the columns go away, the symmetric bracket + final appear.
    await page.click("#bracket-view-toggle-full");
    await expect(page.locator("#bracket-full")).toBeVisible();
    await expect(page.locator("#bracket-stage-grid")).toHaveCount(0);
    await expect(page.locator("#bracket-full")).toContainText("Final");

    // Switch back.
    await page.click("#bracket-view-toggle-columns");
    await expect(page.locator("#bracket-stage-grid")).toBeVisible();
    await expect(page.locator("#bracket-full")).toHaveCount(0);
  });

  test("prompts to rotate on a portrait phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await page.goto("/");
    await page.click("#btn-nav-chaveamento");
    await page.click("#bracket-view-toggle-full");
    const hint = page.locator("#bracket-full-rotate-hint");
    await expect(hint).toBeVisible();
    await expect(hint).toContainText("Gire o celular");
  });
});

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
    // seed (group standings + KNOCKOUT_RESULTS). The seed has the Round of 32, the R16, all
    // four Quarterfinals (#97–#100) and both Semifinals (#101 França 0×2 Espanha, #102
    // Inglaterra 1×2 Argentina) finished, so their winner/loser-refs resolve down the chain to
    // real teams: the Final (#104) is Espanha × Argentina and the 3rd-place match (#103) is
    // França × Inglaterra. With both semis played the whole bracket is drawn — only #103/#104's
    // results remain pending — so every later-round slot names a real team.
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

    // QF #97 is fed by the winners of R16 #89 (Paraguai 0×1 França) and #90 (Canadá 0×3
    // Marrocos) — both finished in the seed, so the feeder chain resolves the slots to the
    // qualified teams (a QF slot chases the winner down the chain, not just a direct ref).
    const qf97 = page.locator("#bracket-match-97");
    await expect(qf97.locator("#bracket-slot-97-a")).toContainText(/fran[çc]a/i);
    await expect(qf97.locator("#bracket-slot-97-b")).toContainText(/marrocos/i);

    // SF #101 is fed by QF #97 (França 2×0 Marrocos) and #98 (Espanha 2×1 Bélgica) — both
    // finished in the seed, so the feeder chain resolves #101's slots to França × Espanha.
    const sf101 = page.locator("#bracket-match-101");
    await expect(sf101.locator("#bracket-slot-101-a")).toContainText(/fran[çc]a/i);
    await expect(sf101.locator("#bracket-slot-101-b")).toContainText(/espanha/i);

    // The 3rd-place match (#103, TP) is fed by the two semifinal losers. Both semis finished
    // (SF #101 França lost, SF #102 Inglaterra lost), so both slots resolve: França × Inglaterra.
    const thirdPlace = page.locator("#bracket-stage-tp #bracket-match-103");
    await expect(thirdPlace).toBeVisible();
    await expect(thirdPlace.locator("#bracket-slot-103-a")).toContainText(/fran[çc]a/i);
    await expect(thirdPlace.locator("#bracket-slot-103-b")).toContainText(/inglaterra/i);
    await expect(thirdPlace).toContainText("Miami");

    // The final (#104) in New Jersey, with the localized Brasília kickoff (19:00Z → 16:00).
    // Both semis finished (SF #101 Espanha won, SF #102 Argentina won), so both slots resolve:
    // Espanha × Argentina.
    const final = page.locator("#bracket-stage-f #bracket-match-104");
    await expect(final).toContainText("New Jersey");
    await expect(final).toContainText("16:00");
    await expect(final.locator("#bracket-slot-104-a")).toContainText(/espanha/i);
    await expect(final.locator("#bracket-slot-104-b")).toContainText(/argentina/i);
  });

  test("clicking a resolved bracket slot opens the team page", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-chaveamento");
    await expect(page.locator("#bracket-view")).toBeVisible();

    // A confirmed team slot (Canadá in R32 #73) is a clickable button…
    const canadaSlot = page.locator("#bracket-slot-73-b");
    await expect(canadaSlot).toContainText(/canad/i);
    expect(await canadaSlot.evaluate((el) => el.tagName)).toBe("BUTTON");
    // …and with both semifinals now played the bracket is fully drawn — no undecided winner/
    // loser-ref labels remain, so even the Final's slots name real teams (e.g. #104 slot B
    // resolves to Argentina, the SF #102 winner).
    await expect(page.locator("#bracket-slot-104-b")).toContainText(/argentina/i);

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
    // Stub the live overlay empty so the bracket resolves only from the static seed
    // (group standings + KNOCKOUT_RESULTS). All four Quarterfinals are finished, so SF
    // #101's slots resolve to real teams (França × Espanha) — each a clickable team link.
    // To exercise the card-level two-stage tap we therefore tap the card HEADER (the #NN /
    // date / venue row above the slots), so the tap targets the card itself, not a team.
    await stubLiveApis(page);
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
  });

  test("first tap previews the quartas feeders, second tap opens the match", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-chaveamento");
    await expect(page.locator("#bracket-view")).toBeVisible();

    const semi = page.locator("#bracket-stage-sf #bracket-match-101");
    const feederA = page.locator("#bracket-stage-qf #bracket-match-97");
    const feederB = page.locator("#bracket-stage-qf #bracket-match-98");
    const unrelated = page.locator("#bracket-stage-qf #bracket-match-99");
    // Tap the card header (above the resolved team links) so the tap targets the card itself.
    const header = { position: { x: 24, y: 8 } };

    // First tap spotlights the feeders WITHOUT leaving the bracket.
    await semi.tap(header);
    await expect(feederA).toHaveAttribute("data-feeder-highlight", "feeder");
    await expect(feederB).toHaveAttribute("data-feeder-highlight", "feeder");
    await expect(unrelated).toHaveAttribute("data-feeder-highlight", "hidden");
    await expect(page.locator("#bracket-view")).toBeVisible();

    // Second tap on the same card opens its match page.
    await semi.tap(header);
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
    // Stub the live overlay empty so the bracket resolves only from the static seed
    // (group standings + KNOCKOUT_RESULTS). All four Quarterfinals are finished, so SF
    // #101's slots resolve to real teams (França × Espanha) — each a clickable team link.
    // We select SF #101 by tapping its card HEADER (the #NN / date / venue row above the
    // slots), so the tap targets the card itself, not a team link.
    await stubLiveApis(page);
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
  });

  test("selecting a Semifinal tie hides its siblings and the unrelated Quartas cards", async ({ page }) => {
    await page.goto("/");
    await page.click("#btn-nav-chaveamento");
    await expect(page.locator("#bracket-view")).toBeVisible();

    const selected = page.locator("#bracket-stage-sf #bracket-match-101");
    const sibling = page.locator("#bracket-stage-sf #bracket-match-102"); // the other Semifinal tie
    const feederA = page.locator("#bracket-stage-qf #bracket-match-97");
    const feederB = page.locator("#bracket-stage-qf #bracket-match-98");
    const unrelated = page.locator("#bracket-stage-qf #bracket-match-99");
    // The visible (mobile) count in each column's subheading.
    const sfCount = page.locator("#bracket-stage-sf-summary span:visible");
    const qfCount = page.locator("#bracket-stage-qf-summary span:visible");
    // Tap the card header (above the resolved team links) so the tap targets the card itself.
    const header = { position: { x: 24, y: 8 } };

    // Idle: the whole column is visible, full tally shown.
    await expect(sibling).toBeVisible();
    await expect(unrelated).toBeVisible();
    await expect(sfCount).toHaveText("2 confrontos");
    await expect(qfCount).toHaveText("4 confrontos");

    // First tap collapses everything but the selected tie and its two feeders.
    await selected.tap(header);
    await expect(selected).toBeVisible();
    await expect(feederA).toBeVisible();
    await expect(feederB).toBeVisible();
    await expect(sibling).toBeHidden(); // display:none — out of the flow
    await expect(unrelated).toBeHidden();
    // …and the subheadings follow the collapse: just the tie, just its two feeders.
    await expect(sfCount).toHaveText("1 confronto");
    await expect(qfCount).toHaveText("2 confrontos");

    // Second tap on the selected card still opens its match page.
    await selected.tap(header);
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

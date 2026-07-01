import { test, expect } from "@playwright/test";

// The tip walkthroughs rotate one per session (TIP_TOURS order:
// 0 full-bracket, 1 messi-card, 2 team-lineup, 3 best-thirds, 4 bracket,
// 5 group-history, 6 bracket-feeder). Pinning `tip-tour-rotation` makes which
// one plays deterministic for tests.

test.describe("Tip tour rotation (one guided walkthrough per session)", () => {
  test("plays the rotated tip — index 2 walks Seleções → team card → lineup", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("feature-tour-seen", "1");
      localStorage.setItem("agora-session-count", "1"); // → becomes 2 on this load
      localStorage.setItem("tip-tour-rotation", "2"); // pin to the team-lineup tip
    });
    await page.goto("/");
    await page.click("#btn-consent-accept").catch(() => {});

    const pop = page.locator(".driver-popover");
    await expect(pop).toBeVisible({ timeout: 6000 });
    await expect(pop).toContainText("elenco"); // step 1 — Seleções tab

    await page.click(".driver-popover-next-btn"); // navigates to Seleções, highlights a team card
    await expect(page.locator("#teams-view")).toBeVisible();
    await expect(pop).toContainText("bandeira", { timeout: 6000 });

    await page.click(".driver-popover-next-btn"); // opens the team's lineup page
    await expect(page.locator("#team-lineup-view")).toBeVisible({ timeout: 6000 });
    await expect(pop).toContainText("Elenco completo");

    // The rotation pointer advanced to the next tip for the following session.
    expect(await page.evaluate(() => localStorage.getItem("tip-tour-rotation"))).toBe("3");
  });

  test("best-thirds tip walks Grupos → scroll → 'Melhores 3º colocados', then locks the session", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("feature-tour-seen", "1");
      localStorage.setItem("agora-session-count", "1"); // → becomes 2 on this load
      localStorage.setItem("tip-tour-rotation", "3"); // pin to the best-thirds tip
    });
    await page.goto("/");
    await page.click("#btn-consent-accept").catch(() => {});

    const pop = page.locator(".driver-popover");
    await expect(pop).toBeVisible({ timeout: 6000 });
    await expect(pop).toContainText("terceiros"); // step 1 — Grupos tab

    await page.click(".driver-popover-next-btn"); // navigates to Grupos, points at the page
    await expect(page.locator("#standings-grid")).toBeVisible();
    await expect(pop).toContainText("Role até o fim", { timeout: 6000 });

    await page.click(".driver-popover-next-btn"); // scrolls to and highlights the thirds table
    await expect(page.locator("#third-place-ranking")).toBeVisible({ timeout: 6000 });
    await expect(pop).toContainText("Melhores 3º colocados");

    // The per-session guard (sessionStorage) is set, so a re-render/remount this
    // session takes the early-return path and never plays a second tip.
    expect(await page.evaluate(() => sessionStorage.getItem("tip-tour-shown"))).toBe("1");
    // …and the rotation pointer advanced to the next tip for the following session.
    expect(await page.evaluate(() => localStorage.getItem("tip-tour-rotation"))).toBe("4");
  });

  test("group-history tip walks Grupos and opens a group's 'Histórico de jogos'", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("feature-tour-seen", "1");
      localStorage.setItem("agora-session-count", "1"); // → becomes 2 on this load
      localStorage.setItem("tip-tour-rotation", "5"); // pin to the group-history tip
    });
    await page.goto("/");
    await page.click("#btn-consent-accept").catch(() => {});

    const pop = page.locator(".driver-popover");
    await expect(pop).toBeVisible({ timeout: 6000 });
    await expect(pop).toContainText("Todos os jogos"); // step 1 — Grupos tab

    await page.click(".driver-popover-next-btn"); // navigates to Grupos, points at the history
    await expect(page.locator("#standings-view")).toBeVisible();
    await expect(pop).toContainText("Histórico de jogos", { timeout: 6000 });

    await page.click(".driver-popover-next-btn"); // opens the history details
    await expect(pop).toContainText("Resultados", { timeout: 6000 });
    const opened = await page.evaluate(
      () => (document.getElementById("standings-group-history-grupo-a") as HTMLDetailsElement | null)?.open,
    );
    expect(opened).toBe(true);
  });

  test("bracket-feeder tip walks Mata-mata and spotlights an Oitavas tie's 16-avos feeders", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("feature-tour-seen", "1");
      localStorage.setItem("agora-session-count", "1"); // → becomes 2 on this load
      localStorage.setItem("tip-tour-rotation", "6"); // pin to the bracket-feeder tip
    });
    await page.goto("/");
    await page.click("#btn-consent-accept").catch(() => {});

    const pop = page.locator(".driver-popover");
    await expect(pop).toBeVisible({ timeout: 6000 });
    await expect(pop).toContainText("adversário"); // step 1 — Mata-mata tab

    await page.click(".driver-popover-next-btn"); // navigates to Chaveamento, points at an Oitavas tie
    await expect(page.locator("#bracket-stage-grid")).toBeVisible();
    await expect(pop).toContainText("Oitavas", { timeout: 6000 });

    // No feeder is spotlighted yet — the hover happens on the next "Próximo".
    await expect(page.locator('#bracket-stage-r32 [data-feeder-highlight="feeder"]')).toHaveCount(0);

    await page.click(".driver-popover-next-btn"); // hovers the tie → its two 16-avos feeders light up
    await expect(page.locator('#bracket-stage-r32 [data-feeder-highlight="feeder"]').first()).toBeVisible({
      timeout: 6000,
    });
    await expect(pop).toContainText("16 avos");

    // Closing the tour clears the spotlight it set (onDestroyed → clearTieSpotlight).
    await page.keyboard.press("Escape");
    await expect(page.locator('#bracket-stage-r32 [data-feeder-highlight="feeder"]')).toHaveCount(0, {
      timeout: 6000,
    });

    // The rotation pointer wrapped back to the first tip (full-bracket) for the following session.
    expect(await page.evaluate(() => localStorage.getItem("tip-tour-rotation"))).toBe("0");
  });

  test("full-bracket tip walks Mata-mata → toggles 'Chave completa' → the poster bracket", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("feature-tour-seen", "1");
      localStorage.setItem("agora-session-count", "1"); // → becomes 2 on this load
      localStorage.setItem("tip-tour-rotation", "0"); // pin to the full-bracket tip
    });
    await page.goto("/");
    await page.click("#btn-consent-accept").catch(() => {});

    const pop = page.locator(".driver-popover");
    await expect(pop).toBeVisible({ timeout: 6000 });
    await expect(pop).toContainText("chave"); // step 1 — Mata-mata tab

    await page.click(".driver-popover-next-btn"); // navigates to Chaveamento, highlights the toggle
    await expect(page.locator("#bracket-view-toggle")).toBeVisible({ timeout: 6000 });
    await expect(pop).toContainText("Chave completa");

    await page.click(".driver-popover-next-btn"); // flips the toggle → the full bracket renders
    await expect(page.locator("#bracket-full")).toBeVisible({ timeout: 6000 });
    await expect(pop).toContainText("taça no centro");

    // The rotation pointer advanced to the next tip (messi-card) for the following session.
    expect(await page.evaluate(() => localStorage.getItem("tip-tour-rotation"))).toBe("1");
  });

  test("stays dormant on the very first session", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("feature-tour-seen", "1"); // suppress the general tour
      // no session-count seed → this load is session 1
      localStorage.setItem("tip-tour-rotation", "1");
    });
    await page.goto("/");
    await page.click("#btn-consent-accept").catch(() => {});
    await page.waitForTimeout(1300);
    await expect(page.locator(".driver-popover")).toHaveCount(0);
  });
});

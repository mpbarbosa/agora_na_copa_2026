import { test, expect } from "@playwright/test";

import { AFFILIATE_PRODUCTS, AMAZON_ASSOCIATES_TAG } from "../../src/config";
import { stubLiveApis } from "./fixtures/aoVivo";

test.describe("Affiliate products strip (Ao Vivo)", () => {
  // No live games → Ao Vivo stays on the focus detail (broadcast tab + strip),
  // not the "Os dois" overview that would unmount them.
  test.beforeEach(async ({ page }) => {
    await stubLiveApis(page);
  });

  test("renders the Amazon gear strip on the broadcast tab with compliant links", async ({ page }) => {
    await page.goto("/");

    const strip = page.locator("#affiliate-products");
    await expect(strip).toBeVisible();
    await expect(strip).toContainText("Equipe para assistir");
    // Amazon Associates requires a visible affiliate disclosure.
    await expect(strip).toContainText("Como Associado da Amazon");

    const links = strip.locator("a");
    await expect(links).toHaveCount(AFFILIATE_PRODUCTS.length);

    // Every link must be tagged with our Associates id, point to Amazon BR, open
    // in a new tab, and carry rel="sponsored" (Google's affiliate-link guidance).
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      await expect(link).toHaveAttribute(
        "href",
        new RegExp(`amazon\\.com\\.br.*tag=${AMAZON_ASSOCIATES_TAG}`),
      );
      await expect(link).toHaveAttribute("rel", /sponsored/);
      await expect(link).toHaveAttribute("target", "_blank");
    }
  });

  test("strip is gated to the 'Onde Assistir' tab (hidden on Escalação)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#affiliate-products")).toBeVisible();

    await page.click("#btn-tab-lineup");
    await expect(page.locator("#affiliate-products")).toBeHidden();

    await page.click("#btn-tab-broadcast");
    await expect(page.locator("#affiliate-products")).toBeVisible();
  });
});

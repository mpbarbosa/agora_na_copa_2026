import { test, expect } from "@playwright/test";

const PIX_KEY = "4a1248a0-93de-4f65-8e17-cf5ac4a147a9";

test.describe("Pix donation block", () => {
  test("Fan Zone shows the full donation card with a QR and a working Pix Copia e Cola", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await page.click("#btn-consent-accept").catch(() => {});
    await page.click("#btn-nav-fanzone");

    const card = page.getByTestId("donation-pix-full");
    await expect(card).toBeVisible();
    await expect(card).toContainText("Apoie o Agora na Copa 26");
    await expect(card.getByTestId("donation-pix-qr").locator("svg")).toBeVisible();

    // Copy the BR Code → button confirms and the clipboard holds a valid EMV payload.
    await card.getByTestId("donation-pix-copy-brcode").click();
    await expect(card.getByTestId("donation-pix-copy-brcode")).toContainText("copiado");
    const brCode = await page.evaluate(() => navigator.clipboard.readText());
    expect(brCode.startsWith("000201")).toBe(true);
    expect(brCode).toContain("br.gov.bcb.pix");
    expect(brCode).toContain(PIX_KEY);
  });

  test("footer shows a compact Pix line and copies the key", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await page.click("#btn-consent-accept").catch(() => {});

    const compact = page.getByTestId("donation-pix-compact");
    await expect(compact).toBeVisible();
    await expect(compact.getByTestId("donation-pix-key")).toHaveText(PIX_KEY);

    await compact.getByTestId("donation-pix-copy-key").click();
    await expect(compact.getByTestId("donation-pix-copy-key")).toContainText("Copiado");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(PIX_KEY);
  });
});

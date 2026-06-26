import { test, expect } from "@playwright/test";
import { stubLiveApis } from "./fixtures/aoVivo";

// Live-match chat ("Resenha ao vivo") on the Ao Vivo view. The panel's open/closed
// state and message list come from GET /api/chat/:matchId, so we route-mock that feed to
// drive both states deterministically (independent of whether a real match is live).
// A final test hits the real server to confirm the unknown-match boundary (404).
test.describe("Live match chat (Ao Vivo)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("feature-tour-seen", "1"));
    // No live games → Ao Vivo stays on the focus detail, so the chat panel is
    // mounted. The panel's open/closed state is driven by the /api/chat mock
    // below, not by a match being live, so this stays deterministic.
    await stubLiveApis(page);
  });

  test("shows the closed-state resenha panel when the match is not live", async ({ page }) => {
    await page.route("**/api/chat/**", async (route) => {
      await route.fulfill({
        json: { open: false, messages: [], updatedAt: new Date().toISOString() },
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.click("#btn-consent-accept").catch(() => {});

    const panel = page.getByTestId("match-chat-panel");
    await expect(panel).toBeVisible({ timeout: 10000 });
    await expect(panel).toContainText(/resenha ao vivo/i);
    await expect(panel).toContainText(/anônimo/i);
    // Closed: the compose box is replaced by the "opens at kickoff" note.
    await expect(page.getByTestId("match-chat-closed")).toBeVisible();
    await expect(page.getByTestId("match-chat-input")).toHaveCount(0);
  });

  test("lets a fan post with an anonymous apelido while the match is live", async ({ page }) => {
    let postedBody: { id?: string; nickname?: string; text?: string } | null = null;

    await page.route("**/api/chat/**", async (route) => {
      const request = route.request();
      const now = new Date().toISOString();
      if (request.method() === "POST") {
        postedBody = request.postDataJSON();
        await route.fulfill({
          json: { message: { id: 2, nickname: postedBody?.nickname, text: postedBody?.text, at: Date.now() } },
        });
        return;
      }
      // GET: honor the `since` cursor so polls don't re-deliver seen messages.
      const since = Number(new URL(request.url()).searchParams.get("since") ?? "0");
      const seed = [{ id: 1, nickname: "Locutor", text: "Bola rolando!", at: Date.now() }];
      await route.fulfill({
        json: { open: true, messages: seed.filter((m) => m.id > since), updatedAt: now },
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.click("#btn-consent-accept").catch(() => {});

    const panel = page.getByTestId("match-chat-panel");
    await expect(panel).toBeVisible({ timeout: 10000 });
    // The seeded message arrives from the first poll.
    await expect(panel).toContainText("Locutor");
    await expect(panel).toContainText("Bola rolando!");

    await page.getByTestId("match-chat-nickname").fill("Torcedor12");
    await page.getByTestId("match-chat-input").fill("Que jogão!");
    await page.getByTestId("match-chat-send").click();

    // Our own message is appended immediately and the input clears.
    await expect(panel).toContainText("Torcedor12");
    await expect(panel).toContainText("Que jogão!");
    await expect(page.getByTestId("match-chat-input")).toHaveValue("");

    // The post carried the apelido, text, and the per-browser client id.
    expect(postedBody).toMatchObject({ nickname: "Torcedor12", text: "Que jogão!" });
    expect(typeof postedBody?.id).toBe("string");
  });

  test("the chat API rejects an unknown match id", async ({ request }) => {
    const res = await request.get("/api/chat/nao-existe-9999");
    expect(res.status()).toBe(404);
  });
});

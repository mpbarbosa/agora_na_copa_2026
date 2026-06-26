import { test, expect } from "@playwright/test";

// Endpoint contract for the Monte-Carlo qualification simulator. It is locally
// simulated (no network), so these hold offline. The exact probabilities depend on
// live standings, so the assertions check the shape and invariants, not values.
test.describe("/api/qualification-odds endpoint", () => {
  test("returns the simulated resilience shape for a valid team", async ({ request }) => {
    const res = await request.get("/api/qualification-odds/BRA");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();

    expect(body.source).toBe("simulated");
    expect(body.simulated).toBe(true);
    expect(typeof body.note).toBe("string");
    expect(typeof body.updatedAt).toBe("string");
    expect(body.team).toMatchObject({ code: "BRA" });
    expect(typeof body.team.name).toBe("string");
    expect(typeof body.team.group).toBe("string");

    const { odds } = body;
    for (const key of ["advance", "asTop2", "asBestThird", "eliminated"] as const) {
      expect(odds[key]).toBeGreaterThanOrEqual(0);
      expect(odds[key]).toBeLessThanOrEqual(1);
    }
    // advance == top2 + bestThird, and advance + eliminated == 1.
    expect(Math.abs(odds.advance - (odds.asTop2 + odds.asBestThird))).toBeLessThan(1e-9);
    expect(Math.abs(odds.advance + odds.eliminated - 1)).toBeLessThan(1e-9);
    // finishPosition is four probabilities summing to 1.
    expect(odds.finishPosition).toHaveLength(4);
    const posSum = odds.finishPosition.reduce((a: number, b: number) => a + b, 0);
    expect(Math.abs(posSum - 1)).toBeLessThan(1e-9);
    expect(typeof odds.deterministic).toBe("boolean");
  });

  test("resolves a team by name as well as code", async ({ request }) => {
    const res = await request.get("/api/qualification-odds/Brasil");
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).team.code).toBe("BRA");
  });

  test("clamps the iterations query to the allowed range", async ({ request }) => {
    // Once the group stage is over there is nothing to simulate, so the endpoint
    // settles in a single pass (iterations: 1) regardless of the query — assert
    // against the clamp only while there are still fixtures to play.
    const low = await (await request.get("/api/qualification-odds/BRA?iterations=1")).json();
    expect(low.iterations).toBe(low.odds.deterministic ? 1 : 200);
    const high = await (await request.get("/api/qualification-odds/BRA?iterations=999999")).json();
    expect(high.iterations).toBe(high.odds.deterministic ? 1 : 20000);
  });

  test("returns 404 for a team that is not competing", async ({ request }) => {
    const res = await request.get("/api/qualification-odds/ZZZ");
    expect(res.status()).toBe(404);
  });
});

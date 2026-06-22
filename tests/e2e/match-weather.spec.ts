import { test, expect } from "@playwright/test";

// The chip itself only renders for a LIVE match with reachable Open-Meteo, so
// these tests assert the endpoint contract (resilience shape + validation),
// which holds even offline (it degrades to the fallback shape).
test.describe("/api/match-weather endpoint", () => {
  test("returns the resilience shape for valid venue coordinates", async ({ request }) => {
    const res = await request.get("/api/match-weather?lat=40.8135&lng=-74.0745");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(["open-meteo", "fallback"]).toContain(body.source);
    expect(typeof body.note).toBe("string");
    expect(typeof body.updatedAt).toBe("string");
    expect(body).toHaveProperty("weather"); // a snapshot object or null
  });

  test("rejects invalid coordinates with 400 + fallback", async ({ request }) => {
    const res = await request.get("/api/match-weather?lat=abc&lng=200");
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.source).toBe("fallback");
    expect(body.weather).toBeNull();
  });
});

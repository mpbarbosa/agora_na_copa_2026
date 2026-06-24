import { defineConfig } from "@playwright/test";

const port = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    headless: true,
    trace: "on-first-retry",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium-browser",
    },
  },
  webServer: {
    command: "npm run dev",
    url: `http://127.0.0.1:${port}`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      PORT: String(port),
      STRICT_PORT: "true",
      // Don't hit the volatile live FIFA API from the test server. Background FIFA
      // sync is disabled, and the FIFA-derived endpoints are served from the
      // production API instead, so e2e gets real, complete data without flakiness.
      // Tests that need a specific live state stub the endpoint themselves.
      DISABLE_FIFA_SYNC: "true",
      FIFA_FALLBACK_API_BASE: "http://copa2026.mpbarbosa.com",
    },
  },
});

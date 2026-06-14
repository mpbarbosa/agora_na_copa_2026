import { defineConfig } from "@playwright/test";

// Runs the same e2e specs against an already-running production preview
// server (started by scripts/deploy-preflight.sh), so no webServer is
// spawned here.
const port = Number(process.env.PREFLIGHT_PREVIEW_PORT || 9011);

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
});

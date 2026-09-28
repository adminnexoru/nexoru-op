import { defineConfig, devices } from "@playwright/test";
import { assertTestEnv } from "./scripts/env-guard";

// Locally, read the same variables the app uses. In CI they come from the workflow environment.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local (CI): nothing to load.
}

// The E2E suite cleans data: it may only run against the test Supabase instance (FR-034).
assertTestEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);

export default defineConfig({
  testDir: "./tests/e2e",
  // Tests share the local Supabase database, so they run one at a time.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});

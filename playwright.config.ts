import { execFileSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";
import { assertTestEnv, assertTestGithubToken, assertTestProjectsRoot } from "./scripts/env-guard";
import { E2E_GITHUB_TOKEN, FAKE_GITHUB_ORIGIN } from "./tests/e2e/helpers/github";

// Locally, read the same variables the app uses. In CI they come from the workflow environment.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local (CI): nothing to load.
}

// The E2E suite cleans data: it may only run against the test Supabase instance (FR-034).
assertTestEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
// Never a real GitHub token in tests (specs/004-github-readonly research R7).
assertTestGithubToken(process.env.GITHUB_TOKEN);

// The app reads a fictitious portfolio built in a temporary folder (FR-028). The config is also
// loaded by every worker: they inherit PROJECTS_ROOT and do not build it again.
if (!process.env.PROJECTS_ROOT) {
  process.env.PROJECTS_ROOT = execFileSync("npx", ["tsx", "tests/fixtures/build-portfolio.ts"], { encoding: "utf8" });
}
assertTestProjectsRoot(process.env.PROJECTS_ROOT);


export default defineConfig({
  testDir: "./tests/e2e",
  globalTeardown: "./tests/e2e/global-teardown.ts",
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
  webServer: [
    // Fake GitHub on 127.0.0.1 (specs/004-github-readonly research R7): the app never reaches the
    // real one in tests, and a fictitious token proves it never leaks.
    {
      command: "npx tsx tests/e2e/fake-github.ts",
      url: `${FAKE_GITHUB_ORIGIN}/__health`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "npm run build && npm run start",
      url: "http://127.0.0.1:3000",
      // Never reuse a running server: it could be reading another PROJECTS_ROOT.
      reuseExistingServer: false,
      env: { PROJECTS_ROOT: process.env.PROJECTS_ROOT, GITHUB_API_ORIGIN: FAKE_GITHUB_ORIGIN, GITHUB_TOKEN: E2E_GITHUB_TOKEN },
      timeout: 240_000,
    },
  ],
});

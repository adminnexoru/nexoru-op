import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // server-only throws outside a React Server environment; unit tests run in plain Node.
      "server-only": fileURLToPath(new URL("./tests/unit/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    // Builds the fictitious portfolio in a temporary folder (tests/fixtures/build-portfolio.ts).
    globalSetup: ["tests/unit/global-setup.ts"],
    // Any request to the real GitHub fails the test (specs/004-github-readonly research R7).
    setupFiles: ["tests/unit/setup/block-github.ts"],
  },
});

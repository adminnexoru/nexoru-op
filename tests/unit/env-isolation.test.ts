// T067: no test script or test file can point at the use environment (SC-012, research R13).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const USE_ENV_MARKERS = /5532[1-9]|\bops\/|--workdir[ =]ops|\.env\.op\.local/;
const root = join(__dirname, "..", "..");
const scripts: Record<string, string> = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts;

// These two files test the guards themselves, so they must name the use environment.
const ALLOWED = new Set(["tests/unit/env-guard.test.ts", "tests/unit/env-isolation.test.ts"]);

function filesUnder(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const path = join(dir, name);
    return statSync(join(root, path)).isDirectory() ? filesUnder(path) : [path];
  });
}

describe("test environment isolation", () => {
  it("test scripts never mention the use environment", () => {
    const testScripts = Object.entries(scripts).filter(([name]) => !name.startsWith("op:"));
    expect(testScripts.length).toBeGreaterThan(0);
    for (const [name, command] of testScripts) {
      expect(command, `script "${name}"`).not.toMatch(USE_ENV_MARKERS);
    }
  });

  it("test configuration and test files never mention the use environment", () => {
    const files = ["playwright.config.ts", "vitest.config.ts", ...filesUnder("tests")].filter((f) => !ALLOWED.has(f));
    for (const file of files) {
      expect(readFileSync(join(root, file), "utf8"), file).not.toMatch(USE_ENV_MARKERS);
    }
  });

  it("every op:* script targets the use environment", () => {
    const opScripts = Object.entries(scripts).filter(([name]) => name.startsWith("op:"));
    expect(opScripts.map(([name]) => name)).toEqual(
      expect.arrayContaining(["op:start", "op:stop", "op:bootstrap-owner", "op:fingerprint"]),
    );
    for (const [name, command] of opScripts) {
      expect(command, `script "${name}"`).toMatch(/\.env\.op\.local|scripts\/op-/);
    }
  });
});

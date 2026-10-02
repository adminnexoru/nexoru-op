// T029: reading the whole fictitious portfolio (US1, FR-001, FR-006, FR-008, FR-030, SC-006–SC-008).
// Each test that needs a stable or modified portfolio builds its own copy.
import { createHash } from "node:crypto";
import { cp, mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readPortfolio } from "@/lib/portfolio/read-portfolio";
import type { PortfolioReading, ProjectReading } from "@/lib/portfolio/types";
import { buildFixturePortfolio, removeFixturePortfolio } from "../../fixtures/build-portfolio";

let root: string;
let reading: PortfolioReading;
const project = (folder: string): ProjectReading => {
  const found = reading.projects.find((p) => p.folder === folder);
  if (!found) throw new Error(`${folder} not in the reading`);
  return found;
};

beforeAll(async () => {
  ({ root } = await buildFixturePortfolio());
  reading = await readPortfolio(root);
});

afterAll(() => removeFixturePortfolio(root));

describe("portfolio", () => {
  it("has one reading per non-hidden folder, without nexoru-governance, sorted", () => {
    const folders = reading.projects.map((p) => p.folder);
    expect(folders).not.toContain("nexoru-governance");
    expect(folders).toContain("level3-demo");
    // 18 projects of phase 2 + 6 of phase 3 (ignored-copy is listed until US5 honors .nexoruignore).
    expect(folders).toHaveLength(24);
    expect([...folders].sort()).toEqual(folders);
    expect(reading.root).toEqual({ status: "ok" });
    expect(reading.supportedStandardVersions).toEqual(["1.0"]);
  });

  it("shows nexoru-governance apart as the standard", () => {
    expect(reading.standard).toEqual({ folder: "nexoru-governance", found: true, version: "1.0", newerThanSupported: false });
  });

  it("warns about duplicate ids", () => {
    expect(reading.warnings).toEqual([{ code: "duplicate_id", detail: "`duplicate-id` aparece en duplicate-id-a, duplicate-id-b" }]);
  });
});

describe("expected results of the fixture (tests/fixtures/portfolio/README.md)", () => {
  it.each([
    ["level3-demo", 3, true, []],
    ["no-manifest", 0, false, ["1.1"]],
    ["bad-yaml", 0, false, ["1.2"]],
    ["confirmar", 0, false, ["1.11"]],
    ["map-state-column", 1, false, ["2.6"]],
    ["spec-no-tasks", 3, true, []],
    ["roadmap-states", 2, false, ["3.6"]],
    ["duplicate-id-a", 3, true, []],
    ["no-git", 0, false, ["1.7"]],
    ["no-origin", 0, false, ["1.7"]],
    ["feature-branch", 3, true, []],
    ["env-versioned", 3, true, []],
    ["symlink-escape", 0, false, ["1.1"]],
    ["secret-link", 1, false, ["2.7"]],
    ["fifo-and-large", 1, false, ["2.1"]],
  ] as const)("%s → level %i", (folder, level, provisional, failures) => {
    const { conformance } = project(folder);
    expect(conformance.level).toBe(level);
    expect(conformance.provisional).toBe(provisional);
    expect(conformance.failures.map((c) => c.id)).toEqual(failures);
  });

  it("keeps the manifest of a valid project and none for a project without PROJECT.md", () => {
    expect(project("level3-demo").manifest).toMatchObject({ id: "level3-demo", siguiente_hito: "Fase 2, reportes ficticios" });
    expect(project("no-manifest")).toMatchObject({ manifest: null, manifestProblem: { reason: "missing" }, roadmap: null });
    expect(project("bad-yaml")).toMatchObject({ manifest: null, manifestProblem: { reason: "invalid_yaml" } });
  });

  it("reports branch, main branch and uncommitted changes", () => {
    expect(project("feature-branch").git).toMatchObject({ branch: "feature/x", onMainBranch: false, hasUncommittedChanges: true });
    expect(project("level3-demo").git).toMatchObject({ branch: "main", onMainBranch: true, hasUncommittedChanges: false });
    expect(project("no-git").git.isRepo).toBe(false);
  });

  it("lists read errors with relative paths and reasons, without contents", () => {
    expect(project("symlink-escape").readErrors).toEqual([{ path: "PROJECT.md", reason: "outside_root", detail: null }]);
    expect(project("secret-link").readErrors).toEqual([{ path: "CLAUDE.md", reason: "secret_file", detail: null }]);
    expect(project("fifo-and-large").readErrors).toEqual([
      { path: "docs/mapa-funcional.md", reason: "too_large", detail: null },
      { path: "specs/001-demo/tasks.md", reason: "not_regular_file", detail: null },
    ]);
    expect(project("level3-demo").readErrors).toEqual([]);
    expect(JSON.stringify(reading)).not.toContain("TEXTO-DE-ENV-FICTICIO");
    expect(JSON.stringify(reading)).not.toContain("TEXTO-DE-SPEC-FICTICIO");
  });

  it("reports the versioned .env as a critical finding", () => {
    expect(project("env-versioned").conformance.findings.find((f) => f.code === "env_versioned")).toMatchObject({
      status: "found",
      detail: ".env",
    });
  });
});

describe("PROJECTS_ROOT problems", () => {
  it.each([
    [undefined, "missing"],
    ["relative/path", "not_absolute"],
    ["/nonexistent/nexoru-op-root", "not_directory"],
  ] as const)("%s → %s, with no projects", async (value, status) => {
    const result = await readPortfolio(value);
    expect(result.root.status).toBe(status);
    expect(result.projects).toEqual([]);
    expect(result.standard.found).toBe(false);
  });
});

async function fingerprint(dir: string): Promise<string> {
  const hash = createHash("sha256");
  const walk = async (path: string): Promise<void> => {
    for (const entry of (await readdir(path, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = join(path, entry.name);
      const info = await stat(full).catch(() => null);
      hash.update(`${full}:${info?.mtimeMs ?? "x"}:${info?.size ?? "x"}\n`);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && info) hash.update(await readFile(full));
    }
  };
  await walk(dir);
  return hash.digest("hex");
}

describe("read-only and regenerable", () => {
  it("does not change any file of the portfolio, including .git (SC-007)", async () => {
    const { root: copy } = await buildFixturePortfolio();
    try {
      const before = await fingerprint(copy);
      await readPortfolio(copy);
      expect(await fingerprint(copy)).toBe(before);
    } finally {
      await removeFixturePortfolio(copy);
    }
  });

  it("gives the same result when read again, except readAt (SC-008)", async () => {
    const again = await readPortfolio(root);
    expect({ ...again, readAt: null }).toEqual({ ...reading, readAt: null });
  });

  it("drops a folder deleted between two readings", async () => {
    const { root: copy } = await buildFixturePortfolio();
    try {
      expect((await readPortfolio(copy)).projects.some((p) => p.folder === "confirmar")).toBe(true);
      await rm(join(copy, "confirmar"), { recursive: true });
      expect((await readPortfolio(copy)).projects.some((p) => p.folder === "confirmar")).toBe(false);
    } finally {
      await removeFixturePortfolio(copy);
    }
  });
});

describe("performance (SC-006)", () => {
  it("reads 50 projects in less than 10 seconds", { timeout: 60_000 }, async () => {
    const big = await mkdtemp(join(tmpdir(), "nexoru-op-fixture-perf-"));
    try {
      for (let i = 0; i < 50; i++) await cp(join(root, "level3-demo"), join(big, `demo-${String(i).padStart(2, "0")}`), { recursive: true });
      const started = performance.now();
      const result = await readPortfolio(big);
      const elapsed = performance.now() - started;
      expect(result.projects).toHaveLength(50);
      expect(elapsed).toBeLessThan(10_000);
    } finally {
      await rm(big, { recursive: true, force: true });
    }
  });
});

// T046: the standard found in nexoru-governance (FR-027).
describe("standard version found in nexoru-governance", () => {
  it("flags a CHANGELOG newer than the supported versions", async () => {
    const { root: copy } = await buildFixturePortfolio({ standardVersion: "1.1.0" });
    try {
      expect((await readPortfolio(copy)).standard).toEqual({
        folder: "nexoru-governance",
        found: true,
        version: "1.1",
        newerThanSupported: true,
      });
    } finally {
      await removeFixturePortfolio(copy);
    }
  });

  it("reports when nexoru-governance is not in the portfolio, and still evaluates with 1.0", async () => {
    const { root: copy } = await buildFixturePortfolio({ withoutStandard: true });
    try {
      const result = await readPortfolio(copy);
      expect(result.standard.found).toBe(false);
      expect(result.projects.find((p) => p.folder === "level3-demo")?.conformance).toMatchObject({ standardVersion: "1.0", level: 3 });
    } finally {
      await removeFixturePortfolio(copy);
    }
  });

  it("does not evaluate the fictitious projects with an unsupported version or without one", () => {
    expect(project("unsupported-version").conformance).toMatchObject({ evaluation: "unsupported_version", level: null });
    expect(project("no-version").conformance).toMatchObject({ evaluation: "no_version", level: null });
  });
});

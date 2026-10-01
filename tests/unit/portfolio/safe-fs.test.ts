// T007: the safe reader is the only door to the portfolio on disk (constitution XIII, SC-005,
// contracts/reader.md). Runs against its own copy of the fictitious portfolio because some cases
// write files into it.
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildFixturePortfolio, removeFixturePortfolio } from "../../fixtures/build-portfolio";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    open: vi.fn(actual.open),
    lstat: vi.fn(actual.lstat),
    realpath: vi.fn(actual.realpath),
    readdir: vi.fn(actual.readdir),
    stat: vi.fn(actual.stat),
  };
});

const fsp = await import("node:fs/promises");
const { CatalogError, MAX_FILE_BYTES, openRoot } = await import("@/lib/portfolio/safe-fs");
type SafeRoot = Extract<Awaited<ReturnType<typeof openRoot>>, { status: "ok" }>["root"];

let rootPath: string;
let root: SafeRoot;

beforeAll(async () => {
  rootPath = await buildFixturePortfolio();
  const opened = await openRoot(rootPath);
  if (opened.status !== "ok") throw new Error(`fixture root not usable: ${opened.status}`);
  root = opened.root;
});

afterAll(() => removeFixturePortfolio(rootPath));

beforeEach(() => vi.clearAllMocks());

function diskCalls(): number {
  return [fsp.open, fsp.lstat, fsp.realpath, fsp.readdir, fsp.stat].reduce(
    (sum, fn) => sum + vi.mocked(fn).mock.calls.length,
    0,
  );
}

describe("openRoot", () => {
  it("reports a missing, relative or non-directory PROJECTS_ROOT without throwing", async () => {
    expect((await openRoot(undefined)).status).toBe("missing");
    expect((await openRoot("")).status).toBe("missing");
    expect((await openRoot("relative/folder")).status).toBe("not_absolute");
    expect((await openRoot(join(rootPath, "does-not-exist"))).status).toBe("not_directory");
    expect((await openRoot(join(rootPath, "level3-demo", "PROJECT.md"))).status).toBe("not_directory");
  });
});

describe("catalog", () => {
  it("rejects a path outside the catalog before touching the disk", async () => {
    await expect(root.readFile("level3-demo", "package.json")).rejects.toBeInstanceOf(CatalogError);
    await expect(root.readFile("level3-demo", "../no-git/PROJECT.md")).rejects.toBeInstanceOf(CatalogError);
    await expect(root.readFile("..", "PROJECT.md")).rejects.toBeInstanceOf(CatalogError);
    await expect(root.readFile(".hidden", "PROJECT.md")).rejects.toBeInstanceOf(CatalogError);
    await expect(root.readFile("level3-demo", ".env")).rejects.toBeInstanceOf(CatalogError);
    await expect(root.readFile("level3-demo", "specs/001-demo/spec.md")).rejects.toBeInstanceOf(CatalogError);
    await expect(root.readFile("level3-demo", "CHANGELOG.md")).rejects.toBeInstanceOf(CatalogError);
    await expect(root.exists("level3-demo", "src/index.ts")).rejects.toBeInstanceOf(CatalogError);
    expect(diskCalls()).toBe(0);
  });

  it("allows CHANGELOG.md only for nexoru-governance", async () => {
    const changelog = await root.readFile("nexoru-governance", "CHANGELOG.md");
    expect(changelog.ok && changelog.text).toContain("## [1.0.0]");
  });
});

describe("readFile", () => {
  it("reads a standard file", async () => {
    const result = await root.readFile("level3-demo", "PROJECT.md");
    expect(result.ok && result.text.startsWith("---\nid: level3-demo")).toBe(true);
  });

  it("reports a missing file", async () => {
    expect(await root.readFile("no-manifest", "PROJECT.md")).toEqual({
      ok: false,
      problem: { path: "PROJECT.md", reason: "missing", detail: null },
    });
  });

  it("does not follow a symlink that leaves PROJECTS_ROOT", async () => {
    const result = await root.readFile("symlink-escape", "PROJECT.md");
    expect(result).toMatchObject({ ok: false, problem: { reason: "outside_root" } });
    const opened = vi.mocked(fsp.open).mock.calls.map(([path]) => String(path));
    expect(opened.some((path) => path.includes("-outside"))).toBe(false);
  });

  it("never opens a secret file, even through a standard path", async () => {
    const result = await root.readFile("secret-link", "CLAUDE.md");
    expect(result).toMatchObject({ ok: false, problem: { reason: "secret_file" } });
    const opened = vi.mocked(fsp.open).mock.calls.map(([path]) => String(path));
    expect(opened.some((path) => path.includes(".env"))).toBe(false);
  });

  it("rejects a FIFO without blocking", { timeout: 2_000 }, async () => {
    const result = await root.readFile("fifo-and-large", "specs/001-demo/tasks.md");
    expect(result).toMatchObject({ ok: false, problem: { reason: "not_regular_file" } });
  });

  it("rejects files larger than 1 MB", async () => {
    expect(MAX_FILE_BYTES).toBe(1_048_576);
    const result = await root.readFile("fifo-and-large", "docs/mapa-funcional.md");
    expect(result).toMatchObject({ ok: false, problem: { reason: "too_large" } });
  });

  it("rejects invalid UTF-8 and normalizes CRLF", async () => {
    await writeFile(join(rootPath, "duplicate-id-a", "CLAUDE.md"), Buffer.from([0x23, 0x20, 0xc3, 0x28]));
    expect(await root.readFile("duplicate-id-a", "CLAUDE.md")).toMatchObject({
      ok: false,
      problem: { reason: "invalid_utf8" },
    });

    await writeFile(join(rootPath, "duplicate-id-b", "CLAUDE.md"), "# Título\r\n\r\n## Sección\r\n");
    expect(await root.readFile("duplicate-id-b", "CLAUDE.md")).toEqual({ ok: true, text: "# Título\n\n## Sección\n" });
  });
});

describe("exists", () => {
  it("checks .env.example with lstat and never opens it", async () => {
    expect(await root.exists("level3-demo", ".env.example")).toBe(true);
    expect(await root.exists("no-manifest", ".env.example")).toBe(false);
    const opened = vi.mocked(fsp.open).mock.calls.map(([path]) => String(path));
    expect(opened).toEqual([]);
  });

  it("checks Spec Kit files without reading them", async () => {
    expect(await root.exists("level3-demo", ".specify")).toBe(true);
    expect(await root.exists("level3-demo", ".specify/memory/constitution.md")).toBe(true);
    expect(await root.exists("level3-demo", "specs/001-demo/spec.md")).toBe(true);
    expect(await root.exists("spec-no-tasks", "specs/002-extra/plan.md")).toBe(false);
    expect(vi.mocked(fsp.open)).not.toHaveBeenCalled();
  });
});

describe("listing", () => {
  it("lists the non-hidden project folders, sorted", async () => {
    await writeFile(join(rootPath, ".hidden-file"), "x");
    const folders = await root.listFolders();
    expect(folders).toContain("level3-demo");
    expect(folders).toContain("nexoru-governance");
    expect(folders.some((name) => name.startsWith("."))).toBe(false);
    expect([...folders].sort()).toEqual(folders);
  });

  it("lists only spec folders that match NNN-name", async () => {
    await writeFile(join(rootPath, "roadmap-states", "specs", "notes.md"), "x");
    expect(await root.listDir("roadmap-states", "specs")).toEqual([
      "001-done",
      "002-partial",
      "003-none",
      "004-conflict",
    ]);
  });

  it("lists only YAML workflows", async () => {
    await writeFile(join(rootPath, "level3-demo", ".github", "workflows", "README.md"), "x");
    expect(await root.listDir("level3-demo", ".github/workflows")).toEqual(["ci.yml"]);
    expect(await root.listDir("no-manifest", ".github/workflows")).toEqual([]);
  });
});

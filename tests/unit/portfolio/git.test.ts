// T008: git is only queried with fixed read-only commands that cannot run anything from the repo
// nor rewrite its internal files (FR-005, FR-030, FR-031, contracts/reader.md).
import { execFileSync } from "node:child_process";
import { chmod, mkdtemp, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { normalizeGithubRemote, readGitInfo } from "@/lib/portfolio/git";
import { openRoot, type SafeRoot } from "@/lib/portfolio/safe-fs";

const root = process.env.PROJECTS_ROOT!;
const project = (folder: string) => realpath(join(root, folder));

async function safeRootOf(path: string): Promise<SafeRoot> {
  const opened = await openRoot(path);
  if (opened.status !== "ok") throw new Error(`root not usable: ${path}`);
  return opened.root;
}
let fixtureRoot: SafeRoot;
beforeAll(async () => {
  fixtureRoot = await safeRootOf(root);
});

describe("readGitInfo", () => {
  it("reads branch, main branch, origin and a clean tree", async () => {
    const { info, versionedEnvFiles } = await readGitInfo(await project("level3-demo"), fixtureRoot);
    expect(info).toEqual({
      isRepo: true,
      branch: "main",
      mainBranch: "main",
      onMainBranch: true,
      hasUncommittedChanges: false,
      uncommittedChangesReason: null,
      originRepo: "example-org/level3-demo",
    });
    expect(versionedEnvFiles).toEqual([]);
  });

  it("does not take a parent repository for a folder without .git", async () => {
    const { info, versionedEnvFiles } = await readGitInfo(await project("no-git"), fixtureRoot);
    expect(info.isRepo).toBe(false);
    expect(info.branch).toBeNull();
    expect(info.originRepo).toBeNull();
    expect(versionedEnvFiles).toBeNull();

    // A subfolder of a repository is not the repository root either.
    expect((await readGitInfo(await project("level3-demo/docs"), fixtureRoot)).info.isRepo).toBe(false);
  });

  it("reports a repository without origin and falls back to main as main branch", async () => {
    const { info } = await readGitInfo(await project("no-origin"), fixtureRoot);
    expect(info.isRepo).toBe(true);
    expect(info.originRepo).toBeNull();
    expect(info.mainBranch).toBe("main");
  });

  it("flags a feature branch with uncommitted changes", async () => {
    const { info } = await readGitInfo(await project("feature-branch"), fixtureRoot);
    expect(info.branch).toBe("feature/x");
    expect(info.onMainBranch).toBe(false);
    expect(info.hasUncommittedChanges).toBe(true);
  });

  it("lists versioned .env files by name only, excluding .env.example", async () => {
    const { versionedEnvFiles } = await readGitInfo(await project("env-versioned"), fixtureRoot);
    expect(versionedEnvFiles).toEqual([".env"]);
  });
});

describe("readGitInfo never runs repository code nor writes to the repository", () => {
  let repo: string;
  let witness: string;

  beforeAll(async () => {
    repo = await mkdtemp(join(tmpdir(), "nexoru-op-fixture-git-"));
    witness = join(repo, "..", `${repo.split("/").pop()}-witness`);
    const hook = join(repo, "fsmonitor.sh");
    await writeFile(hook, `#!/bin/sh\ntouch "${witness}"\n`);
    await chmod(hook, 0o755);
    const git = (...args: string[]) =>
      execFileSync("git", ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", ...args], {
        cwd: repo,
        stdio: "ignore",
      });
    git("init", "-q", "-b", "main");
    await writeFile(join(repo, "README.md"), "ficticio\n");
    git("add", "README.md");
    git("commit", "-q", "-m", "init");
    git("config", "core.fsmonitor", hook);
  });

  afterAll(async () => {
    await rm(repo, { recursive: true, force: true });
    await rm(witness, { force: true });
  });

  it("ignores a core.fsmonitor program configured in the repository", async () => {
    // Sanity check: a plain `git status` does run it.
    execFileSync("git", ["status", "--porcelain"], { cwd: repo, stdio: "ignore" });
    await expect(stat(witness)).resolves.toBeTruthy();
    await rm(witness);

    await readGitInfo(await realpath(repo), await safeRootOf(await realpath(tmpdir())));
    await expect(stat(witness)).rejects.toThrow();
  });

  it("leaves .git/index untouched", async () => {
    const index = join(repo, ".git", "index");
    // Make the index stale so a normal `git status` would want to refresh it.
    await writeFile(join(repo, "README.md"), "ficticio\n");
    const before = await stat(index);
    const hashBefore = createHash("sha256").update(await readFile(index)).digest("hex");
    await readGitInfo(await realpath(repo), await safeRootOf(await realpath(tmpdir())));
    const after = await stat(index);
    expect(after.mtimeMs).toBe(before.mtimeMs);
    expect(createHash("sha256").update(await readFile(index)).digest("hex")).toBe(hashBefore);
  });
});

describe("normalizeGithubRemote", () => {
  it.each([
    ["https://github.com/example-org/demo.git", "example-org/demo"],
    ["https://github.com/example-org/demo", "example-org/demo"],
    ["git@github.com:example-org/demo.git", "example-org/demo"],
    ["ssh://git@github.com/example-org/demo.git", "example-org/demo"],
    ["https://github.com/Example-Org/Demo.git/", "example-org/demo"],
  ])("%s → %s", (url, expected) => {
    expect(normalizeGithubRemote(url)).toBe(expected);
  });

  it("returns null for other hosts or malformed URLs", () => {
    expect(normalizeGithubRemote("https://gitlab.com/example-org/demo.git")).toBeNull();
    expect(normalizeGithubRemote("not a url")).toBeNull();
  });
});

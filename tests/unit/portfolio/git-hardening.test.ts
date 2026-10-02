// T001: a hostile repository cannot make Nexoru Op run anything nor change its .git
// (constitution XIII, research R11, contracts/git-history.md "Prefijo endurecido v2").
// Every program configured in the repo leaves a mark in a folder outside the portfolio.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdir, mkdtemp, readdir, readFile, readlink, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readGitInfo } from "@/lib/portfolio/git";
import { readPortfolio } from "@/lib/portfolio/read-portfolio";
import { openRoot, type SafeRoot } from "@/lib/portfolio/safe-fs";

let root: string;
let marks: string;
let safeRoot: SafeRoot;
const PROGRAMS = ["fsmonitor", "clean", "textconv", "extdiff", "gpg"] as const;

const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", "-c", "commit.gpgsign=false", ...args], {
    cwd,
    stdio: ["ignore", "pipe", "ignore"],
    encoding: "utf8",
  });

async function marksLeft(): Promise<string[]> {
  return (await readdir(marks)).filter((name) => name.startsWith("MARK-")).sort();
}

/** sha256 and mtime of every file under .git (symlinks by target). */
async function gitFingerprint(repo: string): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const walk = async (dir: string) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isSymbolicLink()) result.set(full, `link:${await readlink(full)}`);
      else {
        const info = await stat(full);
        result.set(full, `${info.mtimeMs}:${createHash("sha256").update(await readFile(full)).digest("hex")}`);
      }
    }
  };
  await walk(join(repo, ".git"));
  return result;
}

/** A committed repo whose config would run a program for each of PROGRAMS. */
async function hostileRepo(name: string): Promise<string> {
  const repo = join(root, name);
  await mkdir(repo);
  git(repo, "init", "-q", "-b", "main");
  await writeFile(join(repo, "PROJECT.md"), "---\nid: hostil\nfase: construccion\n---\n# Repo hostil (ficticio)\n");
  await writeFile(join(repo, ".gitattributes"), "* filter=evil diff=evil\n");
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", "init");
  await writeFile(join(repo, "PROJECT.md"), "---\nid: hostil\nfase: pruebas\n---\n# Repo hostil (ficticio)\n");
  git(repo, "commit", "-q", "-am", "fase");

  for (const program of PROGRAMS) {
    const script = join(marks, `${name}-${program}.sh`);
    // Leaves a mark and behaves as an identity filter (cat) so git keeps working.
    await writeFile(script, `#!/bin/sh\ntouch "${join(marks, `MARK-${program}`)}"\ncat\n`);
    await chmod(script, 0o755);
  }
  const attributes = join(marks, `${name}.attributes`);
  await writeFile(attributes, "* filter=evil diff=evil\n");
  const script = (program: string) => join(marks, `${name}-${program}.sh`);
  git(repo, "config", "core.fsmonitor", script("fsmonitor"));
  git(repo, "config", "filter.evil.clean", script("clean"));
  git(repo, "config", "diff.evil.textconv", script("textconv"));
  git(repo, "config", "diff.external", script("extdiff"));
  git(repo, "config", "core.attributesFile", attributes);
  git(repo, "config", "log.showSignature", "true");
  git(repo, "config", "gpg.program", script("gpg"));
  return repo;
}

/** Changes the mtime of a versioned file so git would compare its contents again. */
async function makeStatDirty(repo: string) {
  const future = new Date(Date.now() + 60_000);
  await utimes(join(repo, "PROJECT.md"), future, future);
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "nexoru-op-fixture-hostile-"));
  marks = `${root}-marks`;
  await mkdir(marks);
  const opened = await openRoot(root);
  if (opened.status !== "ok") throw new Error("hostile root not usable");
  safeRoot = opened.root;
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
  await rm(marks, { recursive: true, force: true });
});

describe("hostile repository", () => {
  it("is a valid probe: a plain git status runs the repository's clean filter", async () => {
    const repo = await hostileRepo("probe");
    await makeStatDirty(repo);
    execFileSync("git", ["status", "--porcelain"], { cwd: repo, stdio: "ignore" });
    expect(await marksLeft()).toContain("MARK-clean");
  });

  it("a full reading runs nothing from the repository and changes nothing in .git", async () => {
    await rm(join(root, "probe"), { recursive: true, force: true });
    for (const mark of await marksLeft()) await rm(join(marks, mark));
    const repo = await hostileRepo("hostil");
    await makeStatDirty(repo);
    const before = await gitFingerprint(repo);

    const info = await readGitInfo(repo, safeRoot);
    const reading = await readPortfolio(root);

    expect(await marksLeft()).toEqual([]);
    expect(await gitFingerprint(repo)).toEqual(before);
    expect(info.info.hasUncommittedChanges).toBe(false);
    expect(reading.projects.map((p) => p.folder)).toEqual(["hostil"]);
  });

  it("still detects a real content change", async () => {
    const repo = join(root, "hostil");
    await writeFile(join(repo, "PROJECT.md"), "---\nid: hostil\nfase: piloto\n---\n# Cambiado\n");
    const { info } = await readGitInfo(repo, safeRoot);
    expect(info.hasUncommittedChanges).toBe(true);
    expect(info.uncommittedChangesReason).toBeNull();
    expect(await marksLeft()).toEqual([]);
  });
});

describe("uncommitted changes that cannot be evaluated are never reported as none", () => {
  it("skips git status when .git/info/attributes exists, and says why", async () => {
    const repo = await hostileRepo("infoattr");
    await writeFile(join(repo, ".git", "info", "attributes"), "* filter=evil\n");
    await makeStatDirty(repo);
    const { info, problems } = await readGitInfo(repo, safeRoot);
    expect(info.hasUncommittedChanges).toBeNull();
    expect(info.uncommittedChangesReason).toBe("atributos locales: no se evalúa por seguridad");
    expect(problems).toContainEqual(expect.objectContaining({ reason: "git_error" }));
    expect(await marksLeft()).toEqual([]);
  });

  it("reports an error of git status as not evaluated, never as false", async () => {
    const repo = join(root, "broken");
    await mkdir(repo);
    git(repo, "init", "-q", "-b", "main");
    await writeFile(join(repo, "README.md"), "x\n");
    git(repo, "add", "-A");
    git(repo, "commit", "-q", "-m", "init");
    await writeFile(join(repo, ".git", "index"), "this is not an index");
    const { info } = await readGitInfo(repo, safeRoot);
    expect(info.hasUncommittedChanges).toBeNull();
    expect(info.uncommittedChangesReason).toBe("error de git");
  });
});

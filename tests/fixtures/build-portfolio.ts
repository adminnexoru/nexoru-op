// T004: builds the fictitious test portfolio (FR-028, research R11).
// The folders in tests/fixtures/portfolio/ are copied to a temporary `nexoru-op-fixture-*`
// directory, where the cases that cannot live in this repo are created: nested git repos,
// a versioned `.env`, symlinks, a FIFO and a file larger than 1 MB.
// Every value is fictitious (organization `example-org`, `@example.test` identities).

import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, readFile, rename, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Resolved from the repository root (every test runner starts there); import.meta is not
// available when Playwright loads this file for the global teardown.
const SOURCE = resolve(process.cwd(), "tests", "fixtures", "portfolio");
const NOT_REPOS = new Set(["no-git", "nexoru-governance"]);

export type FixtureOptions = {
  /** Version written in the fictitious nexoru-governance CHANGELOG.md (default 1.0.0). */
  standardVersion?: string;
  /** Leaves nexoru-governance out of the portfolio. */
  withoutStandard?: boolean;
};

function git(cwd: string, ...args: string[]): void {
  execFileSync(
    "git",
    ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", "-c", "commit.gpgsign=false", ...args],
    { cwd, stdio: "ignore", env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1" } },
  );
}

function initRepo(dir: string, folder: string): void {
  git(dir, "init", "-q", "-b", "main");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "Fixture commit");
  if (folder === "no-origin") return;
  git(dir, "remote", "add", "origin", `https://github.com/example-org/${folder}.git`);
  // Simulates a cloned repo without network: origin/main and origin/HEAD point to main.
  git(dir, "update-ref", "refs/remotes/origin/main", "HEAD");
  git(dir, "symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main");
}

/** Creates the temporary portfolio and returns its absolute path (the test PROJECTS_ROOT). */
export async function buildFixturePortfolio(options: FixtureOptions = {}): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "nexoru-op-fixture-"));
  const outside = `${root}-outside`;
  await cp(SOURCE, root, { recursive: true });
  await rm(join(root, "README.md"));

  if (options.withoutStandard) await rm(join(root, "nexoru-governance"), { recursive: true });
  else if (options.standardVersion) {
    const changelog = join(root, "nexoru-governance", "CHANGELOG.md");
    const text = await readFile(changelog, "utf8");
    await writeFile(changelog, text.replace("## [1.0.0]", `## [${options.standardVersion}]`));
  }

  // Cases prepared before the first commit.
  await rename(join(root, "env-versioned", "env.fixture"), join(root, "env-versioned", ".env"));
  const secret = await readFile(join(root, "secret-link", "secret.fixture"), "utf8");
  await unlink(join(root, "secret-link", "secret.fixture"));
  // docs/ is empty in the repo (git does not keep empty folders): create it before the large file.
  await mkdir(join(root, "fifo-and-large", "docs"), { recursive: true });
  await writeFile(join(root, "fifo-and-large", "docs", "mapa-funcional.md"), "x".repeat(1_100_000));

  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isDirectory() && !NOT_REPOS.has(entry.name)) initRepo(join(root, entry.name), entry.name);
  }

  // Cases prepared after the commit (untracked or not versionable).
  git(join(root, "feature-branch"), "checkout", "-q", "-b", "feature/x");
  await writeFile(join(root, "feature-branch", "CLAUDE.md"), "Cambio sin commit (ficticio)\n", { flag: "a" });

  await mkdir(outside, { recursive: true });
  await writeFile(join(outside, "PROJECT.md"), "---\nid: fuera\n---\n# Fuera del portafolio (ficticio)\n");
  await symlink(join(outside, "PROJECT.md"), join(root, "symlink-escape", "PROJECT.md"));

  await writeFile(join(root, "secret-link", ".env.secret"), secret);
  await symlink(".env.secret", join(root, "secret-link", "CLAUDE.md"));

  execFileSync("mkfifo", [join(root, "fifo-and-large", "specs", "001-demo", "tasks.md")]);

  return root;
}

/** Removes a portfolio created by buildFixturePortfolio, including its outside sibling. */
export async function removeFixturePortfolio(root: string): Promise<void> {
  await rm(root, { recursive: true, force: true });
  await rm(`${root}-outside`, { recursive: true, force: true });
}

// `tsx tests/fixtures/build-portfolio.ts` prints the path (used by playwright.config.ts).
if (process.argv[1]?.endsWith("build-portfolio.ts")) {
  buildFixturePortfolio().then((root) => process.stdout.write(root));
}

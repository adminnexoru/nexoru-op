// T004: builds the fictitious test portfolio (FR-028, research R11).
// The folders in tests/fixtures/portfolio/ are copied to a temporary `nexoru-op-fixture-*`
// directory, where the cases that cannot live in this repo are created: nested git repos,
// a versioned `.env`, symlinks, a FIFO and a file larger than 1 MB.
// Every value is fictitious (organization `example-org`, `@example.test` identities).

import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, readFile, rename, rm, symlink, unlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Resolved from the repository root (every test runner starts there); import.meta is not
// available when Playwright loads this file for the global teardown.
const SOURCE = resolve(process.cwd(), "tests", "fixtures", "portfolio");
const NOT_REPOS = new Set(["no-git", "nexoru-governance"]);
/** Built by their own functions below. */
const CUSTOM_REPOS = new Set(["history-demo"]);

export type FixtureOptions = {
  /** Version written in the fictitious nexoru-governance CHANGELOG.md (default 1.0.0). */
  standardVersion?: string;
  /** Leaves nexoru-governance out of the portfolio. */
  withoutStandard?: boolean;
};

function git(cwd: string, ...args: string[]): string {
  return gitAt(cwd, null, ...args);
}

/** Runs git with a fixed author and committer date (ISO 8601), or the current date when null. */
function gitAt(cwd: string, date: string | null, ...args: string[]): string {
  const dates = date ? { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : {};
  return execFileSync(
    "git",
    ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", "-c", "commit.gpgsign=false", ...args],
    { cwd, stdio: ["ignore", "pipe", "ignore"], encoding: "utf8", env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", ...dates } },
  );
}

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (now: Date, days: number) => new Date(now.getTime() - days * DAY);
const localDate = (date: Date) => date.toLocaleDateString("en-CA");

/**
 * T005: history-demo with dates relative to `now` (git's --since uses the real clock).
 * main: initial commit (fase: especificacion) 100 days ago, `fase` changed to construccion 20 days
 * ago (fase_desde says 14 days ago, so they do not match), commits 12 and 5 days ago.
 * origin/main: 3 commits on top of main that main does not have. Current branch feature/history:
 * 2 commits of its own (dated 9 and 8 days ago). FETCH_HEAD modified 40 days ago.
 */
async function buildHistoryDemo(dir: string, now: Date): Promise<void> {
  const projectFile = join(dir, "PROJECT.md");
  const finalText = (await readFile(projectFile, "utf8")).replace(
    "fase_desde: 2026-01-15",
    `fase_desde: ${localDate(daysAgo(now, 14))}`,
  );
  const commit = (days: number, message: string) => gitAt(dir, daysAgo(now, days).toISOString(), "commit", "-q", "--allow-empty", "-m", message);

  git(dir, "init", "-q", "-b", "main");
  await writeFile(projectFile, finalText.replace("fase: construccion", "fase: especificacion"));
  git(dir, "add", "-A");
  commit(100, "Initial (especificacion)");
  await writeFile(projectFile, finalText);
  git(dir, "add", "PROJECT.md");
  commit(20, "Fase construccion");
  commit(12, "Avance");
  commit(5, "Último commit de main");

  git(dir, "remote", "add", "origin", "https://github.com/example-org/history-demo.git");
  git(dir, "checkout", "-q", "-b", "remote-tmp");
  for (const days of [4, 3, 2]) commit(days, `Commit remoto hace ${days} días`);
  git(dir, "update-ref", "refs/remotes/origin/main", "HEAD");
  git(dir, "symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main");
  git(dir, "checkout", "-q", "main");
  git(dir, "branch", "-q", "-D", "remote-tmp");

  git(dir, "checkout", "-q", "-b", "feature/history");
  commit(9, "Feature 1");
  commit(8, "Feature 2");

  const fetchHead = join(dir, ".git", "FETCH_HEAD");
  await writeFile(fetchHead, "");
  await utimes(fetchHead, daysAgo(now, 40), daysAgo(now, 40));
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

export type FixturePortfolio = {
  /** Absolute path of the temporary portfolio (the test PROJECTS_ROOT). */
  root: string;
  /** Base date of the commits of history-demo; pass it as `now` to readPortfolio. */
  now: Date;
};

/** Creates the temporary portfolio. */
export async function buildFixturePortfolio(options: FixtureOptions = {}): Promise<FixturePortfolio> {
  const now = new Date();
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
    if (entry.isDirectory() && !NOT_REPOS.has(entry.name) && !CUSTOM_REPOS.has(entry.name)) {
      initRepo(join(root, entry.name), entry.name);
    }
  }
  await buildHistoryDemo(join(root, "history-demo"), now);
  await writeFile(join(root, "git-info-attributes", ".git", "info", "attributes"), "*.md -text\n");

  // Cases prepared after the commit (untracked or not versionable).
  git(join(root, "feature-branch"), "checkout", "-q", "-b", "feature/x");
  await writeFile(join(root, "feature-branch", "CLAUDE.md"), "Cambio sin commit (ficticio)\n", { flag: "a" });

  await mkdir(outside, { recursive: true });
  await writeFile(join(outside, "PROJECT.md"), "---\nid: fuera\n---\n# Fuera del portafolio (ficticio)\n");
  await symlink(join(outside, "PROJECT.md"), join(root, "symlink-escape", "PROJECT.md"));

  await writeFile(join(root, "secret-link", ".env.secret"), secret);
  await symlink(".env.secret", join(root, "secret-link", "CLAUDE.md"));

  execFileSync("mkfifo", [join(root, "fifo-and-large", "specs", "001-demo", "tasks.md")]);

  return { root, now };
}

/** Removes a portfolio created by buildFixturePortfolio, including its outside sibling. */
export async function removeFixturePortfolio(root: string): Promise<void> {
  await rm(root, { recursive: true, force: true });
  await rm(`${root}-outside`, { recursive: true, force: true });
}

// `tsx tests/fixtures/build-portfolio.ts` prints the path (used by playwright.config.ts).
if (process.argv[1]?.endsWith("build-portfolio.ts")) {
  buildFixturePortfolio().then(({ root }) => process.stdout.write(root));
}

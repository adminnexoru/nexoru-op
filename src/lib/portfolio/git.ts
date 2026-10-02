// T019: read-only git queries with fixed arguments (constitution XIII, contracts/reader.md, R4).
// - No shell, fixed subcommands, 5 s timeout, minimal environment.
// - core.fsmonitor is disabled from the command line: a repository's .git/config could otherwise
//   make `git status` run a program.
// - --no-optional-locks keeps `git status` from rewriting .git/index (nothing in the repo changes).
// - Prefix v2 (phase 3, research R11): `git status` ran a repository's `filter.<n>.clean`; attributes,
//   signatures, submodules and maintenance are neutralized too, and status is skipped when
//   .git/info/attributes exists (it cannot be overridden from the command line).
// - Only file NAMES are read, never contents.
import { execFile } from "node:child_process";
import { basename } from "node:path";
import { promisify } from "node:util";
import type { SafeRoot } from "./safe-fs";
import type { GitInfo, Problem } from "./types";

const run = promisify(execFile);

/** The empty tree: with --attr-source, the project's .gitattributes are ignored. */
const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

/** Hardened prefix v2 (contracts/git-history.md), for every command. */
export const PREFIX = [
  "-c",
  "core.fsmonitor=false",
  "-c",
  "core.untrackedCache=false",
  "-c",
  "core.hooksPath=/dev/null",
  "-c",
  "core.attributesFile=/dev/null",
  "-c",
  "log.showSignature=false",
  "-c",
  "gc.auto=0",
  "-c",
  "maintenance.auto=false",
  "--no-optional-locks",
  `--attr-source=${EMPTY_TREE}`,
];

export const UNCOMMITTED_REASON = {
  localAttributes: "atributos locales: no se evalúa por seguridad",
  gitError: "error de git",
} as const;

function gitEnv(): NodeJS.ProcessEnv {
  // Only what git needs; nothing else from the app environment (no secrets) reaches git.
  return {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
    GIT_PAGER: "cat",
    LC_ALL: "C",
    NODE_ENV: process.env.NODE_ENV,
  };
}

type Outcome = { ok: true; stdout: string } | { ok: false };

async function git(cwd: string, args: string[]): Promise<Outcome> {
  try {
    const { stdout } = await run("git", [...PREFIX, ...args], {
      cwd,
      env: gitEnv(),
      timeout: 5_000,
      maxBuffer: 10 * 1024 * 1024,
      shell: false,
      encoding: "utf8",
    });
    return { ok: true, stdout };
  } catch {
    return { ok: false };
  }
}

/** `https://github.com/org/name(.git)`, `git@github.com:org/name(.git)` or `ssh://…` → `org/name`. */
export function normalizeGithubRemote(url: string): string | null {
  const match = url
    .trim()
    .match(/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i);
  return match ? `${match[1]}/${match[2]}`.toLowerCase() : null;
}

export interface GitReading {
  info: GitInfo;
  /** Names of versioned .env* files other than .env.example; null when not a repository. */
  versionedEnvFiles: string[] | null;
  problems: Problem[];
}

const NOT_A_REPO: GitInfo = {
  isRepo: false,
  branch: null,
  mainBranch: null,
  onMainBranch: null,
  hasUncommittedChanges: null,
  uncommittedChangesReason: null,
  originRepo: null,
};

/**
 * `git status` only when no .git/info/attributes could make it run a filter; otherwise, or on
 * any error, the value is unknown and carries its reason (never "no changes").
 */
async function uncommittedChanges(projectRealPath: string, root: SafeRoot) {
  const attributesPath = await git(projectRealPath, ["rev-parse", "--path-format=absolute", "--git-path", "info/attributes"]);
  if (!attributesPath.ok) return { value: null, reason: UNCOMMITTED_REASON.gitError };
  const attributes = await root.statInsideRoot(attributesPath.stdout.trim());
  if (attributes && attributes.size > 0) return { value: null, reason: UNCOMMITTED_REASON.localAttributes };
  const status = await git(projectRealPath, ["status", "--porcelain=v1", "-z", "--ignore-submodules=all"]);
  if (!status.ok) return { value: null, reason: UNCOMMITTED_REASON.gitError };
  return { value: status.stdout.length > 0, reason: null };
}

/** Reads the git data of a project folder, given its real path inside PROJECTS_ROOT. */
export async function readGitInfo(projectRealPath: string, root: SafeRoot): Promise<GitReading> {
  const toplevel = await git(projectRealPath, ["rev-parse", "--show-toplevel"]);
  // A folder without its own .git must not be evaluated with a parent repository.
  if (!toplevel.ok || toplevel.stdout.trim() !== projectRealPath) {
    return { info: NOT_A_REPO, versionedEnvFiles: null, problems: [] };
  }

  const [origin, branch, originHead, status, files] = await Promise.all([
    git(projectRealPath, ["remote", "get-url", "origin"]),
    git(projectRealPath, ["branch", "--show-current"]),
    git(projectRealPath, ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"]),
    uncommittedChanges(projectRealPath, root),
    git(projectRealPath, ["ls-files", "-z"]),
  ]);

  const problems: Problem[] = [];
  const failed = (name: string) => problems.push({ path: null, reason: "git_error", detail: `git ${name}` });
  if (!branch.ok) failed("branch");
  if (status.reason) problems.push({ path: null, reason: "git_error", detail: `git status: ${status.reason}` });
  if (!files.ok) failed("ls-files");

  const currentBranch = branch.ok ? branch.stdout.trim() || null : null;
  const mainBranch = originHead.ok ? originHead.stdout.trim().replace(/^origin\//, "") : "main";

  return {
    info: {
      isRepo: true,
      branch: currentBranch,
      mainBranch,
      onMainBranch: currentBranch === null ? (branch.ok ? false : null) : currentBranch === mainBranch,
      hasUncommittedChanges: status.value,
      uncommittedChangesReason: status.reason,
      originRepo: origin.ok ? normalizeGithubRemote(origin.stdout) : null,
    },
    versionedEnvFiles: files.ok
      ? files.stdout
          .split("\0")
          .filter((path) => path && /^\.env/.test(basename(path)) && basename(path) !== ".env.example")
          .sort()
      : null,
    problems,
  };
}

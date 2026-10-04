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
import { parseAheadBehind } from "./history";
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
  originKind: "none",
};

/** One fixed `rev-parse` for the four paths a reading needs (fewer git processes). */
export const REPO_PATHS_COMMAND = [
  "rev-parse",
  "--path-format=absolute",
  "--show-toplevel",
  "--git-path",
  "info/attributes",
  "--git-path",
  "FETCH_HEAD",
  "--git-common-dir",
] as const;

export interface RepoPaths {
  toplevel: string;
  infoAttributes: string;
  fetchHead: string;
  commonDir: string;
}

/** Paths of the repository whose root is exactly `projectRealPath`, or null (not a repo root). */
export async function readRepoPaths(projectRealPath: string): Promise<RepoPaths | null> {
  const out = await git(projectRealPath, [...REPO_PATHS_COMMAND]);
  if (!out.ok) return null;
  const [toplevel, infoAttributes, fetchHead, commonDir] = out.stdout.split("\n").map((line) => line.trim());
  // A folder without its own .git must not be evaluated with a parent repository.
  if (toplevel !== projectRealPath || !infoAttributes || !fetchHead || !commonDir) return null;
  return { toplevel, infoAttributes, fetchHead, commonDir };
}

/**
 * `git status` only when no .git/info/attributes could make it run a filter; otherwise, or on
 * any error, the value is unknown and carries its reason (never "no changes").
 */
async function uncommittedChanges(projectRealPath: string, root: SafeRoot, paths: RepoPaths) {
  const attributes = await root.statInsideRoot(paths.infoAttributes);
  if (attributes && attributes.size > 0) return { value: null, reason: UNCOMMITTED_REASON.localAttributes };
  const status = await git(projectRealPath, ["status", "--porcelain=v1", "-z", "--ignore-submodules=all"]);
  if (!status.ok) return { value: null, reason: UNCOMMITTED_REASON.gitError };
  return { value: status.stdout.length > 0, reason: null };
}

/** Reads the git data of a project folder, given its real path inside PROJECTS_ROOT. */
export async function readGitInfo(
  projectRealPath: string,
  root: SafeRoot,
  knownPaths?: RepoPaths | null,
): Promise<GitReading> {
  const paths = knownPaths === undefined ? await readRepoPaths(projectRealPath) : knownPaths;
  if (!paths) return { info: NOT_A_REPO, versionedEnvFiles: null, problems: [] };

  const [origin, branch, originHead, status, files] = await Promise.all([
    git(projectRealPath, ["remote", "get-url", "origin"]),
    git(projectRealPath, ["branch", "--show-current"]),
    git(projectRealPath, ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"]),
    uncommittedChanges(projectRealPath, root, paths),
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
      originKind: !origin.ok || !origin.stdout.trim() ? "none" : normalizeGithubRemote(origin.stdout) ? "github" : "other",
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

/** T017: fixed history commands (contracts/git-history.md). Every one runs with PREFIX. */
export const HISTORY_COMMANDS = {
  lastCommit: ["for-each-ref", "--sort=-committerdate", "--count=1", "--format=%(committerdate:unix)", "refs/heads"],
  activity: ["log", "--branches", "--since=13.weeks.ago", "--format=%ct"],
  aheadBehindRemote: ["rev-list", "--left-right", "--count", "HEAD...refs/remotes/origin/HEAD"],
  aheadBehindMain: ["rev-list", "--left-right", "--count", "HEAD...refs/heads/main"],
  phaseLog: [
    "log",
    "--format=%x00%H%x09%ct",
    "-p",
    "--unified=0",
    "--no-color",
    "--no-ext-diff",
    "--no-textconv",
    "--max-count=500",
    "--",
    "PROJECT.md",
  ],
} as const;

export interface GitHistoryRaw {
  lastCommitUnix: number | null;
  commitTimesUnix: number[];
  aheadBehind: { ahead: number; behind: number; ref: "origin/HEAD" | "main" } | null;
  /** Most recent modification time of FETCH_HEAD (worktree or common dir); never opened. */
  fetchHeadMtimeMs: number | null;
  phaseLog: string | null;
  problems: Problem[];
}

/** Raw outputs of the history commands for a repository root (paths from readRepoPaths). */
export async function readGitHistoryRaw(projectRealPath: string, root: SafeRoot, paths: RepoPaths): Promise<GitHistoryRaw> {
  const run = (args: readonly string[]) => git(projectRealPath, [...args]);
  const [activity, remote, phaseLog] = await Promise.all([
    run(HISTORY_COMMANDS.activity),
    run(HISTORY_COMMANDS.aheadBehindRemote),
    run(HISTORY_COMMANDS.phaseLog),
  ]);
  const problems: Problem[] = [];
  // A repository without commits makes `log` fail: that is "no activity", not an error.
  const commitTimesUnix = activity.ok
    ? activity.stdout
        .split("\n")
        .filter(Boolean)
        .map(Number)
        .filter((n) => Number.isFinite(n))
    : [];
  // The last commit is in the activity log when it is recent; otherwise ask the references.
  let lastText = commitTimesUnix.length > 0 ? String(Math.max(...commitTimesUnix)) : "";
  if (lastText === "") {
    const last = await run(HISTORY_COMMANDS.lastCommit);
    lastText = last.ok ? last.stdout.trim() : "";
  }

  let aheadBehind: GitHistoryRaw["aheadBehind"] = null;
  const remoteCounts = remote.ok ? parseAheadBehind(remote.stdout) : null;
  if (remoteCounts) aheadBehind = { ...remoteCounts, ref: "origin/HEAD" };
  else {
    // No origin/HEAD (e.g. a clone that never fetched it): compare against the local main.
    const main = await run(HISTORY_COMMANDS.aheadBehindMain);
    const mainCounts = main.ok ? parseAheadBehind(main.stdout) : null;
    if (mainCounts) aheadBehind = { ...mainCounts, ref: "main" };
  }

  const candidates = [paths.fetchHead, `${paths.commonDir}/FETCH_HEAD`];
  const stats = await Promise.all(candidates.map((path) => root.statInsideRoot(path)));
  const mtimes = stats.flatMap((info) => (info ? [info.mtimeMs] : []));

  if (!phaseLog.ok && lastText !== "") problems.push({ path: "PROJECT.md", reason: "git_error", detail: "git log de PROJECT.md" });

  return {
    lastCommitUnix: lastText !== "" && Number.isFinite(Number(lastText)) ? Number(lastText) : null,
    commitTimesUnix,
    aheadBehind,
    fetchHeadMtimeMs: mtimes.length > 0 ? Math.max(...mtimes) : null,
    phaseLog: phaseLog.ok ? phaseLog.stdout : null,
    problems,
  };
}

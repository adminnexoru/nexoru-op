// T015: git history against the fictitious history-demo repo, built with dates relative to `now`
// (US1, contracts/git-history.md). Read-only: nothing in .git changes.
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HISTORY_COMMANDS, REPO_PATHS_COMMAND } from "@/lib/portfolio/git";
import { readPortfolio } from "@/lib/portfolio/read-portfolio";
import type { PortfolioReading, ProjectReading } from "@/lib/portfolio/types";
import { buildFixturePortfolio, removeFixturePortfolio } from "../../fixtures/build-portfolio";

let root: string;
let now: Date;
let reading: PortfolioReading;
let before: string;

const project = (folder: string): ProjectReading => {
  const found = reading.projects.find((p) => p.folder === folder);
  if (!found) throw new Error(`${folder} not in the reading`);
  return found;
};

async function dotGitFingerprint(dir: string): Promise<string> {
  const hash = createHash("sha256");
  const walk = async (path: string): Promise<void> => {
    for (const entry of (await readdir(path, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = join(path, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) hash.update(`${full}:${(await stat(full)).mtimeMs}:`).update(await readFile(full));
    }
  };
  await walk(join(dir, ".git"));
  return hash.digest("hex");
}

/** Independent of the code under test: Monday of the local week. */
function monday(date: Date): string {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
  return copy.toLocaleDateString("en-CA");
}

beforeAll(async () => {
  ({ root, now } = await buildFixturePortfolio());
  before = await dotGitFingerprint(join(root, "history-demo"));
  reading = await readPortfolio(root, now);
});

afterAll(() => removeFixturePortfolio(root));

describe("history-demo", () => {
  it("has its last commit 5 days ago, green activity", () => {
    expect(project("history-demo").history).toMatchObject({ daysWithoutActivity: 5, activityLight: "verde" });
  });

  it("counts the commits of every local branch per week (12 weeks)", () => {
    const { weekly } = project("history-demo").history!;
    const dayAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);
    const expected = new Map<string, number>();
    for (const days of [20, 12, 9, 8, 5]) expected.set(monday(dayAgo(days)), (expected.get(monday(dayAgo(days))) ?? 0) + 1);
    expect(weekly).toHaveLength(12);
    expect(weekly.filter((w) => w.commits > 0).map((w) => [w.weekStart, w.commits])).toEqual([...expected].sort());
  });

  it("is 2 ahead and 3 behind origin/HEAD, with references 40 days old", () => {
    expect(project("history-demo").history).toMatchObject({ compareRef: "origin/HEAD", ahead: 2, behind: 3, remoteRefsAgeDays: 40 });
  });

  it("has been 20 days in construccion, which does not match fase_desde", () => {
    expect(project("history-demo").history).toMatchObject({ daysInPhase: 20, phaseMatchesFaseDesde: false });
  });

  it("changed nothing in .git", async () => {
    expect(await dotGitFingerprint(join(root, "history-demo"))).toBe(before);
  });
});

describe("other repositories", () => {
  it("compares against main when there is no origin/HEAD", () => {
    expect(project("no-origin").history).toMatchObject({ compareRef: "main", ahead: 0, behind: 0 });
  });

  it("has no history outside a repository", () => {
    expect(project("no-git").history).toBeNull();
  });

  it("does not know the age of the remote references without FETCH_HEAD", () => {
    expect(project("level3-demo").history).toMatchObject({ remoteRefsUpdatedAt: null, remoteRefsAgeDays: null });
  });

  it("adds the activity of every project per week", () => {
    expect(reading.activityByWeek).toHaveLength(12);
    const total = reading.activityByWeek.reduce((sum, week) => sum + week.commits, 0);
    const sum = reading.projects.reduce((acc, p) => acc + (p.history?.weekly.reduce((s, w) => s + w.commits, 0) ?? 0), 0);
    expect(total).toBe(sum);
  });
});

describe("commands", () => {
  it("read the four repository paths with one fixed rev-parse", () => {
    expect(REPO_PATHS_COMMAND).toEqual([
      "rev-parse",
      "--path-format=absolute",
      "--show-toplevel",
      "--git-path",
      "info/attributes",
      "--git-path",
      "FETCH_HEAD",
      "--git-common-dir",
    ]);
  });

  it("are exactly the fixed commands of the contract", () => {
    expect(HISTORY_COMMANDS).toEqual({
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
    });
  });
});

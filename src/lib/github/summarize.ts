// T020: summaries of GitHub answers (specs/004-github-readonly research R3, data-model). Pure: they
// keep only what the dashboard shows, never bodies, authors or secrets.
import type { CiInfo, CiRun, PullInfo } from "./types";

type RawRun = { name?: unknown; path?: unknown; status?: unknown; conclusion?: unknown; run_started_at?: unknown; created_at?: unknown };

const STATUSES = new Set(["completed", "in_progress", "queued"]);

/** The runs of a `workflow_runs` answer, newest first. */
export function summarizeRuns(body: unknown): CiRun[] {
  const list = (body as { workflow_runs?: unknown } | null)?.workflow_runs;
  if (!Array.isArray(list)) return [];
  return (list as RawRun[])
    .map((run) => ({
      workflowName: String(run.name ?? "CI"),
      path: String(run.path ?? "").replace(/@.*$/, ""),
      status: (STATUSES.has(String(run.status)) ? String(run.status) : "queued") as CiRun["status"],
      conclusion: typeof run.conclusion === "string" ? run.conclusion : null,
      at: String(run.run_started_at ?? run.created_at ?? ""),
    }))
    .sort((a, b) => b.at.localeCompare(a.at));
}

const latestCompleted = (runs: CiRun[], path?: string) =>
  runs.find((run) => run.status === "completed" && (path === undefined || run.path === path)) ?? null;

/** Workflows that satisfy 3.1 without a completed run among the most recent ones (query 2b). */
export function missingWorkflows(runs: CiRun[], workflowFiles: string[]): string[] {
  return workflowFiles.filter((path) => !latestCompleted(runs, path));
}

export function buildCiInfo(branch: string, runs: CiRun[], workflowFiles: string[], older: Record<string, CiRun | null>): CiInfo {
  return {
    branch,
    latest: runs[0] ?? null,
    latestCompletedAny: latestCompleted(runs),
    perWorkflow: workflowFiles.map((path) => {
      const completed = latestCompleted(runs, path) ?? older[path] ?? null;
      const inProgress = runs.some((run) => run.path === path && run.status !== "completed" && (!completed || run.at > completed.at));
      return { path, latestCompleted: completed, inProgress };
    }),
  };
}

type RawPull = { number?: unknown; title?: unknown; created_at?: unknown; draft?: unknown; head?: { sha?: unknown; repo?: { full_name?: unknown } | null } | null };

const SHA = /^[0-9a-f]{40}$/;

/** The head commit of a PR, only when it is a valid 40-hex SHA (it goes into a route). */
export function pullSha(pull: RawPull): string | null {
  const sha = pull.head?.sha;
  return typeof sha === "string" && SHA.test(sha) ? sha : null;
}

/**
 * Open PRs, newest first: number, title as plain text, date, draft and whether they come from a
 * fork (also a deleted one). Never the body or the author. CI is filled in by query 4.
 */
export function summarizePulls(body: unknown, repo: string): PullInfo[] {
  if (!Array.isArray(body)) return [];
  return (body as RawPull[])
    .map((pull) => {
      const head = pull.head?.repo?.full_name;
      return {
        number: Number(pull.number),
        title: String(pull.title ?? ""),
        openedAt: typeof pull.created_at === "string" ? pull.created_at : "",
        draft: pull.draft === true,
        fromFork: typeof head !== "string" || head.toLowerCase() !== repo.toLowerCase(),
        ci: "not_queried" as const,
      };
    })
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt));
}

const PASSING = new Set(["success", "skipped", "neutral"]);

/** CI of a PR from the runs of its head commit (query 4). */
export function pullCi(body: unknown): PullInfo["ci"] {
  const runs = summarizeRuns(body);
  if (runs.length === 0) return "none";
  if (runs.some((run) => run.status !== "completed")) return "in_progress";
  if (runs.some((run) => run.conclusion === "action_required")) return "awaiting_approval";
  return runs.every((run) => PASSING.has(String(run.conclusion))) ? "success" : "failure";
}

/** Only HOW MANY open alerts there are (FR-023): never the secret, its type, location or URL. */
export function countAlerts(body: unknown): number | null {
  return Array.isArray(body) ? body.length : null;
}

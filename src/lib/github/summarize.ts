// T020: summaries of GitHub answers (specs/004-github-readonly research R3, data-model). Pure: they
// keep only what the dashboard shows, never bodies, authors or secrets.
import type { CiInfo, CiRun } from "./types";

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

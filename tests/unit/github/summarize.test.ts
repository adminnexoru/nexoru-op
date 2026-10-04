// T016: summary of the CI runs of the default branch (queries 2 and 2b, research R3, data-model).
import { describe, expect, it } from "vitest";
import { buildCiInfo, missingWorkflows, summarizeRuns } from "@/lib/github/summarize";

const run = (path: string, status: string, conclusion: string | null, at: string, name = "CI") => ({
  name,
  path,
  status,
  conclusion,
  head_branch: "main",
  event: "push",
  created_at: at,
  updated_at: at,
  run_started_at: at,
});

const CI = ".github/workflows/ci.yml";
const E2E = ".github/workflows/e2e.yml";

describe("summarizeRuns", () => {
  it("keeps name, path, status, conclusion and date, newest first, and nothing else", () => {
    const runs = summarizeRuns({
      workflow_runs: [run(CI, "completed", "success", "2026-10-01T10:00:00Z"), run(E2E, "completed", "failure", "2026-10-02T10:00:00Z", "E2E")],
    });
    expect(runs).toEqual([
      { workflowName: "E2E", path: E2E, status: "completed", conclusion: "failure", at: "2026-10-02T10:00:00Z" },
      { workflowName: "CI", path: CI, status: "completed", conclusion: "success", at: "2026-10-01T10:00:00Z" },
    ]);
  });

  it("strips a ref suffix from the path and treats unknown statuses as queued", () => {
    const [summary] = summarizeRuns({ workflow_runs: [run(`${CI}@refs/heads/main`, "waiting", null, "2026-10-01T10:00:00Z")] });
    expect(summary).toMatchObject({ path: CI, status: "queued" });
  });

  it("returns an empty list for an unexpected body", () => {
    expect(summarizeRuns(null)).toEqual([]);
    expect(summarizeRuns({ workflow_runs: "x" })).toEqual([]);
  });
});

describe("buildCiInfo", () => {
  const runs = summarizeRuns({
    workflow_runs: [
      run(CI, "in_progress", null, "2026-10-03T10:00:00Z"),
      run(E2E, "completed", "success", "2026-10-02T10:00:00Z", "E2E"),
      run(CI, "completed", "failure", "2026-10-01T10:00:00Z"),
    ],
  });

  it("latest may be in progress; latestCompletedAny is the newest completed run of any workflow", () => {
    const info = buildCiInfo("main", runs, [CI], {});
    expect(info.latest).toMatchObject({ path: CI, status: "in_progress" });
    expect(info.latestCompletedAny).toMatchObject({ path: E2E, conclusion: "success" });
    expect(info.branch).toBe("main");
  });

  it("perWorkflow only for the workflows that satisfy 3.1, matched by path, with in-progress runs flagged", () => {
    const info = buildCiInfo("main", runs, [CI], {});
    expect(info.perWorkflow).toEqual([{ path: CI, latestCompleted: expect.objectContaining({ conclusion: "failure" }), inProgress: true }]);
  });

  it("uses the result of query 2b for a workflow absent from the 50 most recent runs, and null when there is none", () => {
    const lint = ".github/workflows/lint.yml";
    expect(missingWorkflows(runs, [CI, lint])).toEqual([lint]);
    const older = { [lint]: { workflowName: "Lint", path: lint, status: "completed" as const, conclusion: "success", at: "2026-07-01T10:00:00Z" } };
    const info = buildCiInfo("main", runs, [CI, lint], older);
    expect(info.perWorkflow[1]).toEqual({ path: lint, latestCompleted: older[lint], inProgress: false });
    expect(buildCiInfo("main", runs, [lint], { [lint]: null }).perWorkflow[0].latestCompleted).toBeNull();
  });

  it("with no runs, everything is null", () => {
    expect(buildCiInfo("main", [], [CI], { [CI]: null })).toEqual({
      branch: "main",
      latest: null,
      latestCompletedAny: null,
      perWorkflow: [{ path: CI, latestCompleted: null, inProgress: false }],
    });
  });
});

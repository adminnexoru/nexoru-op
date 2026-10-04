// T016: summary of the CI runs of the default branch (queries 2 and 2b, research R3, data-model).
import { describe, expect, it } from "vitest";
import { buildCiInfo, countAlerts, missingWorkflows, pullCi, pullSha, summarizePulls, summarizeRuns } from "@/lib/github/summarize";

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

// T038 (US3): open pull requests and the CI of each one.
describe("summarizePulls", () => {
  const pull = (number: number, extra: Record<string, unknown> = {}) => ({
    number,
    title: `Cambio ficticio ${number}`,
    created_at: `2026-09-${String(number).padStart(2, "0")}T10:00:00Z`,
    draft: false,
    head: { sha: number.toString(16).padStart(40, "a"), repo: { full_name: "example-org/demo" } },
    body: "CUERPO-DE-PR-FICTICIO",
    user: { login: "persona-ficticia" },
    ...extra,
  });

  it("keeps number, title, date, draft and fork, newest first, and never the body or the author", () => {
    const pulls = summarizePulls([pull(3), pull(5, { draft: true })], "example-org/demo");
    expect(pulls).toEqual([
      { number: 5, title: "Cambio ficticio 5", openedAt: "2026-09-05T10:00:00Z", draft: true, fromFork: false, ci: "not_queried" },
      { number: 3, title: "Cambio ficticio 3", openedAt: "2026-09-03T10:00:00Z", draft: false, fromFork: false, ci: "not_queried" },
    ]);
    expect(JSON.stringify(pulls)).not.toMatch(/CUERPO|persona-ficticia/);
  });

  it("marks a fork, also when its repo was deleted (head.repo null), comparing names case-insensitively", () => {
    const [fork, deleted, same] = summarizePulls(
      [
        pull(9, { head: { sha: "f".repeat(40), repo: { full_name: "persona-ficticia/demo" } } }),
        pull(8, { head: { sha: "e".repeat(40), repo: null } }),
        pull(7, { head: { sha: "d".repeat(40), repo: { full_name: "Example-Org/Demo" } } }),
      ],
      "example-org/demo",
    );
    expect([fork.fromFork, deleted.fromFork, same.fromFork]).toEqual([true, true, false]);
  });

  it("keeps the title as plain text, including markup", () => {
    expect(summarizePulls([pull(1, { title: "Reporte <script>alert(1)</script>" })], "example-org/demo")[0].title).toBe(
      "Reporte <script>alert(1)</script>",
    );
  });

  it("does not break on missing or unexpected fields; without a valid sha there is no CI query", () => {
    expect(summarizePulls(null, "example-org/demo")).toEqual([]);
    const [weird] = summarizePulls([{ number: 4, title: 7, created_at: null, head: null }], "example-org/demo");
    expect(weird).toMatchObject({ number: 4, title: "7", draft: false, fromFork: true, ci: "not_queried" });
    expect(pullSha({ number: 4, head: null })).toBeNull();
    expect(pullSha({ number: 4, head: { sha: "nope" } })).toBeNull();
    expect(pullSha({ number: 4, head: { sha: "a".repeat(40) } })).toBe("a".repeat(40));
  });
});

describe("pullCi", () => {
  const runs = (...items: [string, string | null][]) => ({
    workflow_runs: items.map(([status, conclusion], i) => ({ name: "CI", path: ".github/workflows/ci.yml", status, conclusion, run_started_at: `2026-10-0${i + 1}T10:00:00Z` })),
  });

  it.each([
    [runs(["completed", "success"]), "success"],
    [runs(["completed", "success"], ["completed", "failure"]), "failure"],
    [runs(["in_progress", null], ["completed", "success"]), "in_progress"],
    [runs(["completed", "action_required"]), "awaiting_approval"],
    [runs(["completed", "skipped"], ["completed", "success"]), "success"],
    [runs(), "none"],
    [null, "none"],
  ] as const)("%j → %s", (body, expected) => {
    expect(pullCi(body)).toBe(expected);
  });
});

// T043 (US4): only the number of open alerts.
describe("countAlerts", () => {
  it("returns only how many alerts there are, never any field of them", () => {
    const body = [
      { number: 1, state: "open", secret: "SECRETO-FICTICIO", secret_type: "TIPO", html_url: "https://github.example/a/1", locations_url: "https://x/1" },
      { number: 2, state: "open", secret: "SECRETO-FICTICIO", secret_type: "TIPO", html_url: "https://github.example/a/2", locations_url: "https://x/2" },
    ];
    expect(countAlerts(body)).toBe(2);
    expect(countAlerts([])).toBe(0);
    expect(countAlerts({ message: "x" })).toBeNull();
  });
});

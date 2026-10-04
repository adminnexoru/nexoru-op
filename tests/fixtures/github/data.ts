// T003: fictitious GitHub data for the fictitious portfolio (example-org/*). Never real data.
// The same scenario feeds the in-memory fake (unit tests) and the fake server (E2E).

export type RunState = { workflow: string; path: string; status: "completed" | "in_progress" | "queued"; conclusion: string | null; daysAgo: number };
export type PullState = {
  number: number;
  title: string;
  daysAgo: number;
  sha: string;
  ci: "success" | "failure" | "in_progress" | "awaiting_approval" | "none";
  draft?: boolean;
  /** The head branch lives in another repo ("other") or that repo was deleted ("deleted"). */
  fork?: "other" | "deleted";
};

export type RepoScenario = {
  visibility: "public" | "private" | "internal";
  defaultBranch?: string;
  archived?: boolean;
  /** Runs on the default branch, newest first. */
  runs?: RunState[];
  /** Workflow files whose latest completed run is older than the 50 most recent (query 2b). */
  olderRuns?: Record<string, RunState>;
  pulls?: PullState[];
  /** Number of open secret scanning alerts; "disabled" answers 404. */
  alerts?: number | "disabled";
};

const ci = (conclusion: string | null, daysAgo: number, status: RunState["status"] = "completed"): RunState => ({
  workflow: "CI",
  path: ".github/workflows/ci.yml",
  status,
  conclusion,
  daysAgo,
});

const sha = (n: number) => n.toString(16).padStart(40, "a");

/** Repo name → scenario. A repo that is not here answers 404. */
export const GITHUB_SCENARIO: Record<string, RepoScenario> = {
  "level3-demo": { visibility: "public", runs: [ci("success", 1)], pulls: [], alerts: 0 },
  "duplicate-id-a": { visibility: "public", runs: [ci("failure", 2), ci("success", 5)], pulls: [], alerts: 0 },
  "duplicate-id-b": { visibility: "public", runs: [ci(null, 0, "in_progress"), ci("success", 3)], pulls: [], alerts: 0 },
  "spec-no-tasks": { visibility: "public", runs: [], pulls: [], alerts: 0 },
  "feature-branch": { visibility: "private", runs: [ci("success", 1)], pulls: [], alerts: "disabled" },
  "roadmap-states": { visibility: "internal", runs: [ci("cancelled", 4)], pulls: [], alerts: "disabled" },
  "env-versioned": {
    visibility: "public",
    runs: [ci("success", 1)],
    pulls: [
      { number: 7, title: "Reporte ficticio <script>alert(1)</script>", daysAgo: 30, sha: sha(7), ci: "failure" },
      { number: 8, title: "Ajuste ficticio de textos", daysAgo: 2, sha: sha(8), ci: "success" },
      { number: 9, title: "Borrador ficticio", daysAgo: 1, sha: sha(9), ci: "in_progress", draft: true },
      { number: 10, title: "Aporte ficticio desde un fork", daysAgo: 3, sha: sha(10), ci: "awaiting_approval", fork: "other" },
      { number: 11, title: "Fork ficticio borrado", daysAgo: 5, sha: sha(11), ci: "none", fork: "deleted" },
    ],
    alerts: 2,
  },
  "history-demo": {
    visibility: "public",
    runs: [ci("success", 5)],
    pulls: Array.from({ length: 12 }, (_, i) => ({ number: 100 + i, title: `Cambio ficticio ${i + 1}`, daysAgo: i, sha: sha(100 + i), ci: "success" as const })),
    alerts: 0,
  },
  "standard-1-2-interno": { visibility: "public", runs: [ci("success", 1)], pulls: [], alerts: 0 },
  "standard-1-2-nexoru": { visibility: "public", runs: [ci("success", 1)], pulls: [], alerts: 0 },
  "standard-1-2-sin-decision": { visibility: "public", runs: [ci("success", 1)], pulls: [], alerts: 0 },
  "standard-1-2-cliente": { visibility: "public", runs: [ci("success", 1)], pulls: [], alerts: 0 },
  "standard-1-2-discrepancia": { visibility: "public", runs: [ci("success", 1)], pulls: [], alerts: 0 },
  "multi-workflow": {
    visibility: "public",
    runs: [
      { workflow: "E2E", path: ".github/workflows/e2e.yml", status: "completed", conclusion: "success", daysAgo: 1 },
      { workflow: "CI", path: ".github/workflows/ci.yml", status: "completed", conclusion: "failure", daysAgo: 2 },
    ],
    olderRuns: { "lint.yml": { workflow: "Lint", path: ".github/workflows/lint.yml", status: "completed", conclusion: "success", daysAgo: 90 } },
    pulls: [],
    alerts: 0,
  },
};

export const FAKE_OWNER = "example-org";

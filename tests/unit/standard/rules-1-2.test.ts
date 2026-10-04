// T026: standard 1.2 (FR-026, research R14): supported versions, its rules and check 3.2 with the
// latest completed run of EVERY workflow that satisfies 3.1.
import { describe, expect, it } from "vitest";
import type { CiInfo, CiRun, GithubData } from "@/lib/github/types";
import { evaluateProject } from "@/lib/standard/evaluate";
import type { ProjectFiles } from "@/lib/standard/project-files";
import { RULES } from "@/lib/standard/rules";
import { isNewerThanSupported, SUPPORTED_STANDARD_VERSIONS } from "@/lib/standard/versions";
import { baseFiles, DATE, replaceIn } from "./helpers";

describe("versions", () => {
  it("supports 1.0, 1.1 and 1.2; only a later one is newer", () => {
    expect(SUPPORTED_STANDARD_VERSIONS).toEqual(["1.0", "1.1", "1.2"]);
    expect(isNewerThanSupported("1.2")).toBe(false);
    expect(isNewerThanSupported("1.3")).toBe(true);
  });

  it("1.2 is 1.1 plus the rule of every workflow and the visibilidad field", () => {
    expect(RULES["1.2"]).toEqual({ ...RULES["1.1"], version: "1.2", ciRule: "each_workflow", visibilityField: true });
    expect(RULES["1.1"]).toMatchObject({ ciRule: "latest_any", visibilityField: false });
    expect(RULES["1.0"]).toMatchObject({ ciRule: "latest_any", visibilityField: false });
  });
});

const CI = ".github/workflows/ci.yml";
const E2E = ".github/workflows/e2e.yml";
const WORKFLOW = "name: E2E\non:\n  push:\n  pull_request:\njobs: {}\n";

function files12(): ProjectFiles {
  const files = replaceIn(baseFiles(), "project", 'version_estandar: "1.0"', 'version_estandar: "1.2"');
  files.workflows = [...files.workflows, { name: "e2e.yml", content: { ok: true, text: WORKFLOW } }];
  return files;
}

const completed = (path: string, conclusion: string, at = "2026-09-30T10:00:00Z", workflowName = path.includes("e2e") ? "E2E" : "CI"): CiRun => ({
  workflowName,
  path,
  status: "completed",
  conclusion,
  at,
});

function github(perWorkflow: CiInfo["perWorkflow"], latestCompletedAny: CiRun | null): GithubData {
  const unavailable = { status: "unavailable" as const, value: null, fetchedAt: null, reason: "x" };
  return {
    applies: "yes",
    repo: "example-org/level3-demo",
    repoMismatch: null,
    repoInfo: unavailable,
    ci: { status: "ok", value: { branch: "main", latest: latestCompletedAny, latestCompletedAny, perWorkflow }, fetchedAt: "2026-09-30T12:00:00Z", reason: null },
    pulls: unavailable,
    secretAlerts: unavailable,
  };
}

const c32 = (files: ProjectFiles, data: GithubData) => evaluateProject(files, DATE, data).conformance.checks.find((c) => c.id === "3.2")!;

describe("3.2 in standard 1.2: every workflow that satisfies 3.1", () => {
  it("passes when the latest completed run of every workflow succeeded", () => {
    const data = github(
      [
        { path: CI, latestCompleted: completed(CI, "success"), inProgress: false },
        { path: E2E, latestCompleted: completed(E2E, "success"), inProgress: true },
      ],
      completed(E2E, "success"),
    );
    expect(c32(files12(), data).status).toBe("pass");
  });

  it("fails naming every workflow in red or without completed runs, even if the latest run of all is green", () => {
    const data = github(
      [
        { path: CI, latestCompleted: completed(CI, "failure", "2026-09-29T10:00:00Z"), inProgress: false },
        { path: E2E, latestCompleted: null, inProgress: false },
      ],
      completed(".github/workflows/other.yml", "success", "2026-09-30T10:00:00Z", "Other"),
    );
    expect(c32(files12(), data)).toMatchObject({
      status: "fail",
      detail: "CI: falla el 2026-09-29 en main; E2E: sin ejecuciones terminadas en main",
    });
  });

  it("fails when no workflow satisfies 3.1", () => {
    const files = files12();
    files.workflows = [{ name: "ci.yml", content: { ok: true, text: "name: CI\non: [push]\njobs: {}\n" } }];
    expect(c32(files, github([], completed(CI, "success")))).toMatchObject({ status: "fail", detail: "Ningún workflow cumple 3.1" });
  });

  it("1.1 still uses the latest completed run of any workflow", () => {
    const files = replaceIn(baseFiles(), "project", 'version_estandar: "1.0"', 'version_estandar: "1.1"');
    const data = github([{ path: CI, latestCompleted: completed(CI, "failure"), inProgress: false }], completed(E2E, "success"));
    expect(c32(files, data).status).toBe("pass");
  });
});

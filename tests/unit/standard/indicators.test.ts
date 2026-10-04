// T031: Conformidad and Avance (US2, FR-009 to FR-015, research R8).
import { describe, expect, it } from "vitest";
import { evaluateProject } from "@/lib/standard/evaluate";
import type { ProjectFiles } from "@/lib/standard/project-files";
import type { GithubData } from "@/lib/github/types";
import { baseFiles, DATE, replaceIn, roadmapFiles } from "./helpers";

const indicators = (files: ProjectFiles) => evaluateProject(files, DATE).indicators;

describe("Conformidad", () => {
  it("without GitHub data, 3.2 is out of the base: 28 of 28 on the conforming fixture, saying why", () => {
    expect(indicators(baseFiles()).conformity).toEqual({ percent: 100, passed: 28, applicable: 28, missing: [], check32: { included: false, reason: "sin datos recientes de GitHub" } });
  });

  it("names the checks that are missing", () => {
    const files = replaceIn(baseFiles(), "project", "Ninguno.", "CONFIRMAR");
    expect(indicators(files).conformity).toEqual({ percent: 96, passed: 27, applicable: 28, missing: ["1.11"], check32: { included: false, reason: "sin datos recientes de GitHub" } });
  });

  it("counts the checks that depend on a failed one as not met", () => {
    const files = baseFiles();
    files.project = { ok: false, problem: { path: "PROJECT.md", reason: "missing", detail: null } };
    const conformity = indicators(files).conformity;
    expect(conformity).toMatchObject({ applicable: 28 });
    expect("missing" in conformity && conformity.missing).toEqual(expect.arrayContaining(["1.1", "1.2", "1.11", "3.3", "3.8"]));
    expect("percent" in conformity && conformity.percent).toBeLessThan(50);
  });

  it("is absent, with its reason, for projects that are not evaluated", () => {
    const unsupported = replaceIn(baseFiles(), "project", 'version_estandar: "1.0"', 'version_estandar: "2.0"');
    expect(indicators(unsupported).conformity).toEqual({ absent: "versión del estándar no soportada" });
    const none = replaceIn(baseFiles(), "project", 'version_estandar: "1.0"\n', "");
    expect(indicators(none).conformity).toEqual({ absent: "sin versión del estándar" });
  });
});

// T018 (004-github-readonly, FR-016, FR-017): 3.2 is in the base only when it was evaluated.
describe("Conformidad with 3.2", () => {
  const ci = (conclusion: string): GithubData => {
    const run = { workflowName: "CI", path: ".github/workflows/ci.yml", status: "completed" as const, conclusion, at: "2026-09-30T10:00:00Z" };
    const unavailable = { status: "unavailable" as const, value: null, fetchedAt: null, reason: "x" };
    return {
      applies: "yes",
      repo: "example-org/level3-demo",
      repoMismatch: null,
      repoInfo: unavailable,
      ci: { status: "ok", value: { branch: "main", latest: run, latestCompletedAny: run, perWorkflow: [] }, fetchedAt: "2026-09-30T12:00:00Z", reason: null },
      pulls: unavailable,
      secretAlerts: unavailable,
    };
  };

  it("with 3.2 evaluated the base is 29 and it says so", () => {
    expect(evaluateProject(baseFiles(), DATE, ci("success")).indicators.conformity).toEqual({
      percent: 100,
      passed: 29,
      applicable: 29,
      missing: [],
      check32: { included: true },
    });
    expect(evaluateProject(baseFiles(), DATE, ci("failure")).indicators.conformity).toEqual({
      percent: 97,
      passed: 28,
      applicable: 29,
      missing: ["3.2"],
      check32: { included: true },
    });
  });
});

describe("Avance", () => {
  // 001-done 12/12, 002-partial 10/12, 003-none 0/5, a manual phase, 004-conflict 3/3 (+ manual completa).
  const roadmapStates = () =>
    roadmapFiles(
      [
        "| 1 | Base | 001-done | — | |",
        "| 2 | Parcial | 002-partial | 2027-06-01 | |",
        "| 3 | Sin empezar | 003-none | 2027-09-01 | |",
        "| 4 | Sin spec | — | 2027-12-15 | pendiente |",
        "| 5 | Contradicción | 004-conflict | — | completa |",
      ].join("\n"),
      [
        ["001-done", 12, 12],
        ["002-partial", 10, 12],
        ["003-none", 0, 5],
        ["004-conflict", 3, 3],
      ],
    );

  it("counts only the tasks of derived phases and says how many manual phases were left out", () => {
    expect(indicators(roadmapStates()).progress).toEqual({
      percent: 78,
      done: 25,
      total: 32,
      manualPhasesExcluded: 1,
      phasesCompleted: 2,
      phasesTotal: 5,
    });
  });

  it("counts a spec linked to several phases only once", () => {
    const files = roadmapFiles("| 1 | Base | 001-done | — | |\n| 2 | Ambas | 001-done, 002-partial | — | |", [
      ["001-done", 3, 3],
      ["002-partial", 1, 3],
    ]);
    expect(indicators(files).progress).toMatchObject({ done: 4, total: 6, percent: 67 });
  });

  it("counts manual completa phases in 'fases completas'", () => {
    const files = replaceIn(baseFiles(), "project", "| 2 | Reportes ficticios | — | 2027-12-15 | pendiente |", "| 2 | Reportes ficticios | — | — | completa |");
    expect(indicators(files).progress).toMatchObject({ percent: 100, done: 2, total: 2, manualPhasesExcluded: 1, phasesCompleted: 2, phasesTotal: 2 });
  });

  it("is absent, never 0 %, without a roadmap or without derived phases", () => {
    const noRoadmap = baseFiles();
    noRoadmap.project = { ok: false, problem: { path: "PROJECT.md", reason: "missing", detail: null } };
    expect(indicators(noRoadmap).progress).toEqual({ absent: "sin roadmap" });

    const onlyManual = roadmapFiles("| 1 | Sin spec | — | — | pendiente |", []);
    expect(indicators(onlyManual).progress).toEqual({ absent: "ninguna fase tiene specs con tasks.md" });
  });

  it("is absent for projects that are not evaluated: reading the roadmap depends on the standard", () => {
    const unsupported = replaceIn(baseFiles(), "project", 'version_estandar: "1.0"', 'version_estandar: "2.0"');
    expect(indicators(unsupported).progress).toEqual({ absent: "versión del estándar no soportada" });
    const none = replaceIn(baseFiles(), "project", 'version_estandar: "1.0"\n', "");
    expect(indicators(none).progress).toEqual({ absent: "sin versión del estándar" });
  });
});

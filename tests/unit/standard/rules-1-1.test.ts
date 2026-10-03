// T023: standard 1.1 rules (US5, FR-028 to FR-030, standard/lifecycle.md "Cierre y reactivación").
import { describe, expect, it } from "vitest";
import { evaluateProject } from "@/lib/standard/evaluate";
import type { ProjectFiles } from "@/lib/standard/project-files";
import { baseFiles, DATE, replaceIn, roadmapFiles } from "./helpers";

const v11 = (files: ProjectFiles = baseFiles()) => replaceIn(files, "project", 'version_estandar: "1.0"', 'version_estandar: "1.1"');
const check = (files: ProjectFiles, id: string) => evaluateProject(files, DATE).conformance.checks.find((c) => c.id === id)!;
const finding = (files: ProjectFiles, code: string) => evaluateProject(files, DATE).conformance.findings.find((f) => f.code === code);

// Roadmap of the base project: phase 1 derived (2/2 → completa), phase 2 manual pendiente.
const concludeRoadmap = (files: ProjectFiles) =>
  replaceIn(files, "project", "| 2 | Reportes ficticios | — | 2027-12-15 | pendiente |", "| 2 | Reportes ficticios | — | — | completa |");

describe("versions", () => {
  it("evaluates a project that declares 1.1 with the 1.1 rules", () => {
    expect(evaluateProject(v11(), DATE).conformance).toMatchObject({ evaluation: "evaluated", standardVersion: "1.1", level: 3 });
  });

  it("allows `retirado` without fecha_objetivo in 1.1, but not in 1.0", () => {
    const retired = (files: ProjectFiles) => {
      replaceIn(files, "project", "fase: construccion", "fase: retirado");
      return replaceIn(files, "project", "fecha_objetivo: 2027-12-15\n", "");
    };
    const in11 = retired(v11());
    expect(check(in11, "1.3").status).toBe("pass");
    expect(check(in11, "1.4").status).toBe("pass");

    const in10 = retired(baseFiles());
    expect(check(in10, "1.4")).toMatchObject({ status: "fail", detail: expect.stringMatching(/`fase: retirado` no es un valor permitido/) });
    expect(check(in10, "1.3")).toMatchObject({ status: "fail", detail: expect.stringMatching(/fecha_objetivo/) });
  });
});

describe("roadmap status", () => {
  it("is concluded when every phase is concluded (derived completa or manual completa)", () => {
    expect(evaluateProject(concludeRoadmap(baseFiles()), DATE).roadmapStatus).toBe("concluido");
  });

  it("is active when a phase is not concluded, and absent without a roadmap", () => {
    expect(evaluateProject(baseFiles(), DATE).roadmapStatus).toBe("activo");
    const files = baseFiles();
    files.project = { ok: false, problem: { path: "PROJECT.md", reason: "missing", detail: null } };
    expect(evaluateProject(files, DATE).roadmapStatus).toBeNull();
  });

  it("is active when a derived phase is not complete", () => {
    const files = roadmapFiles("| 1 | Base | 001-done | — | |\n| 2 | Parcial | 002-partial | — | |", [
      ["001-done", 3, 3],
      ["002-partial", 1, 3],
    ]);
    expect(evaluateProject(files, DATE).roadmapStatus).toBe("activo");
  });
});

describe("closure and reactivation findings (1.1 only)", () => {
  it("reports `operacion` with pending phases", () => {
    const files = v11();
    replaceIn(files, "project", "fase: construccion", "fase: operacion");
    expect(finding(files, "operacion_pending_phases")).toMatchObject({ severity: "medium", status: "found" });
    expect(finding(files, "construction_roadmap_concluded")).toMatchObject({ status: "not_found" });
  });

  it("reports `construccion` or `especificacion` with the roadmap concluded", () => {
    expect(finding(concludeRoadmap(v11()), "construction_roadmap_concluded")).toMatchObject({ severity: "medium", status: "found" });
    const spec = concludeRoadmap(v11());
    replaceIn(spec, "project", "fase: construccion", "fase: especificacion");
    expect(finding(spec, "construction_roadmap_concluded")).toMatchObject({ status: "found" });
  });

  it("does not apply them to projects that declare 1.0", () => {
    const files = concludeRoadmap(baseFiles());
    expect(finding(files, "construction_roadmap_concluded")).toBeUndefined();
    expect(finding(files, "operacion_pending_phases")).toBeUndefined();
  });

  it("does not change the level", () => {
    expect(evaluateProject(concludeRoadmap(v11()), DATE).conformance).toMatchObject({ level: 3, provisional: true });
  });
});

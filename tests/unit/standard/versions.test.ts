// T046: projects are only evaluated with a supported version of the standard (FR-026, FR-027,
// constitution XIV, contracts/conformance.md "Versiones").
import { describe, expect, it } from "vitest";
import { evaluateProject } from "@/lib/standard/evaluate";
import { isNewerThanSupported, parseChangelogVersion, SUPPORTED_STANDARD_VERSIONS } from "@/lib/standard/versions";
import { baseFiles, DATE, replaceIn } from "./helpers";

describe("evaluateProject by version", () => {
  it("evaluates a project that declares a supported version", () => {
    expect(evaluateProject(baseFiles(), DATE).conformance).toMatchObject({ evaluation: "evaluated", standardVersion: "1.0", level: 3 });
  });

  it("does not evaluate a project that declares an unsupported version, but keeps its manifest", () => {
    const files = replaceIn(baseFiles(), "project", 'version_estandar: "1.0"', 'version_estandar: "2.0"');
    const result = evaluateProject(files, DATE);
    expect(result.conformance).toEqual({
      standardVersion: null,
      evaluation: "unsupported_version",
      level: null,
      provisional: false,
      checks: [],
      failures: [],
      warnings: [],
      findings: [],
    });
    expect(result.manifest).toMatchObject({ id: "level3-demo", version_estandar: "2.0" });
    expect(result.roadmap).not.toBeNull();
  });

  it("treats a version that is not text as unsupported", () => {
    const files = replaceIn(baseFiles(), "project", 'version_estandar: "1.0"', "version_estandar: 1.0");
    expect(evaluateProject(files, DATE).conformance.evaluation).toBe("unsupported_version");
  });

  it("does not evaluate a project without version_estandar", () => {
    const files = replaceIn(baseFiles(), "project", 'version_estandar: "1.0"\n', "");
    expect(evaluateProject(files, DATE).conformance).toMatchObject({ evaluation: "no_version", level: null, checks: [] });
  });

  it("evaluates with 1.0, at level 0, a project without PROJECT.md or with unreadable YAML", () => {
    const missing = baseFiles();
    missing.project = { ok: false, problem: { path: "PROJECT.md", reason: "missing", detail: null } };
    expect(evaluateProject(missing, DATE).conformance).toMatchObject({ evaluation: "evaluated", standardVersion: "1.0", level: 0 });

    const broken = replaceIn(baseFiles(), "project", "nombre: Proyecto Demo Nivel 3", "nombre: [sin cerrar");
    expect(evaluateProject(broken, DATE).conformance).toMatchObject({ evaluation: "evaluated", level: 0 });
  });
});

describe("versions", () => {
  it("supports 1.0 and 1.1", () => {
    expect(SUPPORTED_STANDARD_VERSIONS).toEqual(["1.0", "1.1"]);
  });

  it("reads the first version of the CHANGELOG as MAJOR.MINOR", () => {
    expect(parseChangelogVersion("# Historial\n\n## [1.1.0] - 2026-11-01\n\n## [1.0.0] - 2026-09-28\n")).toBe("1.1");
    expect(parseChangelogVersion("# Sin versiones\n")).toBeNull();
  });

  it("knows when the local standard is newer than the supported versions", () => {
    expect(isNewerThanSupported("1.0")).toBe(false);
    expect(isNewerThanSupported("1.1")).toBe(false);
    expect(isNewerThanSupported("1.2")).toBe(true);
    expect(isNewerThanSupported("2.0")).toBe(true);
    expect(isNewerThanSupported("0.9")).toBe(false);
  });
});

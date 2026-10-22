// T028: notice of a newer supported version (FR-028). Not a finding; changes neither the level nor
// Conformidad; the number comes from the newest supported version.
import { describe, expect, it } from "vitest";
import { evaluateProject } from "@/lib/standard/evaluate";
import { newerStandardNotice } from "@/lib/standard/versions";
import { baseFiles, DATE, replaceIn } from "./helpers";

const version = (v: string) => replaceIn(baseFiles(), "project", 'version_estandar: "1.0"', `version_estandar: "${v}"`);

describe("newer version notice", () => {
  // T003 (005-standard-1-3): the notice says what the jump from the project's version adds.
  it("names the newest supported version and what the jump adds", () => {
    expect(newerStandardNotice("1.0")).toBe("hay una versión más nueva del estándar (1.3) con reglas más estrictas de CI y visibilidad, y la sección opcional ## Incrementos planeados");
    expect(newerStandardNotice("1.1")).toBe("hay una versión más nueva del estándar (1.3) con reglas más estrictas de CI y visibilidad, y la sección opcional ## Incrementos planeados");
    expect(newerStandardNotice("1.2")).toBe("hay una versión más nueva del estándar (1.3): agrega la sección opcional ## Incrementos planeados");
    expect(newerStandardNotice("1.3")).toBeNull();
  });

  // Explicit text (owner, 2026-10-22): it names 1.3 and everything the jump from 1.0 or 1.1 adds.
  const STRICTER = "hay una versión más nueva del estándar (1.3) con reglas más estrictas de CI y visibilidad, y la sección opcional ## Incrementos planeados";

  it.each(["1.0", "1.1"])("projects in %s get it; level, Conformidad and findings do not change", (v) => {
    const result = evaluateProject(version(v), DATE);
    expect(result.conformance.newerStandardNotice).toBe(STRICTER);
    expect(result.conformance.newerStandardNotice).toContain("(1.3)");
    expect(result.conformance.newerStandardNotice).toContain("reglas más estrictas de CI y visibilidad");
    expect(result.conformance.newerStandardNotice).toContain("la sección opcional ## Incrementos planeados");
    expect(result.conformance.findings.map((f) => f.detail)).not.toContain(STRICTER);
    expect(result.conformance).toMatchObject({ level: 3, provisional: true });
  });

  it("projects in 1.3, and projects that are not evaluated, get no notice", () => {
    expect(evaluateProject(version("1.3"), DATE).conformance.newerStandardNotice).toBeNull();
    expect(evaluateProject(version("2.0"), DATE).conformance.newerStandardNotice).toBeNull();
  });
});

// T028: notice of a newer supported version (FR-028). Not a finding; changes neither the level nor
// Conformidad; the number comes from the newest supported version.
import { describe, expect, it } from "vitest";
import { evaluateProject } from "@/lib/standard/evaluate";
import { newerStandardNotice } from "@/lib/standard/versions";
import { baseFiles, DATE, replaceIn } from "./helpers";

const version = (v: string) => replaceIn(baseFiles(), "project", 'version_estandar: "1.0"', `version_estandar: "${v}"`);

describe("newer version notice", () => {
  it("names the newest supported version", () => {
    expect(newerStandardNotice("1.0")).toBe("hay una versión más nueva del estándar (1.2) con reglas más estrictas de CI y visibilidad");
    expect(newerStandardNotice("1.2")).toBeNull();
  });

  it.each(["1.0", "1.1"])("projects in %s get it; level, Conformidad and findings do not change", (v) => {
    const result = evaluateProject(version(v), DATE);
    expect(result.conformance.newerStandardNotice).toBe(newerStandardNotice(v));
    expect(result.conformance.findings.map((f) => f.detail)).not.toContain(newerStandardNotice(v));
    expect(result.conformance).toMatchObject({ level: 3, provisional: true });
  });

  it("projects in 1.2, and projects that are not evaluated, get no notice", () => {
    expect(evaluateProject(version("1.2"), DATE).conformance.newerStandardNotice).toBeNull();
    expect(evaluateProject(version("2.0"), DATE).conformance.newerStandardNotice).toBeNull();
  });
});

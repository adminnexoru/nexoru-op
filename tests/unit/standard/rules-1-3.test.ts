// T001 and T002 (005-standard-1-3): standard 1.3 has the rules of 1.2 plus the optional section
// ## Incrementos planeados, checked in 1.8 (standard/conformance.md 1.3). Its rows are never phases.
import { describe, expect, it } from "vitest";
import { evaluateProject } from "@/lib/standard/evaluate";
import type { ProjectFiles } from "@/lib/standard/project-files";
import { RULES } from "@/lib/standard/rules";
import { isNewerThanSupported, SUPPORTED_STANDARD_VERSIONS } from "@/lib/standard/versions";
import { baseFiles, DATE, replaceIn, roadmapFiles } from "./helpers";

const SECTION = `## Incrementos planeados

| Incremento | Objetivo | Prioridad | Referencia |
|---|---|---|---|
| Exportes ficticios | Exportar reportes ficticios a CSV | media | B-001 |
| Panel ficticio | Un panel ficticio de ventas | baja | — |

`;

const withVersion = (files: ProjectFiles, v: string) => replaceIn(files, "project", 'version_estandar: "1.0"', `version_estandar: "${v}"`);

/** Inserts the section right before the given H2 heading. */
function withSection(files: ProjectFiles, before: string, section = SECTION): ProjectFiles {
  return replaceIn(files, "project", `## ${before}\n`, `${section}## ${before}\n`);
}

const check18 = (files: ProjectFiles) => evaluateProject(files, DATE).conformance.checks.find((c) => c.id === "1.8")!;

describe("versions and rules", () => {
  it("supports 1.0 to 1.3; 1.3 is not newer than the supported ones", () => {
    expect(SUPPORTED_STANDARD_VERSIONS).toEqual(["1.0", "1.1", "1.2", "1.3"]);
    expect(isNewerThanSupported("1.3")).toBe(false);
    expect(isNewerThanSupported("1.4")).toBe(true);
  });

  it("1.3 is 1.2 plus the check of ## Incrementos planeados; earlier versions do not check it", () => {
    expect(RULES["1.3"]).toEqual({ ...RULES["1.2"], version: "1.3", plannedIncrements: true });
    for (const v of ["1.0", "1.1", "1.2"] as const) expect(RULES[v].plannedIncrements).toBe(false);
  });

  it("a 1.3 project without the section is evaluated with 1.3 exactly as 1.2", () => {
    const as13 = evaluateProject(withVersion(baseFiles(), "1.3"), DATE).conformance;
    const as12 = evaluateProject(withVersion(baseFiles(), "1.2"), DATE).conformance;
    expect(as13.standardVersion).toBe("1.3");
    expect(as13.level).toBe(as12.level);
    expect(as13.checks).toEqual(as12.checks);
  });
});

describe("1.8 with ## Incrementos planeados (1.3)", () => {
  it("passes without the section", () => {
    expect(check18(withVersion(baseFiles(), "1.3")).status).toBe("pass");
  });

  it("passes with the section between ## Roadmap and ## Decisiones clave", () => {
    expect(check18(withSection(withVersion(baseFiles(), "1.3"), "Decisiones clave")).status).toBe("pass");
  });

  it("passes with the header and no rows", () => {
    const empty = "## Incrementos planeados\n\n| Incremento | Objetivo | Prioridad | Referencia |\n|---|---|---|---|\n\n";
    expect(check18(withSection(withVersion(baseFiles(), "1.3"), "Decisiones clave", empty)).status).toBe("pass");
  });

  it.each(["Costo mensual", "Roadmap"])("fails when the section is before ## %s", (before) => {
    expect(check18(withSection(withVersion(baseFiles(), "1.3"), before))).toMatchObject({
      status: "fail",
      detail: "`## Incrementos planeados` debe ir entre `## Roadmap` y `## Decisiones clave`",
    });
  });

  it("fails without the table with the exact header", () => {
    const noTable = "## Incrementos planeados\n\n| Incremento | Objetivo | Prioridad |\n|---|---|---|\n| X | Y | alta |\n\n";
    expect(check18(withSection(withVersion(baseFiles(), "1.3"), "Decisiones clave", noTable))).toMatchObject({
      status: "fail",
      detail: "`## Incrementos planeados` no tiene la tabla Incremento | Objetivo | Prioridad | Referencia",
    });
  });

  it("fails naming a priority that is not alta, media or baja", () => {
    const bad = SECTION.replace("| media |", "| urgente |");
    expect(check18(withSection(withVersion(baseFiles(), "1.3"), "Decisiones clave", bad))).toMatchObject({
      status: "fail",
      detail: "`## Incrementos planeados`: Exportes ficticios tiene la prioridad urgente (permitidas: alta, media, baja)",
    });
  });

  it("in a 1.2 project the misplaced section does not change 1.8", () => {
    expect(check18(withSection(withVersion(baseFiles(), "1.2"), "Costo mensual")).status).toBe("pass");
  });
});

describe("planned increments are never phases", () => {
  // A concluded roadmap (one derived phase, 12/12) in operacion.
  const concluded = () => {
    const files = roadmapFiles("| 1 | Módulo ficticio | 001-done | — | |", [["001-done", 12, 12]]);
    replaceIn(files, "project", "fase: construccion", "fase: operacion");
    return withVersion(files, "1.3");
  };

  it("keeps the roadmap concluded, the same Avance and no closure finding", () => {
    const without = evaluateProject(concluded(), DATE);
    const withRows = evaluateProject(withSection(concluded(), "Decisiones clave"), DATE);
    expect(withRows.roadmapStatus).toBe("concluido");
    expect(withRows.roadmap).toEqual(without.roadmap);
    expect(withRows.indicators.progress).toEqual(without.indicators.progress);
    const pending = withRows.conformance.findings.find((f) => f.code === "operacion_pending_phases");
    expect(pending?.status).toBe("not_found");
    expect(withRows.conformance.checks.find((c) => c.id === "1.8")?.status).toBe("pass");
  });
});

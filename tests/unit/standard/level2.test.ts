// T012: level 2 checks 2.1–2.10 and their warnings (contracts/conformance.md).
import { describe, expect, it } from "vitest";
import type { ProjectFiles } from "@/lib/standard/project-files";
import { baseFiles, check, evaluate, replaceIn } from "./helpers";

type Case = [string, string, (f: ProjectFiles) => unknown, RegExp];
const map = (from: string, to: string) => (f: ProjectFiles) => replaceIn(f, "map", from, to);
const claude = (from: string, to: string) => (f: ProjectFiles) => replaceIn(f, "claude", from, to);

describe("level 2 passes on the conforming fixture", () => {
  it.each(["2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "2.9", "2.10"])("%s", (id) => {
    expect(check(baseFiles(), id)).toMatchObject({ id, level: 2, status: "pass" });
  });
});

const failing: Case[] = [
  ["2.1", "missing map", (f) => (f.map = { ok: false, problem: { path: "docs/mapa-funcional.md", reason: "missing", detail: null } }), /No existe docs\/mapa-funcional\.md/],
  ["2.1", "map too large", (f) => (f.map = { ok: false, problem: { path: "docs/mapa-funcional.md", reason: "too_large", detail: null } }), /más de 1 MB/],
  ["2.2", "proyecto differs from id", map("proyecto: level3-demo", "proyecto: otro"), /`proyecto`/],
  ["2.2", "wrong tipo_documento", map("tipo_documento: mapa-funcional", "tipo_documento: mapa"), /tipo_documento/],
  ["2.2", "missing version_estandar", map('version_estandar: "1.0"\n', ""), /version_estandar/],
  ["2.3", "missing section", map("## Integraciones\n\n- Ninguna.\n", ""), /Integraciones/],
  ["2.3", "sections out of order", map("## Misión", "## Componentes previos\n\n## Flujo\n\n## Misión"), /orden/],
  ["2.4", "no mermaid block", map("```mermaid", "```text"), /mermaid/],
  ["2.5", "CONFIRMAR", map("Demostrar un proyecto conforme.", "CONFIRMAR"), /CONFIRMAR en la línea \d+/],
  ["2.6", "roadmap state in a cell", map("| Módulo ficticio | Nada real |", "| Módulo ficticio | en-curso |"), /en-curso/],
  ["2.6", "column titled Fecha objetivo", map("| Componente | Qué hace |", "| Componente | Fecha objetivo |"), /Fecha objetivo/],
  ["2.7", "missing CLAUDE.md", (f) => (f.claude = { ok: false, problem: { path: "CLAUDE.md", reason: "missing", detail: null } }), /CLAUDE\.md/],
  ["2.7", "CLAUDE.md through a secret file", (f) => (f.claude = { ok: false, problem: { path: "CLAUDE.md", reason: "secret_file", detail: null } }), /secreto/],
  ["2.7", "no project documentation section", claude("## Documentación de proyecto (Estándar Nexoru)", "## Otra sección"), /Documentación de proyecto/],
  ["2.8", "section does not mention specs/", claude("La fuente de verdad técnica es `specs/`.", "Sin más."), /specs\//],
  ["2.9", "no .specify", (f) => (f.specifyDir = false), /\.specify/],
  ["2.9", "no constitution", (f) => (f.constitution = false), /constitution\.md/],
  ["2.10", "no specs folder", (f) => ((f.specsDir = false), (f.specs = [])), /specs\//],
  ["2.10", "spec folder without spec.md", (f) => (f.specs[0].hasSpec = false), /001-demo/],
];

describe("level 2 failures", () => {
  it.each(failing)("%s fails: %s", (id, _name, mutate, detail) => {
    const files = baseFiles();
    mutate(files);
    const result = check(files, id);
    expect(result.status).toBe("fail");
    expect(result.detail).toMatch(detail);
  });

  it("ignores roadmap states and forbidden columns inside code blocks", () => {
    const files = replaceIn(baseFiles(), "map", "## Integraciones", "```md\n| Estado |\n|---|\n| completa |\n```\n\n## Integraciones");
    expect(check(files, "2.6").status).toBe("pass");
  });
});

describe("level 2 warnings", () => {
  it("warns about specs without plan.md or tasks.md and tasks.md without checkboxes", () => {
    const files = baseFiles();
    files.specs.push({ name: "002-extra", hasSpec: true, hasPlan: false, tasks: null });
    files.specs.push({ name: "003-empty", hasSpec: true, hasPlan: true, tasks: { ok: true, text: "# Sin casillas\n" } });
    const warnings = evaluate(files).conformance.warnings.map((w) => `${w.path}: ${w.detail}`);
    expect(warnings).toEqual([
      "specs/002-extra/plan.md: La spec `002-extra` no tiene plan.md",
      "specs/002-extra/tasks.md: La spec `002-extra` no tiene tasks.md",
      "specs/003-empty/tasks.md: El tasks.md de `003-empty` no tiene casillas",
    ]);
    expect(check(files, "2.10").status).toBe("pass");
  });
});

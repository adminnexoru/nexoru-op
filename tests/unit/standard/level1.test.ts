// T011: level 1 checks 1.1–1.11, one passing and one failing case each (contracts/conformance.md).
import { describe, expect, it } from "vitest";
import type { ProjectFiles } from "@/lib/standard/project-files";
import { baseFiles, check, evaluate, replaceIn } from "./helpers";

type Case = [string, string, (f: ProjectFiles) => unknown, RegExp];

const project = (from: string, to: string) => (f: ProjectFiles) => replaceIn(f, "project", from, to);

const SCOPE = "## Alcance\n\n**Incluye:** un módulo ficticio. **Fuera de alcance:** todo lo demás.\n\n";
function moveScopeAfterRoadmap(f: ProjectFiles) {
  replaceIn(f, "project", SCOPE, "");
  replaceIn(f, "project", "## Decisiones clave", `${SCOPE}## Decisiones clave`);
}

describe("level 1 passes on the conforming fixture", () => {
  it.each(["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9", "1.10", "1.11"])("%s", (id) => {
    expect(check(baseFiles(), id)).toMatchObject({ id, level: 1, status: "pass" });
  });
});

const failing: Case[] = [
  ["1.1", "missing PROJECT.md", (f) => (f.project = { ok: false, problem: { path: "PROJECT.md", reason: "missing", detail: null } }), /No existe PROJECT\.md/],
  ["1.1", "PROJECT.md outside the portfolio", (f) => (f.project = { ok: false, problem: { path: "PROJECT.md", reason: "outside_root", detail: null } }), /fuera del portafolio/],
  ["1.2", "no frontmatter", (f) => (f.project = { ok: true, text: "# Sin frontmatter\n" }), /bloque YAML/],
  ["1.2", "invalid YAML", project("nombre: Proyecto Demo Nivel 3", "nombre: [sin cerrar"), /no se puede interpretar \(cerca de la línea 4\)/],
  ["1.3", "missing field", project("repo: example-org/level3-demo\n", ""), /Falta el campo `repo`/],
  ["1.3", "wrong type", project("costo_mensual_usd: 12", 'costo_mensual_usd: "12"'), /`costo_mensual_usd` debe ser número/],
  ["1.3", "urls required by despliegue", project("despliegue: local", "despliegue: nexoru-subdominio"), /Falta el campo `urls`/],
  ["1.3", "fecha_objetivo required outside operacion/pausado", project("fecha_objetivo: 2027-12-15\n", ""), /Falta el campo `fecha_objetivo`/],
  ["1.4", "enum value", project("estado: verde", "estado: amarillo"), /`estado: amarillo` no es un valor permitido/],
  ["1.4", "id format", project("id: level3-demo", "id: Level3_Demo"), /`id`/],
  ["1.4", "mapa_funcional path", project("mapa_funcional: docs/mapa-funcional.md", "mapa_funcional: docs/otro.md"), /mapa_funcional/],
  ["1.5", "nested value", project("stack:\n  - nextjs", "stack:\n  - nombre: nextjs"), /`stack`/],
  ["1.6", "impossible date", project("fecha_inicio: 2026-01-10", "fecha_inicio: 2026-02-30"), /`fecha_inicio`/],
  ["1.6", "wrong date format", project("fecha_inicio: 2026-01-10", "fecha_inicio: 2026/01/10"), /AAAA-MM-DD/],
  ["1.7", "fase_desde in the future", project("fase_desde: 2026-01-15", "fase_desde: 2027-01-15"), /fase_desde/],
  ["1.7", "fecha_objetivo before fecha_inicio", project("fecha_objetivo: 2027-12-15", "fecha_objetivo: 2025-12-15"), /fecha_objetivo/],
  ["1.7", "empty urls with a Nexoru subdomain", project("despliegue: local", "despliegue: nexoru-subdominio\nurls: []"), /urls/],
  ["1.7", "repo differs from origin", (f) => (f.git.originRepo = "example-org/otro"), /origin es example-org\/otro/],
  ["1.7", "not a git repository", (f) => (f.git = { ...f.git, isRepo: false, originRepo: null }), /no es repositorio git/],
  ["1.7", "no origin remote", (f) => (f.git.originRepo = null), /sin remoto origin/],
  ["1.7", "Total differs from costo_mensual_usd", project("costo_mensual_usd: 12", "costo_mensual_usd: 13"), /Total/],
  ["1.7", "map file missing", (f) => (f.mapExists = false), /mapa_funcional/],
  ["1.8", "missing section", project("## Pendientes conocidos\n", ""), /Falta `## Pendientes conocidos`/],
  ["1.8", "section out of order", moveScopeAfterRoadmap, /`## Alcance` está fuera de orden/],
  ["1.9", "no success metrics line", project("**Métricas de éxito:** (1) todas las pruebas en verde.", "Sin métricas."), /Métricas de éxito/],
  ["1.10", "wrong header", project("| Servicio | USD/mes | Nota |", "| Servicio | Costo | Nota |"), /Servicio \| USD\/mes \| Nota/],
  ["1.10", "missing service row", project("| API Demo (`api-demo`) | 12 | Ficticio |\n", ""), /`api-demo`/],
  ["1.10", "missing Total row", project("| **Total** | **12** | |\n", ""), /Total/],
  ["1.11", "CONFIRMAR in the file", project("Ninguno.", "CONFIRMAR"), /CONFIRMAR en la línea \d+/],
];

describe("level 1 failures", () => {
  it.each(failing)("%s fails: %s", (id, _name, mutate, detail) => {
    const files = baseFiles();
    mutate(files);
    const result = check(files, id);
    expect(result.status).toBe("fail");
    expect(result.detail).toMatch(detail);
  });
});

describe("level 1 allowed variants", () => {
  it("does not require fecha_objetivo in operacion", () => {
    const files = replaceIn(baseFiles(), "project", "fase: construccion", "fase: operacion");
    replaceIn(files, "project", "fecha_objetivo: 2027-12-15\n", "");
    expect(check(files, "1.3").status).toBe("pass");
  });

  it("counts — as 0 in the cost table", () => {
    const files = replaceIn(baseFiles(), "project", "costo_mensual_usd: 12", "costo_mensual_usd: 0");
    replaceIn(files, "project", "| API Demo (`api-demo`) | 12 | Ficticio |", "| API Demo (`api-demo`) | — | Sin costo |");
    replaceIn(files, "project", "| **Total** | **12** | |", "| **Total** | **0** | |");
    expect(check(files, "1.7").status).toBe("pass");
    expect(check(files, "1.10").status).toBe("pass");
  });

  it("marks checks that need a readable frontmatter as not evaluated instead of failing them again", () => {
    const files = baseFiles();
    files.project = { ok: false, problem: { path: "PROJECT.md", reason: "missing", detail: null } };
    const { conformance } = evaluate(files);
    expect(conformance.failures.map((c) => c.id)).toEqual(["1.1"]);
    expect(conformance.checks.find((c) => c.id === "1.3")).toMatchObject({ status: "not_evaluated" });
  });
});

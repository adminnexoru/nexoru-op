// T024: level 2 checks 2.1–2.10 and the Spec Kit warnings (standard/conformance.md v1.0).
import type { Check, Problem } from "@/lib/portfolio/types";
import { firstLineContaining, h2Headings, hasMermaidBlock, sectionText, tables, taskCheckboxes } from "../markdown";
import { describeProblem, dependsOn, fail, fromIssues, pass, type Context } from "./context";

export const MAP_SECTIONS = ["Misión", "Componentes", "Flujo", "Reglas de negocio no negociables", "Datos y fuentes", "Integraciones"];
const ROADMAP_STATE_VALUES = ["completa", "en-curso", "implementada-sin-validar", "bloqueada", "pendiente"];
const FORBIDDEN_COLUMNS = ["Estado", "Estado manual", "Fecha objetivo"];
const DOC_SECTION = /^## Documentación de proyecto/;

function mapFrontmatterIssues(ctx: Context): string[] {
  if (ctx.mapFm?.status !== "ok") return ["El mapa no empieza con un frontmatter YAML válido"];
  const { data } = ctx.mapFm;
  const issues: string[] = [];
  const id = ctx.manifest?.id ?? null;
  if (data.proyecto !== id || id === null) {
    issues.push(`\`proyecto\` (${String(data.proyecto ?? "ausente")}) no coincide con el \`id\` de PROJECT.md (${id ?? "ausente"})`);
  }
  if (data.tipo_documento !== "mapa-funcional") issues.push("`tipo_documento` debe ser mapa-funcional");
  if (typeof data.version_estandar !== "string" || data.version_estandar === "") issues.push("Falta `version_estandar`");
  return issues;
}

function mapSectionIssues(text: string): string[] {
  const headings = h2Headings(text).map((h) => h.title.toLowerCase());
  const positions = MAP_SECTIONS.map((title) => ({ title, position: headings.indexOf(title.toLowerCase()) }));
  const issues = positions.filter((p) => p.position === -1).map((p) => `Falta la sección ${p.title}`);
  const present = positions.filter((p) => p.position !== -1).map((p) => p.position);
  if (present.some((position, i) => i > 0 && position < present[i - 1])) {
    issues.push(`Las secciones no están en el orden ${MAP_SECTIONS.join(", ")}`);
  }
  return issues;
}

function stateColumnIssues(text: string): string[] {
  const issues: string[] = [];
  for (const table of tables(text)) {
    for (const column of table.header.filter((cell) => FORBIDDEN_COLUMNS.includes(cell))) {
      issues.push(`La tabla de la línea ${table.line} tiene la columna \`${column}\``);
    }
    for (const cell of table.rows.flat().filter((value) => ROADMAP_STATE_VALUES.includes(value))) {
      issues.push(`La tabla de la línea ${table.line} tiene el estado \`${cell}\``);
    }
  }
  return issues;
}

export function level2(ctx: Context): Check[] {
  const { files } = ctx;
  const checks: Check[] = [];

  if (ctx.mapText === null) {
    const problem = files.map.ok ? null : files.map.problem;
    checks.push(fail("2.1", problem ? describeProblem("docs/mapa-funcional.md", problem) : "No existe docs/mapa-funcional.md"));
    checks.push(...["2.2", "2.3", "2.4", "2.5", "2.6"].map((id) => dependsOn(id, "2.1")));
  } else {
    const text = ctx.mapText;
    checks.push(pass("2.1"));
    checks.push(fromIssues("2.2", mapFrontmatterIssues(ctx)));
    checks.push(fromIssues("2.3", mapSectionIssues(text)));
    checks.push(hasMermaidBlock(text) ? pass("2.4") : fail("2.4", "El mapa no tiene un bloque ```mermaid"));
    const confirmLine = firstLineContaining(text, "CONFIRMAR");
    checks.push(confirmLine === null ? pass("2.5") : fail("2.5", `CONFIRMAR en la línea ${confirmLine}`));
    checks.push(fromIssues("2.6", stateColumnIssues(text)));
  }

  if (!files.claude.ok) {
    checks.push(fail("2.7", describeProblem("CLAUDE.md", files.claude.problem)), dependsOn("2.8", "2.7"));
  } else if (!files.claude.text.split("\n").some((line) => DOC_SECTION.test(line))) {
    checks.push(fail("2.7", "CLAUDE.md no tiene la sección ## Documentación de proyecto"), dependsOn("2.8", "2.7"));
  } else {
    checks.push(pass("2.7"));
    const heading = files.claude.text.split("\n").find((line) => DOC_SECTION.test(line))!.slice(3);
    const section = sectionText(files.claude.text, heading) ?? "";
    const missing = ["PROJECT.md", "docs/mapa-funcional.md", "specs/"].filter((needle) => !section.includes(needle));
    checks.push(fromIssues("2.8", missing.map((needle) => `La sección no menciona ${needle}`)));
  }

  const specifyIssues = [
    ...(files.specifyDir ? [] : ["No existe .specify/"]),
    ...(files.constitution ? [] : ["No existe .specify/memory/constitution.md"]),
  ];
  checks.push(fromIssues("2.9", specifyIssues));

  if (!files.specsDir || files.specs.length === 0) {
    checks.push(fail("2.10", "No existe specs/ con al menos una carpeta NNN-nombre"));
  } else {
    checks.push(fromIssues("2.10", files.specs.filter((s) => !s.hasSpec).map((s) => `La carpeta \`${s.name}\` no tiene spec.md`)));
  }
  return checks;
}

/** Spec folders without plan.md or tasks.md, or with a tasks.md without checkboxes. */
export function specWarnings(ctx: Context): Problem[] {
  const warnings: Problem[] = [];
  for (const spec of ctx.files.specs) {
    const base = `specs/${spec.name}`;
    if (!spec.hasPlan) {
      warnings.push({ path: `${base}/plan.md`, reason: "missing", detail: `La spec \`${spec.name}\` no tiene plan.md` });
    }
    if (spec.tasks === null) {
      warnings.push({ path: `${base}/tasks.md`, reason: "missing", detail: `La spec \`${spec.name}\` no tiene tasks.md` });
    } else if (!spec.tasks.ok) {
      warnings.push({
        ...spec.tasks.problem,
        path: `${base}/tasks.md`,
        detail: `${describeProblem(`${base}/tasks.md`, spec.tasks.problem)}; su fase no tiene estado derivado`,
      });
    } else if (taskCheckboxes(spec.tasks.text).total === 0) {
      warnings.push({ path: `${base}/tasks.md`, reason: "no_checkboxes", detail: `El tasks.md de \`${spec.name}\` no tiene casillas` });
    }
  }
  return warnings;
}

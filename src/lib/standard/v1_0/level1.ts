// T023: level 1 checks 1.1–1.11 (standard/conformance.md v1.0, contracts/conformance.md).
import type { Check, Manifest } from "@/lib/portfolio/types";
import type { FrontmatterViolation } from "../frontmatter";
import { firstLineContaining, h2Headings, sectionText, tables } from "../markdown";
import { describeProblem, dependsOn, fail, fromIssues, pass, type Context } from "./context";
import { DEPLOYMENTS_WITH_URLS, ENUMS, FIELDS, hasValidType, isRequired, isValidDate, KIND_LABEL } from "./manifest";

export const PROJECT_SECTIONS = [
  "Resumen ejecutivo",
  "Alcance",
  "Roadmap",
  "Decisiones clave",
  "Costo mensual",
  "Riesgos, bloqueos y dependencias",
  "Pendientes conocidos",
  "Evidencia de validación",
  "Siguiente hito",
];

const COST_HEADER = ["Servicio", "USD/mes", "Nota"];

const VIOLATION_LABEL: Record<FrontmatterViolation["kind"], string> = {
  nested: "contiene un objeto o una lista anidada",
  anchor: "usa un ancla de YAML",
  alias: "usa un alias de YAML",
  block_scalar: "usa un bloque multilínea (| o >)",
};
const ID_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const stripBold = (value: string) => value.replace(/\*/g, "").trim();

/** Rows of the ## Costo mensual table, or null when the table is missing. */
export function costTable(body: string): string[][] | null {
  const section = sectionText(body, "Costo mensual");
  if (section === null) return null;
  return tables(section).find((t) => t.header.join("|") === COST_HEADER.join("|"))?.rows ?? null;
}

/** Value of the Total row ("—" counts as 0), or null when there is no Total row. */
export function costTotal(rows: string[][]): number | null {
  const total = rows.find((row) => stripBold(row[0] ?? "") === "Total");
  if (!total) return null;
  const value = stripBold(total[1] ?? "").replace(/\s/g, "");
  return value === "—" || value === "" ? 0 : Number(value);
}

function fieldIssues(data: Record<string, unknown>): string[] {
  const issues: string[] = [];
  for (const [field, kind] of Object.entries(FIELDS) as [keyof Manifest, (typeof FIELDS)[keyof Manifest]][]) {
    const value = data[field];
    if (value === undefined || value === null || value === "") {
      if (isRequired(field, data)) issues.push(`Falta el campo \`${field}\``);
    } else if (!hasValidType(value, kind)) {
      issues.push(`\`${field}\` debe ser ${KIND_LABEL[kind]}`);
    }
  }
  return issues;
}

function formatIssues(manifest: Manifest): string[] {
  const issues: string[] = [];
  for (const [field, allowed] of Object.entries(ENUMS) as [keyof Manifest, readonly string[]][]) {
    const value = manifest[field];
    if (typeof value === "string" && !allowed.includes(value)) issues.push(`\`${field}: ${value}\` no es un valor permitido`);
  }
  if (manifest.id !== null && !ID_FORMAT.test(manifest.id)) issues.push(`\`id\` (${manifest.id}) no tiene el formato permitido`);
  if (manifest.version_estandar !== null && !/^\d+\.\d+$/.test(manifest.version_estandar)) {
    issues.push(`\`version_estandar\` debe tener el formato "MAJOR.MINOR"`);
  }
  if (manifest.mapa_funcional !== null && manifest.mapa_funcional !== "docs/mapa-funcional.md") {
    issues.push("`mapa_funcional` debe ser docs/mapa-funcional.md");
  }
  if (manifest.repo !== null && !/^[^/\s]+\/[^/\s]+$/.test(manifest.repo)) issues.push("`repo` debe tener el formato organizacion/nombre");
  if (manifest.urls?.some((url) => !url.startsWith("https://"))) issues.push("`urls` debe contener URLs https://");
  return issues;
}

function dateIssues(manifest: Manifest): string[] {
  return (["fase_desde", "fecha_inicio", "fecha_objetivo"] as const)
    .filter((field) => manifest[field] !== null && !isValidDate(manifest[field]!))
    .map((field) => `\`${field}\` no tiene formato AAAA-MM-DD o no es una fecha válida`);
}

function crossIssues(ctx: Context, manifest: Manifest): string[] {
  const issues: string[] = [];
  const valid = (date: string | null): date is string => date !== null && isValidDate(date);
  if (valid(manifest.fase_desde) && manifest.fase_desde > ctx.date) {
    issues.push(`\`fase_desde\` (${manifest.fase_desde}) es posterior a la fecha de evaluación (${ctx.date})`);
  }
  if (valid(manifest.fecha_objetivo) && valid(manifest.fecha_inicio) && manifest.fecha_objetivo < manifest.fecha_inicio) {
    issues.push("`fecha_objetivo` es anterior a `fecha_inicio`");
  }
  if (DEPLOYMENTS_WITH_URLS.includes(manifest.despliegue ?? "") && manifest.urls?.length === 0) {
    issues.push(`\`urls\` está vacía con \`despliegue: ${manifest.despliegue}\``);
  }
  // FR-031: without a git repository or an origin remote the check fails.
  const { git } = ctx.files;
  if (!git.isRepo) issues.push("`repo` no se puede comparar: no es repositorio git");
  else if (git.originRepo === null) issues.push("`repo` no se puede comparar: sin remoto origin en GitHub");
  else if (manifest.repo !== null && manifest.repo.toLowerCase() !== git.originRepo) {
    issues.push(`\`repo\` es ${manifest.repo} pero origin es ${git.originRepo}`);
  }
  const rows = ctx.body === null ? null : costTable(ctx.body);
  const total = rows === null ? null : costTotal(rows);
  if (manifest.costo_mensual_usd !== null && total !== null && total !== manifest.costo_mensual_usd) {
    issues.push(`\`costo_mensual_usd\` (${manifest.costo_mensual_usd}) no coincide con la fila Total (${total})`);
  }
  if (!ctx.files.mapExists) issues.push("`mapa_funcional` apunta a un archivo que no existe");
  return issues;
}

function sectionOrderIssues(body: string): string[] {
  const headings = h2Headings(body).map((h) => h.title.toLowerCase());
  const positions = PROJECT_SECTIONS.map((title) => ({ title, position: headings.indexOf(title.toLowerCase()) }));
  const issues = positions.filter((p) => p.position === -1).map((p) => `Falta \`## ${p.title}\``);
  const present = positions.filter((p) => p.position !== -1);
  present.forEach((p, i) => {
    if (i + 1 < present.length && p.position > present[i + 1].position) issues.push(`\`## ${p.title}\` está fuera de orden`);
  });
  return issues;
}

function costIssues(body: string, servicios: string[]): string[] {
  const rows = costTable(body);
  if (rows === null) return ["`## Costo mensual` no tiene la tabla Servicio | USD/mes | Nota"];
  const issues = servicios
    .filter((service) => !rows.some((row) => (row[0] ?? "").includes(service)))
    .map((service) => `Falta la fila del servicio \`${service}\``);
  if (costTotal(rows) === null) issues.push("Falta la fila Total");
  return issues;
}

export function level1(ctx: Context): Check[] {
  if (!ctx.files.project.ok) {
    const detail = describeProblem("PROJECT.md", ctx.files.project.problem);
    return [fail("1.1", detail), ...["1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9", "1.10", "1.11"].map((id) => dependsOn(id, "1.1"))];
  }
  const text = ctx.projectText!;
  const body = ctx.body!;
  const checks: Check[] = [pass("1.1")];

  if (ctx.fm?.status === "ok") checks.push(pass("1.2"));
  else if (ctx.fm?.status === "invalid") {
    checks.push(fail("1.2", `El frontmatter no se puede interpretar${ctx.fm.line ? ` (cerca de la línea ${ctx.fm.line})` : ""}`));
  } else checks.push(fail("1.2", "PROJECT.md no empieza con un bloque YAML entre ---"));

  if (ctx.data && ctx.manifest && ctx.fm?.status === "ok") {
    checks.push(fromIssues("1.3", fieldIssues(ctx.data)));
    checks.push(fromIssues("1.4", formatIssues(ctx.manifest)));
    checks.push(fromIssues("1.5", ctx.fm.violations.map((v) => `\`${v.key}\` ${VIOLATION_LABEL[v.kind]}`)));
    checks.push(fromIssues("1.6", dateIssues(ctx.manifest)));
    checks.push(fromIssues("1.7", crossIssues(ctx, ctx.manifest)));
  } else {
    checks.push(...["1.3", "1.4", "1.5", "1.6", "1.7"].map((id) => dependsOn(id, "1.2")));
  }

  checks.push(fromIssues("1.8", sectionOrderIssues(body)));

  const summary = sectionText(body, "Resumen ejecutivo");
  const hasMetrics = summary?.split("\n").some((line) => line.trimStart().startsWith("**Métricas de éxito:**")) ?? false;
  checks.push(hasMetrics ? pass("1.9") : fail("1.9", "`## Resumen ejecutivo` no tiene la línea **Métricas de éxito:**"));

  if (ctx.manifest) checks.push(fromIssues("1.10", costIssues(body, ctx.manifest.servicios ?? [])));
  else checks.push(dependsOn("1.10", "1.2"));

  const confirmLine = firstLineContaining(text, "CONFIRMAR");
  checks.push(confirmLine === null ? pass("1.11") : fail("1.11", `CONFIRMAR en la línea ${confirmLine}`));

  return checks;
}

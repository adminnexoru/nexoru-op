// T025: level 3 checks 3.1–3.8 (standard/conformance.md v1.0). 3.2 needs GitHub (phase 4).
import { ROADMAP_STATES, type Check } from "@/lib/portfolio/types";
import { ciConclusionLabel } from "@/lib/format";
import type { CiInfo, Fetched, GithubData } from "@/lib/github/types";
import type { ProjectFiles } from "../project-files";
import { parseYaml } from "../frontmatter";
import { sectionText } from "../markdown";
import { check, dependsOn, fail, fromIssues, pass, type Context } from "./context";
import { ROADMAP_HEADER } from "./roadmap";

const DAY_MS = 86_400_000;
/** Stored GitHub data of this age or older does not decide 3.2 (FR-015). */
export const STALE_GITHUB_DAYS = 7;
/** Fixed reasons why 3.2 is not evaluated (FR-017); they are shown next to Conformidad. */
export const CHECK_32_REASONS = {
  stale: "sin datos recientes de GitHub",
  token: "requiere token",
  invalidToken: "token de GitHub no válido o vencido",
  notGithub: "el remoto no es de GitHub",
  noRemote: "sin remoto",
} as const;

const localDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA");
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

/**
 * A GitHub datum usable for the evaluation (phase 4): present and younger than 7 days; otherwise
 * the fixed reason why not (FR-017), shared by 3.2 and the visibility findings.
 */
export function usableGithub<T>(ctx: Context, pick: (github: GithubData) => Fetched<T>): { ok: true; value: T } | { ok: false; reason: string } {
  const github = ctx.github;
  if (github?.applies === "no_remote") return { ok: false, reason: CHECK_32_REASONS.noRemote };
  if (github?.applies === "not_github") return { ok: false, reason: CHECK_32_REASONS.notGithub };
  const datum = github ? pick(github) : null;
  if (!datum?.value || !datum.fetchedAt) {
    if (datum?.reason === "requiere token") return { ok: false, reason: CHECK_32_REASONS.token };
    if (datum?.reason === "el token de GitHub no es válido") return { ok: false, reason: CHECK_32_REASONS.invalidToken };
    return { ok: false, reason: CHECK_32_REASONS.stale };
  }
  if (daysBetween(localDay(datum.fetchedAt), ctx.date) >= STALE_GITHUB_DAYS) return { ok: false, reason: CHECK_32_REASONS.stale };
  return { ok: true, value: datum.value };
}

/**
 * 3.2 with the GitHub data (phase 4, research R8). Not evaluated, with a fixed reason, when there is
 * no usable CI data; stored data younger than 7 days is used.
 */
function check32(ctx: Context): Check {
  const usable = usableGithub(ctx, (github) => github.ci);
  if (!usable.ok) return check("3.2", "not_evaluated", usable.reason);
  if (ctx.rules.ciRule === "each_workflow") return eachWorkflow(ctx, usable.value);
  const { branch, latestCompletedAny } = usable.value;
  if (!latestCompletedAny) return fail("3.2", `Sin ejecuciones de CI terminadas en ${branch}`);
  if (latestCompletedAny.conclusion === "success") return pass("3.2");
  return fail(
    "3.2",
    `${latestCompletedAny.workflowName}: ${ciConclusionLabel(latestCompletedAny.conclusion)} el ${localDay(latestCompletedAny.at)} en ${branch}`,
  );
}

function triggers(on: unknown): string[] {
  if (typeof on === "string") return [on];
  if (Array.isArray(on)) return on.map(String);
  if (on && typeof on === "object") return Object.keys(on);
  return [];
}

/** Workflow files that satisfy 3.1 (triggered by push and pull_request), as .github/workflows/<name>. */
export function ciWorkflowPaths(files: Pick<ProjectFiles, "workflows">): string[] {
  return files.workflows
    .filter(({ content }) => {
      if (!content.ok) return false;
      const parsed = parseYaml(content.text);
      if (!parsed.ok || !parsed.value || typeof parsed.value !== "object") return false;
      const names = triggers((parsed.value as Record<string, unknown>).on);
      return names.includes("push") && names.includes("pull_request");
    })
    .map(({ name }) => `.github/workflows/${name}`);
}

function ciCheck(ctx: Context): Check {
  const { workflows } = ctx.files;
  if (workflows.length === 0) return fail("3.1", "No hay flujos de CI en .github/workflows/");
  const ok = ciWorkflowPaths(ctx.files).length > 0;
  return ok ? pass("3.1") : fail("3.1", "Ningún flujo de .github/workflows/ se dispara con push y pull_request");
}

/** Name of a workflow from its `name:`, or its file name. */
function workflowName(ctx: Context, path: string): string {
  const file = path.split("/").pop() ?? path;
  const content = ctx.files.workflows.find((w) => w.name === file)?.content;
  const parsed = content?.ok ? parseYaml(content.text) : null;
  const name = parsed?.ok && parsed.value && typeof parsed.value === "object" ? (parsed.value as Record<string, unknown>).name : null;
  return typeof name === "string" && name ? name : file;
}

/** Standard 1.2: the latest completed run of every workflow that satisfies 3.1 succeeded. */
function eachWorkflow(ctx: Context, ci: CiInfo): Check {
  const paths = ciWorkflowPaths(ctx.files);
  if (paths.length === 0) return fail("3.2", "Ningún workflow cumple 3.1");
  const issues = paths.flatMap((path) => {
    const run = ci.perWorkflow.find((w) => w.path === path)?.latestCompleted ?? null;
    if (!run) return [`${workflowName(ctx, path)}: sin ejecuciones terminadas en ${ci.branch}`];
    if (run.conclusion === "success") return [];
    return [`${run.workflowName}: ${ciConclusionLabel(run.conclusion)} el ${localDay(run.at)} en ${ci.branch}`];
  });
  return issues.length === 0 ? pass("3.2") : fail("3.2", issues.join("; "));
}

export function level3(ctx: Context): Check[] {
  const checks: Check[] = [ciCheck(ctx), check32(ctx)];
  const roadmapChecks = ["3.4", "3.5", "3.6", "3.7", "3.8"];

  if (ctx.body === null) return [...checks, dependsOn("3.3", "1.1"), ...roadmapChecks.map((id) => dependsOn(id, "1.1"))];
  if (!ctx.roadmap?.found) {
    return [
      ...checks,
      fail("3.3", `\`## Roadmap\` no tiene la tabla con el encabezado ${ROADMAP_HEADER.join(" | ")}`),
      ...roadmapChecks.map((id) => dependsOn(id, "3.3")),
    ];
  }

  const { phases } = ctx.roadmap;
  const folders = ctx.files.specs.map((spec) => spec.name);
  checks.push(pass("3.3"));

  checks.push(
    fromIssues(
      "3.4",
      phases.flatMap((p) => p.specs.filter((name) => !folders.includes(name)).map((name) => `Fase ${p.phase}: \`${name}\` no existe en specs/`)),
    ),
  );

  const linked = new Set(phases.flatMap((p) => p.specs));
  checks.push(fromIssues("3.5", folders.filter((name) => !linked.has(name)).map((name) => `\`${name}\` no está vinculada a ninguna fase`)));

  checks.push(
    fromIssues(
      "3.6",
      phases.filter((p) => p.derived && p.manualRaw !== "").map((p) => `Fase ${p.phase} tiene estado derivado y \`Estado manual\` lleno (${p.manualRaw})`),
    ),
  );

  checks.push(
    fromIssues(
      "3.7",
      phases
        .filter((p) => !p.derived)
        .flatMap((p) => {
          if (p.manualRaw === "") return [`Fase ${p.phase} no tiene estado derivado y su \`Estado manual\` está vacío`];
          if (!(ROADMAP_STATES as readonly string[]).includes(p.manualRaw)) return [`Fase ${p.phase}: \`${p.manualRaw}\` no es un estado permitido`];
          return [];
        }),
    ),
  );

  const risks = sectionText(ctx.body, "Riesgos, bloqueos y dependencias") ?? "";
  const hasBlock = risks.split("\n").some((line) => line.startsWith("- **Bloqueo"));
  checks.push(
    fromIssues(
      "3.8",
      phases
        .filter((p) => p.manualState === "bloqueada" && !hasBlock)
        .map((p) => `Fase ${p.phase} está bloqueada pero no hay **Bloqueo** en ## Riesgos, bloqueos y dependencias`),
    ),
  );
  return checks;
}

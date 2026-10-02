// T026: findings outside the levels (standard/conformance.md v1.0, "Hallazgos fuera de nivel").
// Only names of files are reported, never their contents (FR-004, FR-029).
import type { Finding } from "@/lib/portfolio/types";
import type { Context } from "./context";
import { GITHUB_PHASE_REASON } from "./level3";
import { phaseConcluded, roadmapStatus } from "./roadmap";

/** conformance.md 1.1: closure and reactivation findings (medium; they do not change the level). */
function closureFindings(ctx: Context): Finding[] {
  const fase = ctx.manifest?.fase ?? null;
  const status = roadmapStatus(ctx.roadmap);
  const pending = ctx.roadmap?.found ? ctx.roadmap.phases.filter((phase) => !phaseConcluded(phase)) : [];
  return [
    fase === "operacion" && pending.length > 0
      ? {
          severity: "medium",
          code: "operacion_pending_phases",
          status: "found",
          detail: `fase: operacion con fases pendientes: ${pending.map((p) => `Fase ${p.phase}`).join(", ")}`,
        }
      : { severity: "medium", code: "operacion_pending_phases", status: "not_found", detail: null },
    (fase === "construccion" || fase === "especificacion") && status === "concluido"
      ? { severity: "medium", code: "construction_roadmap_concluded", status: "found", detail: `fase: ${fase} con el roadmap concluido` }
      : { severity: "medium", code: "construction_roadmap_concluded", status: "not_found", detail: null },
  ];
}

export function findings(ctx: Context): Finding[] {
  const { files } = ctx;
  const envFiles = files.versionedEnvFiles;
  return [
    envFiles === null
      ? { severity: "critical", code: "env_versioned", status: "not_evaluated", detail: "No es un repositorio git" }
      : envFiles.length > 0
        ? { severity: "critical", code: "env_versioned", status: "found", detail: envFiles.join(", ") }
        : { severity: "critical", code: "env_versioned", status: "not_found", detail: null },
    {
      severity: "critical",
      code: "secret_history",
      status: "not_evaluated",
      detail: "Requiere un escáner de secretos; fuera del alcance de esta fase",
    },
    { severity: "high", code: "repo_visibility", status: "not_evaluated", detail: GITHUB_PHASE_REASON },
    files.envExample
      ? { severity: "medium", code: "env_example_missing", status: "not_found", detail: null }
      : { severity: "medium", code: "env_example_missing", status: "found", detail: "No existe .env.example" },
    {
      severity: "medium",
      code: "env_example_coverage",
      status: "not_evaluated",
      detail: "Requiere leer el código del proyecto (principio XIII)",
    },
    ctx.fm?.status === "ok" && ctx.fm.hasComments
      ? { severity: "low", code: "yaml_comments", status: "found", detail: "El frontmatter de PROJECT.md tiene comentarios YAML" }
      : { severity: "low", code: "yaml_comments", status: "not_found", detail: null },
    ...(ctx.rules.closureFindings ? closureFindings(ctx) : []),
  ];
}

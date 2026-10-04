// T026: findings outside the levels (standard/conformance.md v1.0, "Hallazgos fuera de nivel").
// Only names of files are reported, never their contents (FR-004, FR-029).
import type { ConformanceResult, Finding } from "@/lib/portfolio/types";
import type { Context } from "./context";
import { usableGithub } from "./level3";
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

const VISIBILITY_TEXT = { publico: "público", privado: "privado" } as const;

/**
 * Visibility of the repo (phase 4, US2): the producto-cliente rule of repo-visibility.md in every
 * version and, in 1.2, the declared `visibilidad` compared with GitHub. No finding changes the level.
 */
export function visibility(ctx: Context): { result: ConformanceResult["visibility"]; findings: Finding[] } {
  const repo = usableGithub(ctx, (github) => github.repoInfo);
  const tipo = ctx.manifest?.tipo ?? null;
  const clientRule: Finding =
    tipo !== "producto-cliente"
      ? { severity: "high", code: "repo_visibility", status: "not_found", detail: null }
      : !repo.ok
        ? { severity: "high", code: "repo_visibility", status: "not_evaluated", detail: repo.reason }
        : repo.value.visibility === "publico"
          ? { severity: "high", code: "repo_visibility", status: "found", detail: "`producto-cliente` en un repo público" }
          : { severity: "high", code: "repo_visibility", status: "not_found", detail: null };
  if (!ctx.rules.visibilityField || !ctx.manifest) return { result: null, findings: [clientRule] };

  const declared = ctx.manifest.visibilidad as "publico" | "privado" | null;
  const notFound = (code: Finding["code"]): Finding => ({ severity: "high", code, status: "not_found", detail: null });
  if (declared === null) {
    if (tipo === "interno") return { result: "sin-declarar (interno)", findings: [clientRule, notFound("visibility_decision_required"), notFound("visibility_mismatch")] };
    return {
      result: "requiere-decision",
      findings: [
        clientRule,
        { severity: "high", code: "visibility_decision_required", status: "found", detail: "requiere decisión del Dueño: declara `visibilidad` en PROJECT.md" },
        notFound("visibility_mismatch"),
      ],
    };
  }
  if (!repo.ok) {
    return {
      result: "no_evaluado",
      findings: [clientRule, notFound("visibility_decision_required"), { severity: "high", code: "visibility_mismatch", status: "not_evaluated", detail: repo.reason }],
    };
  }
  if (repo.value.visibility === declared) {
    return { result: "aceptada", findings: [clientRule, notFound("visibility_decision_required"), notFound("visibility_mismatch")] };
  }
  return {
    result: "discrepancia",
    findings: [
      clientRule,
      notFound("visibility_decision_required"),
      {
        severity: "high",
        code: "visibility_mismatch",
        status: "found",
        detail: `la visibilidad declarada (${VISIBILITY_TEXT[declared]}) no coincide con GitHub (${VISIBILITY_TEXT[repo.value.visibility]})`,
      },
    ],
  };
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
    ...visibility(ctx).findings,
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

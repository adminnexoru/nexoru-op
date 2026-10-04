// T026: evaluation of one project with the standard v1.0: checks, cumulative level (with the
// provisional level 3 while 3.2 waits for GitHub), failures, warnings and findings (FR-021 to FR-025).
import type { Check, ConformanceResult, Indicators, Manifest, Problem, RoadmapPhase } from "@/lib/portfolio/types";
import { conformity, progress } from "../indicators";
import type { ProjectFiles } from "../project-files";
import type { GithubData } from "@/lib/github/types";
import { newerStandardNotice } from "../versions";
import { buildContext, type Context } from "./context";
import { VISIBILIDAD_VALUES } from "./manifest";
import { findings } from "./findings";
import { level1 } from "./level1";
import { level2, specWarnings } from "./level2";
import { level3 } from "./level3";
import { RULES, type StandardRules } from "../rules";
import { roadmapStatus, toRoadmapPhases } from "./roadmap";


/** Checks that are pending only because this phase cannot evaluate them (FR-023). */
const DEFERRED_TO_LATER_PHASE = new Set(["3.2"]);

export interface ProjectEvaluation {
  manifest: Manifest | null;
  manifestProblem: Problem | null;
  roadmap: RoadmapPhase[] | null;
  /** FR-029: activo or concluido (standard/roadmap.md 1.1), for every project with a roadmap. */
  roadmapStatus: "activo" | "concluido" | null;
  conformance: ConformanceResult;
  indicators: Indicators;
}

/** Standard 1.2: a visibilidad with a value that is not allowed counts as not declared, with a warning. */
function manifestWarnings(ctx: Context): Problem[] {
  const raw = ctx.data?.visibilidad;
  if (!ctx.rules.visibilityField || raw === undefined || raw === null || raw === "" || VISIBILIDAD_VALUES.includes(String(raw))) return [];
  return [
    {
      path: "PROJECT.md",
      reason: "invalid_value",
      detail: `\`visibilidad\` tiene un valor no permitido (${String(raw)}); se toma como no declarada. Valores permitidos: ${VISIBILIDAD_VALUES.join(", ")}`,
    },
  ];
}

export function computeLevel(checks: Check[]): Pick<ConformanceResult, "level" | "provisional" | "failures"> {
  let level: 0 | 1 | 2 | 3 = 0;
  let provisional = false;
  for (const n of [1, 2, 3] as const) {
    const ofLevel = checks.filter((c) => c.level === n);
    if (ofLevel.every((c) => c.status === "pass")) {
      level = n;
      continue;
    }
    if (ofLevel.every((c) => c.status === "pass" || (c.status === "not_evaluated" && DEFERRED_TO_LATER_PHASE.has(c.id)))) {
      level = n;
      provisional = true;
    }
    break;
  }
  const next = provisional ? null : level + 1;
  return { level, provisional, failures: checks.filter((c) => c.level === next && c.status === "fail") };
}

export function evaluateProject(
  files: ProjectFiles,
  evaluationDate: string,
  rules: StandardRules = RULES["1.0"],
  github: GithubData | null = null,
): ProjectEvaluation {
  const ctx = buildContext(files, evaluationDate, rules, github);
  const checks = [...level1(ctx), ...level2(ctx), ...level3(ctx)];

  let manifestProblem: Problem | null = null;
  if (!files.project.ok) manifestProblem = files.project.problem;
  else if (ctx.fm?.status === "missing") {
    manifestProblem = { path: "PROJECT.md", reason: "invalid_yaml", detail: "No empieza con un bloque YAML entre ---" };
  } else if (ctx.fm?.status === "invalid") {
    manifestProblem = { path: "PROJECT.md", reason: "invalid_yaml", detail: ctx.fm.message };
  }

  const conformance: ConformanceResult = {
    standardVersion: rules.version,
    evaluation: "evaluated",
    ...computeLevel(checks),
    checks,
    warnings: [...manifestWarnings(ctx), ...specWarnings(ctx)],
    findings: findings(ctx),
    newerStandardNotice: newerStandardNotice(rules.version),
  };

  return {
    manifest: ctx.manifest,
    manifestProblem,
    roadmap: ctx.roadmap ? toRoadmapPhases(ctx.roadmap) : null,
    roadmapStatus: roadmapStatus(ctx.roadmap),
    conformance,
    indicators: { conformity: conformity(conformance), progress: progress(ctx.roadmap, files.specs) },
  };
}

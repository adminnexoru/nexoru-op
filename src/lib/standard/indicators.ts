// T033: the two percentages of the dashboard (US2, FR-009 to FR-015, research R8). Always derived
// from the files in each reading; never captured. Absent values carry their reason, never 0 %.
import type { ConformanceResult, Indicators } from "@/lib/portfolio/types";
import { taskCheckboxes } from "./markdown";
import type { SpecFolder } from "./project-files";
import { phaseConcluded, type ParsedRoadmap } from "./v1_0/roadmap";


const percent = (part: number, whole: number) => Math.round((part / whole) * 100);

/** Why both indicators are absent when the project is not evaluated (they follow "ausente:"). */
export const NOT_EVALUATED_REASON = {
  unsupported_version: "versión del estándar no soportada",
  no_version: "sin versión del estándar",
} as const;

/**
 * Conformidad: checks passed over applicable ones; "Depende de X" counts as not met. 3.2 is
 * applicable only when it was evaluated with GitHub data (phase 4, FR-016): base 29, or 28 with
 * the reason (FR-017).
 */
export function conformity(conformance: ConformanceResult): Indicators["conformity"] {
  if (conformance.evaluation === "unsupported_version") return { absent: NOT_EVALUATED_REASON.unsupported_version };
  if (conformance.evaluation === "no_version") return { absent: NOT_EVALUATED_REASON.no_version };
  const c32 = conformance.checks.find((check) => check.id === "3.2");
  const out32 = c32?.status === "not_evaluated";
  const applicable = conformance.checks.filter((check) => !(out32 && check.id === "3.2"));
  if (applicable.length === 0) return { absent: "sin verificaciones aplicables" };
  const passed = applicable.filter((check) => check.status === "pass").length;
  return {
    percent: percent(passed, applicable.length),
    passed,
    applicable: applicable.length,
    missing: applicable.filter((check) => check.status !== "pass").map((check) => check.id),
    check32: out32 ? { included: false, reason: c32.detail ?? "sin datos recientes de GitHub" } : { included: true },
  };
}

/**
 * Avance: tasks done over total in the specs of phases with derived state, each spec once.
 * Phases with a manual state are left out of the percentage but counted in "fases completas".
 */
export function progress(roadmap: ParsedRoadmap | null, specs: SpecFolder[]): Indicators["progress"] {
  if (!roadmap?.found) return { absent: "sin roadmap" };
  const derived = roadmap.phases.filter((phase) => phase.derived !== null);
  const linked = new Set(derived.flatMap((phase) => phase.specs));
  let done = 0;
  let total = 0;
  for (const spec of specs) {
    if (!linked.has(spec.name) || !spec.tasks?.ok) continue;
    const counts = taskCheckboxes(spec.tasks.text);
    done += counts.done;
    total += counts.total;
  }
  if (derived.length === 0 || total === 0) return { absent: "ninguna fase tiene specs con tasks.md" };
  return {
    percent: percent(done, total),
    done,
    total,
    manualPhasesExcluded: roadmap.phases.length - derived.length,
    phasesCompleted: roadmap.phases.filter(phaseConcluded).length,
    phasesTotal: roadmap.phases.length,
  };
}

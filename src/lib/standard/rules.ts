// T026: differences between the supported versions of the standard (research R7). One engine
// (src/lib/standard/v1_0) receives these rules instead of a copy of the engine per version.

export interface StandardRules {
  version: "1.0" | "1.1" | "1.2";
  /** Allowed values of `fase` (project-manifest.md). */
  fases: readonly string[];
  /** Phases where `fecha_objetivo` is not mandatory. */
  phasesWithoutTarget: readonly string[];
  /** Closure and reactivation findings of conformance.md 1.1. */
  closureFindings: boolean;
  /**
   * Check 3.2 (phase 4, research R8): "latest_any" = the latest completed run of any workflow on
   * the default branch (1.0, 1.1); "each_workflow" = the latest completed run of every workflow
   * that satisfies 3.1 (1.2).
   */
  ciRule: "latest_any" | "each_workflow";
  /** Standard 1.2: the `visibilidad` field of the manifest and its result (repo-visibility.md). */
  visibilityField: boolean;
}

const BASE_FASES = ["idea", "especificacion", "construccion", "pruebas", "piloto", "migracion", "operacion", "pausado"];

const RULES_1_1: StandardRules = {
  version: "1.1",
  fases: [...BASE_FASES, "retirado"],
  phasesWithoutTarget: ["operacion", "pausado", "retirado"],
  closureFindings: true,
  ciRule: "latest_any",
  visibilityField: false,
};

export const RULES: Record<StandardRules["version"], StandardRules> = {
  "1.0": { version: "1.0", fases: BASE_FASES, phasesWithoutTarget: ["operacion", "pausado"], closureFindings: false, ciRule: "latest_any", visibilityField: false },
  "1.1": RULES_1_1,
  // Standard 1.2.0 (2026-10-03): 1.1 plus 3.2 with every workflow and the visibilidad field.
  "1.2": { ...RULES_1_1, version: "1.2", ciRule: "each_workflow", visibilityField: true },
};

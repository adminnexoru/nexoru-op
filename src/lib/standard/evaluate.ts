// T048: evaluates a project only with a supported version of the standard (FR-026, constitution
// XIV). A project that declares another version, or none, is not evaluated with rules that are not
// its own: its manifest and roadmap are still shown. Without a readable manifest there is no
// version to read, and level 0 is true with any version, so it is evaluated with 1.0.
import type { ConformanceResult } from "@/lib/portfolio/types";
import { NOT_EVALUATED_REASON } from "./indicators";
import { parseFrontmatter } from "./frontmatter";
import type { ProjectFiles } from "./project-files";
import { evaluateProject as evaluateV1_0, type ProjectEvaluation } from "./v1_0/evaluate";
import { RULES, type StandardRules } from "./rules";
import { isSupportedVersion } from "./versions";

function notEvaluated(evaluation: "unsupported_version" | "no_version"): ConformanceResult {
  return { standardVersion: null, evaluation, level: null, provisional: false, checks: [], failures: [], warnings: [], findings: [] };
}

/**
 * Replaces the conformance of a project that is not evaluated. Both indicators become absent:
 * Conformidad needs the rules of its version, and reading the roadmap depends on the standard too.
 */
function withConformance(result: ProjectEvaluation, conformance: ConformanceResult): ProjectEvaluation {
  const reason = NOT_EVALUATED_REASON[conformance.evaluation as keyof typeof NOT_EVALUATED_REASON];
  return { ...result, conformance, indicators: { conformity: { absent: reason }, progress: { absent: reason } } };
}

export function evaluateProject(files: ProjectFiles, evaluationDate: string): ProjectEvaluation {
  const fm = files.project.ok ? parseFrontmatter(files.project.text) : null;
  const declared = fm?.status === "ok" ? fm.data.version_estandar : undefined;
  const rules: StandardRules =
    typeof declared === "string" && isSupportedVersion(declared) ? RULES[declared as StandardRules["version"]] : RULES["1.0"];
  const result = evaluateV1_0(files, evaluationDate, rules);
  if (fm?.status !== "ok") return result;

  if (declared === undefined || declared === null || declared === "") return withConformance(result, notEvaluated("no_version"));
  if (typeof declared !== "string" || !isSupportedVersion(declared)) {
    return withConformance(
      { ...result, manifest: result.manifest && { ...result.manifest, version_estandar: String(declared) } },
      notEvaluated("unsupported_version"),
    );
  }
  return result;
}

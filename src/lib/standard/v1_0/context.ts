// Shared, already-parsed view of one project for the v1.0 checks. Built once per evaluation;
// every check reads from here and never touches the disk (research R6).
import type { GithubData } from "@/lib/github/types";
import type { Check, Manifest, Problem } from "@/lib/portfolio/types";
import { parseFrontmatter, type FrontmatterResult } from "../frontmatter";
import { RULES, type StandardRules } from "../rules";
import type { ProjectFiles } from "../project-files";
import { readManifest } from "./manifest";
import { parseRoadmap, type ParsedRoadmap } from "./roadmap";

export interface Context {
  files: ProjectFiles;
  /** Rules of the version of the standard the project is evaluated with. */
  rules: StandardRules;
  /** Phase 4: GitHub data of the project (3.2 and findings); null when the caller has none. */
  github: GithubData | null;
  /** Evaluation date, AAAA-MM-DD (the reading date). */
  date: string;
  projectText: string | null;
  fm: FrontmatterResult | null;
  data: Record<string, unknown> | null;
  manifest: Manifest | null;
  /** Body of PROJECT.md (whole text if the frontmatter cannot be parsed). */
  body: string | null;
  mapText: string | null;
  mapFm: FrontmatterResult | null;
  roadmap: ParsedRoadmap | null;
}

export function buildContext(files: ProjectFiles, date: string, rules: StandardRules = RULES["1.0"], github: GithubData | null = null): Context {
  const projectText = files.project.ok ? files.project.text : null;
  const fm = projectText === null ? null : parseFrontmatter(projectText);
  const data = fm?.status === "ok" ? fm.data : null;
  const body = fm?.status === "ok" ? fm.body : projectText;
  const mapText = files.map.ok ? files.map.text : null;
  return {
    files,
    rules,
    github,
    date,
    projectText,
    fm,
    data,
    manifest: data ? readManifest(data) : null,
    body,
    mapText,
    mapFm: mapText === null ? null : parseFrontmatter(mapText),
    roadmap: body === null ? null : parseRoadmap(body, files.specs),
  };
}

export function check(id: string, status: Check["status"], detail: string | null = null): Check {
  return { id, level: Number(id.split(".")[0]) as Check["level"], status, detail };
}

export const pass = (id: string) => check(id, "pass");
export const fail = (id: string, detail: string) => check(id, "fail", detail);
export const dependsOn = (id: string, prerequisite: string) => check(id, "not_evaluated", `Depende de ${prerequisite}`);

/** Result of a list of sub-checks: pass when there are no problems. */
export function fromIssues(id: string, issues: string[]): Check {
  return issues.length === 0 ? pass(id) : fail(id, issues.join("; "));
}

/** Spanish description of a read problem (FR-029: path and reason only, never contents). */
export function describeProblem(path: string, problem: Problem): string {
  switch (problem.reason) {
    case "missing":
      return `No existe ${path}`;
    case "outside_root":
      return `${path} apunta fuera del portafolio; no se lee`;
    case "secret_file":
      return `${path} apunta a un archivo de secretos; no se lee`;
    case "too_large":
      return `${path} pesa más de 1 MB; no se lee`;
    case "not_regular_file":
      return `${path} no es un archivo normal; no se lee`;
    case "invalid_utf8":
      return `${path} no es texto UTF-8 válido`;
    default:
      return `No se pudo leer ${path}`;
  }
}

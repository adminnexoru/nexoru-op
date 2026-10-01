// Builds in-memory ProjectFiles from the fictitious level3-demo project, so each conformance
// test changes exactly one thing (SC-003). No disk access during evaluation.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ProjectFiles } from "@/lib/standard/project-files";
import { evaluateProject } from "@/lib/standard/v1_0/evaluate";

const BASE = resolve(import.meta.dirname, "../../fixtures/portfolio/level3-demo");
const read = (rel: string) => readFileSync(join(BASE, rel), "utf8");

/** Evaluation date used by every test (fase_desde of the fixture is earlier). */
export const DATE = "2026-10-01";

export function baseFiles(): ProjectFiles {
  return {
    folder: "level3-demo",
    project: { ok: true, text: read("PROJECT.md") },
    map: { ok: true, text: read("docs/mapa-funcional.md") },
    mapExists: true,
    claude: { ok: true, text: read("CLAUDE.md") },
    specifyDir: true,
    constitution: true,
    specsDir: true,
    specs: [
      { name: "001-demo", hasSpec: true, hasPlan: true, tasks: { ok: true, text: read("specs/001-demo/tasks.md") } },
    ],
    workflows: [{ name: "ci.yml", content: { ok: true, text: read(".github/workflows/ci.yml") } }],
    envExample: true,
    git: {
      isRepo: true,
      branch: "main",
      mainBranch: "main",
      onMainBranch: true,
      hasUncommittedChanges: false,
      originRepo: "example-org/level3-demo",
    },
    versionedEnvFiles: [],
  };
}

/** Replaces text in a file of the base project; fails loudly if the text is not there. */
export function replaceIn(files: ProjectFiles, key: "project" | "map" | "claude", from: string, to: string) {
  const file = files[key];
  if (!file.ok || !file.text.includes(from)) throw new Error(`fixture text not found in ${key}: ${from}`);
  files[key] = { ok: true, text: file.text.replace(from, to) };
  return files;
}

export function evaluate(files: ProjectFiles) {
  return evaluateProject(files, DATE);
}

export function check(files: ProjectFiles, id: string) {
  const found = evaluate(files).conformance.checks.find((c) => c.id === id);
  if (!found) throw new Error(`check ${id} not reported`);
  return found;
}

export function tasksText(done: number, total: number): string {
  return Array.from({ length: total }, (_, i) => `- [${i < done ? "x" : " "}] T${String(i + 1).padStart(3, "0")} Tarea`).join("\n");
}

const BASE_ROWS = "| 1 | Módulo ficticio | 001-demo | — | |\n| 2 | Reportes ficticios | — | 2027-12-15 | pendiente |";

/** Replaces the roadmap rows and the spec folders of the base project. */
export function roadmapFiles(rows: string, specs: Array<[string, number, number] | [string, null]>): ProjectFiles {
  const files = replaceIn(baseFiles(), "project", BASE_ROWS, rows);
  files.specs = specs.map(([name, done, total]) => ({
    name,
    hasSpec: true,
    hasPlan: true,
    tasks: done === null ? null : { ok: true as const, text: tasksText(done, total!) },
  }));
  return files;
}

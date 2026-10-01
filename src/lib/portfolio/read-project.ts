// T032: reads one project folder through the safe reader and git (contracts/reader.md) and
// evaluates it with its (supported) version of the standard. Only catalog paths are requested.
import type { FileContent, ProjectFiles, SpecFolder } from "@/lib/standard/project-files";
import { evaluateProject } from "@/lib/standard/evaluate";
import { readGitInfo, type GitReading } from "./git";
import type { SafeRoot } from "./safe-fs";
import type { Problem, ProjectReading } from "./types";

const NO_GIT: GitReading = {
  info: { isRepo: false, branch: null, mainBranch: null, onMainBranch: null, hasUncommittedChanges: null, originRepo: null },
  versionedEnvFiles: null,
  problems: [],
};

async function readSpec(root: SafeRoot, folder: string, name: string): Promise<SpecFolder> {
  const base = `specs/${name}`;
  const [hasSpec, hasPlan, hasTasks] = await Promise.all([
    root.exists(folder, `${base}/spec.md`),
    root.exists(folder, `${base}/plan.md`),
    root.exists(folder, `${base}/tasks.md`),
  ]);
  return { name, hasSpec, hasPlan, tasks: hasTasks ? await root.readFile(folder, `${base}/tasks.md`) : null };
}

/** Problems worth showing: anything but a plain missing file (absent data is shown as absent). */
function readErrors(files: ProjectFiles, git: GitReading): Problem[] {
  const contents: FileContent[] = [
    files.project,
    files.map,
    files.claude,
    ...files.specs.flatMap((spec) => (spec.tasks ? [spec.tasks] : [])),
    ...files.workflows.map((workflow) => workflow.content),
  ];
  return [
    ...contents.flatMap((content) => (!content.ok && content.problem.reason !== "missing" ? [content.problem] : [])),
    ...git.problems,
  ];
}

export async function readProject(root: SafeRoot, folder: string, evaluationDate: string): Promise<ProjectReading> {
  const projectReal = await root.projectPath(folder);
  const [project, map, mapExists, claude, specifyDir, constitution, specsDir, specNames, workflowNames, envExample, git] =
    await Promise.all([
      root.readFile(folder, "PROJECT.md"),
      root.readFile(folder, "docs/mapa-funcional.md"),
      root.exists(folder, "docs/mapa-funcional.md"),
      root.readFile(folder, "CLAUDE.md"),
      root.exists(folder, ".specify"),
      root.exists(folder, ".specify/memory/constitution.md"),
      root.exists(folder, "specs"),
      root.listDir(folder, "specs"),
      root.listDir(folder, ".github/workflows"),
      root.exists(folder, ".env.example"),
      projectReal ? readGitInfo(projectReal) : Promise.resolve(NO_GIT),
    ]);

  const files: ProjectFiles = {
    folder,
    project,
    map,
    mapExists,
    claude,
    specifyDir,
    constitution,
    specsDir,
    specs: await Promise.all(specNames.map((name) => readSpec(root, folder, name))),
    workflows: await Promise.all(
      workflowNames.map(async (name) => ({ name, content: await root.readFile(folder, `.github/workflows/${name}`) })),
    ),
    envExample,
    git: git.info,
    versionedEnvFiles: git.versionedEnvFiles,
  };

  return { folder, git: git.info, ...evaluateProject(files, evaluationDate), readErrors: readErrors(files, git) };
}

/** Reading of a project that could not be read at all (FR-008): absent data and the reason. */
export function unreadableProject(folder: string, evaluationDate: string): ProjectReading {
  const missing = (path: string): FileContent => ({ ok: false, problem: { path, reason: "missing", detail: null } });
  const files: ProjectFiles = {
    folder,
    project: missing("PROJECT.md"),
    map: missing("docs/mapa-funcional.md"),
    mapExists: false,
    claude: missing("CLAUDE.md"),
    specifyDir: false,
    constitution: false,
    specsDir: false,
    specs: [],
    workflows: [],
    envExample: false,
    git: NO_GIT.info,
    versionedEnvFiles: null,
  };
  return {
    folder,
    git: NO_GIT.info,
    ...evaluateProject(files, evaluationDate),
    readErrors: [{ path: null, reason: "unreadable", detail: "No se pudo leer la carpeta del proyecto" }],
  };
}

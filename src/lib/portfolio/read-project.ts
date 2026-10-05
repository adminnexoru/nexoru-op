// T032: reads one project folder through the safe reader and git (contracts/reader.md) and
// evaluates it with its (supported) version of the standard. Only catalog paths are requested.
import type { FileContent, ProjectFiles, SpecFolder } from "@/lib/standard/project-files";
import { evaluateProject } from "@/lib/standard/evaluate";
import { parseFrontmatter } from "@/lib/standard/frontmatter";
import { ciWorkflowPaths } from "@/lib/standard/v1_0/level3";
import type { GithubTarget } from "@/lib/github/fetch-portfolio";
import type { GithubData } from "@/lib/github/types";
import { readGitHistoryRaw, readGitInfo, readRepoPaths, type GitReading } from "./git";
import { buildHistory } from "./history";
import type { SafeRoot } from "./safe-fs";
import type { Problem, ProjectReading } from "./types";

const NO_GIT: GitReading = {
  info: {
    isRepo: false,
    branch: null,
    mainBranch: null,
    onMainBranch: null,
    hasUncommittedChanges: null,
    uncommittedChangesReason: null,
    originRepo: null,
    originKind: "none",
  },
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

/** 1-based line of the closing `---` of the frontmatter, or null. */
function frontmatterEndLine(text: string | null): number | null {
  if (!text?.startsWith("---")) return null;
  const index = text.split("\n").findIndex((line, i) => i > 0 && line.trimEnd() === "---");
  return index === -1 ? null : index + 1;
}

/** Phase 4: what a project has read locally, before GitHub is queried and it is evaluated. */
export type LocalProject = {
  folder: string;
  files: ProjectFiles;
  git: GitReading;
  rawHistory: Awaited<ReturnType<typeof readGitHistoryRaw>> | null;
  projectText: string | null;
};

/** What the GitHub queries need from a local reading (specs/004-github-readonly). */
export function githubTarget(local: LocalProject): GithubTarget {
  const fm = local.projectText ? parseFrontmatter(local.projectText) : null;
  const repo = fm?.status === "ok" ? fm.data.repo : null;
  return {
    folder: local.folder,
    originKind: local.git.info.originKind,
    originRepo: local.git.info.originRepo,
    manifestRepo: typeof repo === "string" ? repo : null,
    workflowFiles: ciWorkflowPaths(local.files),
  };
}

export async function readProjectLocal(root: SafeRoot, folder: string): Promise<LocalProject> {
  const projectReal = await root.projectPath(folder);
  // One rev-parse per project, shared by the git data and the history (fewer git processes).
  const repoPaths = projectReal ? await readRepoPaths(projectReal) : null;
  const [project, map, mapExists, claude, specifyDir, constitution, specsDir, specNames, workflowNames, envExample, git, rawHistory] =
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
      projectReal ? readGitInfo(projectReal, root, repoPaths) : Promise.resolve(NO_GIT),
      projectReal && repoPaths ? readGitHistoryRaw(projectReal, root, repoPaths).catch(() => null) : Promise.resolve(null),
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

  return { folder, files, git, rawHistory, projectText: project.ok ? project.text : null };
}

/** Evaluates a local reading with its GitHub data. */
export function finishProject(local: LocalProject, evaluationDate: string, now: Date, github: GithubData): ProjectReading {
  const { folder, files, git, rawHistory } = local;
  const evaluation = evaluateProject(files, evaluationDate, github);
  const history =
    git.info.isRepo && rawHistory
      ? buildHistory(
          { ...rawHistory, detachedHead: git.info.branch === null },
          evaluation.manifest,
          frontmatterEndLine(local.projectText),
          now,
        )
      : null;

  return { folder, git: git.info, history, ...evaluation, readErrors: readErrors(files, git), github };
}

/** Reading of a project that could not be read at all (FR-008): absent data and the reason. */
export function unreadableProject(folder: string, evaluationDate: string, github: GithubData): ProjectReading {
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
    history: null,
    ...evaluateProject(files, evaluationDate, github),
    readErrors: [{ path: null, reason: "unreadable", detail: "No se pudo leer la carpeta del proyecto" }],
    github,
  };
}

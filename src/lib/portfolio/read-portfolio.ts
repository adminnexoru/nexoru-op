// T033: reads the whole portfolio: every non-hidden folder of PROJECTS_ROOT, nexoru-governance
// apart as the standard, 8 projects at a time, one failure never stopping the others (FR-001, FR-008).
import { isNewerThanSupported, parseChangelogVersion, SUPPORTED_STANDARD_VERSIONS } from "@/lib/standard/versions";
import { readProject, unreadableProject } from "./read-project";
import { openRoot, STANDARD_FOLDER, type SafeRoot } from "./safe-fs";
import type { PortfolioReading, PortfolioWarning, ProjectReading, StandardInfo } from "./types";

const CONCURRENCY = 8;

/** Evaluation date in the machine's time zone (AAAA-MM-DD). */
function localDate(now: Date): string {
  return now.toLocaleDateString("en-CA");
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function readStandard(root: SafeRoot, folders: string[]): Promise<StandardInfo> {
  if (!folders.includes(STANDARD_FOLDER)) return { folder: STANDARD_FOLDER, found: false, version: null, newerThanSupported: false };
  const changelog = await root.readFile(STANDARD_FOLDER, "CHANGELOG.md");
  const version = changelog.ok ? parseChangelogVersion(changelog.text) : null;
  return { folder: STANDARD_FOLDER, found: true, version, newerThanSupported: version !== null && isNewerThanSupported(version) };
}

function duplicateIds(projects: ProjectReading[]): PortfolioWarning[] {
  const byId = new Map<string, string[]>();
  for (const project of projects) {
    const id = project.manifest?.id;
    if (id) byId.set(id, [...(byId.get(id) ?? []), project.folder]);
  }
  return [...byId]
    .filter(([, folders]) => folders.length > 1)
    .map(([id, folders]) => ({ code: "duplicate_id", detail: `\`${id}\` aparece en ${folders.join(", ")}` }));
}

export async function readPortfolio(projectsRoot: string | undefined, now = new Date()): Promise<PortfolioReading> {
  const base = { readAt: now.toISOString(), supportedStandardVersions: [...SUPPORTED_STANDARD_VERSIONS] };
  const opened = await openRoot(projectsRoot);
  if (opened.status !== "ok") {
    return {
      ...base,
      root: { status: opened.status },
      standard: { folder: STANDARD_FOLDER, found: false, version: null, newerThanSupported: false },
      projects: [],
      warnings: [],
    };
  }

  const { root } = opened;
  const folders = await root.listFolders();
  const date = localDate(now);
  const projects = await mapLimit(
    folders.filter((folder) => folder !== STANDARD_FOLDER),
    CONCURRENCY,
    (folder) =>
      readProject(root, folder, date).catch((error: unknown) => {
        console.error(`portfolio: could not read ${folder}:`, error instanceof Error ? error.name : "unknown error");
        return unreadableProject(folder, date);
      }),
  );

  return { ...base, root: { status: "ok" }, standard: await readStandard(root, folders), projects, warnings: duplicateIds(projects) };
}

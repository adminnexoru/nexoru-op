// What the conformance checks receive: the files of one project already read by the safe reader
// (src/lib/portfolio), plus its git data. The checks never touch the disk (research R6).
import type { GitInfo, Problem } from "@/lib/portfolio/types";

export type FileContent = { ok: true; text: string } | { ok: false; problem: Problem };

export interface SpecFolder {
  /** Folder name matching ^\d{3}-[a-z0-9-]+$ */
  name: string;
  hasSpec: boolean;
  hasPlan: boolean;
  /** null when tasks.md does not exist. */
  tasks: FileContent | null;
}

export interface ProjectFiles {
  folder: string;
  project: FileContent;
  map: FileContent;
  /** docs/mapa-funcional.md exists (even if it cannot be read). */
  mapExists: boolean;
  claude: FileContent;
  specifyDir: boolean;
  constitution: boolean;
  specsDir: boolean;
  specs: SpecFolder[];
  workflows: { name: string; content: FileContent }[];
  envExample: boolean;
  git: GitInfo;
  /** Names of versioned .env* files (not .env.example); null when it is not a git repository. */
  versionedEnvFiles: string[] | null;
}

// T018: the ONLY door to the portfolio on disk (constitution XIII, contracts/reader.md, research R3).
// - Only the paths of the standard's catalog; anything else throws before touching the disk.
// - Every path is resolved to its real path, which must stay inside PROJECTS_ROOT.
// - Secret files (.env*, keys) are never opened, whatever the path that leads to them.
// - Read only regular files up to 1 MB, from the same descriptor that was checked; strict UTF-8.
// Nothing here writes, creates, renames or deletes anything.
import { constants } from "node:fs";
import { lstat, open, readdir, realpath, stat } from "node:fs/promises";
import { basename, isAbsolute, join, sep } from "node:path";
import type { Problem, RootStatus } from "./types";
import type { FileContent } from "@/lib/standard/project-files";

export const MAX_FILE_BYTES = 1_048_576;
export const STANDARD_FOLDER = "nexoru-governance";

const SPEC_FOLDER = /^\d{3}-[a-z0-9-]+$/;
const SECRET_NAMES = [/^\.env/, /\.pem$/, /\.key$/, /\.p12$/, /\.pfx$/, /^id_(rsa|ed25519|ecdsa|dsa)/];
const PROJECT_FOLDER = /^[^./\\][^/\\]*$/;

const READ_CATALOG: RegExp[] = [
  /^PROJECT\.md$/,
  /^docs\/mapa-funcional\.md$/,
  /^CLAUDE\.md$/,
  /^specs\/\d{3}-[a-z0-9-]+\/tasks\.md$/,
  /^\.github\/workflows\/[^/]+\.ya?ml$/,
];
const EXISTS_CATALOG: RegExp[] = [
  /^\.specify$/,
  /^\.specify\/memory\/constitution\.md$/,
  /^specs$/,
  /^specs\/\d{3}-[a-z0-9-]+\/(spec|plan|tasks)\.md$/,
  /^docs\/mapa-funcional\.md$/,
  /^\.env\.example$/,
];
const LIST_CATALOG = ["specs", ".github/workflows"] as const;
export type ListableDir = (typeof LIST_CATALOG)[number];

/** A request outside the catalog: a programming error, never a data problem. */
export class CatalogError extends Error {
  constructor(folder: string, path: string) {
    super(`Ruta fuera del catálogo del lector: ${folder}/${path}`);
    this.name = "CatalogError";
  }
}

function isSecretName(name: string): boolean {
  return SECRET_NAMES.some((pattern) => pattern.test(name));
}

function assertCatalog(folder: string, path: string, catalog: RegExp[]): void {
  const inCatalog =
    catalog.some((pattern) => pattern.test(path)) ||
    (catalog === READ_CATALOG && folder === STANDARD_FOLDER && path === "CHANGELOG.md");
  if (!PROJECT_FOLDER.test(folder) || !inCatalog || path.split("/").includes("..")) {
    throw new CatalogError(folder, path);
  }
}

const problem = (path: string, reason: Problem["reason"], detail: string | null = null): FileContent => ({
  ok: false,
  problem: { path, reason, detail },
});

function errorCode(error: unknown): string | undefined {
  return (error as NodeJS.ErrnoException | undefined)?.code;
}

export type OpenRootResult = { status: "ok"; root: SafeRoot } | { status: Exclude<RootStatus, "ok"> };

/** Validates PROJECTS_ROOT (absolute path to a directory) and resolves its real path. */
export async function openRoot(root: string | undefined): Promise<OpenRootResult> {
  if (!root) return { status: "missing" };
  if (!isAbsolute(root)) return { status: "not_absolute" };
  try {
    const real = await realpath(root);
    if (!(await stat(real)).isDirectory()) return { status: "not_directory" };
    return { status: "ok", root: new SafeRoot(real) };
  } catch {
    return { status: "not_directory" };
  }
}

export class SafeRoot {
  constructor(readonly realPath: string) {}

  /** Real path of `folder/path` if it exists and stays inside the root; otherwise the reason. */
  private async resolveInside(folder: string, path: string): Promise<{ real: string } | { reason: "missing" | "outside_root" }> {
    try {
      const real = await realpath(join(this.realPath, folder, path));
      if (!real.startsWith(this.realPath + sep)) return { reason: "outside_root" };
      return { real };
    } catch (error) {
      if (errorCode(error) === "ENOENT" || errorCode(error) === "ENOTDIR") return { reason: "missing" };
      throw error;
    }
  }

  /** Non-hidden directories directly under the root, sorted. */
  async listFolders(): Promise<string[]> {
    const names: string[] = [];
    for (const entry of await readdir(this.realPath, { withFileTypes: true })) {
      if (!PROJECT_FOLDER.test(entry.name)) continue;
      const isDir = entry.isDirectory() || (entry.isSymbolicLink() && (await this.isDirectory(entry.name)));
      if (isDir) names.push(entry.name);
    }
    return names.sort();
  }

  private async isDirectory(folder: string): Promise<boolean> {
    const resolved = await this.resolveInside(folder, ".");
    return "real" in resolved && (await stat(resolved.real)).isDirectory();
  }

  /** Real path of a project folder inside the root, or null. */
  async projectPath(folder: string): Promise<string | null> {
    if (!PROJECT_FOLDER.test(folder)) throw new CatalogError(folder, ".");
    const resolved = await this.resolveInside(folder, ".");
    return "real" in resolved ? resolved.real : null;
  }

  /** Reads a file of the catalog (contracts/reader.md, "Reglas de toda lectura"). */
  async readFile(folder: string, path: string): Promise<FileContent> {
    assertCatalog(folder, path, READ_CATALOG);
    if (isSecretName(basename(path))) return problem(path, "secret_file");

    const resolved = await this.resolveInside(folder, path);
    if ("reason" in resolved) return problem(path, resolved.reason);
    if (isSecretName(basename(resolved.real))) return problem(path, "secret_file");

    // O_NONBLOCK: opening a FIFO for reading would otherwise wait for a writer forever.
    const handle = await open(resolved.real, constants.O_RDONLY | constants.O_NONBLOCK).catch((error: unknown) => {
      if (errorCode(error) === "ENOENT") return null;
      throw error;
    });
    if (!handle) return problem(path, "missing");
    try {
      const info = await handle.stat();
      if (!info.isFile()) return problem(path, "not_regular_file");
      if (info.size > MAX_FILE_BYTES) return problem(path, "too_large");
      const buffer = Buffer.alloc(info.size);
      const { bytesRead } = await handle.read(buffer, 0, info.size, 0);
      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, bytesRead));
      } catch {
        return problem(path, "invalid_utf8");
      }
      return { ok: true, text: text.replace(/^﻿/, "").replace(/\r\n?/g, "\n") };
    } finally {
      await handle.close();
    }
  }

  /** Whether a path of the catalog exists. `.env.example` is checked with lstat only. */
  async exists(folder: string, path: string): Promise<boolean> {
    assertCatalog(folder, path, EXISTS_CATALOG);
    if (path === ".env.example") {
      const projectReal = await this.projectPath(folder);
      if (!projectReal) return false;
      return lstat(join(projectReal, path)).then(
        () => true,
        () => false,
      );
    }
    const resolved = await this.resolveInside(folder, path);
    return "real" in resolved;
  }

  /** Entries of `specs/` (NNN-name folders) or `.github/workflows/` (YAML files), sorted. */
  async listDir(folder: string, dir: ListableDir): Promise<string[]> {
    if (!PROJECT_FOLDER.test(folder) || !LIST_CATALOG.includes(dir)) throw new CatalogError(folder, dir);
    const resolved = await this.resolveInside(folder, dir);
    if ("reason" in resolved) return [];
    const entries = await readdir(resolved.real, { withFileTypes: true }).catch(() => []);
    return entries
      .filter((entry) =>
        dir === "specs"
          ? SPEC_FOLDER.test(entry.name) && (entry.isDirectory() || entry.isSymbolicLink())
          : /\.ya?ml$/.test(entry.name) && !entry.isDirectory(),
      )
      .map((entry) => entry.name)
      .sort();
  }
}

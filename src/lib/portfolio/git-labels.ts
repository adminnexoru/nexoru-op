// Texts for the branch and uncommitted-changes data (FR-030, contracts/git-history.md).
// An unknown value is shown as "no evaluado" with its reason, never as "sin cambios".
import type { GitInfo } from "./types";

export function uncommittedLabel(git: GitInfo): string {
  if (git.hasUncommittedChanges === true) return "cambios sin commit";
  if (git.hasUncommittedChanges === false) return "sin cambios sin commit";
  return `Cambios sin commit: no evaluado (${git.uncommittedChangesReason ?? "error de git"})`;
}

export function branchWarnings(git: GitInfo): string[] {
  if (!git.isRepo) return ["no es repositorio git"];
  const warnings: string[] = [];
  if (git.branch === null) warnings.push("sin rama (HEAD separado)");
  else if (git.onMainBranch === false) warnings.push("no es la rama principal");
  if (git.hasUncommittedChanges !== false) warnings.push(uncommittedLabel(git));
  return warnings;
}

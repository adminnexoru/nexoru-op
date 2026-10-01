import { Badge } from "@/components/ui/badge";
import type { GitInfo } from "@/lib/portfolio/types";
import { Absent } from "./absent";

// Current branch of the copy on disk and its warnings (FR-030): data is read as it is on disk.
export function branchWarnings(git: GitInfo): string[] {
  if (!git.isRepo) return ["no es repositorio git"];
  const warnings: string[] = [];
  if (git.branch === null) warnings.push("sin rama (HEAD separado)");
  else if (git.onMainBranch === false) warnings.push("no es la rama principal");
  if (git.hasUncommittedChanges) warnings.push("cambios sin commit");
  return warnings;
}

export function BranchBadge({ git }: { git: GitInfo }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {git.branch ? <span className="font-mono text-xs">{git.branch}</span> : <Absent />}
      {branchWarnings(git).map((warning) => (
        <Badge key={warning} variant="outline">
          {warning}
        </Badge>
      ))}
    </div>
  );
}

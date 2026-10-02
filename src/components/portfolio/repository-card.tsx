import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { uncommittedLabel } from "@/lib/portfolio/git-labels";
import type { GitInfo } from "@/lib/portfolio/types";
import { Absent, OrAbsent } from "./absent";
import { BranchBadge } from "./branch-badge";

// Current branch, main branch and origin of the copy on disk (FR-030).
export function RepositoryCard({ git }: { git: GitInfo }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Repositorio</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1">
          <dt className="text-muted-foreground">Rama actual</dt>
          <dd>
            <BranchBadge git={git} />
          </dd>
          <dt className="text-muted-foreground">Rama principal</dt>
          <dd>
            <OrAbsent value={git.mainBranch} />
          </dd>
          <dt className="text-muted-foreground">Cambios sin commit</dt>
          <dd data-testid="uncommitted">{git.isRepo ? uncommittedLabel(git) : <Absent />}</dd>
          <dt className="text-muted-foreground">Remoto origin</dt>
          <dd>
            <OrAbsent value={git.originRepo} />
          </dd>
        </dl>
      </CardContent>
    </Card>
  );
}

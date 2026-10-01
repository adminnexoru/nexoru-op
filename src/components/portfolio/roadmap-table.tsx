import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RoadmapPhase } from "@/lib/portfolio/types";
import { Absent, OrAbsent } from "./absent";

// T044: roadmap of a project (US3). The state is derived from tasks.md when every linked spec has
// one (with its task count) or the manual state otherwise, always labeled (FR-017, FR-018).
function PhaseState({ phase }: { phase: RoadmapPhase }) {
  if (!phase.shownState) return <Absent />;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span>{phase.shownState}</span>
      <Badge variant="outline">{phase.derived ? `derivado (${phase.derived.done}/${phase.derived.total})` : "manual"}</Badge>
    </div>
  );
}

export function RoadmapTable({ roadmap }: { roadmap: RoadmapPhase[] | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Roadmap</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {roadmap ? (
          <Table data-testid="roadmap">
            <TableHeader>
              <TableRow>
                <TableHead>Fase</TableHead>
                <TableHead>Objetivo</TableHead>
                <TableHead>Specs</TableHead>
                <TableHead>Fecha objetivo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roadmap.map((phase) => (
                <TableRow key={phase.phase}>
                  <TableCell>{phase.phase}</TableCell>
                  <TableCell className="whitespace-normal">
                    <OrAbsent value={phase.objective} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <OrAbsent value={phase.specs.join(", ")} />
                  </TableCell>
                  <TableCell>
                    <OrAbsent value={phase.targetDate} />
                  </TableCell>
                  <TableCell>
                    <PhaseState phase={phase} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p data-testid="roadmap-absent" className="text-muted-foreground">
            Sin roadmap: PROJECT.md no tiene la tabla de `## Roadmap` del estándar.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

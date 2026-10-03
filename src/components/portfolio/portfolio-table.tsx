import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProjectReading } from "@/lib/portfolio/types";
import { declaredLevel, TrafficLight } from "@/components/status/traffic-light";
import { Absent, OrAbsent } from "./absent";
import { BranchBadge } from "./branch-badge";
import { daysText, phaseLabel } from "@/lib/format";
import { IndicatorCell } from "./indicators";
import { LevelBadge } from "./level-badge";

// Portfolio table (contracts/ui.md, FR-015). Plain text only: React escapes every value.
function manifestNote(project: ProjectReading): string | null {
  if (!project.manifestProblem) return null;
  return project.manifestProblem.reason === "missing" ? "sin PROJECT.md" : "PROJECT.md ilegible";
}

export function PortfolioTable({ projects }: { projects: ProjectReading[] }) {
  return (
    <Table data-testid="portfolio-table">
      <TableHeader>
        <TableRow>
          <TableHead>Proyecto</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Fase</TableHead>
          <TableHead>Estado declarado</TableHead>
          <TableHead>Fecha objetivo</TableHead>
          <TableHead>Siguiente hito</TableHead>
          <TableHead>Nivel</TableHead>
          <TableHead>Conformidad</TableHead>
          <TableHead>Avance</TableHead>
          <TableHead>Actividad</TableHead>
          <TableHead>Roadmap</TableHead>
          <TableHead>Rama</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => {
          const { manifest } = project;
          const note = manifestNote(project);
          return (
            <TableRow key={project.folder}>
              <TableCell className="font-medium">
                <Link href={`/projects/${encodeURIComponent(project.folder)}`} className="underline-offset-4 hover:underline">
                  {manifest?.nombre ?? project.folder}
                </Link>
                {note ? <div className="text-xs text-muted-foreground">{note}</div> : null}
              </TableCell>
              <TableCell><OrAbsent value={manifest?.tipo} /></TableCell>
              <TableCell><OrAbsent value={manifest?.cliente} /></TableCell>
              <TableCell>{manifest?.fase ? phaseLabel(manifest.fase) : <Absent />}</TableCell>
              <TableCell>
                {declaredLevel(manifest?.estado) ? (
                  <TrafficLight kind="declared" level={declaredLevel(manifest?.estado)!} labelHidden />
                ) : (
                  <OrAbsent value={manifest?.estado} />
                )}
              </TableCell>
              <TableCell><OrAbsent value={manifest?.fecha_objetivo} /></TableCell>
              <TableCell className="max-w-64 whitespace-normal">
                {manifest?.siguiente_hito ? (
                  // Two lines at most; the full text is in the detail (and in the tooltip).
                  <span data-testid="milestone" className="line-clamp-2" title={manifest.siguiente_hito}>
                    {manifest.siguiente_hito}
                  </span>
                ) : (
                  <Absent />
                )}
              </TableCell>
              <TableCell><LevelBadge project={project} /></TableCell>
              <TableCell className="whitespace-nowrap"><IndicatorCell kind="conformity" indicators={project.indicators} /></TableCell>
              <TableCell className="whitespace-nowrap"><IndicatorCell kind="progress" indicators={project.indicators} /></TableCell>
              <TableCell>
                {project.history?.activityLight ? (
                  <TrafficLight kind="activity" level={project.history.activityLight} detail={daysText(project.history.daysWithoutActivity ?? 0)} labelHidden />
                ) : (
                  <Absent />
                )}
              </TableCell>
              <TableCell>
                <OrAbsent value={project.roadmapStatus} />
              </TableCell>
              <TableCell><BranchBadge git={project.git} /></TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

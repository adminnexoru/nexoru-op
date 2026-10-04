import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProjectReading } from "@/lib/portfolio/types";
import { declaredLevel, TrafficLight } from "@/components/status/traffic-light";
import { Absent, OrAbsent } from "./absent";
import { BranchBadge } from "./branch-badge";
import { daysText, phaseLabel } from "@/lib/format";
import { ciState } from "@/lib/github/ci-state";
import { SUPPORTED_STANDARD_VERSIONS } from "@/lib/standard/versions";
import { IndicatorCell } from "./indicators";
import { LevelBadge } from "./level-badge";

// Portfolio table (contracts/ui.md, FR-015). Plain text only: React escapes every value.
function manifestNote(project: ProjectReading): string | null {
  if (!project.manifestProblem) return null;
  return project.manifestProblem.reason === "missing" ? "sin PROJECT.md" : "PROJECT.md ilegible";
}

export function PortfolioTable({ projects, now }: { projects: ProjectReading[]; now: Date }) {
  return (
    <Table data-testid="portfolio-table">
      <TableHeader>
        <TableRow>
          <TableHead>Proyecto</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Fase</TableHead>
          <TableHead>Estado declarado</TableHead>
          <TableHead>Fecha objetivo</TableHead>
          <TableHead>Siguiente hito</TableHead>
          <TableHead>Nivel</TableHead>
          <TableHead>Conformidad</TableHead>
          <TableHead>Avance</TableHead>
          <TableHead>Actividad</TableHead>
          <TableHead>CI</TableHead>
          <TableHead>PRs</TableHead>
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
                {project.github.repoInfo.value ? (
                  // Phase 4 (US2): the visibility of the repo, from the last GitHub data.
                  <div data-testid="visibility" className="text-xs text-muted-foreground">
                    {project.github.repoInfo.value.visibility === "publico" ? "público" : "privado"}
                  </div>
                ) : null}
              </TableCell>
              <TableCell>
                {/* Phase 4: Tipo and Cliente share a column; the client only for producto-cliente. */}
                <OrAbsent value={manifest?.tipo} />
                {manifest?.tipo === "producto-cliente" && manifest.cliente ? (
                  <div className="text-xs text-muted-foreground">{manifest.cliente}</div>
                ) : null}
              </TableCell>
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
              <TableCell>
                <LevelBadge project={project} />
                {project.conformance.newerStandardNotice ? (
                  // FR-028: the short form of the notice; the full text is in the detail.
                  <div data-testid="newer-standard" className="text-xs text-muted-foreground" title={project.conformance.newerStandardNotice}>
                    Estándar {SUPPORTED_STANDARD_VERSIONS[SUPPORTED_STANDARD_VERSIONS.length - 1]} disponible
                  </div>
                ) : null}
              </TableCell>
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
                <TrafficLight kind="ci" {...ciState(project.github, now)} labelHidden />
              </TableCell>
              <TableCell>
                {/* Phase 4 (US3): open PRs; "—" when GitHub does not apply, "?" with its reason when unavailable. */}
                {project.github.applies !== "yes" ? (
                  <span data-testid="pulls-count" className="text-muted-foreground">—</span>
                ) : project.github.pulls.value ? (
                  <span data-testid="pulls-count">{project.github.pulls.value.length}</span>
                ) : (
                  <span>
                    <span data-testid="pulls-count" aria-hidden="true">?</span>
                    <span className="sr-only">PRs no disponibles: {project.github.pulls.reason}</span>
                  </span>
                )}
              </TableCell>
              <TableCell><BranchBadge git={project.git} /></TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

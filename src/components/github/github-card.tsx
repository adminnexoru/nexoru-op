import { TrafficLight } from "@/components/status/traffic-light";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { agoText, capitalize, ciConclusionLabel, daysText, pullCiLabel } from "@/lib/format";
import { ciState } from "@/lib/github/ci-state";
import type { CiRun, Fetched, PullInfo } from "@/lib/github/types";
import type { ProjectReading } from "@/lib/portfolio/types";

// T024: GitHub data of a project in the detail (contracts/github-ui.md). Plain text only: React
// escapes every value. Each datum says why it is missing.

const STALE_DAYS = 7;
const DAY_MS = 86_400_000;

function Origin({ data, now }: { data: Fetched<unknown>; now: Date }) {
  if (!data.fetchedAt) return <p className="text-muted-foreground">No disponible: {data.reason}</p>;
  const stale = now.getTime() - new Date(data.fetchedAt).getTime() >= STALE_DAYS * DAY_MS;
  return (
    <p className="text-muted-foreground">
      Datos de GitHub de {agoText(data.fetchedAt, now)}
      {stale ? " (desactualizado)" : ""}
      {data.status !== "ok" && data.reason ? ` · Última consulta sin respuesta: ${data.reason}` : ""}
    </p>
  );
}

function RunLine({ run, label }: { run: CiRun | null; label: string }) {
  if (!run) return <li>{label}: sin ejecuciones terminadas</li>;
  const result = run.status === "completed" ? capitalize(ciConclusionLabel(run.conclusion)) : "En curso";
  return (
    <li>
      {run.workflowName}: {result} · {new Date(run.at).toLocaleDateString("en-CA")}
    </li>
  );
}

function PullItem({ pull, now }: { pull: PullInfo; now: Date }) {
  const days = Math.max(0, Math.floor((now.getTime() - new Date(pull.openedAt).getTime()) / DAY_MS));
  return (
    <li data-testid={`pull-${pull.number}`}>
      <span className="font-mono">#{pull.number}</span> {pull.title}
      <span className="text-muted-foreground">
        {" "}
        · abierto hace {daysText(days)} · CI: {pullCiLabel(pull.ci)}
        {pull.draft ? " · borrador" : ""}
        {pull.fromFork ? " · desde un fork" : ""}
      </span>
    </li>
  );
}

/** Explanation of the visibility result of standard 1.2 (repo-visibility.md "Visibilidad declarada"). */
function visibilityResultText(project: ProjectReading): string {
  const finding = (code: string) => project.conformance.findings.find((f) => f.code === code)?.detail ?? "";
  switch (project.conformance.visibility) {
    case "aceptada":
      return "aceptada: declarada en PROJECT.md";
    case "requiere-decision":
      return finding("visibility_decision_required");
    case "discrepancia":
      return `discrepancia: ${finding("visibility_mismatch")}`;
    case "sin-declarar (interno)":
      return "sin declarar (proyecto interno): no se exige";
    case "no_evaluado":
      return `no evaluado: ${finding("visibility_mismatch")}`;
    default:
      return "";
  }
}

export function GithubCard({ project, now }: { project: ProjectReading; now: Date }) {
  const { github } = project;
  return (
    <Card data-testid="github-card">
      <CardHeader>
        <CardTitle>GitHub</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {github.applies !== "yes" ? (
          <p className="text-muted-foreground">No aplica: {github.applies === "no_remote" ? "sin remoto" : "el remoto no es de GitHub"}</p>
        ) : (
          <>
            <p>
              Repo: <span className="font-mono">{github.repo}</span>
            </p>
            {github.repoMismatch ? (
              <p>
                Aviso: PROJECT.md declara <span className="font-mono">{github.repoMismatch}</span>, pero origin es{" "}
                <span className="font-mono">{github.repo}</span>.
              </p>
            ) : null}
            <section className="grid gap-1">
              <p>
                Visibilidad:{" "}
                {github.repoInfo.value ? (github.repoInfo.value.visibility === "publico" ? "público" : "privado") : `no disponible: ${github.repoInfo.reason}`}
              </p>
              {project.conformance.visibility ? (
                <p data-testid="visibility-result" className="text-muted-foreground">
                  {visibilityResultText(project)}
                </p>
              ) : null}
            </section>
            <section className="grid gap-1">
              <h3 className="font-medium">CI de la rama principal{github.ci.value ? ` (${github.ci.value.branch})` : ""}</h3>
              <div>
                <TrafficLight kind="ci" {...ciState(github, now)} />
              </div>
              {github.ci.value ? (
                <ul className="grid gap-0.5">
                  <RunLine run={github.ci.value.latest} label="Última ejecución" />
                </ul>
              ) : null}
              <Origin data={github.ci} now={now} />
            </section>
            <section className="grid gap-1">
              <h3 className="font-medium">PRs abiertos</h3>
              {github.pulls.value === null ? (
                <p data-testid="pulls" className="text-muted-foreground">
                  No disponible: {github.pulls.reason}
                </p>
              ) : github.pulls.value.length === 0 ? (
                <p data-testid="pulls">Ninguno</p>
              ) : (
                <ul data-testid="pulls" className="grid gap-0.5">
                  {github.pulls.value.map((pull) => (
                    <PullItem key={pull.number} pull={pull} now={now} />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}

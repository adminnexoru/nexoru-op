import { TrafficLight } from "@/components/status/traffic-light";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { agoText, capitalize, ciConclusionLabel } from "@/lib/format";
import { ciState } from "@/lib/github/ci-state";
import type { CiRun, Fetched } from "@/lib/github/types";
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
          </>
        )}
      </CardContent>
    </Card>
  );
}

import { WeeklyChart } from "@/components/charts/weekly-chart";
import { TrafficLight } from "@/components/status/traffic-light";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectReading } from "@/lib/portfolio/types";
import { Absent } from "./absent";

// T020: git history of a project (US1, contracts/indicators-ui.md). Everything comes from local
// references only; the remote age shows its limits (research R2).

const dateTime = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" });
const date = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" });

export function HistoryCard({ project }: { project: ProjectReading }) {
  const { history, manifest } = project;
  return (
    <Card data-testid="history">
      <CardHeader>
        <CardTitle>Historial de git</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        {history === null ? (
          <p className="text-muted-foreground">Sin historial de git: la carpeta no es un repositorio git.</p>
        ) : (
          <>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2">
              <dt className="text-muted-foreground">Último commit</dt>
              <dd className="flex flex-wrap items-center gap-2">
                {history.lastCommitAt ? dateTime.format(new Date(history.lastCommitAt)) : <Absent />}
                {history.activityLight ? (
                  <TrafficLight kind="activity" level={history.activityLight} detail={`${history.daysWithoutActivity} días`} />
                ) : null}
                {history.daysWithoutActivity !== null ? <span>{history.daysWithoutActivity} días sin actividad</span> : null}
              </dd>

              <dt className="text-muted-foreground">Rama actual frente a la principal</dt>
              <dd>
                {history.ahead !== null && history.behind !== null
                  ? `${history.ahead} adelante, ${history.behind} atrás respecto a ${history.compareRef}`
                  : <Absent />}
              </dd>

              <dt className="text-muted-foreground">Referencias remotas</dt>
              <dd>
                {history.remoteRefsAgeDays !== null
                  ? `referencia local de hace ${history.remoteRefsAgeDays} días (último fetch de esta copia; el dashboard nunca la actualiza)`
                  : "antigüedad desconocida: esta copia nunca ha hecho fetch"}
              </dd>

              <dt className="text-muted-foreground">Días en la fase</dt>
              <dd className="grid gap-1">
                {history.daysInPhase !== null ? (
                  <span>
                    {history.daysInPhase} días en {manifest?.fase ?? "la fase actual"}
                    {history.daysInPhaseSource === "fase_desde"
                      ? " (contados desde fase_desde, el dato declarado)"
                      : history.phaseChangedAt
                        ? `, desde el commit del ${date.format(new Date(history.phaseChangedAt))}`
                        : null}
                    {history.phaseCheck === "coincide" ? " · coincide con fase_desde" : null}
                  </span>
                ) : (
                  <span>sin historial de la fase{manifest?.fase_desde ? ` · fase_desde: ${manifest.fase_desde}` : ""}</span>
                )}
                {history.phaseCheckDetail ? (
                  <span
                    data-testid="phase-check"
                    className={history.phaseCheck === "no_verificable" ? "text-muted-foreground" : "text-destructive"}
                  >
                    {history.phaseCheckDetail}
                  </span>
                ) : null}
              </dd>
            </dl>

            {history.notes.length > 0 ? (
              <ul className="grid list-disc gap-1 pl-5 text-muted-foreground">
                {history.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}

            <WeeklyChart weeks={history.weekly} title="Actividad de git por semana (últimas 12 semanas)" />
          </>
        )}
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Manifest, ProjectReading } from "@/lib/portfolio/types";
import { declaredLevel, TrafficLight } from "@/components/status/traffic-light";
import { phaseLabel } from "@/lib/format";
import { OrAbsent } from "./absent";
import { PROBLEM_LABEL } from "./labels";

// Every field of the PROJECT.md manifest, absent ones marked as such (FR-016, FR-009).
const FIELDS: [keyof Manifest, string][] = [
  ["id", "Identificador"],
  ["nombre", "Nombre"],
  ["tipo", "Tipo"],
  ["cliente", "Cliente"],
  ["fase", "Fase"],
  ["fase_desde", "Fase desde"],
  ["estado", "Estado"],
  ["despliegue", "Despliegue"],
  ["urls", "URLs"],
  ["repo", "Repositorio"],
  ["fecha_inicio", "Fecha de inicio"],
  ["fecha_objetivo", "Fecha objetivo"],
  ["stack", "Stack"],
  ["servicios", "Servicios"],
  ["costo_mensual_usd", "Costo mensual (USD)"],
  ["siguiente_hito", "Siguiente hito"],
  ["mapa_funcional", "Mapa funcional"],
  ["version_estandar", "Versión del estándar"],
];

function value(manifest: Manifest, field: keyof Manifest): string | number | null {
  const raw = manifest[field];
  return Array.isArray(raw) ? (raw.length > 0 ? raw.join(", ") : null) : raw;
}

export function ManifestCard({ project }: { project: ProjectReading }) {
  const { manifest, manifestProblem } = project;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manifiesto</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {manifest ? (
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1">
            {FIELDS.map(([field, label]) => (
              <div key={field} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="break-words">
                  {field === "estado" && declaredLevel(manifest.estado) ? (
                    <TrafficLight kind="declared" level={declaredLevel(manifest.estado)!} />
                  ) : field === "fase" && manifest.fase ? (
                    phaseLabel(manifest.fase)
                  ) : (
                    <OrAbsent value={value(manifest, field)} />
                  )}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-muted-foreground">
            Sin manifiesto: PROJECT.md {manifestProblem ? PROBLEM_LABEL[manifestProblem.reason] : "no se pudo leer"}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

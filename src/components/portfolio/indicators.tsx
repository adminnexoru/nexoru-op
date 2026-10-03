import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Indicators } from "@/lib/portfolio/types";

// T034: Conformidad and Avance always with their name and base (FR-013); absent values with their
// reason, never 0 %. Plain text only.

export function conformityText(conformity: Indicators["conformity"]): string {
  return "absent" in conformity
    ? `Conformidad ausente: ${conformity.absent}`
    : `Conformidad ${conformity.percent} % · ${conformity.passed} de ${conformity.applicable}`;
}

export function progressText(progress: Indicators["progress"]): string {
  return "absent" in progress
    ? `Avance ausente: ${progress.absent}`
    : `Avance ${progress.percent} % · ${progress.done} de ${progress.total} tareas`;
}

export function IndicatorCell({ kind, indicators }: { kind: "conformity" | "progress"; indicators: Indicators }) {
  const text = kind === "conformity" ? conformityText(indicators.conformity) : progressText(indicators.progress);
  const absent = "absent" in indicators[kind];
  return (
    <span data-testid={kind} className={absent ? "text-muted-foreground" : undefined}>
      {text}
    </span>
  );
}

export function IndicatorsCard({ indicators }: { indicators: Indicators }) {
  const { conformity, progress } = indicators;
  return (
    <Card data-testid="indicators">
      <CardHeader>
        <CardTitle>Indicadores</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm md:grid-cols-2">
        <section className="grid gap-1">
          <h3 className="font-medium">{conformityText(conformity)}</h3>
          <p className="text-muted-foreground">
            Verificaciones del estándar cumplidas sobre las aplicables. No cuentan las que se evaluarán con GitHub (3.2); las
            que dependen de otra que falló cuentan como no cumplidas.
          </p>
          {"missing" in conformity && conformity.missing.length > 0 ? (
            <p>Verificaciones que faltan: {conformity.missing.join(", ")}</p>
          ) : null}
        </section>
        <section className="grid gap-1">
          <h3 className="font-medium">{progressText(progress)}</h3>
          <p className="text-muted-foreground">
            Tareas marcadas sobre el total de las specs vinculadas a fases con estado derivado; cada spec cuenta una vez.
          </p>
          {"absent" in progress ? null : (
            <>
              <p>Fases con estado manual no incluidas: {progress.manualPhasesExcluded}</p>
              <p>
                Fases completas: {progress.phasesCompleted} de {progress.phasesTotal}
              </p>
            </>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

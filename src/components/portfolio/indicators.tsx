import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { conformityCellText, conformityText, progressCellText, progressText } from "@/lib/format";
import type { Indicators } from "@/lib/portfolio/types";
import { ConformityLegend } from "@/components/github/conformity-legend";

// T034: Conformidad and Avance always with their name and base (FR-013); absent values with their
// reason, never 0 %. Plain text only.

export function IndicatorCell({ kind, indicators }: { kind: "conformity" | "progress"; indicators: Indicators }) {
  // Table cell: the column header gives the name (owner review).
  const text = kind === "conformity" ? conformityCellText(indicators.conformity) : progressCellText(indicators.progress);
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
          <p className="max-w-prose text-muted-foreground">
            Verificaciones del estándar cumplidas sobre las aplicables; las que dependen de otra que falló cuentan como no
            cumplidas.
          </p>
          <ConformityLegend />
          {"missing" in conformity && conformity.missing.length > 0 ? (
            <p className="max-w-prose">Verificaciones que faltan: {conformity.missing.join(", ")}</p>
          ) : null}
        </section>
        <section className="grid gap-1">
          <h3 className="font-medium">{progressText(progress)}</h3>
          <p className="max-w-prose text-muted-foreground">
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

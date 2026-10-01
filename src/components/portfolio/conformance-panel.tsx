import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Check, ProjectReading } from "@/lib/portfolio/types";
import { FINDING_LABEL, SEVERITY_LABEL } from "./labels";
import { LevelBadge } from "./level-badge";

// Conformance of one project (US2, FR-024): level, failures of the next level, warnings,
// findings, what is not evaluated and why, and every check.
const STATUS_LABEL: Record<Check["status"], string> = { pass: "pasa", fail: "falla", not_evaluated: "no evaluada" };

function CheckItem({ check }: { check: Check }) {
  return (
    <li>
      <span className="font-mono">{check.id}</span>
      {check.detail ? <span className="text-muted-foreground"> · {check.detail}</span> : null}
    </li>
  );
}

export function ConformancePanel({ project }: { project: ProjectReading }) {
  const { conformance } = project;
  const notEvaluatedChecks = conformance.checks.filter((c) => c.status === "not_evaluated");
  const notEvaluatedFindings = conformance.findings.filter((f) => f.status === "not_evaluated");
  const foundFindings = conformance.findings.filter((f) => f.status === "found");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conformidad</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        <p className="flex items-center gap-2">
          Nivel <LevelBadge project={project} data-testid="level" />
          {conformance.standardVersion ? (
            <span className="text-muted-foreground">con el estándar {conformance.standardVersion}</span>
          ) : null}
        </p>

        {conformance.evaluation === "evaluated" ? (
          <>
            <section className="grid gap-1">
              <h3 className="font-medium">Fallas para el siguiente nivel</h3>
              {conformance.failures.length > 0 ? (
                <ul data-testid="failures" className="grid list-disc gap-1 pl-5">
                  {conformance.failures.map((check) => (
                    <CheckItem key={check.id} check={check} />
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Ninguna.</p>
              )}
            </section>

            {conformance.warnings.length > 0 ? (
              <section className="grid gap-1">
                <h3 className="font-medium">Advertencias</h3>
                <ul data-testid="warnings" className="grid list-disc gap-1 pl-5">
                  {conformance.warnings.map((warning) => (
                    <li key={`${warning.path}-${warning.reason}`}>{warning.detail ?? warning.path}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="grid gap-1">
              <h3 className="font-medium">Hallazgos</h3>
              {foundFindings.length > 0 ? (
                <ul data-testid="findings" className="grid gap-1">
                  {foundFindings.map((finding) => (
                    <li key={finding.code} className="flex flex-wrap items-center gap-2">
                      <Badge variant={finding.severity === "critical" ? "destructive" : "outline"}>
                        {SEVERITY_LABEL[finding.severity]}
                      </Badge>
                      {FINDING_LABEL[finding.code]}
                      {finding.detail ? <span className="font-mono text-muted-foreground">{finding.detail}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Ninguno.</p>
              )}
            </section>

            <section className="grid gap-1">
              <h3 className="font-medium">No evaluadas en esta fase</h3>
              <ul data-testid="not-evaluated" className="grid list-disc gap-1 pl-5">
                {notEvaluatedChecks.map((check) => (
                  <CheckItem key={check.id} check={check} />
                ))}
                {notEvaluatedFindings.map((finding) => (
                  <li key={finding.code}>
                    {FINDING_LABEL[finding.code]} ({SEVERITY_LABEL[finding.severity]})
                    {finding.detail ? <span className="text-muted-foreground"> · {finding.detail}</span> : null}
                  </li>
                ))}
              </ul>
            </section>

            <details>
              <summary className="cursor-pointer font-medium">Todas las verificaciones</summary>
              <ul className="mt-2 grid gap-1">
                {conformance.checks.map((check) => (
                  <li key={check.id}>
                    <span className="font-mono">{check.id}</span> {STATUS_LABEL[check.status]}
                    {check.detail ? <span className="text-muted-foreground"> · {check.detail}</span> : null}
                  </li>
                ))}
              </ul>
            </details>
          </>
        ) : (
          <p className="text-muted-foreground">
            No se evalúa: el dashboard solo aplica las versiones del estándar que soporta (principio XIV).
          </p>
        )}
      </CardContent>
    </Card>
  );
}

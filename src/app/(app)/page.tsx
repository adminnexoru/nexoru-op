import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrAbsent } from "@/components/portfolio/absent";
import { PortfolioCharts } from "@/components/charts/portfolio-charts";
import { PortfolioTable } from "@/components/portfolio/portfolio-table";
import { RefreshButton } from "@/components/portfolio/refresh-button";
import { getPortfolio } from "@/lib/portfolio/snapshot";
import type { PortfolioReading } from "@/lib/portfolio/types";

// T037: the portfolio (US1, contracts/ui.md "GET /"). Reads the index; reads PROJECTS_ROOT again
// first when the index is empty, invalid or older than 10 minutes (FR-012, FR-013).

const ROOT_MESSAGES: Record<Exclude<PortfolioReading["root"]["status"], "ok">, string> = {
  missing: "No está configurado PROJECTS_ROOT. Añádelo a .env.op.local con la carpeta del portafolio y reinicia la app.",
  not_absolute: "PROJECTS_ROOT debe ser una ruta absoluta (por ejemplo, /home/usuario/proyectos).",
  not_directory: "PROJECTS_ROOT no es una carpeta existente.",
};

const dateTime = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "medium" });

export default async function PortfolioPage() {
  const portfolio = await getPortfolio();
  const { root, standard, projects, warnings } = portfolio;

  return (
    <section className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold">Portafolio</h1>
          <p className="text-sm text-muted-foreground">
            Última lectura:{" "}
            <time data-testid="read-at" dateTime={portfolio.readAt}>
              {dateTime.format(new Date(portfolio.readAt))}
            </time>{" "}
            · Estándar soportado: {portfolio.supportedStandardVersions.join(", ")}
          </p>
        </div>
        <RefreshButton />
      </header>

      {root.status !== "ok" ? (
        <Alert>
          <AlertTitle>No hay proyectos que mostrar</AlertTitle>
          <AlertDescription className="max-w-prose">{ROOT_MESSAGES[root.status]}</AlertDescription>
        </Alert>
      ) : null}

      {standard.found && standard.newerThanSupported ? (
        <Alert data-testid="standard-warning">
          <AlertTitle>El estándar local es más nuevo</AlertTitle>
          <AlertDescription className="max-w-prose">
            {standard.folder} está en la versión {standard.version}, pero el dashboard solo sabe evaluar la{" "}
            {portfolio.supportedStandardVersions.join(", ")}. Los proyectos que declaren la versión nueva no se evalúan.
          </AlertDescription>
        </Alert>
      ) : null}

      {root.status === "ok" && !standard.found ? (
        <Alert data-testid="standard-warning">
          <AlertTitle>No se encontró el estándar</AlertTitle>
          <AlertDescription className="max-w-prose">
            No hay una carpeta {standard.folder} en el portafolio. Los proyectos se evalúan con la versión soportada:{" "}
            {portfolio.supportedStandardVersions.join(", ")}.
          </AlertDescription>
        </Alert>
      ) : null}

      {warnings.map((warning) => (
        <Alert key={warning.detail}>
          <AlertTitle>Identificador duplicado</AlertTitle>
          <AlertDescription className="max-w-prose">{warning.detail}</AlertDescription>
        </Alert>
      ))}

      {root.status === "ok" && projects.length === 0 ? (
        <p className="text-muted-foreground">PROJECTS_ROOT no tiene carpetas de proyecto.</p>
      ) : null}

      {projects.length > 0 ? <PortfolioCharts portfolio={portfolio} /> : null}

      {projects.length > 0 ? <PortfolioTable projects={projects} /> : null}

      <Card data-testid="standard">
        <CardHeader>
          <CardTitle>Estándar</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {standard.found ? (
            <p>
              <span className="font-mono">{standard.folder}</span> · versión <OrAbsent value={standard.version} />
            </p>
          ) : (
            <p className="text-muted-foreground">No se encontró {standard.folder} en el portafolio.</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

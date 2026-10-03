import { BarChart } from "@/components/charts/bar-chart";
import { WeeklyChart } from "@/components/charts/weekly-chart";
import { Card, CardContent } from "@/components/ui/card";
import { chartData } from "@/lib/charts/chart-data";
import type { PortfolioReading } from "@/lib/portfolio/types";

// T046: the five charts of the portfolio (US4, FR-022). Their totals match the table (FR-024).
export function PortfolioCharts({ portfolio }: { portfolio: PortfolioReading }) {
  const data = chartData(portfolio);
  const projects = portfolio.projects.length;
  return (
    <section className="grid gap-4 lg:grid-cols-2" aria-label="Gráficos del portafolio">
      <Card>
        <CardContent>
          <BarChart
            chartKey="declared"
            title="Estado declarado"
            description={`${projects} proyectos según el campo estado de su PROJECT.md.`}
            items={data.declared}
            unit="proyectos"
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <BarChart
            chartKey="levels"
            title="Nivel de conformidad"
            description={`${projects} proyectos por nivel del estándar; el nivel 3 provisional espera la verificación 3.2.`}
            items={data.levels}
            unit="proyectos"
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <BarChart
            chartKey="progress"
            title="Avance por proyecto"
            description="Tareas marcadas sobre el total de las specs vinculadas a fases con estado derivado."
            items={data.progress.items}
            unit="%"
            max={100}
            footnote={`Proyectos sin Avance: ${data.progress.excluded} (sin roadmap, sin fases derivadas o no evaluados).`}
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <BarChart
            chartKey="phases"
            title="Fase del ciclo de vida"
            description={`${projects} proyectos según el campo fase de su PROJECT.md.`}
            items={data.phases}
            unit="proyectos"
          />
        </CardContent>
      </Card>
      <Card className="lg:col-span-2" data-testid="chart-activity">
        <CardContent className="grid gap-2">
          <p className="font-medium">Actividad de git del portafolio</p>
          <WeeklyChart weeks={data.activity} title="Actividad de git del portafolio por semana (últimas 12 semanas)" testId="chart-data-activity" />
        </CardContent>
      </Card>
    </section>
  );
}

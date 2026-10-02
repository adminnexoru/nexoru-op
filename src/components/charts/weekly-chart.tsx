import { useId } from "react";
import type { WeekActivity } from "@/lib/portfolio/types";

// T020: commits per week as a server-rendered SVG (research R5). Numeric attributes and CSS classes
// only (no style attributes, no JavaScript), so the strict CSP stays intact. The same values are
// in a table under "Ver datos" (FR-023).

const WIDTH = 360;
const HEIGHT = 120;
const PADDING = 16;
const BAR_GAP = 4;

const shortDate = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" });
const label = (weekStart: string) => shortDate.format(new Date(`${weekStart}T00:00:00`));

export function WeeklyChart({ weeks, title, testId = "weekly-data" }: { weeks: WeekActivity[]; title: string; testId?: string }) {
  const id = useId();
  const total = weeks.reduce((sum, week) => sum + week.commits, 0);
  const max = Math.max(1, ...weeks.map((week) => week.commits));
  const barWidth = (WIDTH - 2 * PADDING) / weeks.length - BAR_GAP;
  const plotHeight = HEIGHT - 2 * PADDING;

  return (
    <figure className="grid gap-2">
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">Sin datos: no hubo commits en las últimas 12 semanas.</p>
      ) : (
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby={`${id}-title ${id}-desc`} className="h-32 w-full max-w-md">
          <title id={`${id}-title`}>{title}</title>
          <desc id={`${id}-desc`}>
            {total} commits en 12 semanas; la semana con más actividad tuvo {max}.
          </desc>
          <line className="chart-axis" x1={PADDING} y1={HEIGHT - PADDING} x2={WIDTH - PADDING} y2={HEIGHT - PADDING} />
          {weeks.map((week, i) => {
            const height = (week.commits / max) * plotHeight;
            const x = PADDING + i * (barWidth + BAR_GAP);
            return (
              <g key={week.weekStart}>
                <rect className="chart-bar chart-bar--accent" x={x} y={HEIGHT - PADDING - height} width={barWidth} height={height} />
                {week.commits > 0 ? (
                  <text className="chart-label" x={x + barWidth / 2} y={HEIGHT - PADDING - height - 3} textAnchor="middle">
                    {week.commits}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      )}
      <details>
        <summary className="cursor-pointer text-sm">Ver datos</summary>
        <table data-testid={testId} className="mt-2 text-sm">
          <thead>
            <tr>
              <th className="pr-4 text-left font-medium">Semana del</th>
              <th className="text-right font-medium">Commits</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week.weekStart}>
                <td className="pr-4">{label(week.weekStart)}</td>
                <td className="text-right">{week.commits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

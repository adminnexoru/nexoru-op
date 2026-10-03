import { useId } from "react";
import { commitsInWeeks, weekLabel } from "@/lib/format";
import type { WeekActivity } from "@/lib/portfolio/types";

// T020: commits per week as a server-rendered SVG (research R5). Numeric attributes and CSS classes
// only (no style attributes, no JavaScript), so the strict CSP stays intact. The same values are
// in a table under "Ver datos" (FR-023). The x axis shows the start of each week ("14 sep").

// Wide and low viewBox: full width of its container with a reduced height (owner review).
const WIDTH = 960;
const HEIGHT = 120;
const PADDING_X = 16;
const PADDING_TOP = 18;
const AXIS_HEIGHT = 22;
const BAR_GAP = 12;

export function WeeklyChart({ weeks, title, testId = "weekly-data" }: { weeks: WeekActivity[]; title: string; testId?: string }) {
  const id = useId();
  const total = weeks.reduce((sum, week) => sum + week.commits, 0);
  const max = Math.max(1, ...weeks.map((week) => week.commits));
  const barWidth = (WIDTH - 2 * PADDING_X) / weeks.length - BAR_GAP;
  const baseline = HEIGHT - AXIS_HEIGHT;
  const plotHeight = baseline - PADDING_TOP;

  return (
    <figure className="grid gap-2">
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">Sin datos: no hubo commits en las últimas 12 semanas.</p>
      ) : (
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby={`${id}-title ${id}-desc`} className="h-auto max-h-48 w-full">
          <title id={`${id}-title`}>{title}</title>
          <desc id={`${id}-desc`}>
            {commitsInWeeks(total)}; la semana con más actividad tuvo {max}.
          </desc>
          <line className="chart-axis" x1={PADDING_X} y1={baseline} x2={WIDTH - PADDING_X} y2={baseline} />
          {weeks.map((week, i) => {
            const height = (week.commits / max) * plotHeight;
            const x = PADDING_X + i * (barWidth + BAR_GAP) + BAR_GAP / 2;
            return (
              <g key={week.weekStart}>
                <rect className="chart-bar chart-bar--accent" x={x} y={baseline - height} width={barWidth} height={height} />
                {week.commits > 0 ? (
                  <text className="chart-label" x={x + barWidth / 2} y={baseline - height - 4} textAnchor="middle">
                    {week.commits}
                  </text>
                ) : null}
                <text className="chart-label chart-axis-label" x={x + barWidth / 2} y={HEIGHT - 4} textAnchor="middle">
                  {weekLabel(week.weekStart)}
                </text>
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
                <td className="pr-4">{weekLabel(week.weekStart)}</td>
                <td className="text-right">{week.commits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

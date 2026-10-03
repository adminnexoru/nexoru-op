import { useId, type ReactNode } from "react";
import { declaredLevel, TrafficLight } from "@/components/status/traffic-light";
import type { ChartItem } from "@/lib/charts/chart-data";

// T045: horizontal bar chart as a server-rendered SVG (research R5). Numeric attributes and CSS
// classes from tokens.css only (no style attributes, no JavaScript): the strict CSP stays intact.
// Every value is also in the "Ver datos" table (FR-023).

const WIDTH = 960;
const LABEL_WIDTH = 280;
const VALUE_WIDTH = 70;
const ROW_HEIGHT = 32;
const PADDING = 12;
const MAX_LABEL = 34;

const short = (label: string) => (label.length > MAX_LABEL ? `${label.slice(0, MAX_LABEL - 1)}…` : label);

export function BarChart({
  chartKey,
  title,
  description,
  items,
  unit,
  max,
  footnote,
}: {
  chartKey: string;
  title: string;
  description: string;
  items: ChartItem[];
  unit: "proyectos" | "%";
  /** Upper bound of the scale (100 for percentages); defaults to the largest value. */
  max?: number;
  footnote?: ReactNode;
}) {
  const id = useId();
  const scale = max ?? Math.max(1, ...items.map((item) => item.value));
  const plot = WIDTH - LABEL_WIDTH - VALUE_WIDTH - PADDING;
  const height = items.length * ROW_HEIGHT + 2 * PADDING;
  const format = (value: number) => (unit === "%" ? `${value} %` : String(value));
  const empty = items.length === 0 || items.every((item) => item.value === 0);

  return (
    <figure className="grid gap-2" data-testid={`chart-${chartKey}`}>
      <figcaption className="font-medium">{title}</figcaption>
      {empty ? (
        <p className="text-sm text-muted-foreground">Sin datos.</p>
      ) : (
        <svg viewBox={`0 0 ${WIDTH} ${height}`} role="img" aria-labelledby={`${id}-title ${id}-desc`} className="h-auto w-full">
          <title id={`${id}-title`}>{title}</title>
          <desc id={`${id}-desc`}>{description}</desc>
          {items.map((item, i) => {
            const y = PADDING + i * ROW_HEIGHT;
            const width = (item.value / scale) * plot;
            return (
              <g key={item.key}>
                <text className="chart-label" x={LABEL_WIDTH - 12} y={y + ROW_HEIGHT / 2 + 5} textAnchor="end">
                  {short(item.label)}
                </text>
                <rect className={`chart-bar chart-bar--${item.tone}`} x={LABEL_WIDTH} y={y + 6} width={width} height={ROW_HEIGHT - 12} rx={4} />
                <text className="chart-label" x={LABEL_WIDTH + width + 8} y={y + ROW_HEIGHT / 2 + 5}>
                  {format(item.value)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {footnote ? <p className="max-w-prose text-sm text-muted-foreground">{footnote}</p> : null}
      <details>
        <summary className="cursor-pointer text-sm">Ver datos</summary>
        <table data-testid={`chart-data-${chartKey}`} className="mt-2 text-sm">
          <thead>
            <tr>
              <th className="pr-6 text-left font-medium">{chartKey === "progress" ? "Proyecto" : "Categoría"}</th>
              <th className="text-right font-medium">{unit === "%" ? "Avance" : "Proyectos"}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const level = chartKey === "declared" ? declaredLevel(item.key) : null;
              return (
                <tr key={item.key}>
                  <td className="pr-6">{level ? <TrafficLight kind="declared" level={level} /> : item.label}</td>
                  <td className="text-right">{format(item.value)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

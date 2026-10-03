// T044: series of the five portfolio charts (US4, FR-022 to FR-024). Pure: computed from the
// reading; the totals of declared state, level and phase always add up to the number of projects.
import { phaseLabel } from "@/lib/format";
import type { PortfolioReading, WeekActivity } from "@/lib/portfolio/types";

export type Tone = "verde" | "ambar" | "rojo" | "neutro" | "accent";

export interface ChartItem {
  key: string;
  label: string;
  value: number;
  tone: Tone;
}

export interface ChartData {
  declared: ChartItem[];
  levels: ChartItem[];
  progress: { items: ChartItem[]; excluded: number };
  phases: ChartItem[];
  activity: WeekActivity[];
}

const PHASES = ["idea", "especificacion", "construccion", "pruebas", "piloto", "migracion", "operacion", "pausado", "retirado"];

export function chartData(reading: PortfolioReading): ChartData {
  const { projects } = reading;
  const count = (predicate: (project: (typeof projects)[number]) => boolean) => projects.filter(predicate).length;

  const declared: ChartItem[] = [
    { key: "verde", label: "Verde", value: count((p) => p.manifest?.estado === "verde"), tone: "verde" },
    { key: "ambar", label: "Ámbar", value: count((p) => p.manifest?.estado === "ambar"), tone: "ambar" },
    { key: "rojo", label: "Rojo", value: count((p) => p.manifest?.estado === "rojo"), tone: "rojo" },
  ];
  declared.push({ key: "sin-dato", label: "Sin dato", value: projects.length - declared.reduce((t, i) => t + i.value, 0), tone: "neutro" });

  const evaluated = (p: (typeof projects)[number]) => p.conformance.evaluation === "evaluated";
  const levels: ChartItem[] = [
    ...[0, 1, 2].map((level) => ({
      key: String(level),
      label: `Nivel ${level}`,
      value: count((p) => evaluated(p) && p.conformance.level === level),
      tone: "accent" as const,
    })),
    { key: "3", label: "Nivel 3", value: count((p) => evaluated(p) && p.conformance.level === 3 && !p.conformance.provisional), tone: "accent" },
    {
      key: "3-provisional",
      label: "Nivel 3 (provisional)",
      value: count((p) => evaluated(p) && p.conformance.level === 3 && p.conformance.provisional),
      tone: "accent",
    },
    { key: "no-evaluado", label: "No evaluado", value: count((p) => !evaluated(p)), tone: "neutro" },
  ];

  const progressItems = projects
    .flatMap((p) =>
      "absent" in p.indicators.progress
        ? []
        : [{ key: p.folder, label: p.manifest?.nombre ?? p.folder, value: p.indicators.progress.percent, tone: "accent" as const }],
    )
    .sort((a, b) => a.label.localeCompare(b.label, "es"));

  const phases: ChartItem[] = PHASES.map((fase) => ({ key: fase, label: phaseLabel(fase), value: count((p) => p.manifest?.fase === fase), tone: "accent" }));
  phases.push({ key: "sin-dato", label: "Sin dato", value: projects.length - phases.reduce((t, i) => t + i.value, 0), tone: "neutro" });

  return {
    declared,
    levels,
    progress: { items: progressItems, excluded: projects.length - progressItems.length },
    phases,
    activity: reading.activityByWeek,
  };
}

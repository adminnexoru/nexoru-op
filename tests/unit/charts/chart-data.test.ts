// T042: series of the five portfolio charts, computed from the reading (US4, FR-022 to FR-024).
// Expected values are computed here independently from the projects of the reading.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chartData } from "@/lib/charts/chart-data";
import { readPortfolio } from "@/lib/portfolio/read-portfolio";
import type { PortfolioReading } from "@/lib/portfolio/types";
import { buildFixturePortfolio, removeFixturePortfolio } from "../../fixtures/build-portfolio";

let root: string;
let reading: PortfolioReading;
const sum = (items: { value: number }[]) => items.reduce((total, item) => total + item.value, 0);

beforeAll(async () => {
  let now: Date;
  ({ root, now } = await buildFixturePortfolio());
  reading = await readPortfolio(root, now);
});

afterAll(() => removeFixturePortfolio(root));

describe("chartData", () => {
  it("declared state: one bar per level, adding up to the number of projects", () => {
    const { declared } = chartData(reading);
    expect(declared.map((item) => item.key)).toEqual(["verde", "ambar", "rojo", "sin-dato"]);
    expect(sum(declared)).toBe(reading.projects.length);
    expect(declared.find((item) => item.key === "verde")?.value).toBe(reading.projects.filter((p) => p.manifest?.estado === "verde").length);
  });

  it("conformance level: 0 to 3, provisional level 3 apart and not evaluated, adding up to the projects", () => {
    const { levels } = chartData(reading);
    expect(levels.map((item) => item.key)).toEqual(["0", "1", "2", "3", "3-provisional", "no-evaluado"]);
    expect(sum(levels)).toBe(reading.projects.length);
    const provisional = reading.projects.filter((p) => p.conformance.level === 3 && p.conformance.provisional).length;
    expect(levels.find((item) => item.key === "3-provisional")?.value).toBe(provisional);
    expect(levels.find((item) => item.key === "no-evaluado")?.value).toBe(
      reading.projects.filter((p) => p.conformance.evaluation !== "evaluated").length,
    );
  });

  it("Avance per project: only projects with a value, sorted by name, and how many were left out", () => {
    const { progress } = chartData(reading);
    const withValue = reading.projects.filter((p) => !("absent" in p.indicators.progress));
    expect(progress.items).toHaveLength(withValue.length);
    expect(progress.excluded).toBe(reading.projects.length - withValue.length);
    expect(progress.items.every((item) => item.value >= 0 && item.value <= 100)).toBe(true);
    const labels = progress.items.map((item) => item.label);
    expect([...labels].sort((a, b) => a.localeCompare(b, "es"))).toEqual(labels);
  });

  it("lifecycle phase: every phase of the standard plus 'sin dato', adding up to the projects", () => {
    const { phases } = chartData(reading);
    expect(phases.map((item) => item.key)).toEqual([
      "idea",
      "especificacion",
      "construccion",
      "pruebas",
      "piloto",
      "migracion",
      "operacion",
      "pausado",
      "retirado",
      "sin-dato",
    ]);
    expect(sum(phases)).toBe(reading.projects.length);
    expect(phases.map((item) => item.label)).toEqual([
      "Idea",
      "Especificación",
      "Construcción",
      "Pruebas",
      "Piloto",
      "Migración",
      "Operación",
      "Pausado",
      "Retirado",
      "Sin dato",
    ]);
    expect(phases.find((item) => item.key === "construccion")?.value).toBe(
      reading.projects.filter((p) => p.manifest?.fase === "construccion").length,
    );
  });

  it("git activity: the 12 weeks of the portfolio", () => {
    const { activity } = chartData(reading);
    expect(activity).toEqual(reading.activityByWeek);
    expect(activity).toHaveLength(12);
  });
});

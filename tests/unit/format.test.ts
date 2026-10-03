// Number agreement in every text with a count (owner review, 2026-10-02): "1 día", "2 días".
import { describe, expect, it } from "vitest";
import {
  commitsInWeeks,
  conformityCellText,
  conformityText,
  count,
  daysInPhaseText,
  phaseLabel,
  progressCellText,
  progressText,
  projectsText,
  remoteAgeText,
  weekLabel,
} from "@/lib/format";

const NBSP = "\u00a0";

describe("count", () => {
  it.each([
    [0, "0 días"],
    [1, "1 día"],
    [2, "2 días"],
  ])("%i → %s", (n, text) => {
    expect(count(n, "día", "días")).toBe(text);
  });
});

describe("texts with counts", () => {
  it("remote reference age", () => {
    expect(remoteAgeText(1)).toBe("referencia local de hace 1 día");
    expect(remoteAgeText(40)).toBe("referencia local de hace 40 días");
    expect(remoteAgeText(0)).toBe("referencia local de hoy");
  });

  it("days in the phase, with the readable phase name", () => {
    expect(daysInPhaseText(1, "construccion")).toBe("1 día en Construcción");
    expect(daysInPhaseText(20, "especificacion")).toBe("20 días en Especificación");
  });

  it("Avance agrees with the total of tasks", () => {
    expect(progressText({ percent: 100, done: 1, total: 1, manualPhasesExcluded: 0, phasesCompleted: 1, phasesTotal: 1 })).toBe(
      `Avance 100${NBSP}% · 1 de 1 tarea`,
    );
    expect(progressText({ percent: 50, done: 1, total: 2, manualPhasesExcluded: 0, phasesCompleted: 0, phasesTotal: 1 })).toBe(
      `Avance 50${NBSP}% · 1 de 2 tareas`,
    );
    expect(progressText({ absent: "sin roadmap" })).toBe("Avance ausente: sin roadmap");
  });

  it("Conformidad keeps its base", () => {
    expect(conformityText({ percent: 100, passed: 28, applicable: 28, missing: [] })).toBe(`Conformidad 100${NBSP}% · 28 de 28`);
  });

  it("projects and commits", () => {
    expect(projectsText(1)).toBe("1 proyecto");
    expect(projectsText(5)).toBe("5 proyectos");
    expect(commitsInWeeks(1)).toBe("1 commit en 12 semanas");
    expect(commitsInWeeks(33)).toBe("33 commits en 12 semanas");
  });
});

describe("table cells (the column header gives the name)", () => {
  it("do not repeat the name and keep the number with its %", () => {
    expect(conformityCellText({ percent: 93, passed: 26, applicable: 28, missing: ["1.11", "2.6"] })).toBe(`93${NBSP}% · 26 de 28`);
    expect(progressCellText({ percent: 78, done: 25, total: 32, manualPhasesExcluded: 1, phasesCompleted: 2, phasesTotal: 5 })).toBe(
      `78${NBSP}% · 25 de 32 tareas`,
    );
    expect(progressCellText({ absent: "sin roadmap" })).toBe("Ausente: sin roadmap");
    expect(conformityCellText({ absent: "versión del estándar no soportada" })).toBe("Ausente: versión del estándar no soportada");
  });
});

describe("phase names on screen", () => {
  it.each([
    ["idea", "Idea"],
    ["especificacion", "Especificación"],
    ["construccion", "Construcción"],
    ["pruebas", "Pruebas"],
    ["piloto", "Piloto"],
    ["migracion", "Migración"],
    ["operacion", "Operación"],
    ["pausado", "Pausado"],
    ["retirado", "Retirado"],
  ])("%s → %s", (id, label) => {
    expect(phaseLabel(id)).toBe(label);
  });

  it("shows an unknown value as it is", () => {
    expect(phaseLabel("otra")).toBe("otra");
  });
});

describe("week labels", () => {
  it("day and short month in Spanish", () => {
    expect(weekLabel("2026-09-14")).toBe("14 sep");
    expect(weekLabel("2026-01-05")).toBe("5 ene");
    expect(weekLabel("2026-12-28")).toBe("28 dic");
  });
});

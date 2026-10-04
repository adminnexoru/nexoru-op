// Number agreement in every text with a count (owner review, 2026-10-02): "1 día", "2 días".
import { describe, expect, it } from "vitest";
import {
  commitsInWeeks,
  CONFORMITY_LEGEND,
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

  it("Conformidad keeps its base and says the state of 3.2 in the same place", () => {
    expect(conformityText({ percent: 100, passed: 28, applicable: 28, missing: [], check32: { included: false, reason: "sin datos recientes de GitHub" } })).toBe(
      `Conformidad 100${NBSP}% · 28 de 28 (3.2 sin evaluar: sin datos recientes de GitHub)`,
    );
    expect(conformityText({ percent: 97, passed: 28, applicable: 29, missing: ["3.2"], check32: { included: true } })).toBe(
      `Conformidad 97${NBSP}% · 28 de 29 (incluye 3.2)`,
    );
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
    expect(
      conformityCellText({ percent: 93, passed: 26, applicable: 28, missing: ["1.11", "2.6"], check32: { included: false, reason: "requiere token" } }),
    ).toBe(`93${NBSP}% · 26 de 28 (3.2 sin evaluar: requiere token)`);
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

// T018 (004-github-readonly, FR-017, contracts/github-ui.md): one exact text per reason.
describe("Conformidad without 3.2", () => {
  it.each(["sin datos recientes de GitHub", "requiere token", "token de GitHub no válido o vencido", "el remoto no es de GitHub", "sin remoto"])(
    "%s",
    (reason) => {
      expect(conformityCellText({ percent: 100, passed: 28, applicable: 28, missing: [], check32: { included: false, reason } })).toBe(
        `100${NBSP}% · 28 de 28 (3.2 sin evaluar: ${reason})`,
      );
    },
  );

  it("with 3.2 evaluated", () => {
    expect(conformityCellText({ percent: 97, passed: 28, applicable: 29, missing: ["3.2"], check32: { included: true } })).toBe(
      `97${NBSP}% · 28 de 29 (incluye 3.2)`,
    );
  });

  it("the fixed legend is the only text that says the base changed", () => {
    expect(CONFORMITY_LEGEND).toBe(
      "La Conformidad incluye la verificación 3.2 (CI de la rama principal) desde la Fase 4: la base es 29 cuando 3.2 se evalúa y 28 cuando no se puede evaluar; la base cambió de 28 a 29 por la activación de 3.2",
    );
  });
});

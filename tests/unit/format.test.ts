// Number agreement in every text with a count (owner review, 2026-10-02): "1 día", "2 días".
import { describe, expect, it } from "vitest";
import {
  commitsInWeeks,
  conformityText,
  count,
  daysInPhaseText,
  progressText,
  projectsText,
  remoteAgeText,
} from "@/lib/format";

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

  it("days in the phase", () => {
    expect(daysInPhaseText(1, "construccion")).toBe("1 día en construccion");
    expect(daysInPhaseText(20, "construccion")).toBe("20 días en construccion");
  });

  it("Avance agrees with the total of tasks", () => {
    expect(progressText({ percent: 100, done: 1, total: 1, manualPhasesExcluded: 0, phasesCompleted: 1, phasesTotal: 1 })).toBe(
      "Avance 100 % · 1 de 1 tarea",
    );
    expect(progressText({ percent: 50, done: 1, total: 2, manualPhasesExcluded: 0, phasesCompleted: 0, phasesTotal: 1 })).toBe(
      "Avance 50 % · 1 de 2 tareas",
    );
    expect(progressText({ absent: "sin roadmap" })).toBe("Avance ausente: sin roadmap");
  });

  it("Conformidad keeps its base", () => {
    expect(conformityText({ percent: 100, passed: 28, applicable: 28, missing: [] })).toBe("Conformidad 100 % · 28 de 28");
  });

  it("projects and commits", () => {
    expect(projectsText(1)).toBe("1 proyecto");
    expect(projectsText(5)).toBe("5 proyectos");
    expect(commitsInWeeks(1)).toBe("1 commit en 12 semanas");
    expect(commitsInWeeks(33)).toBe("33 commits en 12 semanas");
  });
});

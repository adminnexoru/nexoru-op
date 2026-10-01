// T013: roadmap table and derived phase state (standard/roadmap.md, research R7).
import { describe, expect, it } from "vitest";
import { baseFiles, evaluate, replaceIn, roadmapFiles } from "./helpers";

describe("derived state", () => {
  it("derives completa, en-curso and pendiente with counts, and keeps manual states", () => {
    const files = roadmapFiles(
      [
        "| 1 | Base | 001-done | — | |",
        "| 2 | Parcial | 002-partial | 2027-06-01 | |",
        "| 3 | Sin empezar | 003-none | 2027-09-01 | |",
        "| 4 | Sin spec | — | 2027-12-15 | pendiente |",
        "| 4.5 | Varias specs | 001-done, 002-partial | — | |",
      ].join("\n"),
      [
        ["001-done", 12, 12],
        ["002-partial", 10, 12],
        ["003-none", 0, 5],
      ],
    );
    const roadmap = evaluate(files).roadmap!;
    expect(roadmap.map((p) => [p.phase, p.shownState, p.derived, p.manualState])).toEqual([
      ["1", "completa", { state: "completa", done: 12, total: 12 }, null],
      ["2", "en-curso", { state: "en-curso", done: 10, total: 12 }, null],
      ["3", "pendiente", { state: "pendiente", done: 0, total: 5 }, null],
      ["4", "pendiente", null, "pendiente"],
      ["4.5", "en-curso", { state: "en-curso", done: 22, total: 24 }, null],
    ]);
    expect(roadmap[0]).toMatchObject({ objective: "Base", specs: ["001-done"], targetDate: null });
    expect(roadmap[1].targetDate).toBe("2027-06-01");
  });

  it("only derives when every linked spec has tasks.md", () => {
    const files = roadmapFiles("| 1 | Mixta | 001-done, 002-extra | — | en-curso |", [
      ["001-done", 3, 3],
      ["002-extra", null],
    ]);
    expect(evaluate(files).roadmap![0]).toMatchObject({ derived: null, manualState: "en-curso", shownState: "en-curso" });
  });

  it("treats an unreadable tasks.md (e.g. a FIFO) as missing", () => {
    const files = baseFiles();
    files.specs[0].tasks = { ok: false, problem: { path: "specs/001-demo/tasks.md", reason: "not_regular_file", detail: null } };
    expect(evaluate(files).roadmap![0].derived).toBeNull();
  });

  it("returns null when there is no roadmap table", () => {
    const files = replaceIn(baseFiles(), "project", "| Fase | Objetivo | Specs | Fecha objetivo | Estado manual |", "| Fase | Objetivo |");
    expect(evaluate(files).roadmap).toBeNull();
  });
});

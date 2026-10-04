// T013: level 3 checks 3.1–3.8 (contracts/conformance.md). 3.2 needs GitHub (phase 4).
import { describe, expect, it } from "vitest";
import type { ProjectFiles } from "@/lib/standard/project-files";
import { baseFiles, check, replaceIn, roadmapFiles } from "./helpers";

const workflow = (text: string) => (f: ProjectFiles) => (f.workflows = [{ name: "ci.yml", content: { ok: true, text } }]);

describe("level 3 on the conforming fixture", () => {
  it.each(["3.1", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8"])("%s passes", (id) => {
    expect(check(baseFiles(), id)).toMatchObject({ id, level: 3, status: "pass" });
  });

  it("without GitHub data 3.2 is not evaluated, saying why (phase 4: check-3-2.test.ts)", () => {
    expect(check(baseFiles(), "3.2")).toEqual({
      id: "3.2",
      level: 3,
      status: "not_evaluated",
      detail: "sin datos recientes de GitHub",
    });
  });
});

describe("3.1 CI triggers", () => {
  it.each([
    ["a list", "on: [push, pull_request]\njobs: {}\n"],
    ["a map", "on:\n  push:\n  pull_request:\n    branches: [main]\n"],
  ])("passes with %s", (_name, text) => {
    const files = baseFiles();
    workflow(text)(files);
    expect(check(files, "3.1").status).toBe("pass");
  });

  it.each([
    ["only push", "on: push\n"],
    ["only push in a list", "on: [push]\n"],
    ["invalid YAML", "on: [push\n"],
  ])("fails with %s", (_name, text) => {
    const files = baseFiles();
    workflow(text)(files);
    expect(check(files, "3.1").status).toBe("fail");
  });

  it("fails without workflows", () => {
    const files = baseFiles();
    files.workflows = [];
    expect(check(files, "3.1")).toMatchObject({ status: "fail", detail: expect.stringMatching(/\.github\/workflows/) });
  });
});

describe("3.3–3.8 roadmap", () => {
  it("3.3 fails with a different header and 3.4–3.8 depend on it", () => {
    const files = replaceIn(baseFiles(), "project", "| Fase | Objetivo | Specs | Fecha objetivo | Estado manual |", "| Fase | Objetivo | Specs | Fecha | Estado manual |");
    expect(check(files, "3.3").status).toBe("fail");
    for (const id of ["3.4", "3.5", "3.6", "3.7", "3.8"]) {
      expect(check(files, id)).toMatchObject({ status: "not_evaluated", detail: "Depende de 3.3" });
    }
  });

  it("3.4 fails when a phase links a spec folder that does not exist", () => {
    const files = roadmapFiles("| 1 | Base | 001-done, 009-ghost | — | |", [["001-done", 1, 1]]);
    expect(check(files, "3.4")).toMatchObject({ status: "fail", detail: expect.stringMatching(/009-ghost/) });
  });

  it("3.5 fails when a spec folder is not linked to any phase", () => {
    const files = roadmapFiles("| 1 | Base | 001-done | — | |", [["001-done", 1, 1], ["002-orphan", 0, 1]]);
    expect(check(files, "3.5")).toMatchObject({ status: "fail", detail: expect.stringMatching(/002-orphan/) });
  });

  it("3.6 fails when a derived phase also has a manual state", () => {
    const files = roadmapFiles("| 5 | Contradicción | 004-conflict | — | completa |", [["004-conflict", 3, 3]]);
    expect(check(files, "3.6")).toMatchObject({ status: "fail", detail: expect.stringMatching(/Fase 5/) });
  });

  it("3.7 fails when a phase without derived state has no valid manual state", () => {
    const empty = roadmapFiles("| 1 | Base | 001-done | — | |\n| 2 | Sin spec | — | — | |", [["001-done", 1, 1]]);
    expect(check(empty, "3.7")).toMatchObject({ status: "fail", detail: expect.stringMatching(/Fase 2/) });
    const invalid = roadmapFiles("| 1 | Base | 001-done | — | |\n| 2 | Sin spec | — | — | listo |", [["001-done", 1, 1]]);
    expect(check(invalid, "3.7")).toMatchObject({ status: "fail", detail: expect.stringMatching(/listo/) });
  });

  it("3.8 requires a Bloqueo entry for a blocked phase", () => {
    const rows = "| 1 | Base | 001-done | — | |\n| 2 | Sin spec | — | 2027-12-15 | bloqueada |";
    const blocked = roadmapFiles(rows, [["001-done", 1, 1]]);
    expect(check(blocked, "3.8").status).toBe("fail");
    replaceIn(blocked, "project", "- **Dependencia:** ninguna real.", "- **Bloqueo:** proveedor ficticio sin respuesta.");
    expect(check(blocked, "3.8").status).toBe("pass");
  });
});

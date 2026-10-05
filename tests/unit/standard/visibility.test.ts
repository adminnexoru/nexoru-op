// T033: visibility of the repo and its findings (US2, FR-018 to FR-020, standard 1.2.0
// repo-visibility.md "Visibilidad declarada"). No case changes the level.
import { describe, expect, it } from "vitest";
import type { GithubData } from "@/lib/github/types";
import { evaluateProject } from "@/lib/standard/evaluate";
import type { ProjectFiles } from "@/lib/standard/project-files";
import { baseFiles, DATE, replaceIn } from "./helpers";

type Options = { version?: string; tipo?: string; visibilidad?: string | null };

function files({ version = "1.2", tipo = "producto-nexoru", visibilidad = null }: Options): ProjectFiles {
  let f = replaceIn(baseFiles(), "project", 'version_estandar: "1.0"', `version_estandar: "${version}"${visibilidad ? `\nvisibilidad: ${visibilidad}` : ""}`);
  if (tipo !== "producto-nexoru") f = replaceIn(f, "project", "tipo: producto-nexoru", `tipo: ${tipo}`);
  if (tipo === "producto-cliente") f = replaceIn(f, "project", "cliente: Nexoru", "cliente: Cliente Ficticio");
  return f;
}

const unavailable = (reason: string) => ({ status: "unavailable" as const, value: null, fetchedAt: null, reason });

function github(visibility: "publico" | "privado" | null, fetchedAt = "2026-09-30T12:00:00Z", reason = "sin conexión con GitHub"): GithubData {
  return {
    applies: "yes",
    repo: "example-org/level3-demo",
    repoMismatch: null,
    repoInfo: visibility
      ? { status: "ok", value: { visibility, defaultBranch: "main", archived: false }, fetchedAt, reason: null }
      : unavailable(reason),
    ci: unavailable("x"),
    pulls: unavailable("x"),
    secretAlerts: unavailable("x"),
  };
}

function evaluate(options: Options, data: GithubData | null) {
  const { conformance } = evaluateProject(files(options), DATE, data);
  const finding = (code: string) => conformance.findings.find((f) => f.code === code);
  return { conformance, finding };
}

describe("standard 1.0 and 1.1: only producto-cliente in a public repo", () => {
  it.each(["1.0", "1.1"])("%s: producto-cliente public is a high finding; no visibility result", (version) => {
    const { conformance, finding } = evaluate({ version, tipo: "producto-cliente" }, github("publico"));
    expect(finding("repo_visibility")).toEqual({ severity: "high", code: "repo_visibility", status: "found", detail: "`producto-cliente` en un repo público" });
    expect(conformance.visibility).toBeNull();
    expect(finding("visibility_decision_required")).toBeUndefined();
    expect(finding("visibility_mismatch")).toBeUndefined();
  });

  it("a public producto-nexoru without visibilidad has no finding in 1.1", () => {
    const { finding } = evaluate({ version: "1.1" }, github("publico"));
    expect(finding("repo_visibility")?.status).toBe("not_found");
  });

  it("producto-cliente without GitHub data is not evaluated, saying why", () => {
    const { finding } = evaluate({ version: "1.1", tipo: "producto-cliente" }, github(null, undefined, "requiere token"));
    expect(finding("repo_visibility")).toMatchObject({ status: "not_evaluated", detail: "requiere token" });
  });
});

describe("standard 1.2: the declared visibilidad", () => {
  it("without the field in producto-nexoru: requiere-decision, high finding, even without GitHub data", () => {
    const { conformance, finding } = evaluate({}, null);
    expect(conformance.visibility).toBe("requiere-decision");
    expect(finding("visibility_decision_required")).toEqual({
      severity: "high",
      code: "visibility_decision_required",
      status: "found",
      detail: "requiere decisión del Dueño: declara `visibilidad` en PROJECT.md",
    });
  });

  it("without the field in interno: sin-declarar (interno), no finding", () => {
    const { conformance, finding } = evaluate({ tipo: "interno" }, github("publico"));
    expect(conformance.visibility).toBe("sin-declarar (interno)");
    expect(finding("visibility_decision_required")?.status).toBe("not_found");
  });

  it("declared and equal to GitHub: aceptada, no finding", () => {
    const { conformance, finding } = evaluate({ visibilidad: "publico" }, github("publico"));
    expect(conformance.visibility).toBe("aceptada");
    expect(finding("visibility_mismatch")?.status).toBe("not_found");
    expect(finding("visibility_decision_required")?.status).toBe("not_found");
  });

  it("declared and different from GitHub: discrepancia, high finding", () => {
    const { conformance, finding } = evaluate({ visibilidad: "privado" }, github("publico"));
    expect(conformance.visibility).toBe("discrepancia");
    expect(finding("visibility_mismatch")).toEqual({
      severity: "high",
      code: "visibility_mismatch",
      status: "found",
      detail: "la visibilidad declarada (privado) no coincide con GitHub (público)",
    });
  });

  it("producto-cliente declared publico in a public repo: aceptada AND the producto-cliente finding stays", () => {
    const { conformance, finding } = evaluate({ tipo: "producto-cliente", visibilidad: "publico" }, github("publico"));
    expect(conformance.visibility).toBe("aceptada");
    expect(finding("repo_visibility")?.status).toBe("found");
  });

  it("an internal repo of GitHub counts as privado (already mapped by the summary)", () => {
    expect(evaluate({ visibilidad: "privado" }, github("privado")).conformance.visibility).toBe("aceptada");
  });

  it("declared without usable GitHub data: no_evaluado; stored data younger than 7 days is used", () => {
    const none = evaluate({ visibilidad: "publico" }, github(null, undefined, "requiere token"));
    expect(none.conformance.visibility).toBe("no_evaluado");
    expect(none.finding("visibility_mismatch")).toMatchObject({ status: "not_evaluated", detail: "requiere token" });
    expect(evaluate({ visibilidad: "publico" }, github("publico", "2026-09-28T12:00:00Z")).conformance.visibility).toBe("aceptada");
    const old = evaluate({ visibilidad: "publico" }, github("publico", "2026-09-20T12:00:00Z"));
    expect(old.conformance.visibility).toBe("no_evaluado");
    expect(old.finding("visibility_mismatch")).toMatchObject({ status: "not_evaluated", detail: "sin datos recientes de GitHub" });
  });

  it("no case changes the level", () => {
    for (const options of [{}, { visibilidad: "privado" }, { tipo: "producto-cliente", visibilidad: "publico" }]) {
      expect(evaluate(options, github("publico")).conformance).toMatchObject({ level: 3, provisional: true });
    }
  });
});

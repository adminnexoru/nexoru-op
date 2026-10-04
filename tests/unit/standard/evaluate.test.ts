// T014: cumulative level, provisional level 3, failures and findings (FR-022 to FR-025).
import { describe, expect, it } from "vitest";
import { baseFiles, evaluate, replaceIn } from "./helpers";

describe("level", () => {
  it("is 3 provisional when everything evaluable passes and only 3.2 is pending", () => {
    const { conformance } = evaluate(baseFiles());
    expect(conformance).toMatchObject({ standardVersion: "1.0", evaluation: "evaluated", level: 3, provisional: true, failures: [] });
  });

  it("is cumulative: a level 1 failure gives level 0 even if level 2 passes", () => {
    const files = replaceIn(baseFiles(), "project", "Ninguno.", "CONFIRMAR");
    const { conformance } = evaluate(files);
    expect(conformance.level).toBe(0);
    expect(conformance.provisional).toBe(false);
    expect(conformance.failures.map((c) => c.id)).toEqual(["1.11"]);
  });

  it("reports the failures of the next level only", () => {
    const files = replaceIn(baseFiles(), "map", "```mermaid", "```text");
    files.workflows = [];
    const { conformance } = evaluate(files);
    expect(conformance.level).toBe(1);
    expect(conformance.failures.map((c) => c.id)).toEqual(["2.4"]);
  });

  it("is 2 (not provisional) when a level 3 check fails", () => {
    const files = baseFiles();
    files.workflows = [];
    const { conformance } = evaluate(files);
    expect(conformance).toMatchObject({ level: 2, provisional: false });
    expect(conformance.failures.map((c) => c.id)).toEqual(["3.1"]);
  });
});

describe("findings", () => {
  const finding = (files: ReturnType<typeof baseFiles>, code: string) =>
    evaluate(files).conformance.findings.find((f) => f.code === code);

  it("reports versioned .env files by name as critical", () => {
    const files = baseFiles();
    files.versionedEnvFiles = [".env", "config/.env.local"];
    expect(finding(files, "env_versioned")).toEqual({
      severity: "critical",
      code: "env_versioned",
      status: "found",
      detail: ".env, config/.env.local",
    });
    expect(finding(baseFiles(), "env_versioned")).toMatchObject({ status: "not_found" });
  });

  it("does not evaluate versioned .env files outside a git repository", () => {
    const files = baseFiles();
    files.versionedEnvFiles = null;
    expect(finding(files, "env_versioned")).toMatchObject({ status: "not_evaluated" });
  });

  it("reports a missing .env.example as medium", () => {
    const files = baseFiles();
    files.envExample = false;
    expect(finding(files, "env_example_missing")).toMatchObject({ severity: "medium", status: "found" });
    expect(finding(baseFiles(), "env_example_missing")).toMatchObject({ status: "not_found" });
  });

  it("reports YAML comments in the frontmatter as low", () => {
    const files = replaceIn(baseFiles(), "project", "estado: verde", "estado: verde # revisar");
    expect(finding(files, "yaml_comments")).toMatchObject({ severity: "low", status: "found" });
    expect(finding(baseFiles(), "yaml_comments")).toMatchObject({ status: "not_found" });
  });

  it("leaves the findings that need a secret scanner or the project code as not evaluated", () => {
    // Phase 4: the visibility of a producto-nexoru repo in 1.0 has no finding without GitHub data
    // (only producto-cliente in a public repo is one): visibility.test.ts.
    const { findings } = evaluate(baseFiles()).conformance;
    expect(findings.filter((f) => f.status === "not_evaluated").map((f) => [f.code, f.severity])).toEqual([
      ["secret_history", "critical"],
      ["env_example_coverage", "medium"],
    ]);
  });

  it("never includes the contents of a .env file in any detail", () => {
    const files = baseFiles();
    files.versionedEnvFiles = [".env"];
    const serialized = JSON.stringify(evaluate(files));
    expect(serialized).not.toContain("TEXTO-DE-ENV-FICTICIO");
  });
});

describe("manifest", () => {
  it("returns the manifest fields, null when absent or of the wrong type", () => {
    const files = replaceIn(baseFiles(), "project", "costo_mensual_usd: 12", 'costo_mensual_usd: "12"');
    replaceIn(files, "project", "cliente: Nexoru\n", "");
    const { manifest } = evaluate(files);
    expect(manifest).toMatchObject({
      id: "level3-demo",
      nombre: "Proyecto Demo Nivel 3",
      cliente: null,
      costo_mensual_usd: null,
      stack: ["nextjs", "postgres"],
      urls: null,
      version_estandar: "1.0",
    });
  });

  it("has no manifest and explains why when PROJECT.md cannot be read or parsed", () => {
    const files = baseFiles();
    files.project = { ok: false, problem: { path: "PROJECT.md", reason: "missing", detail: null } };
    expect(evaluate(files)).toMatchObject({ manifest: null, manifestProblem: { reason: "missing" } });

    const broken = replaceIn(baseFiles(), "project", "nombre: Proyecto Demo Nivel 3", "nombre: [sin cerrar");
    expect(evaluate(broken)).toMatchObject({ manifest: null, manifestProblem: { reason: "invalid_yaml" } });
  });
});

// T027: the optional visibilidad field of the manifest (standard 1.2.0, project-manifest.md).
import { describe, expect, it } from "vitest";
import { evaluateProject } from "@/lib/standard/evaluate";
import { baseFiles, DATE, replaceIn } from "./helpers";

function with12(visibilidad: string | null) {
  const files = replaceIn(baseFiles(), "project", 'version_estandar: "1.0"', 'version_estandar: "1.2"');
  return visibilidad === null ? files : replaceIn(files, "project", 'version_estandar: "1.2"', `version_estandar: "1.2"\nvisibilidad: ${visibilidad}`);
}

const evaluate = (visibilidad: string | null) => evaluateProject(with12(visibilidad), DATE);
const status = (visibilidad: string | null, id: string) => evaluate(visibilidad).conformance.checks.find((c) => c.id === id)?.status;

describe("visibilidad", () => {
  it.each(["publico", "privado"])("%s is read and valid", (value) => {
    const result = evaluate(value);
    expect(result.manifest?.visibilidad).toBe(value);
    expect(result.conformance.warnings.filter((w) => w.reason === "invalid_value")).toEqual([]);
    expect(status(value, "1.3")).toBe("pass");
    expect(status(value, "1.4")).toBe("pass");
  });

  it("is optional: without it 1.3 still passes and nothing is declared", () => {
    expect(status(null, "1.3")).toBe("pass");
    expect(evaluate(null).manifest?.visibilidad).toBeNull();
  });

  it("an empty value is not declared and gives no warning", () => {
    expect(evaluate('""').manifest?.visibilidad).toBeNull();
    expect(evaluate('""').conformance.warnings.filter((w) => w.reason === "invalid_value")).toEqual([]);
  });

  it("another value gives a warning and counts as not declared; it is not an enumerated field of 1.4", () => {
    const result = evaluate("público");
    expect(result.manifest?.visibilidad).toBeNull();
    expect(result.conformance.warnings).toContainEqual({
      path: "PROJECT.md",
      reason: "invalid_value",
      detail: "`visibilidad` tiene un valor no permitido (público); se toma como no declarada. Valores permitidos: publico, privado",
    });
    expect(status("público", "1.4")).toBe("pass");
  });

  it("CONFIRMAR also fails 1.11, as the standard says", () => {
    expect(status("CONFIRMAR", "1.11")).toBe("fail");
    expect(evaluate("CONFIRMAR").manifest?.visibilidad).toBeNull();
  });
});

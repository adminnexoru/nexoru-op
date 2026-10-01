// T010: PROJECT.md frontmatter with YAML 1.2 (research R1, checks 1.2, 1.5 and the low finding).
import { describe, expect, it } from "vitest";
import { parseFrontmatter, parseYaml } from "@/lib/standard/frontmatter";

const ok = (yaml: string, body = "# Cuerpo\n") => `---\n${yaml}\n---\n${body}`;

describe("parseFrontmatter", () => {
  it("keeps dates and quoted versions as text and numbers as numbers", () => {
    const result = parseFrontmatter(ok('fecha_inicio: 2026-01-10\nversion_estandar: "1.0"\ncosto_mensual_usd: 12'));
    expect(result).toMatchObject({
      status: "ok",
      data: { fecha_inicio: "2026-01-10", version_estandar: "1.0", costo_mensual_usd: 12 },
      violations: [],
      hasComments: false,
      body: "# Cuerpo\n",
    });
  });

  it("reports a file that does not start with ---", () => {
    expect(parseFrontmatter("# Sin frontmatter\n")).toEqual({ status: "missing" });
    expect(parseFrontmatter("\n---\nid: x\n---\n")).toEqual({ status: "missing" });
  });

  it("reports invalid YAML with its line in the file", () => {
    const result = parseFrontmatter(ok("id: demo\nnombre: [sin cerrar"));
    expect(result).toMatchObject({ status: "invalid", line: 3 });
  });

  it("reports an unclosed block and a non-mapping block as invalid", () => {
    expect(parseFrontmatter("---\nid: x\n# sin cierre\n")).toMatchObject({ status: "invalid" });
    expect(parseFrontmatter(ok("- uno\n- dos"))).toMatchObject({ status: "invalid" });
  });

  it("detects what check 1.5 forbids", () => {
    const result = parseFrontmatter(
      ok(
        [
          "stack:",
          "  - nextjs",
          "  - nombre: postgres",
          "datos:",
          "  clave: valor",
          "base: &ancla texto",
          "copia: *ancla",
          "nota: |",
          "  multilínea",
          "resumen: >",
          "  plegado",
        ].join("\n"),
      ),
    );
    expect(result.status === "ok" && result.violations).toEqual([
      { key: "stack", kind: "nested" },
      { key: "datos", kind: "nested" },
      { key: "base", kind: "anchor" },
      { key: "copia", kind: "alias" },
      { key: "nota", kind: "block_scalar" },
      { key: "resumen", kind: "block_scalar" },
    ]);
  });

  it("detects YAML comments, but not a # inside a quoted value", () => {
    expect(parseFrontmatter(ok("# comentario\nid: demo")).status === "ok").toBe(true);
    expect(parseFrontmatter(ok("# comentario\nid: demo"))).toMatchObject({ hasComments: true });
    expect(parseFrontmatter(ok("id: demo # al final"))).toMatchObject({ hasComments: true });
    expect(parseFrontmatter(ok('nombre: "Proyecto #1"'))).toMatchObject({ hasComments: false });
  });

  it("returns the line where the body starts", () => {
    expect(parseFrontmatter(ok("id: demo"))).toMatchObject({ bodyStartLine: 4 });
  });
});

describe("parseYaml", () => {
  it("keeps the `on` key of a GitHub workflow as text (YAML 1.2)", () => {
    const result = parseYaml("on:\n  push:\n  pull_request:\n");
    expect(result).toEqual({ ok: true, value: { on: { push: null, pull_request: null } } });
  });

  it("reports invalid YAML", () => {
    expect(parseYaml("on: [push")).toMatchObject({ ok: false });
  });
});

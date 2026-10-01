// T009: line-based Markdown reading used by the conformance checks (research R2).
import { describe, expect, it } from "vitest";
import {
  firstLineContaining,
  h2Headings,
  hasMermaidBlock,
  sectionText,
  tables,
  taskCheckboxes,
} from "@/lib/standard/markdown";

const doc = [
  "# Título",
  "",
  "## 1. Resumen ejecutivo",
  "Texto del resumen.",
  "",
  "```md",
  "## Esto no es un encabezado",
  "| A | B |",
  "|---|---|",
  "| x | y |",
  "- [x] tampoco es una casilla",
  "```",
  "",
  "## ALCANCE   ",
  "| Servicio | USD/mes | Nota |",
  "|---|:---:|---|",
  "| API \\| pagos | 12 | Con barra |",
  "| **Total** | **12** | |",
  "",
  "```mermaid",
  "flowchart LR",
  "```",
  "",
  "- [ ] T001 pendiente",
  "- [x] T002 hecha",
  "  - [X] T003 anidada",
  "* [x] no cuenta (el estándar usa guion)",
  "## Siguiente hito",
  "Final con CONFIRMAR.",
].join("\n");

describe("h2Headings", () => {
  it("finds H2 headings with optional numbering, outside code blocks", () => {
    expect(h2Headings(doc)).toEqual([
      { title: "Resumen ejecutivo", line: 3 },
      { title: "ALCANCE", line: 14 },
      { title: "Siguiente hito", line: 28 },
    ]);
  });

  it("does not take an H3 or a heading without a space as H2", () => {
    expect(h2Headings("### Tres\n##Pegado\n## Dos")).toEqual([{ title: "Dos", line: 3 }]);
  });
});

describe("sectionText", () => {
  it("returns the text until the next H2, matching the title case-insensitively", () => {
    const text = sectionText(doc, "Alcance");
    expect(text).toContain("| **Total** | **12** | |");
    expect(text).not.toContain("Siguiente hito");
    expect(sectionText(doc, "Resumen ejecutivo")).toContain("## Esto no es un encabezado");
  });

  it("returns null for a missing section", () => {
    expect(sectionText(doc, "Roadmap")).toBeNull();
  });
});

describe("tables", () => {
  it("parses pipe tables outside code blocks, with escaped pipes", () => {
    expect(tables(doc)).toEqual([
      {
        line: 15,
        header: ["Servicio", "USD/mes", "Nota"],
        rows: [
          ["API | pagos", "12", "Con barra"],
          ["**Total**", "**12**", ""],
        ],
      },
    ]);
  });

  it("requires a separator row", () => {
    expect(tables("| A | B |\n| x | y |")).toEqual([]);
  });
});

describe("hasMermaidBlock", () => {
  it("detects a mermaid fence", () => {
    expect(hasMermaidBlock(doc)).toBe(true);
    expect(hasMermaidBlock("```js\nmermaid\n```")).toBe(false);
  });
});

describe("taskCheckboxes", () => {
  it("counts - [ ], - [x] and - [X] outside code blocks", () => {
    expect(taskCheckboxes(doc)).toEqual({ done: 2, total: 3 });
    expect(taskCheckboxes("Sin casillas")).toEqual({ done: 0, total: 0 });
  });
});

describe("firstLineContaining", () => {
  it("returns the 1-based line of the first occurrence, anywhere in the file", () => {
    expect(firstLineContaining(doc, "CONFIRMAR")).toBe(29);
    expect(firstLineContaining("```\nCONFIRMAR\n```", "CONFIRMAR")).toBe(2);
    expect(firstLineContaining(doc, "confirmar")).toBeNull();
  });
});

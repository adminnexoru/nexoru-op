// T021: frontmatter of PROJECT.md and docs/mapa-funcional.md with YAML 1.2 (research R1).
// The `core` schema keeps dates as text (check 1.6 validates their format) and the `on` key of
// GitHub workflows as text. The document nodes expose what check 1.5 forbids and the comments.
import { isAlias, isMap, isScalar, isSeq, Lexer, parseDocument, Scalar, type Node } from "yaml";

export type FrontmatterViolation = { key: string; kind: "nested" | "anchor" | "alias" | "block_scalar" };

export type FrontmatterResult =
  | { status: "missing" }
  | { status: "invalid"; line: number | null; message: string }
  | {
      status: "ok";
      data: Record<string, unknown>;
      violations: FrontmatterViolation[];
      hasComments: boolean;
      body: string;
      /** 1-based line of the file where the body starts. */
      bodyStartLine: number;
    };

const OPTIONS = { schema: "core" as const, version: "1.2" as const };

function violationOf(node: unknown): FrontmatterViolation["kind"] | null {
  if (isAlias(node)) return "alias";
  if ((node as Node | null)?.anchor) return "anchor";
  if (isMap(node)) return "nested";
  if (isSeq(node)) {
    for (const item of node.items) {
      if (isAlias(item)) return "alias";
      if (!isScalar(item)) return "nested";
      if (item.anchor) return "anchor";
    }
    return null;
  }
  if (isScalar(node) && (node.type === Scalar.BLOCK_LITERAL || node.type === Scalar.BLOCK_FOLDED)) return "block_scalar";
  return null;
}

function hasYamlComments(source: string): boolean {
  for (const token of new Lexer().lex(source)) if (token.startsWith("#")) return true;
  return false;
}

export function parseFrontmatter(text: string): FrontmatterResult {
  const lines = text.split("\n");
  if (lines[0]?.trimEnd() !== "---") return { status: "missing" };
  const closing = lines.findIndex((line, index) => index > 0 && line.trimEnd() === "---");
  if (closing === -1) return { status: "invalid", line: null, message: "El bloque YAML no se cierra con ---" };

  const source = lines.slice(1, closing).join("\n");
  const doc = parseDocument(source, OPTIONS);
  if (doc.errors.length > 0) {
    const error = doc.errors[0];
    const yamlLine = error.linePos?.[0]?.line;
    return { status: "invalid", line: yamlLine === undefined ? null : yamlLine + 1, message: error.message };
  }
  if (!isMap(doc.contents)) return { status: "invalid", line: 2, message: "El frontmatter no es un mapa de campos" };

  const violations: FrontmatterViolation[] = [];
  for (const pair of doc.contents.items) {
    const kind = violationOf(pair.value);
    if (kind) violations.push({ key: String(isScalar(pair.key) ? pair.key.value : pair.key), kind });
  }

  return {
    status: "ok",
    data: (doc.toJS() ?? {}) as Record<string, unknown>,
    violations,
    hasComments: hasYamlComments(source),
    body: lines.slice(closing + 1).join("\n"),
    bodyStartLine: closing + 2,
  };
}

/** Parses a whole YAML file (e.g. a GitHub workflow). */
export function parseYaml(text: string): { ok: true; value: unknown } | { ok: false; line: number | null } {
  const doc = parseDocument(text, OPTIONS);
  if (doc.errors.length > 0) return { ok: false, line: doc.errors[0].linePos?.[0]?.line ?? null };
  return { ok: true, value: doc.toJS() };
}

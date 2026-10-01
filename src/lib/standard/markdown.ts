// T020: minimal line-based Markdown reading for the conformance checks (research R2).
// Recognizes H2 headings, fenced code blocks, pipe tables, mermaid blocks and task checkboxes.
// Text is expected with LF line endings (the safe reader normalizes CRLF).

const FENCE = /^ {0,3}(```|~~~)/;
const H2 = /^## (?:\d+\.\s+)?(.*?)\s*$/;
const CHECKBOX = /^\s*- \[([ xX])\] /;
const SEPARATOR_CELL = /^:?-{3,}:?$/;

interface Line {
  text: string;
  /** 1-based line number. */
  number: number;
  inCode: boolean;
}

/** Splits text into lines and marks those inside fenced code blocks (fences included). */
function scan(text: string): Line[] {
  let open: string | null = null;
  return text.split("\n").map((line, index) => {
    const fence = line.match(FENCE)?.[1] ?? null;
    const wasOpen = open !== null;
    if (fence && (open === null || fence === open)) open = open === null ? fence : null;
    return { text: line, number: index + 1, inCode: wasOpen || fence !== null };
  });
}

export function h2Headings(text: string): { title: string; line: number }[] {
  return scan(text)
    .filter((line) => !line.inCode)
    .map((line) => ({ match: line.text.match(H2), line: line.number }))
    .filter((item): item is { match: RegExpMatchArray; line: number } => item.match !== null)
    .map(({ match, line }) => ({ title: match[1], line }));
}

const sameTitle = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Text of the section `## title` (case-insensitive) until the next H2, or null. */
export function sectionText(text: string, title: string): string | null {
  const headings = h2Headings(text);
  const index = headings.findIndex((heading) => sameTitle(heading.title, title));
  if (index === -1) return null;
  const lines = text.split("\n");
  const end = index + 1 < headings.length ? headings[index + 1].line - 1 : lines.length;
  return lines.slice(headings[index].line, end).join("\n");
}

export interface MdTable {
  /** 1-based line of the header row. */
  line: number;
  header: string[];
  rows: string[][];
}

function cells(row: string): string[] {
  let body = row.trim();
  if (body.startsWith("|")) body = body.slice(1);
  if (body.endsWith("|") && !body.endsWith("\\|")) body = body.slice(0, -1);
  return body.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

/** Pipe tables outside code blocks: a header row, a separator row and the body rows. */
export function tables(text: string): MdTable[] {
  const lines = scan(text);
  const result: MdTable[] = [];
  const isRow = (line: Line | undefined) => line !== undefined && !line.inCode && line.text.trim().startsWith("|");
  for (let i = 0; i < lines.length; i++) {
    const separator = lines[i + 1];
    if (!isRow(lines[i]) || !isRow(separator) || !cells(separator.text).every((cell) => SEPARATOR_CELL.test(cell))) {
      continue;
    }
    const table: MdTable = { line: lines[i].number, header: cells(lines[i].text), rows: [] };
    let j = i + 2;
    while (isRow(lines[j])) table.rows.push(cells(lines[j++].text));
    result.push(table);
    i = j - 1;
  }
  return result;
}

export function hasMermaidBlock(text: string): boolean {
  let insideCode = false;
  for (const line of text.split("\n")) {
    const fence = line.match(/^ {0,3}```(\S*)/);
    if (!fence) continue;
    if (!insideCode && fence[1] === "mermaid") return true;
    insideCode = !insideCode;
  }
  return false;
}

/** Counts `- [ ]` (pending) and `- [x]`/`- [X]` (done) outside code blocks. */
export function taskCheckboxes(text: string): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const line of scan(text)) {
    if (line.inCode) continue;
    const mark = line.text.match(CHECKBOX)?.[1];
    if (mark === undefined) continue;
    total++;
    if (mark !== " ") done++;
  }
  return { done, total };
}

/** 1-based line of the first occurrence of `needle` anywhere in the text (case-sensitive). */
export function firstLineContaining(text: string, needle: string): number | null {
  const index = text.split("\n").findIndex((line) => line.includes(needle));
  return index === -1 ? null : index + 1;
}

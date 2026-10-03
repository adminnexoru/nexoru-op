// T007: interpretation of PROJECTS_ROOT/.nexoruignore (standard 1.1, project-standard.md §8).
import { describe, expect, it } from "vitest";
import { parseNexoruIgnore } from "@/lib/portfolio/ignore";

describe("parseNexoruIgnore", () => {
  it("keeps exact folder names, one per line", () => {
    expect(parseNexoruIgnore("ignored-copy\nproyecto-demo-hotfix\n")).toEqual(new Set(["ignored-copy", "proyecto-demo-hotfix"]));
  });

  it("ignores empty lines, comments and surrounding spaces", () => {
    expect(parseNexoruIgnore("# Worktrees\n\n   \n  ignored-copy  \n#otro\n")).toEqual(new Set(["ignored-copy"]));
  });

  it("drops invalid names: paths, wildcards and hidden names", () => {
    expect(parseNexoruIgnore("no/valido\nno\\valido\n*\ncopia?\n.oculta\n..\nvalida\n")).toEqual(new Set(["valida"]));
  });

  it("is empty when there is no file", () => {
    expect(parseNexoruIgnore(null)).toEqual(new Set());
  });
});

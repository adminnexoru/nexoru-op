// T001: "cambios sin commit" that could not be evaluated is shown as such, never as "sin cambios"
// (contracts/git-history.md).
import { describe, expect, it } from "vitest";
import { branchWarnings, uncommittedLabel, uncommittedValue } from "@/lib/portfolio/git-labels";
import type { GitInfo } from "@/lib/portfolio/types";

const repo: GitInfo = {
  isRepo: true,
  branch: "main",
  mainBranch: "main",
  onMainBranch: true,
  hasUncommittedChanges: false,
  uncommittedChangesReason: null,
  originRepo: "example-org/demo",
};

describe("value of the repository card (the label is the row title)", () => {
  it("says only the value", () => {
    expect(uncommittedValue(repo)).toBe("Ninguno");
    expect(uncommittedValue({ ...repo, hasUncommittedChanges: true })).toBe("Sí");
    expect(uncommittedValue({ ...repo, hasUncommittedChanges: null, uncommittedChangesReason: "error de git" })).toBe(
      "No evaluado (error de git)",
    );
  });
});

describe("uncommitted changes", () => {
  it("says 'no evaluado' with its reason when git status was not run", () => {
    const git = { ...repo, hasUncommittedChanges: null, uncommittedChangesReason: "atributos locales: no se evalúa por seguridad" };
    expect(uncommittedLabel(git)).toBe("Cambios sin commit: no evaluado (atributos locales: no se evalúa por seguridad)");
    expect(branchWarnings(git)).toContain("Cambios sin commit: no evaluado (atributos locales: no se evalúa por seguridad)");
  });

  it("never says 'sin cambios' when the value is unknown", () => {
    const git = { ...repo, hasUncommittedChanges: null, uncommittedChangesReason: "error de git" };
    expect(uncommittedLabel(git)).not.toMatch(/sin cambios/i);
    expect(uncommittedLabel(git)).toBe("Cambios sin commit: no evaluado (error de git)");
  });

  it("keeps the Phase 2 texts for known values", () => {
    expect(uncommittedLabel({ ...repo, hasUncommittedChanges: true })).toBe("cambios sin commit");
    expect(uncommittedLabel(repo)).toBe("Cambios sin commit: ninguno");
    expect(branchWarnings({ ...repo, hasUncommittedChanges: true })).toEqual(["cambios sin commit"]);
    expect(branchWarnings(repo)).toEqual([]);
  });

  it("does not apply outside a repository", () => {
    const none: GitInfo = { ...repo, isRepo: false, branch: null, hasUncommittedChanges: null, uncommittedChangesReason: null };
    expect(branchWarnings(none)).toEqual(["no es repositorio git"]);
  });
});

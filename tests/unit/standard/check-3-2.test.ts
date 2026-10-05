// T017: check 3.2 with the GitHub data in standard 1.0 and 1.1 (FR-013 to FR-017, research R8).
// The rule of 1.2 (every workflow) is tested in rules-1-2.test.ts.
import { describe, expect, it } from "vitest";
import type { CiInfo, CiRun, GithubData } from "@/lib/github/types";
import { evaluateProject } from "@/lib/standard/evaluate";
import { baseFiles, DATE, replaceIn } from "./helpers";

const CI = ".github/workflows/ci.yml";
const run = (conclusion: string | null, at = "2026-09-30T10:00:00Z", status: CiRun["status"] = "completed"): CiRun => ({
  workflowName: "CI",
  path: CI,
  status,
  conclusion,
  at,
});

function ci(latestCompletedAny: CiRun | null, latest: CiRun | null = latestCompletedAny): CiInfo {
  return { branch: "main", latest, latestCompletedAny, perWorkflow: [{ path: CI, latestCompleted: latestCompletedAny, inProgress: false }] };
}

function github(info: CiInfo | null, overrides: Partial<GithubData> = {}, fetchedAt = "2026-09-30T12:00:00Z", reason: string | null = null): GithubData {
  const unavailable = { status: "unavailable" as const, value: null, fetchedAt: null, reason: "sin datos de GitHub: pulsa Actualizar" };
  return {
    applies: "yes",
    repo: "example-org/level3-demo",
    repoMismatch: null,
    repoInfo: { status: "ok", value: { visibility: "publico", defaultBranch: "main", archived: false }, fetchedAt, reason: null },
    ci: info ? { status: reason ? "unavailable" : "ok", value: info, fetchedAt, reason } : { ...unavailable, reason: reason ?? unavailable.reason },
    pulls: unavailable,
    secretAlerts: unavailable,
    ...overrides,
  };
}

const files11 = () => replaceIn(baseFiles(), "project", 'version_estandar: "1.0"', 'version_estandar: "1.1"');

function evaluate(data: GithubData | null, files = baseFiles()) {
  const result = evaluateProject(files, DATE, data);
  return { ...result, c32: result.conformance.checks.find((c) => c.id === "3.2")! };
}

describe.each([
  ["1.0", baseFiles],
  ["1.1", files11],
])("3.2 in standard %s", (_version, files) => {
  it("passes when the latest completed run on the default branch succeeded; level 3 is not provisional", () => {
    const { c32, conformance } = evaluate(github(ci(run("success"))), files());
    expect(c32).toMatchObject({ status: "pass" });
    expect(conformance).toMatchObject({ level: 3, provisional: false });
  });

  it("fails with the workflow and the date when it did not succeed; the level is 2", () => {
    const { c32, conformance } = evaluate(github(ci(run("failure", "2026-09-29T08:00:00Z"))), files());
    expect(c32.status).toBe("fail");
    expect(c32.detail).toBe("CI: falla el 2026-09-29 en main");
    expect(conformance.level).toBe(2);
    expect(conformance.failures.map((f) => f.id)).toContain("3.2");
  });

  it("names the real result (cancelled) and a run in progress does not decide", () => {
    expect(evaluate(github(ci(run("cancelled", "2026-09-29T08:00:00Z"))), files()).c32.detail).toBe("CI: cancelada el 2026-09-29 en main");
    const inProgress = ci(run("success"), run(null, "2026-10-01T09:00:00Z", "in_progress"));
    expect(evaluate(github(inProgress), files()).c32.status).toBe("pass");
  });

  it("fails without completed runs on the default branch", () => {
    const { c32 } = evaluate(github(ci(null)), files());
    expect(c32).toMatchObject({ status: "fail", detail: "Sin ejecuciones de CI terminadas en main" });
  });

  it("uses stored data of 2 days; with 7 days or more it is not evaluated", () => {
    expect(evaluate(github(ci(run("success")), {}, "2026-09-29T12:00:00Z", "sin conexión con GitHub"), files()).c32.status).toBe("pass");
    const old = evaluate(github(ci(run("success")), {}, "2026-09-24T12:00:00Z", "sin conexión con GitHub"), files());
    expect(old.c32).toMatchObject({ status: "not_evaluated", detail: "sin datos recientes de GitHub" });
    expect(old.conformance).toMatchObject({ level: 3, provisional: true });
  });

  it.each([
    ["requiere token", "requiere token"],
    ["el token de GitHub no es válido", "token de GitHub no válido o vencido"],
    ["sin conexión con GitHub", "sin datos recientes de GitHub"],
    ["tiempo agotado", "sin datos recientes de GitHub"],
    ["sin datos de GitHub: pulsa Actualizar", "sin datos recientes de GitHub"],
  ])("without CI data (%s) it is not evaluated: %s", (reason, detail) => {
    expect(evaluate(github(null, {}, "2026-09-30T12:00:00Z", reason), files()).c32).toMatchObject({ status: "not_evaluated", detail });
  });

  it("is not evaluated without remote, with a remote that is not GitHub or without GitHub data", () => {
    const none = github(null, { applies: "no_remote", repo: null });
    expect(evaluate(none, files()).c32).toMatchObject({ status: "not_evaluated", detail: "sin remoto" });
    const other = github(null, { applies: "not_github", repo: null });
    expect(evaluate(other, files()).c32).toMatchObject({ status: "not_evaluated", detail: "el remoto no es de GitHub" });
    expect(evaluate(null, files()).c32).toMatchObject({ status: "not_evaluated", detail: "sin datos recientes de GitHub" });
  });
});

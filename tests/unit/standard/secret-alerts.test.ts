// T043 (US4, FR-023, FR-024): the critical finding "Secretos en el historial" with the open alerts
// of GitHub secret scanning. With 0 alerts it is NOT met: secret scanning only detects known
// patterns, so it stays not evaluated with that note (owner, 2026-10-04).
import { describe, expect, it } from "vitest";
import type { Fetched, GithubData } from "@/lib/github/types";
import { evaluateProject } from "@/lib/standard/evaluate";
import { baseFiles, DATE } from "./helpers";

const unavailable = { status: "unavailable" as const, value: null, fetchedAt: null, reason: "x" };

function github(secretAlerts: Fetched<number>): GithubData {
  return { applies: "yes", repo: "example-org/level3-demo", repoMismatch: null, repoInfo: unavailable, ci: unavailable, pulls: unavailable, secretAlerts };
}

const finding = (alerts: Fetched<number>) =>
  evaluateProject(baseFiles(), DATE, github(alerts)).conformance.findings.find((f) => f.code === "secret_history");

const ok = (value: number, fetchedAt = "2026-09-30T12:00:00Z"): Fetched<number> => ({ status: "ok", value, fetchedAt, reason: null });

describe("Secretos en el historial", () => {
  it("with 1 or more open alerts it is a critical finding; the level does not change", () => {
    expect(finding(ok(2))).toEqual({
      severity: "critical",
      code: "secret_history",
      status: "found",
      detail: "2 alertas abiertas (secret scanning de GitHub)",
    });
    expect(finding(ok(1))?.detail).toBe("1 alerta abierta (secret scanning de GitHub)");
    expect(evaluateProject(baseFiles(), DATE, github(ok(2))).conformance).toMatchObject({ level: 3, provisional: true });
  });

  it("with 0 alerts it stays not evaluated, saying that secret scanning only detects known patterns", () => {
    expect(finding(ok(0))).toEqual({
      severity: "critical",
      code: "secret_history",
      status: "not_evaluated",
      detail: "sin alertas abiertas (secret scanning de GitHub); el secret scanning solo detecta patrones conocidos",
    });
    expect(JSON.stringify(finding(ok(0)))).not.toMatch(/sin secretos/i);
  });

  it.each(["secret scanning no está activo", "el token no tiene permiso de alertas", "requiere token"])("not evaluated: %s", (reason) => {
    expect(finding({ status: "not_evaluated", value: null, fetchedAt: null, reason })).toMatchObject({ status: "not_evaluated", detail: reason });
  });

  it("stored data of 7 days or more is not used", () => {
    expect(finding(ok(2, "2026-09-20T12:00:00Z"))).toMatchObject({ status: "not_evaluated", detail: "sin datos recientes de GitHub" });
  });
});

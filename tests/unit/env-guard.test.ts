// T066: guards that keep the test and use environments apart (FR-034, research R13).
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GITHUB_API_ORIGIN, resolveGithubApiOrigin } from "@/lib/github/origin";
import { githubClientFor } from "@/lib/portfolio/refresh";
import { assertOpsEnv, assertTestEnv, assertTestGithubToken, assertTestProjectsRoot } from "../../scripts/env-guard";

describe("assertTestEnv", () => {
  it("accepts the test Supabase instance", () => {
    expect(() => assertTestEnv("http://127.0.0.1:54321")).not.toThrow();
  });

  it("rejects the use instance, explaining why", () => {
    expect(() => assertTestEnv("http://127.0.0.1:55321")).toThrow(/entorno de uso/);
  });

  it("rejects any non-local URL", () => {
    expect(() => assertTestEnv("https://abcd.supabase.co")).toThrow(/local/);
    expect(() => assertTestEnv("http://192.168.1.20:54321")).toThrow(/local/);
    expect(() => assertTestEnv(undefined)).toThrow();
  });
});

describe("assertOpsEnv", () => {
  it("accepts the use Supabase instance", () => {
    expect(() => assertOpsEnv("http://127.0.0.1:55321")).not.toThrow();
  });

  it("rejects the test instance, explaining why", () => {
    expect(() => assertOpsEnv("http://127.0.0.1:54321")).toThrow(/pruebas/);
  });

  it("rejects any non-local URL", () => {
    expect(() => assertOpsEnv("https://abcd.supabase.co")).toThrow(/local/);
    expect(() => assertOpsEnv(undefined)).toThrow();
  });
});

// T006: tests may only read the fictitious portfolio in a temporary folder (FR-028).
describe("assertTestProjectsRoot", () => {
  it("accepts a nexoru-op-fixture-* folder under the system temp directory", () => {
    const root = join(tmpdir(), "nexoru-op-fixture-abc123");
    expect(assertTestProjectsRoot(root)).toBe(root);
  });

  it("rejects the owner's real portfolio", () => {
    expect(() => assertTestProjectsRoot("/home/fili/proyectos")).toThrow(/portafolio ficticio/);
  });

  it("rejects relative paths, escapes with .. and a missing value", () => {
    expect(() => assertTestProjectsRoot("nexoru-op-fixture-abc")).toThrow(/absoluta/);
    expect(() => assertTestProjectsRoot(join(tmpdir(), "nexoru-op-fixture-abc", "..", "..", "home"))).toThrow();
    expect(() => assertTestProjectsRoot(join(tmpdir(), "other-folder"))).toThrow(/portafolio ficticio/);
    expect(() => assertTestProjectsRoot(undefined)).toThrow(/PROJECTS_ROOT/);
  });
});

// T002 (004-github-readonly, research R7): never a real token in tests; the fake GitHub origin
// only in the test environment.
describe("assertTestGithubToken", () => {
  it("accepts no token or a fictitious test- token", () => {
    expect(() => assertTestGithubToken(undefined)).not.toThrow();
    expect(() => assertTestGithubToken("")).not.toThrow();
    expect(() => assertTestGithubToken("test-token-NO-REAL-0000")).not.toThrow();
  });

  it("rejects anything that could be a real token, without echoing it", () => {
    const value = "github_pat_11FAKEVALUEFORTESTONLY";
    expect(() => assertTestGithubToken(value)).toThrow(/token real/);
    try {
      assertTestGithubToken(value);
    } catch (error) {
      expect(String(error)).not.toContain(value);
    }
  });
});

describe("resolveGithubApiOrigin", () => {
  const test = "http://127.0.0.1:54321";
  const use = "http://127.0.0.1:55321";

  it("uses the real API in the use environment", () => {
    expect(resolveGithubApiOrigin({ supabaseUrl: use, override: undefined })).toBe(GITHUB_API_ORIGIN);
    expect(GITHUB_API_ORIGIN).toBe("https://api.github.com");
  });

  it("accepts the fake GitHub on 127.0.0.1 only in the test environment", () => {
    expect(resolveGithubApiOrigin({ supabaseUrl: test, override: "http://127.0.0.1:4010" })).toBe("http://127.0.0.1:4010");
  });

  it("rejects any override in the use environment", () => {
    expect(() => resolveGithubApiOrigin({ supabaseUrl: use, override: "http://127.0.0.1:4010" })).toThrow(/entorno de uso/);
  });

  it("rejects overrides that are not http://127.0.0.1:<port>", () => {
    for (const override of ["http://localhost:4010", "https://127.0.0.1:4010", "http://127.0.0.1", "http://192.0.2.1:4010", "http://127.0.0.1:4010/path"]) {
      expect(() => resolveGithubApiOrigin({ supabaseUrl: test, override })).toThrow(/127\.0\.0\.1/);
    }
  });

  it("refuses the real API in the test environment", () => {
    expect(() => resolveGithubApiOrigin({ supabaseUrl: test, override: undefined })).toThrow(/pruebas/);
    expect(() => resolveGithubApiOrigin({ supabaseUrl: test, override: "https://api.github.com" })).toThrow();
  });
});

// T014 (research R7): without the fake GitHub, the test environment never queries the real one.
describe("githubClientFor", () => {
  const fakeFetch = (async () => new Response("{}")) as typeof fetch;

  it("has no client in the test environment without the fake, and says why", () => {
    expect(githubClientFor({ supabaseUrl: "http://127.0.0.1:54321", override: undefined, token: undefined }, fakeFetch)).toEqual({
      client: null,
      reason: "GitHub no disponible en este entorno",
    });
    expect(githubClientFor({ supabaseUrl: "http://127.0.0.1:54321", override: "https://api.github.com", token: undefined }, fakeFetch).client).toBeNull();
  });

  it("uses the fake in the test environment and the real API in the use environment", () => {
    expect(githubClientFor({ supabaseUrl: "http://127.0.0.1:54321", override: "http://127.0.0.1:4010", token: undefined }, fakeFetch).client).not.toBeNull();
    expect(githubClientFor({ supabaseUrl: "http://127.0.0.1:55321", override: undefined, token: undefined }, fakeFetch).client).not.toBeNull();
    expect(githubClientFor({ supabaseUrl: "http://127.0.0.1:55321", override: "http://127.0.0.1:4010", token: undefined }, fakeFetch).client).toBeNull();
  });
});

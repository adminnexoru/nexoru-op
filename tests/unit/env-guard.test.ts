// T066: guards that keep the test and use environments apart (FR-034, research R13).
import { describe, expect, it } from "vitest";
import { assertOpsEnv, assertTestEnv } from "../../scripts/env-guard";

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

// T006: the read-only GitHub client (contracts/github-client.md, research R4–R6). Runs against the
// in-memory fake GitHub; never the real one.
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGithubClient, GithubClientError, githubRoutes, parseTokenExpiration } from "@/lib/github/client";
import { createFakeGithub } from "../../fixtures/github/fake-github";

const TOKEN = "test-token-NO-REAL-0000";
const ORIGIN = "http://127.0.0.1:4010";
const repo = githubRoutes.repo("example-org", "level3-demo");

/** `null` means no token (an `undefined` argument would take the default). */
function setup(token: string | null = TOKEN, fakeOptions = {}) {
  const fake = createFakeGithub(fakeOptions);
  const client = createGithubClient({ fetch: fake.fetch, origin: ORIGIN, token: token ?? undefined });
  return { fake, client };
}

afterEach(() => vi.restoreAllMocks());

describe("only GET", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE", "HEAD"])("rejects %s before touching the network", async (method) => {
    const { fake, client } = setup();
    await expect(client.request(method, repo)).rejects.toThrow(GithubClientError);
    await expect(client.request(method, repo)).rejects.toMatchObject({ code: "method_not_allowed" });
    expect(fake.requests).toHaveLength(0);
  });

  it("sends GET for an allowed route", async () => {
    const { fake, client } = setup();
    const result = await client.get(repo);
    expect(result.kind).toBe("ok");
    expect(fake.requests).toEqual([expect.objectContaining({ method: "GET", path: "/repos/example-org/level3-demo" })]);
  });
});

describe("closed catalog of routes and origins", () => {
  it.each([
    "/user",
    "/repos/example-org/level3-demo/contents/README.md",
    "/repos/example-org/../admin",
    "/repos/example-org/level3-demo/pulls?state=all&per_page=30",
    "/repos/example-org/level3-demo/secret-scanning/alerts?state=open&per_page=100",
    "//evil.example/repos/a/b",
    "https://evil.example/repos/a/b",
    "/repos/a@b/c",
  ])("rejects %s", async (route) => {
    const { fake, client } = setup();
    await expect(client.get(route)).rejects.toMatchObject({ code: "route_not_allowed" });
    expect(fake.requests).toHaveLength(0);
  });

  it("builds every route of the catalog and accepts it", () => {
    const routes = [
      githubRoutes.repo("example-org", "demo"),
      githubRoutes.branchRuns("example-org", "demo", "main"),
      githubRoutes.workflowRuns("example-org", "demo", "ci.yml", "release/1.x"),
      githubRoutes.pulls("example-org", "demo"),
      githubRoutes.commitRuns("example-org", "demo", "a".repeat(40)),
      githubRoutes.secretAlerts("example-org", "demo"),
    ];
    expect(routes[1]).toBe("/repos/example-org/demo/actions/runs?branch=main&per_page=50&exclude_pull_requests=true");
    expect(routes[2]).toBe("/repos/example-org/demo/actions/workflows/ci.yml/runs?branch=release%2F1.x&status=completed&per_page=1");
    expect(routes[5]).toBe("/repos/example-org/demo/secret-scanning/alerts?state=open&per_page=100&hide_secret=true");
    const { client } = setup();
    for (const route of routes) expect(client.isAllowedRoute(route)).toBe(true);
  });

  it("refuses to build routes from unsafe values", () => {
    expect(() => githubRoutes.repo("example-org", "..")).toThrow(GithubClientError);
    expect(() => githubRoutes.repo("ex/ample", "demo")).toThrow(GithubClientError);
    expect(() => githubRoutes.commitRuns("example-org", "demo", "not-a-sha")).toThrow(GithubClientError);
    expect(() => githubRoutes.workflowRuns("example-org", "demo", "../ci.yml", "main")).toThrow(GithubClientError);
  });

  it("rejects an origin that is not https://api.github.com or the fake on 127.0.0.1", () => {
    const fake = createFakeGithub();
    expect(() => createGithubClient({ fetch: fake.fetch, origin: "https://evil.example", token: undefined })).toThrow(GithubClientError);
  });
});

describe("headers and fetch options", () => {
  it("sends the API headers, the token only in Authorization and no cache or redirects", async () => {
    const calls: RequestInit[] = [];
    const fake = createFakeGithub();
    const spy = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(init ?? {});
      return fake.fetch(input, init);
    }) as typeof fetch;
    const client = createGithubClient({ fetch: spy, origin: ORIGIN, token: TOKEN });
    await client.get(repo);
    expect(fake.requests[0].headers).toMatchObject({
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "nexoru-op",
      authorization: `Bearer ${TOKEN}`,
    });
    expect(fake.requests[0].path).not.toContain(TOKEN);
    expect(calls[0]).toMatchObject({ method: "GET", cache: "no-store", redirect: "error" });
  });

  it("sends no Authorization without a token", async () => {
    const { fake, client } = setup(null);
    await client.get(repo);
    expect(fake.requests[0].headers).not.toHaveProperty("authorization");
  });
});

describe("answers", () => {
  it("returns the body and the ETag, and with If-None-Match a 304 reuses the stored summary", async () => {
    const { fake, client } = setup();
    const first = await client.get(repo);
    expect(first).toMatchObject({ kind: "ok", body: expect.objectContaining({ default_branch: "main" }) });
    const etag = first.kind === "ok" ? first.etag : null;
    expect(etag).toBeTruthy();
    const second = await client.get(repo, { etag });
    expect(second).toEqual({ kind: "not_modified" });
    expect(fake.requests[1].headers["if-none-match"]).toBe(etag);
  });

  it.each([
    [401, {}, "invalid_token", true],
    [403, { "x-ratelimit-remaining": "0" }, "rate_limited", true],
    [429, { "retry-after": "60" }, "secondary_limit", true],
    [403, {}, "forbidden", false],
    [404, {}, "not_found", false],
    [502, {}, "server_error", false],
  ] as const)("%i %o → %s (stop: %s)", async (status, headers, reason, stop) => {
    const { fake, client } = setup();
    fake.set("*", { status, headers: { ...headers }, body: { message: "x" } });
    const result = await client.get(repo);
    expect(result).toMatchObject({ kind: "error", reason, stop });
    expect(fake.requests).toHaveLength(1);
  });

  it("does not ask again when 2 or fewer requests remain", async () => {
    const reset = new Date("2026-10-03T15:05:00Z");
    const { fake, client } = setup(TOKEN, { rateLimit: { limit: 60, remaining: 3, resetAt: reset } });
    await client.get(repo);
    expect(client.rateLimit()).toEqual({ limit: 60, remaining: 2, resetAt: reset.toISOString() });
    const result = await client.get(repo);
    expect(result).toMatchObject({ kind: "error", reason: "rate_limited", stop: true });
    expect(fake.requests).toHaveLength(1);
  });

  it("network failure and per-request timeout", async () => {
    const { fake, client } = setup();
    fake.set("*", { status: 200, networkError: true });
    expect(await client.get(repo)).toMatchObject({ kind: "error", reason: "network", stop: false });
    fake.set("*", { status: 200, body: {}, delayMs: 10_000 });
    const started = Date.now();
    expect(await client.get(repo, { timeoutMs: 50 })).toMatchObject({ kind: "error", reason: "timeout" });
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it("stops at the global deadline signal", async () => {
    const { fake, client } = setup();
    fake.set("*", { status: 200, body: {}, delayMs: 10_000 });
    const deadline = AbortSignal.timeout(50);
    expect(await client.get(repo, { signal: deadline })).toMatchObject({ kind: "error", reason: "timeout" });
  });
});

describe("token", () => {
  it("reads the expiration header", async () => {
    const { client } = setup(TOKEN, { tokenExpiration: "2026-12-01 00:00:00 UTC" });
    await client.get(repo);
    expect(client.tokenExpiresAt()).toBe("2026-12-01T00:00:00.000Z");
    expect(parseTokenExpiration("2026-12-01 00:00:00 UTC")).toBe("2026-12-01T00:00:00.000Z");
    expect(parseTokenExpiration("garbage")).toBeNull();
  });

  it("never appears in errors or console output", async () => {
    const logs: unknown[] = [];
    for (const level of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, level).mockImplementation((...args) => void logs.push(...args));
    }
    const { fake, client } = setup();
    const errors: unknown[] = [];
    for (const response of [{ status: 401 }, { status: 500 }, { status: 200, networkError: true }]) {
      fake.set("*", response);
      errors.push(await client.get(repo));
    }
    errors.push(await client.request("POST", repo).catch((error: unknown) => error));
    errors.push(await client.get("/user").catch((error: unknown) => error));
    const text = JSON.stringify([errors.map((e) => (e instanceof Error ? `${e.name} ${e.message} ${e.stack}` : e)), logs.map(String)]);
    expect(text).not.toContain(TOKEN);
  });
});

// T008: GitHub queries of the portfolio in priority waves, within the 8 s deadline, merged with the
// stored data (research R5, data-model). Wave 1 (repo) here; each story tests its own wave.
import { describe, expect, it } from "vitest";
import { createGithubClient } from "@/lib/github/client";
import { carryOverGithub, fetchPortfolioGithub, type GithubTarget } from "@/lib/github/fetch-portfolio";
import { createFakeGithub } from "../../fixtures/github/fake-github";

const NOW = new Date("2026-10-03T12:00:00Z");
const ORIGIN = "http://127.0.0.1:4010";
const TOKEN = "test-token-NO-REAL-0000";

const target = (folder: string, overrides: Partial<GithubTarget> = {}): GithubTarget => ({
  folder,
  originKind: "github",
  originRepo: `example-org/${folder}`,
  manifestRepo: `example-org/${folder}`,
  workflowFiles: [".github/workflows/ci.yml"],
  ...overrides,
});

/** `null` means no token (an `undefined` argument would take the default). */
function setup(token: string | null = TOKEN, options = {}) {
  const fake = createFakeGithub({ now: NOW, ...options });
  const client = createGithubClient({ fetch: fake.fetch, origin: ORIGIN, token: token ?? undefined });
  return { fake, client };
}

const repoPaths = (fake: ReturnType<typeof createFakeGithub>) => fake.requests.map((r) => r.path).filter((p) => /^\/repos\/[^/]+\/[^/?]+$/.test(p));

describe("wave 1: repository", () => {
  it("reads visibility and default branch of every GitHub project, internal counting as private", async () => {
    const { client } = setup();
    const state = await fetchPortfolioGithub([target("level3-demo"), target("roadmap-states")], null, { client, now: NOW });
    expect(state.github["level3-demo"]).toMatchObject({
      applies: "yes",
      repo: "example-org/level3-demo",
      repoMismatch: null,
      repoInfo: { status: "ok", value: { visibility: "publico", defaultBranch: "main", archived: false }, fetchedAt: NOW.toISOString(), reason: null },
    });
    expect(state.github["roadmap-states"].repoInfo.value?.visibility).toBe("privado");
    expect(state.githubStatus).toMatchObject({ fetchedAt: NOW.toISOString(), tokenPresent: true, stoppedReason: null });
    expect(state.githubStatus.rateLimit?.remaining).toBeGreaterThan(0);
  });

  it("makes no request for a project without remote or with a remote that is not GitHub", async () => {
    const { fake, client } = setup();
    const state = await fetchPortfolioGithub(
      [target("no-origin", { originKind: "none", originRepo: null }), target("gitlab-remote", { originKind: "other", originRepo: null })],
      null,
      { client, now: NOW },
    );
    expect(fake.requests).toHaveLength(0);
    expect(state.github["no-origin"]).toMatchObject({ applies: "no_remote", repo: null });
    expect(state.github["gitlab-remote"]).toMatchObject({ applies: "not_github", repo: null });
  });

  it("flags a repo in PROJECT.md that differs from origin", async () => {
    const { client } = setup();
    const state = await fetchPortfolioGithub([target("level3-demo", { manifestRepo: "example-org/otro" })], null, { client, now: NOW });
    expect(state.github["level3-demo"].repoMismatch).toBe("example-org/otro");
    const same = await fetchPortfolioGithub([target("level3-demo", { manifestRepo: "Example-Org/Level3-Demo" })], null, { client, now: NOW });
    expect(same.github["level3-demo"].repoMismatch).toBeNull();
  });

  it("without a token, a private repo is not available: requires token", async () => {
    const { client } = setup(null);
    const state = await fetchPortfolioGithub([target("feature-branch")], null, { client, now: NOW });
    expect(state.github["feature-branch"].repoInfo).toMatchObject({ status: "unavailable", value: null, reason: "requiere token" });
    expect(state.githubStatus.tokenPresent).toBe(false);
  });

  it("runs at most 3 requests at a time", async () => {
    const { fake, client } = setup();
    let inFlight = 0;
    let max = 0;
    const counting = (async (input: RequestInfo | URL, init?: RequestInit) => {
      inFlight++;
      max = Math.max(max, inFlight);
      await new Promise((r) => setTimeout(r, 20));
      try {
        return await fake.fetch(input, init);
      } finally {
        inFlight--;
      }
    }) as typeof fetch;
    const slowClient = createGithubClient({ fetch: counting, origin: ORIGIN, token: TOKEN });
    void client;
    const folders = ["level3-demo", "duplicate-id-a", "duplicate-id-b", "spec-no-tasks", "env-versioned", "history-demo"];
    await fetchPortfolioGithub(folders.map((f) => target(f)), null, { client: slowClient, now: NOW });
    expect(max).toBe(3);
    expect(repoPaths(fake)).toHaveLength(6);
  });

  it("marks what does not answer within the global deadline as 'tiempo agotado'", async () => {
    const { fake, client } = setup();
    fake.set("*", { status: 200, body: {}, delayMs: 5_000 });
    const started = Date.now();
    const state = await fetchPortfolioGithub([target("level3-demo")], null, { client, now: NOW, deadlineMs: 100 });
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(state.github["level3-demo"].repoInfo).toMatchObject({ status: "unavailable", reason: "tiempo agotado" });
    expect(state.githubStatus.stoppedReason).toBe("tiempo agotado");
  });

  it("keeps the previous value and its date when the new query fails", async () => {
    const { fake, client } = setup();
    const before = new Date("2026-10-01T12:00:00Z");
    const first = await fetchPortfolioGithub([target("level3-demo")], null, { client, now: before });
    fake.set("*", { status: 200, networkError: true });
    const second = await fetchPortfolioGithub([target("level3-demo")], first, { client, now: NOW });
    expect(second.github["level3-demo"].repoInfo).toMatchObject({
      status: "unavailable",
      value: { visibility: "publico" },
      fetchedAt: before.toISOString(),
      reason: "sin conexión con GitHub",
    });
  });

  it("asks with the stored ETag and, on 304, reuses the stored summary with the new date", async () => {
    const { fake, client } = setup();
    const first = await fetchPortfolioGithub([target("level3-demo")], null, { client, now: new Date("2026-10-01T12:00:00Z") });
    const second = await fetchPortfolioGithub([target("level3-demo")], first, { client, now: NOW });
    const asked = fake.requests.filter((r) => r.path === "/repos/example-org/level3-demo");
    expect(asked[1].headers["if-none-match"]).toBeTruthy();
    expect(second.github["level3-demo"].repoInfo).toMatchObject({ status: "ok", value: { visibility: "publico" }, fetchedAt: NOW.toISOString() });
  });

  it("stops every pending query when the rate limit runs out, saying when it resets", async () => {
    const reset = new Date("2026-10-03T13:05:00Z");
    const { fake, client } = setup(TOKEN, { rateLimit: { limit: 60, remaining: 4, resetAt: reset } });
    const folders = ["level3-demo", "duplicate-id-a", "duplicate-id-b", "spec-no-tasks", "env-versioned"];
    const state = await fetchPortfolioGithub(folders.map((f) => target(f)), null, { client, now: NOW, concurrency: 1 });
    expect(repoPaths(fake).length).toBeLessThanOrEqual(2);
    const unavailable = folders.filter((f) => state.github[f].repoInfo.status === "unavailable");
    expect(unavailable.length).toBeGreaterThanOrEqual(3);
    expect(state.github[unavailable[0]].repoInfo.reason).toMatch(/^límite de consultas de GitHub agotado; se restablece a las \d{2}:\d{2}$/);
    expect(state.githubStatus.stoppedReason).toMatch(/^límite de consultas/);
  });
});

describe("carryOverGithub (automatic re-read, no queries)", () => {
  it("keeps the stored data and status, and empty data says to press Actualizar", async () => {
    const { client } = setup();
    const stored = await fetchPortfolioGithub([target("level3-demo")], null, { client, now: NOW });
    const carried = carryOverGithub([target("level3-demo"), target("history-demo")], stored);
    expect(carried.github["level3-demo"]).toEqual(stored.github["level3-demo"]);
    expect(carried.githubStatus).toEqual(stored.githubStatus);
    expect(carried.githubCache).toEqual(stored.githubCache);
    expect(carried.github["history-demo"].repoInfo).toMatchObject({ status: "unavailable", value: null, reason: "sin datos de GitHub: pulsa Actualizar" });
    expect(carryOverGithub([target("level3-demo")], null).githubStatus.fetchedAt).toBeNull();
  });

  it("drops stored data of a project whose origin now points to another repo", async () => {
    const { client } = setup();
    const stored = await fetchPortfolioGithub([target("level3-demo")], null, { client, now: NOW });
    const carried = carryOverGithub([target("level3-demo", { originRepo: "example-org/otro" })], stored);
    expect(carried.github["level3-demo"].repoInfo.value).toBeNull();
  });
});

// T020 (US1): wave 2, CI of the default branch.
describe("wave 2: CI", () => {
  it("reads the runs of the default branch and asks 2b only for workflows absent from them", async () => {
    const { fake, client } = setup();
    const state = await fetchPortfolioGithub(
      [target("multi-workflow", { workflowFiles: [".github/workflows/ci.yml", ".github/workflows/e2e.yml", ".github/workflows/lint.yml"] })],
      null,
      { client, now: NOW },
    );
    const ci = state.github["multi-workflow"].ci;
    expect(ci.status).toBe("ok");
    expect(ci.value?.perWorkflow.map((w) => [w.path, w.latestCompleted?.conclusion])).toEqual([
      [".github/workflows/ci.yml", "failure"],
      [".github/workflows/e2e.yml", "success"],
      [".github/workflows/lint.yml", "success"],
    ]);
    const paths = fake.requests.map((r) => r.path);
    expect(paths).toContain("/repos/example-org/multi-workflow/actions/runs?branch=main&per_page=50&exclude_pull_requests=true");
    expect(paths).toContain("/repos/example-org/multi-workflow/actions/workflows/lint.yml/runs?branch=main&status=completed&per_page=1");
    expect(paths.filter((p) => p.includes("/actions/workflows/"))).toHaveLength(1);
  });

  it("without the repository data it does not ask and keeps the reason", async () => {
    const { fake, client } = setup(null);
    const state = await fetchPortfolioGithub([target("feature-branch")], null, { client, now: NOW });
    expect(state.github["feature-branch"].ci).toMatchObject({ status: "unavailable", reason: "requiere token" });
    expect(fake.requests.filter((r) => r.path.includes("/actions/"))).toHaveLength(0);
  });
});

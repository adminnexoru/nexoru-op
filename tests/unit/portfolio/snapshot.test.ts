// T030: the regenerable index: expiry after 10 minutes and validation when loading (FR-012, FR-013).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isStale, parseSnapshot, STALE_AFTER_MS } from "@/lib/portfolio/snapshot-format";
import { readPortfolio } from "@/lib/portfolio/read-portfolio";
import { buildReading } from "@/lib/portfolio/refresh";
import { createGithubClient } from "@/lib/github/client";
import { createFakeGithub } from "../../fixtures/github/fake-github";
import { FORMAT_VERSION, type PortfolioReading } from "@/lib/portfolio/types";
import { buildFixturePortfolio, removeFixturePortfolio } from "../../fixtures/build-portfolio";

let root: string;
let reading: PortfolioReading;

beforeAll(async () => {
  ({ root } = await buildFixturePortfolio());
  reading = await readPortfolio(root);
});

afterAll(() => removeFixturePortfolio(root));

describe("isStale", () => {
  const now = new Date("2026-10-01T12:00:00Z");

  it("is stale after more than 10 minutes", () => {
    expect(STALE_AFTER_MS).toBe(600_000);
    expect(isStale("2026-10-01T11:50:00.000Z", now)).toBe(false);
    expect(isStale("2026-10-01T11:49:59.999Z", now)).toBe(true);
    expect(isStale("2026-10-01T11:59:00.000Z", now)).toBe(false);
  });
});

describe("parseSnapshot", () => {
  it("accepts the reading of the fictitious portfolio (JSON round trip, as stored in jsonb)", () => {
    const payload = JSON.parse(JSON.stringify(reading));
    expect(parseSnapshot({ format_version: FORMAT_VERSION, payload })).toEqual(reading);
  });

  it("treats a missing row, another format version or an invalid payload as an empty index", () => {
    expect(parseSnapshot(null)).toBeNull();
    expect(parseSnapshot({ format_version: FORMAT_VERSION - 1, payload: reading })).toBeNull();
    expect(parseSnapshot({ format_version: FORMAT_VERSION, payload: { readAt: "ayer" } })).toBeNull();
    expect(parseSnapshot({ format_version: FORMAT_VERSION, payload: [] })).toBeNull();
  });
});

// T009 (004-github-readonly, research R10): format 3 and the two refresh modes.
describe("GitHub in the index", () => {
  const TOKEN = "test-token-NO-REAL-0000";

  it("uses format 3; a format 2 index is read again", () => {
    expect(FORMAT_VERSION).toBe(3);
    expect(parseSnapshot({ format_version: 2, payload: JSON.parse(JSON.stringify(reading)) })).toBeNull();
  });

  it("Actualizar (withGitHub) queries GitHub; the automatic re-read (localOnly) never does and keeps the stored data", { timeout: 30_000 }, async () => {
    const fake = createFakeGithub();
    const client = createGithubClient({ fetch: fake.fetch, origin: "http://127.0.0.1:4010", token: TOKEN });
    const withGitHub = await buildReading(root, { mode: "withGitHub", previous: null, client });
    expect(fake.requests.length).toBeGreaterThan(0);
    expect(withGitHub.githubStatus.fetchedAt).not.toBeNull();
    expect(withGitHub.projects.find((p) => p.folder === "level3-demo")?.github.repoInfo.status).toBe("ok");

    const asked = fake.requests.length;
    const localOnly = await buildReading(root, { mode: "localOnly", previous: withGitHub, client });
    expect(fake.requests.length).toBe(asked);
    expect(localOnly.githubStatus).toEqual(withGitHub.githubStatus);
    expect(localOnly.githubCache).toEqual(withGitHub.githubCache);
    expect(localOnly.projects.find((p) => p.folder === "level3-demo")?.github).toEqual(
      withGitHub.projects.find((p) => p.folder === "level3-demo")?.github,
    );
  });

  it("never stores the token, and the reading survives the jsonb round trip", { timeout: 30_000 }, async () => {
    const fake = createFakeGithub({ tokenExpiration: "2026-12-01 00:00:00 UTC" });
    const client = createGithubClient({ fetch: fake.fetch, origin: "http://127.0.0.1:4010", token: TOKEN });
    const stored = await buildReading(root, { mode: "withGitHub", previous: null, client });
    const json = JSON.stringify(stored);
    expect(json).not.toContain(TOKEN);
    expect(json).not.toContain("SECRETO-FICTICIO");
    expect(parseSnapshot({ format_version: FORMAT_VERSION, payload: JSON.parse(json) })).toEqual(stored);
  });
});


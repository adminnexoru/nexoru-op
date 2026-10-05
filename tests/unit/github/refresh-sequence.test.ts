// T018 (contracts/github-ui.md "Secuencia de actualizaciones"): the base of Conformidad describes
// the current state of each project, never a change between updates.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createGithubClient } from "@/lib/github/client";
import { buildReading } from "@/lib/portfolio/refresh";
import type { PortfolioReading } from "@/lib/portfolio/types";
import { conformityCellText } from "@/lib/format";
import { buildFixturePortfolio, removeFixturePortfolio } from "../../fixtures/build-portfolio";
import { createFakeGithub } from "../../fixtures/github/fake-github";

const DAY = 86_400_000;
let root: string;
beforeAll(async () => ({ root } = await buildFixturePortfolio()));
afterAll(() => removeFixturePortfolio(root));

const demo = (reading: PortfolioReading) => reading.projects.find((p) => p.folder === "level3-demo")!;

describe("sequence of updates", () => {
  it("green → GitHub silent with 2-day data → re-read with 8-day data", { timeout: 60_000 }, async () => {
    const t0 = new Date("2026-10-01T12:00:00Z");
    const fake = createFakeGithub({ now: t0 });
    const client = createGithubClient({ fetch: fake.fetch, origin: "http://127.0.0.1:4010", token: "test-token-NO-REAL-0000" });

    const first = await buildReading(root, { mode: "withGitHub", previous: null, client, now: t0 });
    expect(conformityCellText(demo(first).indicators.conformity)).toMatch(/· 29 de 29 \(incluye 3\.2\)$/);

    fake.set("*", { status: 200, networkError: true });
    const second = await buildReading(root, { mode: "withGitHub", previous: first, client, now: new Date(t0.getTime() + 2 * DAY) });
    expect(conformityCellText(demo(second).indicators.conformity)).toMatch(/· 29 de 29 \(incluye 3\.2\)$/);
    expect(demo(second).github.ci).toMatchObject({ status: "unavailable", fetchedAt: t0.toISOString() });

    const third = await buildReading(root, { mode: "localOnly", previous: second, client, now: new Date(t0.getTime() + 8 * DAY) });
    expect(conformityCellText(demo(third).indicators.conformity)).toMatch(/· 28 de 28 \(3\.2 sin evaluar: sin datos recientes de GitHub\)$/);

    for (const reading of [first, second, third]) {
      expect(JSON.stringify(reading)).not.toMatch(/cambió/);
      for (const project of reading.projects) expect(conformityCellText(project.indicators.conformity)).not.toMatch(/cambió/);
    }
  });
});

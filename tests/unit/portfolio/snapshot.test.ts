// T030: the regenerable index: expiry after 10 minutes and validation when loading (FR-012, FR-013).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isStale, parseSnapshot, STALE_AFTER_MS } from "@/lib/portfolio/snapshot-format";
import { readPortfolio } from "@/lib/portfolio/read-portfolio";
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
    expect(parseSnapshot({ format_version: 2, payload: reading })).toBeNull();
    expect(parseSnapshot({ format_version: FORMAT_VERSION, payload: { readAt: "ayer" } })).toBeNull();
    expect(parseSnapshot({ format_version: FORMAT_VERSION, payload: [] })).toBeNull();
  });
});

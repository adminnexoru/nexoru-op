// T014: pure history calculations (US1, FR-001 to FR-006, FR-032, data-model.md).
import { describe, expect, it } from "vitest";
import {
  activityLevel,
  buildHistory,
  daysBetween,
  latestPhaseChange,
  parseAheadBehind,
  weeklyActivity,
  weekStart,
  type HistoryInput,
} from "@/lib/portfolio/history";

const NOW = new Date(2026, 9, 1, 12, 0, 0); // Thursday 2026-10-01, 12:00 local time
const daysAgo = (days: number, hour = 10) => {
  const date = new Date(NOW);
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
};
const unix = (date: Date) => Math.floor(date.getTime() / 1000);

const input = (overrides: Partial<HistoryInput> = {}): HistoryInput => ({
  lastCommitUnix: unix(daysAgo(5)),
  commitTimesUnix: [unix(daysAgo(5))],
  aheadBehind: { ahead: 2, behind: 3, ref: "origin/HEAD" },
  fetchHeadMtimeMs: daysAgo(40).getTime(),
  phaseLog: null,
  detachedHead: false,
  problems: [],
  ...overrides,
});

describe("days and activity level", () => {
  it("counts whole local calendar days", () => {
    expect(daysBetween(daysAgo(5, 23), NOW)).toBe(5);
    expect(daysBetween(daysAgo(0, 1), NOW)).toBe(0);
  });

  it.each([
    [0, "verde"],
    [5, "verde"],
    [6, "ambar"],
    [15, "ambar"],
    [16, "rojo"],
    [400, "rojo"],
  ] as const)("%i days → %s", (days, level) => {
    expect(activityLevel(days, "construccion")).toBe(level);
  });

  it.each(["pausado", "operacion", "retirado"])("is neutral in %s, whatever the days", (fase) => {
    expect(activityLevel(40, fase)).toBe("neutro");
    expect(activityLevel(1, fase)).toBe("neutro");
  });

  it("is absent without a value", () => {
    expect(activityLevel(null, "construccion")).toBeNull();
  });
});

describe("weekly activity", () => {
  it("starts weeks on Monday, local time", () => {
    expect(weekStart(NOW)).toBe("2026-09-28");
    expect(weekStart(new Date(2026, 8, 28, 0, 30))).toBe("2026-09-28");
    expect(weekStart(new Date(2026, 8, 27, 23, 30))).toBe("2026-09-21");
  });

  it("returns 12 weeks, oldest first, current week included, 0 for empty weeks", () => {
    const weeks = weeklyActivity([unix(daysAgo(0)), unix(daysAgo(1)), unix(daysAgo(10)), unix(daysAgo(200))], NOW);
    expect(weeks).toHaveLength(12);
    expect(weeks[11]).toEqual({ weekStart: "2026-09-28", commits: 2 });
    expect(weeks[10]).toEqual({ weekStart: "2026-09-21", commits: 1 });
    expect(weeks[0].weekStart).toBe("2026-07-13");
    expect(weeks.reduce((sum, week) => sum + week.commits, 0)).toBe(3);
  });
});

describe("ahead and behind", () => {
  it("parses rev-list --left-right --count", () => {
    expect(parseAheadBehind("2\t3\n")).toEqual({ ahead: 2, behind: 3 });
    expect(parseAheadBehind("garbage")).toBeNull();
  });
});

describe("phase change from the history of PROJECT.md", () => {
  const record = (date: Date, diff: string) => `\0${"a".repeat(40)}\t${unix(date)}\n\n${diff}`;
  const hunk = (start: number, lines: string[]) => `diff --git a/PROJECT.md b/PROJECT.md\n--- a/PROJECT.md\n+++ b/PROJECT.md\n@@ -${start} +${start} @@\n${lines.join("\n")}\n`;

  it("finds the most recent commit that set the current value", () => {
    const log = [
      record(daysAgo(3), hunk(20, ["-Texto", "+Texto nuevo"])),
      record(daysAgo(20), hunk(6, ["-fase: especificacion", "+fase: construccion"])),
      record(daysAgo(100), `diff --git a/PROJECT.md b/PROJECT.md\n--- /dev/null\n+++ b/PROJECT.md\n@@ -0,0 +1,3 @@\n+---\n+fase: especificacion\n+---\n`),
    ].join("");
    expect(latestPhaseChange(log, 24)).toEqual({ value: "construccion", at: daysAgo(20) });
  });

  it("takes the commit that introduced the field when it never changed", () => {
    const log = record(daysAgo(100), `diff --git a/PROJECT.md b/PROJECT.md\n--- /dev/null\n+++ b/PROJECT.md\n@@ -0,0 +1,3 @@\n+---\n+fase: idea\n+---\n`);
    expect(latestPhaseChange(log, 24)).toEqual({ value: "idea", at: daysAgo(100) });
  });

  it("ignores a commit that rewrites the same value and fase: lines outside the frontmatter", () => {
    const log = [
      record(daysAgo(2), hunk(6, ["-fase: construccion", "+fase: construccion"])),
      record(daysAgo(4), hunk(40, ["-fase: pruebas", "+fase: piloto"])),
      record(daysAgo(20), hunk(6, ["-fase: idea", "+fase: construccion"])),
    ].join("");
    expect(latestPhaseChange(log, 24)).toEqual({ value: "construccion", at: daysAgo(20) });
  });

  it("is null without history", () => {
    expect(latestPhaseChange(null, 24)).toBeNull();
    expect(latestPhaseChange("", 24)).toBeNull();
  });
});

describe("buildHistory", () => {
  const manifest = { fase: "construccion", fase_desde: "2026-09-17" };

  it("builds the history of a repository", () => {
    const phaseLog = `\0${"b".repeat(40)}\t${unix(daysAgo(20))}\n\ndiff --git a/PROJECT.md b/PROJECT.md\n--- a/PROJECT.md\n+++ b/PROJECT.md\n@@ -6 +6 @@\n-fase: especificacion\n+fase: construccion\n`;
    const history = buildHistory(input({ phaseLog }), manifest, 24, NOW);
    expect(history).toMatchObject({
      daysWithoutActivity: 5,
      activityLight: "verde",
      compareRef: "origin/HEAD",
      ahead: 2,
      behind: 3,
      remoteRefsAgeDays: 40,
      daysInPhase: 20,
      phaseMatchesFaseDesde: false,
      notes: [],
    });
    expect(history.weekly).toHaveLength(12);
    expect(new Date(history.lastCommitAt!).getTime()).toBe(unix(daysAgo(5)) * 1000);
  });

  it("matches fase_desde when the change was that day", () => {
    const phaseLog = `\0${"b".repeat(40)}\t${unix(daysAgo(14))}\n\n@@ -6 +6 @@\n-fase: especificacion\n+fase: construccion\n`;
    expect(buildHistory(input({ phaseLog }), manifest, 24, NOW).phaseMatchesFaseDesde).toBe(true);
  });

  it("handles a repository without commits", () => {
    const history = buildHistory(input({ lastCommitUnix: null, commitTimesUnix: [], aheadBehind: null }), manifest, 24, NOW);
    expect(history).toMatchObject({ lastCommitAt: null, daysWithoutActivity: null, activityLight: null, ahead: null });
    expect(history.notes).toContain("sin commits");
  });

  it("marks a detached HEAD", () => {
    expect(buildHistory(input({ detachedHead: true }), manifest, 24, NOW).notes).toContain("HEAD separado");
  });

  it("shows a commit dated in the future as is, with a note", () => {
    const history = buildHistory(input({ lastCommitUnix: unix(daysAgo(-3)) }), manifest, 24, NOW);
    expect(history.daysWithoutActivity).toBe(0);
    expect(history.notes).toContain("fecha de commit en el futuro");
  });

  it("warns when fase changed on disk but not in a commit", () => {
    const phaseLog = `\0${"b".repeat(40)}\t${unix(daysAgo(20))}\n\n@@ -6 +6 @@\n-fase: especificacion\n+fase: construccion\n`;
    const history = buildHistory(input({ phaseLog }), { fase: "pruebas", fase_desde: "2026-09-30" }, 24, NOW);
    expect(history.notes).toContain("cambio de fase sin commit");
  });

  it("is neutral in operacion and keeps the days; without FETCH_HEAD the age is unknown", () => {
    const history = buildHistory(input({ fetchHeadMtimeMs: null }), { fase: "operacion", fase_desde: null }, 24, NOW);
    expect(history).toMatchObject({ activityLight: "neutro", daysWithoutActivity: 5, remoteRefsUpdatedAt: null, remoteRefsAgeDays: null });
  });
});

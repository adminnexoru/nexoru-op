// T018: pure calculations of the git history (US1, FR-001 to FR-006, FR-032, data-model.md).
// Inputs are the raw outputs of the fixed git commands of contracts/git-history.md; nothing here
// touches the disk or runs git.
import { phaseLabel } from "@/lib/format";
import type { ActivityLevel, GitHistory, Problem, WeekActivity } from "./types";

const DAY_MS = 86_400_000;
const WEEKS = 12;
const NEUTRAL_PHASES = new Set(["pausado", "operacion", "retirado"]);
/** Used when the end of the frontmatter of PROJECT.md is unknown. */
const DEFAULT_FRONTMATTER_END = 50;

const startOfLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
export const localDateString = (date: Date) => date.toLocaleDateString("en-CA");

/** Whole local calendar days from `from` to `to` (DST-safe). */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime()) / DAY_MS);
}

/** Activity traffic light: ≤ 5 days verde, 6–15 ámbar, > 15 rojo; neutral in pausado/operacion/retirado. */
export function activityLevel(days: number | null, fase: string | null): ActivityLevel | null {
  if (days === null) return null;
  if (fase !== null && NEUTRAL_PHASES.has(fase)) return "neutro";
  if (days <= 5) return "verde";
  if (days <= 15) return "ambar";
  return "rojo";
}

/** Monday of the local week, AAAA-MM-DD. */
export function weekStart(date: Date): string {
  const day = startOfLocalDay(date);
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return localDateString(day);
}

/** Commits per week for the last 12 weeks (oldest first, current week last, 0 when empty). */
export function weeklyActivity(commitTimesUnix: number[], now: Date): WeekActivity[] {
  const current = new Date(`${weekStart(now)}T00:00:00`);
  const weeks: WeekActivity[] = [];
  for (let i = WEEKS - 1; i >= 0; i--) {
    const start = new Date(current);
    start.setDate(start.getDate() - 7 * i);
    weeks.push({ weekStart: localDateString(start), commits: 0 });
  }
  const index = new Map(weeks.map((week, i) => [week.weekStart, i]));
  for (const time of commitTimesUnix) {
    const i = index.get(weekStart(new Date(time * 1000)));
    if (i !== undefined) weeks[i].commits++;
  }
  return weeks;
}

/** Output of `rev-list --left-right --count A...B`: "<ahead>\t<behind>". */
export function parseAheadBehind(output: string): { ahead: number; behind: number } | null {
  const match = output.trim().match(/^(\d+)\s+(\d+)$/);
  return match ? { ahead: Number(match[1]), behind: Number(match[2]) } : null;
}

const FASE_LINE = /^([+-])fase:\s*(\S+)\s*$/;
const HUNK = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

export interface PhaseChange {
  value: string;
  at: Date;
  /** "changed": from another value; "introduced": the field appeared (usually PROJECT.md was created). */
  kind: "changed" | "introduced";
}

/**
 * Most recent commit that left `fase` (in the frontmatter) at its value: the one that introduced
 * it or changed it from another value. `log` is the output of the phaseLog command (newest first).
 */
export function latestPhaseChange(log: string | null, frontmatterEndLine: number | null): PhaseChange | null {
  if (!log) return null;
  const limit = frontmatterEndLine ?? DEFAULT_FRONTMATTER_END;
  for (const record of log.split("\0")) {
    const header = record.match(/^[0-9a-f]{40}\t(\d+)/);
    if (!header) continue;
    let oldLine = 0;
    let newLine = 0;
    let added: string | null = null;
    let removed: string | null = null;
    for (const line of record.split("\n")) {
      const hunk = line.match(HUNK);
      if (hunk) {
        // With --unified=0 the first changed line is the hunk start (0 for an empty side).
        oldLine = Math.max(Number(hunk[1]), 1) - 1;
        newLine = Math.max(Number(hunk[2]), 1) - 1;
        continue;
      }
      if (line.startsWith("+++") || line.startsWith("---")) continue;
      if (line.startsWith("-")) oldLine++;
      else if (line.startsWith("+")) newLine++;
      else continue;
      const fase = line.match(FASE_LINE);
      if (!fase) continue;
      if (fase[1] === "+" && newLine <= limit) added = fase[2];
      if (fase[1] === "-" && oldLine <= limit) removed = fase[2];
    }
    if (added !== null && added !== removed) {
      return { value: added, at: new Date(Number(header[1]) * 1000), kind: removed === null ? "introduced" : "changed" };
    }
  }
  return null;
}

type PhaseCheck = Pick<GitHistory, "daysInPhase" | "daysInPhaseSource" | "phaseCheck" | "phaseCheckDetail" | "phaseMatchesFaseDesde">;

/**
 * FR-006, option A: a real change is compared with fase_desde; a history that starts when the
 * field was created is only a lower bound and cannot contradict an earlier fase_desde.
 */
function checkPhase(change: PhaseChange | null, fase: string | null, faseDesde: string | null, now: Date): PhaseCheck {
  if (!change) return { daysInPhase: null, daysInPhaseSource: null, phaseCheck: null, phaseCheckDetail: null, phaseMatchesFaseDesde: null };
  const changedOn = localDateString(change.at);
  const fromHistory = { daysInPhase: daysBetween(change.at, now), daysInPhaseSource: "historial" as const };
  if (faseDesde === null) return { ...fromHistory, phaseCheck: null, phaseCheckDetail: null, phaseMatchesFaseDesde: null };
  if (faseDesde === changedOn) return { ...fromHistory, phaseCheck: "coincide", phaseCheckDetail: null, phaseMatchesFaseDesde: true };

  if (change.kind === "changed") {
    return {
      ...fromHistory,
      phaseCheck: "no_coincide",
      phaseCheckDetail: `No coincide con fase_desde (${faseDesde}): el historial muestra el cambio a ${phaseLabel(change.value)} el ${changedOn}.`,
      phaseMatchesFaseDesde: false,
    };
  }
  if (faseDesde < changedOn) {
    return {
      daysInPhase: daysBetween(new Date(`${faseDesde}T00:00:00`), now),
      daysInPhaseSource: "fase_desde",
      phaseCheck: "no_verificable",
      phaseCheckDetail: `No verificable: PROJECT.md registra la fase desde el ${changedOn} (cuando se creó el campo) y fase_desde (${faseDesde}) es anterior; el historial no puede confirmarlo.`,
      phaseMatchesFaseDesde: null,
    };
  }
  return {
    ...fromHistory,
    phaseCheck: "contradice",
    phaseCheckDetail: `Contradicción: fase_desde dice ${faseDesde}, pero PROJECT.md ya registraba fase: ${fase ?? change.value} desde el ${changedOn} y la fase no cambió después. fase_desde debería ser el ${changedOn} o una fecha anterior.`,
    phaseMatchesFaseDesde: false,
  };
}

export interface HistoryInput {
  lastCommitUnix: number | null;
  commitTimesUnix: number[];
  aheadBehind: { ahead: number; behind: number; ref: "origin/HEAD" | "main" } | null;
  fetchHeadMtimeMs: number | null;
  phaseLog: string | null;
  detachedHead: boolean;
  problems: Problem[];
}

export function buildHistory(
  input: HistoryInput,
  manifest: { fase: string | null; fase_desde: string | null } | null,
  frontmatterEndLine: number | null,
  now: Date,
): GitHistory {
  const notes: string[] = [];
  const fase = manifest?.fase ?? null;

  let lastCommitAt: string | null = null;
  let daysWithoutActivity: number | null = null;
  if (input.lastCommitUnix === null) notes.push("sin commits");
  else {
    const last = new Date(input.lastCommitUnix * 1000);
    lastCommitAt = last.toISOString();
    daysWithoutActivity = daysBetween(last, now);
    if (last.getTime() > now.getTime()) {
      notes.push("fecha de commit en el futuro");
      daysWithoutActivity = 0;
    }
  }
  if (input.detachedHead) notes.push("HEAD separado");

  const fetched = input.fetchHeadMtimeMs === null ? null : new Date(input.fetchHeadMtimeMs);
  const change = latestPhaseChange(input.phaseLog, frontmatterEndLine);
  if (change && fase !== null && change.value !== fase) notes.push("cambio de fase sin commit");

  return {
    lastCommitAt,
    daysWithoutActivity,
    activityLight: activityLevel(daysWithoutActivity, fase),
    weekly: weeklyActivity(input.commitTimesUnix, now),
    compareRef: input.aheadBehind?.ref ?? null,
    ahead: input.aheadBehind?.ahead ?? null,
    behind: input.aheadBehind?.behind ?? null,
    remoteRefsUpdatedAt: fetched?.toISOString() ?? null,
    remoteRefsAgeDays: fetched ? daysBetween(fetched, now) : null,
    phaseChangedAt: change?.at.toISOString() ?? null,
    ...checkPhase(change, fase, manifest?.fase_desde ?? null, now),
    notes,
    problems: input.problems,
  };
}

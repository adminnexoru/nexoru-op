// T025: the ## Roadmap table and the derived state of each phase (standard/roadmap.md v1.0).
import { ROADMAP_STATES, type RoadmapPhase, type RoadmapState } from "@/lib/portfolio/types";
import { sectionText, tables, taskCheckboxes } from "../markdown";
import type { SpecFolder } from "../project-files";

export const ROADMAP_HEADER = ["Fase", "Objetivo", "Specs", "Fecha objetivo", "Estado manual"];
const NONE = new Set(["—", ""]);

export interface ParsedPhase extends RoadmapPhase {
  /** Raw `Estado manual` cell, kept for check 3.7 when it is not an allowed value. */
  manualRaw: string;
}

export interface ParsedRoadmap {
  /** A table with the exact header exists in ## Roadmap (check 3.3). */
  found: boolean;
  phases: ParsedPhase[];
}

const isState = (value: string): value is RoadmapState => (ROADMAP_STATES as readonly string[]).includes(value);

function derive(specs: string[], folders: SpecFolder[]): RoadmapPhase["derived"] {
  if (specs.length === 0) return null;
  let done = 0;
  let total = 0;
  for (const name of specs) {
    const tasks = folders.find((folder) => folder.name === name)?.tasks;
    // Derived only if EVERY linked spec has a readable tasks.md.
    if (!tasks?.ok) return null;
    const counts = taskCheckboxes(tasks.text);
    done += counts.done;
    total += counts.total;
  }
  const state: RoadmapState = total > 0 && done === total ? "completa" : done > 0 ? "en-curso" : "pendiente";
  return { state, done, total };
}

export function parseRoadmap(body: string, folders: SpecFolder[]): ParsedRoadmap {
  const section = sectionText(body, "Roadmap");
  const table = section === null ? undefined : tables(section).find((t) => t.header.join("|") === ROADMAP_HEADER.join("|"));
  if (!table) return { found: false, phases: [] };

  const phases = table.rows.map((row): ParsedPhase => {
    const [phase = "", objective = "", specsCell = "", target = "", manual = ""] = row;
    const specs = NONE.has(specsCell) ? [] : specsCell.split(",").map((name) => name.trim()).filter(Boolean);
    const derived = derive(specs, folders);
    const manualState = isState(manual) ? manual : null;
    return {
      phase,
      objective,
      specs,
      targetDate: NONE.has(target) ? null : target,
      manualState,
      derived,
      shownState: derived?.state ?? manualState,
      manualRaw: manual,
    };
  });
  return { found: true, phases };
}

/** The roadmap as stored in the index (without the raw manual cell). */
export function toRoadmapPhases(roadmap: ParsedRoadmap): RoadmapPhase[] | null {
  if (!roadmap.found) return null;
  return roadmap.phases.map(({ phase, objective, specs, targetDate, manualState, derived, shownState }) => ({
    phase,
    objective,
    specs,
    targetDate,
    manualState,
    derived,
    shownState,
  }));
}

// Spanish texts with counts: singular and plural always agree (owner review, 2026-10-02).
import type { Indicators } from "@/lib/portfolio/types";

/** No-break space: a number never separates from its "%" (owner review). */
const NBSP = "\u00a0";
const pct = (n: number) => `${n}${NBSP}%`;
export const percentText = pct;

/** Readable phase names on screen; the identifiers in the files do not change. */
const PHASE_LABELS: Record<string, string> = {
  idea: "Idea",
  especificacion: "Especificación",
  construccion: "Construcción",
  pruebas: "Pruebas",
  piloto: "Piloto",
  migracion: "Migración",
  operacion: "Operación",
  pausado: "Pausado",
  retirado: "Retirado",
};

export function phaseLabel(fase: string): string {
  return PHASE_LABELS[fase] ?? fase;
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-09-14" → "14 sep" (start of a week on the x axis). */
export function weekLabel(isoDate: string): string {
  const [, month, day] = isoDate.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}

/** "1 día", "2 días", "0 días". */
export function count(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

export const daysText = (n: number) => count(n, "día", "días");
export const projectsText = (n: number) => count(n, "proyecto", "proyectos");
export const commitsInWeeks = (n: number) => `${count(n, "commit", "commits")} en 12 semanas`;

export function remoteAgeText(days: number): string {
  return days === 0 ? "referencia local de hoy" : `referencia local de hace ${daysText(days)}`;
}

export function daysInPhaseText(days: number, fase: string): string {
  return `${daysText(days)} en ${phaseLabel(fase)}`;
}

export function conformityText(conformity: Indicators["conformity"]): string {
  return "absent" in conformity
    ? `Conformidad ausente: ${conformity.absent}`
    : `Conformidad ${pct(conformity.percent)} · ${conformity.passed} de ${conformity.applicable}`;
}

export function progressText(progress: Indicators["progress"]): string {
  return "absent" in progress
    ? `Avance ausente: ${progress.absent}`
    : `Avance ${pct(progress.percent)} · ${progress.done} de ${count(progress.total, "tarea", "tareas")}`;
}

/** Table cells: the column header gives the name. */
export function conformityCellText(conformity: Indicators["conformity"]): string {
  return "absent" in conformity ? `Ausente: ${conformity.absent}` : `${pct(conformity.percent)} · ${conformity.passed} de ${conformity.applicable}`;
}

export function progressCellText(progress: Indicators["progress"]): string {
  return "absent" in progress
    ? `Ausente: ${progress.absent}`
    : `${pct(progress.percent)} · ${progress.done} de ${count(progress.total, "tarea", "tareas")}`;
}

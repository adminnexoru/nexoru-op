// Spanish texts with counts: singular and plural always agree (owner review, 2026-10-02).
import type { Indicators } from "@/lib/portfolio/types";

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
  return `${daysText(days)} en ${fase}`;
}

export function conformityText(conformity: Indicators["conformity"]): string {
  return "absent" in conformity
    ? `Conformidad ausente: ${conformity.absent}`
    : `Conformidad ${conformity.percent} % · ${conformity.passed} de ${conformity.applicable}`;
}

export function progressText(progress: Indicators["progress"]): string {
  return "absent" in progress
    ? `Avance ausente: ${progress.absent}`
    : `Avance ${progress.percent} % · ${progress.done} de ${count(progress.total, "tarea", "tareas")}`;
}

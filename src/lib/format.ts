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

/** Result of a GitHub Actions run, as the dashboard names it (contracts/github-ui.md). */
const CI_CONCLUSIONS: Record<string, string> = {
  success: "éxito",
  failure: "falla",
  cancelled: "cancelada",
  timed_out: "tiempo agotado",
  skipped: "omitida",
  neutral: "neutra",
  action_required: "requiere acción",
  stale: "obsoleta",
  startup_failure: "falla al iniciar",
};

export function ciConclusionLabel(conclusion: string | null): string {
  return conclusion === null ? "sin resultado" : (CI_CONCLUSIONS[conclusion] ?? conclusion);
}

/** First letter in uppercase ("éxito" → "Éxito"). */
export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "hace unos segundos", "hace 1 minuto", "hace 3 horas", "hace 2 días" (age of the GitHub data). */
export function agoText(fromIso: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - new Date(fromIso).getTime()) / 60_000);
  if (minutes < 1) return "hace unos segundos";
  if (minutes < 60) return `hace ${count(minutes, "minuto", "minutos")}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${count(hours, "hora", "horas")}`;
  return `hace ${count(Math.floor(hours / 24), "día", "días")}`;
}

/** CI of a pull request, as the dashboard names it (contracts/github-ui.md). */
const PULL_CI: Record<string, string> = {
  success: "éxito",
  failure: "falla",
  in_progress: "en curso",
  awaiting_approval: "requiere aprobación",
  none: "sin CI",
  not_queried: "no consultada",
};

export const pullCiLabel = (ci: string) => PULL_CI[ci] ?? ci;

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

/** Where 3.2 stands, in the same place as the percentage (FR-017): the current state, never a change. */
function check32Text(conformity: Extract<Indicators["conformity"], { check32: unknown }>): string {
  return conformity.check32.included ? "(incluye 3.2)" : `(3.2 sin evaluar: ${conformity.check32.reason})`;
}

/** The only text that says the base changed (contracts/github-ui.md); it does not depend on the last update. */
export const CONFORMITY_LEGEND =
  "La Conformidad incluye la verificación 3.2 (CI de la rama principal) desde la Fase 4: la base es 29 cuando 3.2 se evalúa y 28 cuando no se puede evaluar; la base cambió de 28 a 29 por la activación de 3.2";

export function conformityText(conformity: Indicators["conformity"]): string {
  return "absent" in conformity
    ? `Conformidad ausente: ${conformity.absent}`
    : `Conformidad ${pct(conformity.percent)} · ${conformity.passed} de ${conformity.applicable} ${check32Text(conformity)}`;
}

export function progressText(progress: Indicators["progress"]): string {
  return "absent" in progress
    ? `Avance ausente: ${progress.absent}`
    : `Avance ${pct(progress.percent)} · ${progress.done} de ${count(progress.total, "tarea", "tareas")}`;
}

/** Table cells: the column header gives the name. */
export function conformityCellText(conformity: Indicators["conformity"]): string {
  return "absent" in conformity
    ? `Ausente: ${conformity.absent}`
    : `${pct(conformity.percent)} · ${conformity.passed} de ${conformity.applicable} ${check32Text(conformity)}`;
}

export function progressCellText(progress: Indicators["progress"]): string {
  return "absent" in progress
    ? `Ausente: ${progress.absent}`
    : `${pct(progress.percent)} · ${progress.done} de ${count(progress.total, "tarea", "tareas")}`;
}

// T023: the CI traffic light of a project (contracts/github-ui.md). Pure: what the dashboard says
// about the CI of the default branch, from the stored GitHub data.
import { agoText, capitalize, ciConclusionLabel } from "@/lib/format";
import type { ActivityLevel } from "@/lib/portfolio/types";
import type { GithubData } from "./types";

export type CiState = { level: ActivityLevel; text: string; detail?: string };

export function ciState(github: GithubData, now: Date): CiState {
  if (github.applies !== "yes") return { level: "neutro", text: "No aplica" };
  const ci = github.ci;
  if (!ci.value) return { level: "neutro", text: "No disponible" };
  const detail = ci.status === "ok" || !ci.fetchedAt ? undefined : agoText(ci.fetchedAt, now);
  const { latest, latestCompletedAny } = ci.value;
  if (latest && latest.status !== "completed") return { level: "ambar", text: "En curso", detail };
  if (!latestCompletedAny) return { level: "rojo", text: "Sin ejecuciones", detail };
  if (latestCompletedAny.conclusion === "success") return { level: "verde", text: "Éxito", detail };
  return { level: "rojo", text: capitalize(ciConclusionLabel(latestCompletedAny.conclusion)), detail };
}

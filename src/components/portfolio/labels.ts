import type { Finding, Problem } from "@/lib/portfolio/types";

// Spanish labels for the conformance detail (contracts/ui.md).

export const SEVERITY_LABEL: Record<Finding["severity"], string> = {
  critical: "crítico",
  high: "alto",
  medium: "medio",
  low: "bajo",
};

export const FINDING_LABEL: Record<Finding["code"], string> = {
  env_versioned: "Archivos .env versionados",
  secret_history: "Secretos en el historial de git",
  repo_visibility: "Visibilidad del repositorio",
  env_example_missing: "Falta .env.example",
  env_example_coverage: ".env.example lista todas las variables que lee el código",
  yaml_comments: "Comentarios YAML en el frontmatter",
};

export const PROBLEM_LABEL: Record<Problem["reason"], string> = {
  missing: "no existe",
  outside_root: "apunta fuera del portafolio; no se lee",
  secret_file: "apunta a un archivo de secretos; no se lee",
  too_large: "pesa más de 1 MB; no se lee",
  not_regular_file: "no es un archivo normal; no se lee",
  invalid_utf8: "no es texto UTF-8 válido",
  invalid_yaml: "el frontmatter no se puede interpretar",
  git_error: "error al consultar git",
  no_checkboxes: "no tiene casillas",
  unreadable: "no se pudo leer",
};

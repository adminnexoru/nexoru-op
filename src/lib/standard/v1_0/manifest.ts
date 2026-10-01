// T023: fields of the PROJECT.md manifest (standard/project-manifest.md v1.0).
import type { Manifest } from "@/lib/portfolio/types";

type Kind = "text" | "date" | "number" | "list";

export const FIELDS: Record<keyof Manifest, Kind> = {
  id: "text",
  nombre: "text",
  tipo: "text",
  cliente: "text",
  fase: "text",
  fase_desde: "date",
  estado: "text",
  despliegue: "text",
  urls: "list",
  repo: "text",
  fecha_inicio: "date",
  fecha_objetivo: "date",
  stack: "list",
  servicios: "list",
  costo_mensual_usd: "number",
  siguiente_hito: "text",
  mapa_funcional: "text",
  version_estandar: "text",
};

export const ENUMS: Partial<Record<keyof Manifest, readonly string[]>> = {
  tipo: ["producto-cliente", "producto-nexoru", "interno"],
  fase: ["idea", "especificacion", "construccion", "pruebas", "piloto", "migracion", "operacion", "pausado"],
  estado: ["verde", "ambar", "rojo"],
  despliegue: ["nexoru-subdominio", "dominio-cliente", "local", "ninguno"],
};

export const DEPLOYMENTS_WITH_URLS = ["nexoru-subdominio", "dominio-cliente"];
const PHASES_WITHOUT_TARGET = ["operacion", "pausado"];

export function hasValidType(value: unknown, kind: Kind): boolean {
  switch (kind) {
    case "text":
    case "date":
      return typeof value === "string" && value.length > 0;
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "list":
      return Array.isArray(value) && value.every((item) => typeof item === "string");
  }
}

/** Manifest values; a field that is absent or of the wrong type is null (FR-009). */
export function readManifest(data: Record<string, unknown>): Manifest {
  const manifest = {} as Record<string, unknown>;
  for (const [field, kind] of Object.entries(FIELDS)) {
    manifest[field] = hasValidType(data[field], kind) ? data[field] : null;
  }
  return manifest as Manifest;
}

/** Whether a field is mandatory for this manifest (project-manifest.md, "Campos"). */
export function isRequired(field: keyof Manifest, data: Record<string, unknown>): boolean {
  if (field === "urls") return DEPLOYMENTS_WITH_URLS.includes(String(data.despliegue));
  if (field === "fecha_objetivo") return !PHASES_WITHOUT_TARGET.includes(String(data.fase));
  return true;
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const KIND_LABEL: Record<Kind, string> = {
  text: "texto",
  date: "texto",
  number: "número",
  list: "lista de texto",
};

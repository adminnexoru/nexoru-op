// T017: result of a portfolio reading, stored in the regenerable index (data-model §2).
// The zod schemas validate the index when it is loaded back (FR-013).
import { z } from "zod";

/** Version of the payload format stored in portfolio_snapshots.format_version. */
export const FORMAT_VERSION = 1;

export const ROADMAP_STATES = ["completa", "implementada-sin-validar", "en-curso", "bloqueada", "pendiente"] as const;
export const roadmapStateSchema = z.enum(ROADMAP_STATES);
export type RoadmapState = z.infer<typeof roadmapStateSchema>;

export const problemSchema = z.object({
  path: z.string().nullable(),
  reason: z.enum([
    "missing",
    "outside_root",
    "secret_file",
    "too_large",
    "not_regular_file",
    "invalid_utf8",
    "invalid_yaml",
    "git_error",
    "no_checkboxes",
    "unreadable",
  ]),
  detail: z.string().nullable(),
});
export type Problem = z.infer<typeof problemSchema>;

export const gitInfoSchema = z.object({
  isRepo: z.boolean(),
  branch: z.string().nullable(),
  mainBranch: z.string().nullable(),
  onMainBranch: z.boolean().nullable(),
  hasUncommittedChanges: z.boolean().nullable(),
  originRepo: z.string().nullable(),
});
export type GitInfo = z.infer<typeof gitInfoSchema>;

const text = z.string().nullable();
const list = z.array(z.string()).nullable();

export const manifestSchema = z.object({
  id: text,
  nombre: text,
  tipo: text,
  cliente: text,
  fase: text,
  fase_desde: text,
  estado: text,
  despliegue: text,
  urls: list,
  repo: text,
  fecha_inicio: text,
  fecha_objetivo: text,
  stack: list,
  servicios: list,
  costo_mensual_usd: z.number().nullable(),
  siguiente_hito: text,
  mapa_funcional: text,
  version_estandar: text,
});
export type Manifest = z.infer<typeof manifestSchema>;

export const roadmapPhaseSchema = z.object({
  phase: z.string(),
  objective: z.string(),
  specs: z.array(z.string()),
  targetDate: z.string().nullable(),
  manualState: roadmapStateSchema.nullable(),
  derived: z.object({ state: roadmapStateSchema, done: z.number(), total: z.number() }).nullable(),
  shownState: roadmapStateSchema.nullable(),
});
export type RoadmapPhase = z.infer<typeof roadmapPhaseSchema>;

export const checkSchema = z.object({
  id: z.string(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  status: z.enum(["pass", "fail", "not_evaluated"]),
  detail: z.string().nullable(),
});
export type Check = z.infer<typeof checkSchema>;

export const findingSchema = z.object({
  severity: z.enum(["critical", "high", "medium", "low"]),
  code: z.enum([
    "env_versioned",
    "env_example_missing",
    "env_example_coverage",
    "yaml_comments",
    "secret_history",
    "repo_visibility",
  ]),
  status: z.enum(["found", "not_found", "not_evaluated"]),
  detail: z.string().nullable(),
});
export type Finding = z.infer<typeof findingSchema>;

export const conformanceResultSchema = z.object({
  standardVersion: z.string().nullable(),
  evaluation: z.enum(["evaluated", "unsupported_version", "no_version"]),
  level: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).nullable(),
  provisional: z.boolean(),
  checks: z.array(checkSchema),
  failures: z.array(checkSchema),
  warnings: z.array(problemSchema),
  findings: z.array(findingSchema),
});
export type ConformanceResult = z.infer<typeof conformanceResultSchema>;

export const projectReadingSchema = z.object({
  folder: z.string(),
  git: gitInfoSchema,
  manifest: manifestSchema.nullable(),
  manifestProblem: problemSchema.nullable(),
  roadmap: z.array(roadmapPhaseSchema).nullable(),
  conformance: conformanceResultSchema,
  readErrors: z.array(problemSchema),
});
export type ProjectReading = z.infer<typeof projectReadingSchema>;

export const standardInfoSchema = z.object({
  folder: z.literal("nexoru-governance"),
  found: z.boolean(),
  version: z.string().nullable(),
  newerThanSupported: z.boolean(),
});
export type StandardInfo = z.infer<typeof standardInfoSchema>;

export const portfolioWarningSchema = z.object({
  code: z.enum(["duplicate_id"]),
  detail: z.string(),
});
export type PortfolioWarning = z.infer<typeof portfolioWarningSchema>;

export const rootStatusSchema = z.enum(["ok", "missing", "not_absolute", "not_directory"]);
export type RootStatus = z.infer<typeof rootStatusSchema>;

export const portfolioReadingSchema = z.object({
  readAt: z.iso.datetime(),
  root: z.object({ status: rootStatusSchema }),
  supportedStandardVersions: z.array(z.string()),
  standard: standardInfoSchema,
  projects: z.array(projectReadingSchema),
  warnings: z.array(portfolioWarningSchema),
});
export type PortfolioReading = z.infer<typeof portfolioReadingSchema>;

// T017: result of a portfolio reading, stored in the regenerable index (data-model §2).
// The zod schemas validate the index when it is loaded back (FR-013).
import { z } from "zod";
import { githubCacheSchema, githubDataSchema, githubStatusSchema } from "@/lib/github/types";

/** Version of the payload format stored in portfolio_snapshots.format_version. */
export const FORMAT_VERSION = 3;

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
    "invalid_value",
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
  /** Why hasUncommittedChanges is null in a repository (phase 3, contracts/git-history.md). */
  uncommittedChangesReason: z.string().nullable(),
  originRepo: z.string().nullable(),
  /** Whether origin exists and is GitHub (phase 4: "no aplica" for none and other). */
  originKind: z.enum(["github", "other", "none"]),
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
  /** Standard 1.2: publico or privado; null when absent, empty or not allowed. */
  visibilidad: text,
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
    "operacion_pending_phases",
    "construction_roadmap_concluded",
    "visibility_decision_required",
    "visibility_mismatch",
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
  /** Phase 4 (FR-028): informative notice of a newer supported version; not a finding. */
  newerStandardNotice: z.string().nullable(),
  /** Phase 4 (standard 1.2, repo-visibility.md): result of the declared visibility; null in 1.0 and 1.1. */
  visibility: z.enum(["aceptada", "requiere-decision", "discrepancia", "sin-declarar (interno)", "no_evaluado"]).nullable(),
});
export type ConformanceResult = z.infer<typeof conformanceResultSchema>;

export const weekActivitySchema = z.object({
  /** Monday of the week, AAAA-MM-DD in local time. */
  weekStart: z.string(),
  commits: z.number(),
});
export type WeekActivity = z.infer<typeof weekActivitySchema>;

export const ACTIVITY_LEVELS = ["verde", "ambar", "rojo", "neutro"] as const;
export const activityLevelSchema = z.enum(ACTIVITY_LEVELS);
export type ActivityLevel = z.infer<typeof activityLevelSchema>;

/** T011: git history of a project (phase 3, data-model.md). */
export const gitHistorySchema = z.object({
  lastCommitAt: z.iso.datetime({ offset: true }).nullable(),
  daysWithoutActivity: z.number().nullable(),
  activityLight: activityLevelSchema.nullable(),
  weekly: z.array(weekActivitySchema),
  compareRef: z.enum(["origin/HEAD", "main"]).nullable(),
  ahead: z.number().nullable(),
  behind: z.number().nullable(),
  remoteRefsUpdatedAt: z.iso.datetime({ offset: true }).nullable(),
  remoteRefsAgeDays: z.number().nullable(),
  phaseChangedAt: z.iso.datetime({ offset: true }).nullable(),
  daysInPhase: z.number().nullable(),
  phaseMatchesFaseDesde: z.boolean().nullable(),
  /**
   * FR-006 (option A): "changed" history is compared; a history that starts when the field was
   * created only gives a lower bound ("no_verificable", or "contradice" if fase_desde is later).
   */
  phaseCheck: z.enum(["coincide", "no_coincide", "no_verificable", "contradice"]).nullable(),
  /** Spanish explanation of phaseCheck (null when it matches or there is no history). */
  phaseCheckDetail: z.string().nullable(),
  /** Where daysInPhase comes from: the git history or the declared fase_desde. */
  daysInPhaseSource: z.enum(["historial", "fase_desde"]).nullable(),
  /** Spanish notes: "HEAD separado", "fecha de commit en el futuro", "cambio de fase sin commit", "sin commits". */
  notes: z.array(z.string()),
  problems: z.array(problemSchema),
});
export type GitHistory = z.infer<typeof gitHistorySchema>;

const absentSchema = z.object({ absent: z.string() });

/** T011/T033: Conformidad and Avance (US2, data-model.md). */
export const indicatorsSchema = z.object({
  conformity: z.union([
    z.object({
      percent: z.number(),
      passed: z.number(),
      applicable: z.number(),
      missing: z.array(z.string()),
      /** Phase 4 (FR-016, FR-017): whether 3.2 is in the base, or why not. The current state only. */
      check32: z.union([z.object({ included: z.literal(true) }), z.object({ included: z.literal(false), reason: z.string() })]),
    }),
    absentSchema,
  ]),
  progress: z.union([
    z.object({
      percent: z.number(),
      done: z.number(),
      total: z.number(),
      manualPhasesExcluded: z.number(),
      phasesCompleted: z.number(),
      phasesTotal: z.number(),
    }),
    absentSchema,
  ]),
});
export type Indicators = z.infer<typeof indicatorsSchema>;

export const projectReadingSchema = z.object({
  folder: z.string(),
  git: gitInfoSchema,
  history: gitHistorySchema.nullable(),
  manifest: manifestSchema.nullable(),
  manifestProblem: problemSchema.nullable(),
  roadmap: z.array(roadmapPhaseSchema).nullable(),
  /** FR-029: activo or concluido (standard/roadmap.md 1.1); null without roadmap. */
  roadmapStatus: z.enum(["activo", "concluido"]).nullable(),
  conformance: conformanceResultSchema,
  indicators: indicatorsSchema,
  readErrors: z.array(problemSchema),
  /** Phase 4: GitHub data of the project (specs/004-github-readonly data-model.md). */
  github: githubDataSchema,
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
  /** Sum of every project, last 12 weeks (chart of US4). */
  activityByWeek: z.array(weekActivitySchema),
  /** Folders skipped by .nexoruignore; never shown (FR-031). */
  ignoredCount: z.number(),
  /** Phase 4: last query to GitHub, rate limit and token (never its value). */
  githubStatus: githubStatusSchema,
  /** Phase 4: ETag and summary per query, for conditional requests. */
  githubCache: githubCacheSchema,
});
export type PortfolioReading = z.infer<typeof portfolioReadingSchema>;

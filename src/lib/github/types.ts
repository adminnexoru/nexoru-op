// T010: GitHub data of the regenerable index (specs/004-github-readonly data-model.md). Never the
// token or HTTP headers; only summaries.
import { z } from "zod";

const iso = z.string();

/** `public` → `publico`; `private` and `internal` → `privado`. */
export const repoInfoSchema = z.object({
  visibility: z.enum(["publico", "privado"]),
  defaultBranch: z.string(),
  archived: z.boolean(),
});
export type RepoInfo = z.infer<typeof repoInfoSchema>;

export const ciRunSchema = z.object({
  workflowName: z.string(),
  path: z.string(),
  status: z.enum(["completed", "in_progress", "queued"]),
  /** Only "success" passes 3.2. */
  conclusion: z.string().nullable(),
  at: iso,
});
export type CiRun = z.infer<typeof ciRunSchema>;

export const ciInfoSchema = z.object({
  branch: z.string(),
  /** Most recent run of any workflow (it may be in progress). */
  latest: ciRunSchema.nullable(),
  /** For 3.2 in 1.0 and 1.1. */
  latestCompletedAny: ciRunSchema.nullable(),
  /** For 3.2 in 1.2: only the workflows that satisfy 3.1. */
  perWorkflow: z.array(z.object({ path: z.string(), latestCompleted: ciRunSchema.nullable(), inProgress: z.boolean() })),
});
export type CiInfo = z.infer<typeof ciInfoSchema>;

export const pullInfoSchema = z.object({
  number: z.number().int(),
  /** Plain text, shown escaped. */
  title: z.string(),
  openedAt: iso,
  ci: z.enum(["success", "failure", "in_progress", "none", "not_queried"]),
});
export type PullInfo = z.infer<typeof pullInfoSchema>;

/** A value from GitHub: the last good one (maybe from an earlier query), with its date and why it is not fresh. */
function fetched<T extends z.ZodType>(value: T) {
  return z.object({
    status: z.enum(["ok", "unavailable", "not_evaluated"]),
    value: value.nullable(),
    fetchedAt: iso.nullable(),
    reason: z.string().nullable(),
  });
}

export const githubDataSchema = z.object({
  applies: z.enum(["yes", "no_remote", "not_github"]),
  repo: z.string().nullable(),
  repoMismatch: z.string().nullable(),
  repoInfo: fetched(repoInfoSchema),
  ci: fetched(ciInfoSchema),
  pulls: fetched(z.array(pullInfoSchema)),
  secretAlerts: fetched(z.number().int().nonnegative()),
});
export type GithubData = z.infer<typeof githubDataSchema>;
export type Fetched<T> = { status: "ok" | "unavailable" | "not_evaluated"; value: T | null; fetchedAt: string | null; reason: string | null };

export const githubStatusSchema = z.object({
  /** Last query to GitHub (Actualizar); null if never. */
  fetchedAt: iso.nullable(),
  /** Whether there is a token; never its value. */
  tokenPresent: z.boolean(),
  tokenExpiresAt: iso.nullable(),
  rateLimit: z.object({ limit: z.number(), remaining: z.number(), resetAt: iso }).nullable(),
  stoppedReason: z.string().nullable(),
});
export type GithubStatus = z.infer<typeof githubStatusSchema>;

/** Query route (without origin) → ETag and the summary already made from its answer. */
export const githubCacheSchema = z.record(z.string(), z.object({ etag: z.string(), summary: z.unknown() }));
export type GithubCache = z.infer<typeof githubCacheSchema>;

export type GithubState = { github: Record<string, GithubData>; githubStatus: GithubStatus; githubCache: GithubCache };

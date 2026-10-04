// T012: GitHub queries of the portfolio (specs/004-github-readonly research R5, data-model). Waves
// by priority within one global deadline, at most 3 requests at a time, ETags from the stored
// cache and a stop for the whole update when the rate limit runs out. What fails keeps the last
// good value with its date and says why.
import { githubRoutes, type GithubClient, type GithubFailure } from "./client";
import { buildCiInfo, missingWorkflows, pullCi, pullSha, summarizePulls, summarizeRuns } from "./summarize";
import type { CiRun, Fetched, GithubCache, GithubData, GithubState, GithubStatus, RepoInfo } from "./types";

export const GITHUB_DEADLINE_MS = 8_000;
export const GITHUB_CONCURRENCY = 3;
export const NO_DATA_REASON = "sin datos de GitHub: pulsa Actualizar";

/** What the GitHub queries need from the local reading of a project. */
export type GithubTarget = {
  folder: string;
  originKind: "github" | "other" | "none";
  /** owner/name of the GitHub origin (lowercase), or null. */
  originRepo: string | null;
  /** `repo` of PROJECT.md, or null. */
  manifestRepo: string | null;
  /** Workflow files that satisfy 3.1 (.github/workflows/…). */
  workflowFiles: string[];
};

type QueryResult<T> = { ok: true; summary: T } | { ok: false; reason: string };

export type WaveContext = {
  client: GithubClient;
  now: Date;
  signal: AbortSignal;
  concurrency: number;
  targets: GithubTarget[];
  github: Record<string, GithubData>;
  /** Runs one query of the catalog with the stored ETag; never throws. */
  query<T>(route: string, summarize: (body: unknown) => T): Promise<QueryResult<T>>;
  /** Runs jobs with the concurrency limit. */
  pool(jobs: (() => Promise<void>)[]): Promise<void>;
};

export type Wave = (ctx: WaveContext) => Promise<void>;

const timeFormat = new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });

export function failureText(reason: GithubFailure, hasToken: boolean, resetAt: string | null): string {
  switch (reason) {
    case "timeout":
      return "tiempo agotado";
    case "network":
      return "sin conexión con GitHub";
    case "server_error":
      return "error de GitHub";
    case "invalid_token":
      return "el token de GitHub no es válido";
    case "rate_limited":
      return resetAt
        ? `límite de consultas de GitHub agotado; se restablece a las ${timeFormat.format(new Date(resetAt))}`
        : "límite de consultas de GitHub agotado";
    case "secondary_limit":
      return "GitHub pidió esperar antes de más consultas";
    case "forbidden":
      return "GitHub negó el acceso";
    case "not_found":
      return hasToken ? "el repo no existe o el token no tiene acceso" : "requiere token";
  }
}

export function fresh<T>(value: T, now: Date): Fetched<T> {
  return { status: "ok", value, fetchedAt: now.toISOString(), reason: null };
}

/** Keeps the last good value and its date; says why it is not fresh. */
export function failed<T>(previous: Fetched<T>, reason: string, status: Fetched<T>["status"] = "unavailable"): Fetched<T> {
  return { status, value: previous.value, fetchedAt: previous.fetchedAt, reason };
}

const empty = <T>(reason: string): Fetched<T> => ({ status: "unavailable", value: null, fetchedAt: null, reason });

function baseData(target: GithubTarget): GithubData {
  if (target.originKind !== "github" || !target.originRepo) {
    const reason = target.originKind === "none" ? "sin remoto" : "el remoto no es de GitHub";
    return {
      applies: target.originKind === "none" ? "no_remote" : "not_github",
      repo: null,
      repoMismatch: null,
      repoInfo: empty(reason),
      ci: empty(reason),
      pulls: empty(reason),
      secretAlerts: empty(reason),
    };
  }
  const mismatch = target.manifestRepo && target.manifestRepo.toLowerCase() !== target.originRepo ? target.manifestRepo : null;
  return {
    applies: "yes",
    repo: target.originRepo,
    repoMismatch: mismatch,
    repoInfo: empty(NO_DATA_REASON),
    ci: empty(NO_DATA_REASON),
    pulls: empty(NO_DATA_REASON),
    secretAlerts: empty(NO_DATA_REASON),
  };
}

const EMPTY_STATUS: GithubStatus = { fetchedAt: null, tokenPresent: false, tokenExpiresAt: null, rateLimit: null, stoppedReason: null };

/** The stored data of each project, if it still points to the same repo; nothing is queried. */
export function carryOverGithub(targets: GithubTarget[], previous: GithubState | null): GithubState {
  const github: Record<string, GithubData> = {};
  for (const target of targets) {
    const base = baseData(target);
    const stored = previous?.github[target.folder];
    github[target.folder] = stored && base.applies === "yes" && stored.repo === base.repo ? { ...stored, repoMismatch: base.repoMismatch } : base;
  }
  return { github, githubStatus: previous?.githubStatus ?? EMPTY_STATUS, githubCache: previous?.githubCache ?? {} };
}

export function splitRepo(repo: string): [string, string] {
  const [owner, name] = repo.split("/");
  return [owner, name];
}

/** Wave 1 (US1, US2): visibility, default branch and archived. */
export const repoWave: Wave = async (ctx) => {
  await ctx.pool(
    ctx.targets
      .filter((t) => ctx.github[t.folder].applies === "yes")
      .map((t) => async () => {
        const data = ctx.github[t.folder];
        const result = await ctx.query(githubRoutes.repo(...splitRepo(data.repo as string)), summarizeRepo);
        data.repoInfo = result.ok ? fresh(result.summary, ctx.now) : failed(data.repoInfo, result.reason);
      }),
  );
};

export function summarizeRepo(body: unknown): RepoInfo {
  const repo = body as { visibility?: string; private?: boolean; default_branch?: string; archived?: boolean };
  const visibility = repo.visibility ? (repo.visibility === "public" ? "publico" : "privado") : repo.private ? "privado" : "publico";
  return { visibility, defaultBranch: String(repo.default_branch ?? "main"), archived: Boolean(repo.archived) };
}

/** Wave 2 (US1): CI runs of the default branch, and query 2b for workflows not among them. */
export const ciWave: Wave = async (ctx) => {
  await ctx.pool(
    ctx.targets
      .filter((t) => ctx.github[t.folder].applies === "yes")
      .map((t) => async () => {
        const data = ctx.github[t.folder];
        const branch = data.repoInfo.value?.defaultBranch;
        if (!branch) {
          data.ci = failed(data.ci, data.repoInfo.reason ?? NO_DATA_REASON);
          return;
        }
        const [owner, name] = splitRepo(data.repo as string);
        const runs = await ctx.query(githubRoutes.branchRuns(owner, name, branch), summarizeRuns);
        if (!runs.ok) {
          data.ci = failed(data.ci, runs.reason);
          return;
        }
        const older: Record<string, CiRun | null> = {};
        for (const path of missingWorkflows(runs.summary, t.workflowFiles)) {
          const file = path.split("/").pop() as string;
          const result = await ctx.query(githubRoutes.workflowRuns(owner, name, file, branch), (body) => summarizeRuns(body)[0] ?? null);
          if (!result.ok) {
            data.ci = failed(data.ci, result.reason);
            return;
          }
          older[path] = result.summary;
        }
        data.ci = fresh(buildCiInfo(branch, runs.summary, t.workflowFiles, older), ctx.now);
      }),
  );
};

/** PRs whose CI is asked (query 4); the rest say "no consultada" (research R3). */
export const PULLS_WITH_CI = 10;

/** Wave 3 (US3): open pull requests and the CI of the 10 most recent ones. */
export const pullsWave: Wave = async (ctx) => {
  const jobs: (() => Promise<void>)[] = [];
  for (const t of ctx.targets.filter((target) => ctx.github[target.folder].applies === "yes")) {
    const data = ctx.github[t.folder];
    if (!data.repoInfo.value) {
      data.pulls = failed(data.pulls, data.repoInfo.reason ?? NO_DATA_REASON);
      continue;
    }
    jobs.push(async () => {
      const [owner, name] = splitRepo(data.repo as string);
      const raw = await ctx.query(githubRoutes.pulls(owner, name), (body) => ({
        pulls: summarizePulls(body, data.repo as string),
        shas: Array.isArray(body) ? Object.fromEntries((body as Parameters<typeof pullSha>[0][]).map((p) => [Number(p.number), pullSha(p)])) : {},
      }));
      if (!raw.ok) {
        data.pulls = failed(data.pulls, raw.reason);
        return;
      }
      const pulls = raw.summary.pulls.map((pull) => ({ ...pull }));
      for (const pull of pulls.slice(0, PULLS_WITH_CI)) {
        const sha = raw.summary.shas[pull.number];
        if (!sha) continue;
        const ci = await ctx.query(githubRoutes.commitRuns(owner, name, sha), pullCi);
        if (ci.ok) pull.ci = ci.summary;
      }
      data.pulls = fresh(pulls, ctx.now);
    });
  }
  await ctx.pool(jobs);
};

/** Waves in priority order; each story adds its own. */
export const GITHUB_WAVES: Wave[] = [repoWave, ciWave, pullsWave];

export async function fetchPortfolioGithub(
  targets: GithubTarget[],
  previous: GithubState | null,
  deps: { client: GithubClient; now: Date; deadlineMs?: number; concurrency?: number; waves?: Wave[] },
): Promise<GithubState> {
  const { client, now } = deps;
  const carried = carryOverGithub(targets, previous);
  const github = carried.github;
  const repos = new Set(Object.values(github).flatMap((d) => (d.repo ? [`/repos/${d.repo}`] : [])));
  const previousCache = previous?.githubCache ?? {};
  const cache: GithubCache = Object.fromEntries(
    Object.entries(previousCache).filter(([route]) => [...repos].some((r) => route.toLowerCase().startsWith(r))),
  );
  const signal = AbortSignal.timeout(deps.deadlineMs ?? GITHUB_DEADLINE_MS);
  const concurrency = deps.concurrency ?? GITHUB_CONCURRENCY;
  let stoppedReason: string | null = null;

  async function query<T>(route: string, summarize: (body: unknown) => T): Promise<QueryResult<T>> {
    if (!stoppedReason && signal.aborted) stoppedReason = "tiempo agotado";
    if (stoppedReason) return { ok: false, reason: stoppedReason };
    const cached = previousCache[route];
    const result = await client.get(route, { etag: cached?.etag ?? null, signal });
    if (result.kind === "ok") {
      const summary = summarize(result.body);
      if (result.etag) cache[route] = { etag: result.etag, summary };
      else delete cache[route];
      return { ok: true, summary };
    }
    if (result.kind === "not_modified" && cached) return { ok: true, summary: cached.summary as T };
    if (result.kind === "not_modified") return { ok: false, reason: failureText("server_error", client.hasToken(), null) };
    const reason = failureText(result.reason, client.hasToken(), client.rateLimit()?.resetAt ?? null);
    if (result.reason === "timeout" && signal.aborted) stoppedReason = "tiempo agotado";
    else if (result.stop) stoppedReason = reason;
    return { ok: false, reason };
  }

  async function pool(jobs: (() => Promise<void>)[]): Promise<void> {
    let next = 0;
    const worker = async () => {
      while (next < jobs.length) await jobs[next++]();
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
  }

  const ctx: WaveContext = { client, now, signal, concurrency, targets, github, query, pool };
  for (const wave of deps.waves ?? GITHUB_WAVES) await wave(ctx);

  const status: GithubStatus = {
    fetchedAt: now.toISOString(),
    tokenPresent: client.hasToken(),
    tokenExpiresAt: client.tokenExpiresAt(),
    rateLimit: client.rateLimit(),
    stoppedReason,
  };
  return { github, githubStatus: status, githubCache: cache };
}

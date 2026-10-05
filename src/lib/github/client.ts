import "server-only";

// T011: the single door to GitHub (specs/004-github-readonly contracts/github-client.md, research
// R3–R6). Only GET, a closed catalog of routes, the token only in the Authorization header, no
// retries. Errors carry an internal code and never headers, URLs with secrets or the token.
import { GITHUB_API_ORIGIN } from "./origin";

export type GithubClientErrorCode = "method_not_allowed" | "route_not_allowed" | "origin_not_allowed";

export class GithubClientError extends Error {
  constructor(readonly code: GithubClientErrorCode) {
    super(`GitHub client: ${code}`);
    this.name = "GithubClientError";
  }
}

export type GithubFailure =
  | "invalid_token"
  | "rate_limited"
  | "secondary_limit"
  | "forbidden"
  | "not_found"
  | "server_error"
  | "network"
  | "timeout";

export type GithubResult =
  | { kind: "ok"; body: unknown; etag: string | null }
  | { kind: "not_modified" }
  | { kind: "error"; reason: GithubFailure; stop: boolean };

export type RateLimit = { limit: number; remaining: number; resetAt: string };

const NAME = /^[A-Za-z0-9_.-]+$/;
const WORKFLOW_FILE = /^[A-Za-z0-9_.-]+\.ya?ml$/;
const SHA = /^[0-9a-f]{40}$/;
const BRANCH = /^[A-Za-z0-9._%-]+$/;
const FAKE_ORIGIN = /^http:\/\/127\.0\.0\.1:\d{2,5}$/;
const PER_REQUEST_TIMEOUT_MS = 4_000;
/** With this many or fewer requests left, no more queries (research R4). */
const RATE_LIMIT_RESERVE = 2;

function name(value: string): string {
  if (!NAME.test(value) || value === "." || value === "..") throw new GithubClientError("route_not_allowed");
  return value;
}

/** Builders of the only routes the client accepts. */
export const githubRoutes = {
  repo: (owner: string, repo: string) => `/repos/${name(owner)}/${name(repo)}`,
  branchRuns: (owner: string, repo: string, branch: string) =>
    `/repos/${name(owner)}/${name(repo)}/actions/runs?branch=${encodeURIComponent(branch)}&per_page=50&exclude_pull_requests=true`,
  workflowRuns: (owner: string, repo: string, file: string, branch: string) => {
    if (!WORKFLOW_FILE.test(file)) throw new GithubClientError("route_not_allowed");
    return `/repos/${name(owner)}/${name(repo)}/actions/workflows/${file}/runs?branch=${encodeURIComponent(branch)}&status=completed&per_page=1`;
  },
  pulls: (owner: string, repo: string) => `/repos/${name(owner)}/${name(repo)}/pulls?state=open&per_page=30`,
  commitRuns: (owner: string, repo: string, sha: string) => {
    if (!SHA.test(sha)) throw new GithubClientError("route_not_allowed");
    return `/repos/${name(owner)}/${name(repo)}/actions/runs?head_sha=${sha}&per_page=20`;
  },
  secretAlerts: (owner: string, repo: string) => `/repos/${name(owner)}/${name(repo)}/secret-scanning/alerts?state=open&per_page=100&hide_secret=true`,
};

const N = "[A-Za-z0-9_.-]+";
const B = "[A-Za-z0-9._%-]+";
const ROUTE_PATTERNS = [
  new RegExp(`^/repos/${N}/${N}$`),
  new RegExp(`^/repos/${N}/${N}/actions/runs\\?branch=${B}&per_page=50&exclude_pull_requests=true$`),
  new RegExp(`^/repos/${N}/${N}/actions/workflows/[A-Za-z0-9_.-]+\\.ya?ml/runs\\?branch=${B}&status=completed&per_page=1$`),
  new RegExp(`^/repos/${N}/${N}/pulls\\?state=open&per_page=30$`),
  new RegExp(`^/repos/${N}/${N}/actions/runs\\?head_sha=[0-9a-f]{40}&per_page=20$`),
  new RegExp(`^/repos/${N}/${N}/secret-scanning/alerts\\?state=open&per_page=100&hide_secret=true$`),
];

function isAllowedRoute(route: string): boolean {
  if (route.includes("..") || route.includes("//") || route.includes("@")) return false;
  if (!ROUTE_PATTERNS.some((pattern) => pattern.test(route))) return false;
  const branch = route.match(/[?&]branch=([^&]*)/)?.[1];
  return branch === undefined || BRANCH.test(branch);
}

/** "2026-12-01 00:00:00 UTC" (GitHub-Authentication-Token-Expiration) → ISO, or null. */
export function parseTokenExpiration(value: string | null): string | null {
  const match = value?.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) UTC$/);
  if (!match) return null;
  const date = new Date(`${match[1]}T${match[2]}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export type GithubClientDeps = { fetch: typeof fetch; origin: string; token: string | undefined };

export function createGithubClient({ fetch: fetchImpl, origin, token }: GithubClientDeps) {
  if (origin !== GITHUB_API_ORIGIN && !FAKE_ORIGIN.test(origin)) throw new GithubClientError("origin_not_allowed");
  let rateLimit: RateLimit | null = null;
  let tokenExpiresAt: string | null = null;

  function readRateLimit(headers: Headers): void {
    const limit = Number(headers.get("x-ratelimit-limit"));
    const remaining = Number(headers.get("x-ratelimit-remaining"));
    const reset = Number(headers.get("x-ratelimit-reset"));
    if (headers.has("x-ratelimit-remaining") && Number.isFinite(remaining) && Number.isFinite(reset)) {
      rateLimit = { limit: Number.isFinite(limit) ? limit : 0, remaining, resetAt: new Date(reset * 1000).toISOString() };
    }
    if (token) tokenExpiresAt = parseTokenExpiration(headers.get("github-authentication-token-expiration")) ?? tokenExpiresAt;
  }

  async function request(method: string, route: string, options: { etag?: string | null; signal?: AbortSignal; timeoutMs?: number } = {}): Promise<GithubResult> {
    if (method !== "GET") throw new GithubClientError("method_not_allowed");
    if (!isAllowedRoute(route)) throw new GithubClientError("route_not_allowed");
    if (rateLimit && rateLimit.remaining <= RATE_LIMIT_RESERVE) return { kind: "error", reason: "rate_limited", stop: true };

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "nexoru-op",
    };
    if (options.etag) headers["If-None-Match"] = options.etag;
    if (token) headers.Authorization = `Bearer ${token}`;
    const timeout = AbortSignal.timeout(options.timeoutMs ?? PER_REQUEST_TIMEOUT_MS);
    const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

    let response: Response;
    try {
      response = await fetchImpl(`${origin}${route}`, { method: "GET", headers, cache: "no-store", redirect: "error", signal });
    } catch {
      return { kind: "error", reason: signal.aborted ? "timeout" : "network", stop: false };
    }
    readRateLimit(response.headers);
    if (response.status === 304) return { kind: "not_modified" };
    if (response.status === 200) {
      try {
        return { kind: "ok", body: await response.json(), etag: response.headers.get("etag") };
      } catch {
        return { kind: "error", reason: signal.aborted ? "timeout" : "server_error", stop: false };
      }
    }
    if (response.status === 401) return { kind: "error", reason: "invalid_token", stop: true };
    if (response.status === 403 || response.status === 429) {
      if (response.headers.get("x-ratelimit-remaining") === "0") return { kind: "error", reason: "rate_limited", stop: true };
      if (response.headers.has("retry-after") || response.status === 429) return { kind: "error", reason: "secondary_limit", stop: true };
      return { kind: "error", reason: "forbidden", stop: false };
    }
    if (response.status === 404) return { kind: "error", reason: "not_found", stop: false };
    return { kind: "error", reason: "server_error", stop: false };
  }

  return {
    request,
    get: (route: string, options?: { etag?: string | null; signal?: AbortSignal; timeoutMs?: number }) => request("GET", route, options),
    isAllowedRoute,
    hasToken: () => Boolean(token),
    rateLimit: () => rateLimit,
    tokenExpiresAt: () => tokenExpiresAt,
  };
}

export type GithubClient = ReturnType<typeof createGithubClient>;

// T003: fake GitHub (research R7). Answers the routes of contracts/github-client.md from
// GITHUB_SCENARIO, records every request and lets each test program errors, delays, ETags and the
// rate limit headers. Used in memory by the unit tests and behind node:http by the E2E server.
import { FAKE_OWNER, GITHUB_SCENARIO, type RepoScenario, type RunState } from "./data";

export type FakeResponse = {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
  /** Milliseconds before answering (aborts with the request signal). */
  delayMs?: number;
  /** Rejects as a network failure. */
  networkError?: boolean;
};

export type FakeRequest = { method: string; path: string; headers: Record<string, string> };

export type FakeGithubOptions = {
  scenario?: Record<string, RepoScenario>;
  now?: Date;
  rateLimit?: { limit: number; remaining: number; resetAt: Date };
  /** Value of GitHub-Authentication-Token-Expiration, e.g. "2026-12-01 00:00:00 UTC". */
  tokenExpiration?: string | null;
};

const DAY_MS = 86_400_000;
const iso = (now: Date, daysAgo: number) => new Date(now.getTime() - daysAgo * DAY_MS).toISOString();

function runJson(now: Date, run: RunState, id: number, branch: string) {
  return {
    id,
    name: run.workflow,
    path: run.path,
    workflow_id: id,
    status: run.status,
    conclusion: run.conclusion,
    head_branch: branch,
    event: "push",
    created_at: iso(now, run.daysAgo),
    updated_at: iso(now, run.daysAgo),
    run_started_at: iso(now, run.daysAgo),
  };
}

/** The response GitHub would give for `path` (path and query, without origin). */
export function scenarioResponse(path: string, scenario: Record<string, RepoScenario>, now: Date, auth = true): FakeResponse {
  const url = new URL(path, "http://fake.invalid");
  const match = url.pathname.match(/^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/);
  const repo = match && match[1] === FAKE_OWNER ? scenario[match[2]] : undefined;
  // Like GitHub: without a token, a private or internal repo does not exist.
  if (!match || !repo || (!auth && repo.visibility !== "public")) return { status: 404, body: { message: "Not Found" } };
  const rest = match[3] ?? "";
  const branch = repo.defaultBranch ?? "main";
  const etag = (body: unknown) => `W/"${Buffer.from(JSON.stringify(body)).toString("base64url").slice(-24)}"`;
  const ok = (body: unknown): FakeResponse => ({ status: 200, body, headers: { etag: etag(body) } });

  if (rest === "") {
    return ok({ full_name: `${FAKE_OWNER}/${match[2]}`, private: repo.visibility !== "public", visibility: repo.visibility, default_branch: branch, archived: repo.archived ?? false });
  }
  if (rest === "/actions/runs" && url.searchParams.has("head_sha")) {
    const pull = repo.pulls?.find((p) => p.sha === url.searchParams.get("head_sha"));
    const runs =
      !pull || pull.ci === "none"
        ? []
        : [
            runJson(
              now,
              {
                workflow: "CI",
                path: ".github/workflows/ci.yml",
                status: pull.ci === "in_progress" ? "in_progress" : "completed",
                // A run of a fork that waits for approval ends as action_required.
                conclusion: pull.ci === "in_progress" ? null : pull.ci === "awaiting_approval" ? "action_required" : pull.ci,
                daysAgo: pull.daysAgo,
              },
              pull.number,
              `pr-${pull.number}`,
            ),
          ];
    return ok({ total_count: runs.length, workflow_runs: runs });
  }
  if (rest === "/actions/runs") {
    const runs = (repo.runs ?? []).map((run, i) => runJson(now, run, 1000 + i, branch));
    return ok({ total_count: runs.length, workflow_runs: runs });
  }
  const workflow = rest.match(/^\/actions\/workflows\/([^/]+)\/runs$/);
  if (workflow) {
    const older = repo.olderRuns?.[workflow[1]];
    const runs = older ? [runJson(now, older, 2000, branch)] : [];
    return ok({ total_count: runs.length, workflow_runs: runs });
  }
  if (rest === "/pulls") {
    return ok(
      (repo.pulls ?? []).map((p) => ({
        number: p.number,
        title: p.title,
        created_at: iso(now, p.daysAgo),
        draft: p.draft ?? false,
        head: {
          sha: p.sha,
          repo: p.fork === "deleted" ? null : { full_name: p.fork === "other" ? `persona-ficticia/${match[2]}` : `${FAKE_OWNER}/${match[2]}` },
        },
        base: { repo: { full_name: `${FAKE_OWNER}/${match[2]}` } },
        body: "CUERPO-DE-PR-FICTICIO",
        user: { login: "persona-ficticia" },
      })),
    );
  }
  if (rest === "/secret-scanning/alerts") {
    if (repo.alerts === "disabled" || repo.alerts === undefined) return { status: 404, body: { message: "Secret scanning is disabled on this repository." } };
    if (repo.alerts === "forbidden") return { status: 403, body: { message: "Resource not accessible by personal access token" } };
    // Everything an alert carries besides its count: the dashboard must never keep any of it.
    return ok(
      Array.from({ length: repo.alerts }, (_, i) => ({
        number: i + 1,
        state: "open",
        secret: "SECRETO-FICTICIO-NUNCA-GUARDAR",
        secret_type: "TIPO-DE-SECRETO-FICTICIO",
        secret_type_display_name: "Tipo de secreto ficticio",
        url: `https://api.github.example/alerts/ALERTA-FICTICIA-${i + 1}`,
        html_url: `https://github.example/alerts/ALERTA-FICTICIA-${i + 1}`,
        locations_url: `https://api.github.example/alerts/UBICACION-FICTICIA-${i + 1}`,
      })),
    );
  }
  return { status: 404, body: { message: "Not Found" } };
}

export function createFakeGithub(options: FakeGithubOptions = {}) {
  const scenario = options.scenario ?? GITHUB_SCENARIO;
  const now = options.now ?? new Date();
  const requests: FakeRequest[] = [];
  const overrides = new Map<string, FakeResponse>();
  let rateLimit = options.rateLimit ?? { limit: 5000, remaining: 4999, resetAt: new Date(now.getTime() + 3_600_000) };
  let tokenExpiration = options.tokenExpiration ?? null;

  function headersFor(response: FakeResponse, auth: boolean): Record<string, string> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-ratelimit-limit": String(rateLimit.limit),
      "x-ratelimit-remaining": String(rateLimit.remaining),
      "x-ratelimit-reset": String(Math.floor(rateLimit.resetAt.getTime() / 1000)),
      ...response.headers,
    };
    if (auth && tokenExpiration) headers["github-authentication-token-expiration"] = tokenExpiration;
    return headers;
  }

  async function handle(method: string, path: string, headers: Record<string, string>, signal?: AbortSignal | null): Promise<Response> {
    requests.push({ method, path, headers });
    const response = overrides.get(path) ?? overrides.get("*") ?? scenarioResponse(path, scenario, now, "authorization" in headers);
    if (response.delayMs) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, response.delayMs);
        signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(signal.reason ?? new DOMException("aborted", "AbortError"));
        });
      });
    }
    if (response.networkError) throw new TypeError("fetch failed");
    const auth = "authorization" in headers;
    const etag = response.headers?.etag;
    const notModified = response.status === 200 && etag !== undefined && headers["if-none-match"] === etag;
    // GitHub reports what is left after counting this request, and only stops counting a 304 when
    // the request carries a token (research R4).
    if (!(notModified && auth)) rateLimit = { ...rateLimit, remaining: Math.max(0, rateLimit.remaining - 1) };
    if (notModified) return new Response(null, { status: 304, headers: headersFor({ status: 304, headers: { etag } }, auth) });
    const body = response.body === undefined ? null : JSON.stringify(response.body);
    return new Response(body, { status: response.status, headers: headersFor(response, auth) });
  }

  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((value, key) => (headers[key] = value));
    return handle(init?.method ?? "GET", url.pathname + url.search, headers, init?.signal);
  }) as typeof fetch;

  return {
    fetch: fetchImpl,
    handle,
    requests,
    /** Programs the answer of one path, or of every path with "*". */
    set(path: string, response: FakeResponse) {
      overrides.set(path, response);
    },
    setRateLimit(value: { limit: number; remaining: number; resetAt: Date }) {
      rateLimit = value;
    },
    setTokenExpiration(value: string | null) {
      tokenExpiration = value;
    },
  };
}

export type FakeGithub = ReturnType<typeof createFakeGithub>;

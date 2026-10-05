// T014: fake GitHub for the E2E suite (research R7). A node:http server on 127.0.0.1 that answers
// the catalog routes from the fictitious scenario (tests/fixtures/github). Playwright starts it
// before the app, which reaches it through GITHUB_API_ORIGIN. Tests switch its behaviour with a
// state file and read the requests it received.
//
//   GET /__health     → 200
//   GET /__requests   → the requests received so far (method, path, whether it had a token)
//   POST /__state     → { mode: "normal" | "off" | "rate_limited", tokenExpiration?: string | null }
import { createServer, type IncomingMessage } from "node:http";
import { createFakeGithub } from "../fixtures/github/fake-github";

export const FAKE_GITHUB_PORT = Number(process.env.FAKE_GITHUB_PORT ?? 4010);
export const FAKE_GITHUB_ORIGIN = `http://127.0.0.1:${FAKE_GITHUB_PORT}`;

type State = { mode: "normal" | "off" | "rate_limited"; tokenExpiration: string | null };

/** 60 days from now, so the expiry warning (14 days or less) does not show by default. */
function defaultExpiration(): string {
  const date = new Date(Date.now() + 60 * 86_400_000);
  return `${date.toISOString().slice(0, 10)} 00:00:00 UTC`;
}

async function readBody(req: IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body;
}

export function startFakeGithub(port = FAKE_GITHUB_PORT) {
  let state: State = { mode: "normal", tokenExpiration: defaultExpiration() };
  let fake = createFakeGithub({ tokenExpiration: state.tokenExpiration });

  const server = createServer(async (req, res) => {
    const path = req.url ?? "/";
    if (path === "/__health") return res.end("ok");
    if (path === "/__requests") {
      res.setHeader("content-type", "application/json");
      return res.end(JSON.stringify(fake.requests.map((r) => ({ method: r.method, path: r.path, hasToken: "authorization" in r.headers, token: r.headers.authorization ?? null }))));
    }
    if (path === "/__state" && req.method === "POST") {
      state = { ...state, ...(JSON.parse(await readBody(req)) as Partial<State>) };
      fake = createFakeGithub({ tokenExpiration: state.tokenExpiration });
      if (state.mode === "rate_limited") fake.set("*", { status: 403, headers: { "x-ratelimit-remaining": "0" }, body: { message: "API rate limit exceeded" } });
      return res.end("ok");
    }
    if (state.mode === "off") {
      req.socket.destroy();
      return;
    }
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) if (typeof value === "string") headers[key] = value;
    const response = await fake.handle(req.method ?? "GET", path, headers);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(response.status === 304 ? undefined : await response.text());
  });
  server.listen(port, "127.0.0.1");
  return server;
}

// Run as a script by playwright.config.ts (webServer).
if (process.argv[1]?.endsWith("fake-github.ts")) startFakeGithub();

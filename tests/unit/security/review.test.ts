// T049: static security review of the code (constitution XII and XIII, research R11, CSP).
// It keeps holding after the phase: a new file or command that breaks a rule fails here.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HISTORY_COMMANDS, PREFIX, REPO_PATHS_COMMAND } from "@/lib/portfolio/git";

function files(dir: string, extensions: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path, extensions);
    return extensions.test(name) ? [path] : [];
  });
}

const source = files("src", /\.(ts|tsx)$/).map((path) => ({ path, text: readFileSync(path, "utf8") }));
const gitSource = readFileSync("src/lib/portfolio/git.ts", "utf8");

describe("disk and processes", () => {
  it("only safe-fs.ts and git.ts import node:fs or node:child_process", () => {
    const importers = source
      .filter(({ text }) => /from "(node:)?(fs|fs\/promises|child_process)"/.test(text))
      .map(({ path }) => path)
      .sort();
    expect(importers).toEqual(["src/lib/portfolio/git.ts", "src/lib/portfolio/safe-fs.ts"]);
  });

  it("git.ts runs git in a single place, always with the hardened prefix and without a shell", () => {
    expect(gitSource.match(/run\("git"/g)).toHaveLength(1);
    expect(gitSource).toContain('run("git", [...PREFIX, ...args]');
    expect(gitSource).toContain("shell: false");
    expect(gitSource).not.toMatch(/\b(exec|execSync|spawn|spawnSync)\(/);
  });

  it("the hardened prefix neutralizes the repository config that could run programs", () => {
    for (const option of [
      "core.fsmonitor=false",
      "core.hooksPath=/dev/null",
      "core.attributesFile=/dev/null",
      "log.showSignature=false",
      "gc.auto=0",
      "maintenance.auto=false",
    ]) {
      expect(PREFIX).toContain(option);
    }
    expect(PREFIX).toContain("--no-optional-locks");
    expect(PREFIX.some((arg) => arg.startsWith("--attr-source="))).toBe(true);
    expect(gitSource).toContain('GIT_OPTIONAL_LOCKS: "0"');
  });

  it("no command fetches, pulls, pushes or writes; log -p never runs diff programs", () => {
    const commands = [...Object.values(HISTORY_COMMANDS), REPO_PATHS_COMMAND];
    const forbidden = ["fetch", "pull", "push", "checkout", "config", "gc", "commit", "reset", "update-ref", "remote add"];
    for (const command of commands) expect(forbidden).not.toContain(command[0]);
    for (const word of ["fetch", "pull", "push"]) expect(gitSource).not.toMatch(new RegExp(`["']${word}["']`));
    expect(HISTORY_COMMANDS.phaseLog).toEqual(expect.arrayContaining(["--no-ext-diff", "--no-textconv"]));
  });
});

describe("interface", () => {
  it("has no inline styles nor raw HTML (strict CSP)", () => {
    const offenders = source
      .filter(({ path, text }) => path.endsWith(".tsx") && /\bstyle=\{|dangerouslySetInnerHTML/.test(text))
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });

  it("makes no network request except the password check (HIBP)", () => {
    const fetchers = source.filter(({ text }) => /\bfetch\(/.test(text)).map(({ path }) => path);
    expect(fetchers).toEqual(["src/lib/password.ts"]);
  });
});

// T007 (004-github-readonly, contracts/github-client.md): a single read-only door to GitHub.
describe("GitHub", () => {
  const client = "src/lib/github/client.ts";

  it("only client.ts calls fetch toward GitHub; password.ts keeps its own HIBP fetch", () => {
    // The client receives fetch by injection (tests use the fake) and calls it as fetchImpl(.
    const fetchers = source.filter(({ text }) => /\b(fetch|fetchImpl)\(/.test(text)).map(({ path }) => path).sort();
    expect(readFileSync(client, "utf8")).toMatch(/\bfetchImpl\(/);
    expect(fetchers).toEqual([client, "src/lib/password.ts"].sort());
    expect(readFileSync("src/lib/password.ts", "utf8")).not.toMatch(/github/i);
  });

  it("no browser component imports the GitHub module", () => {
    const browser = source.filter(({ text }) => /^\s*["']use client["']/m.test(text));
    for (const { path, text } of browser) expect(text, path).not.toMatch(/@\/lib\/github/);
  });

  it("the client only sends GET and no other file names an HTTP write method toward GitHub", () => {
    const text = readFileSync(client, "utf8");
    expect(text).toMatch(/method: "GET"/);
    expect(text).not.toMatch(/method: "(POST|PUT|PATCH|DELETE)"/);
    for (const { path, text: other } of source.filter(({ text: t }) => /github/i.test(t))) {
      expect(other, path).not.toMatch(/method:\s*["'](POST|PUT|PATCH|DELETE)["']/);
    }
  });

  it("next.config does not log fetches", () => {
    expect(readFileSync("next.config.ts", "utf8")).not.toMatch(/fetches/);
  });
});

// T049 (004-github-readonly): security review of phase 4, kept as permanent tests.
describe("GitHub review (phase 4)", () => {
  const client = readFileSync("src/lib/github/client.ts", "utf8");

  it("secret scanning alerts are always asked with hide_secret=true (builder and route catalog)", () => {
    // Once in the route builder and once in the catalog pattern (where "?" is escaped).
    expect(client.match(/secret-scanning\/alerts\\*\?state=open&per_page=100&hide_secret=true/g)?.length).toBe(2);
    expect(client).not.toMatch(/hide_secret=false/);
  });

  it("the only network requests are the GitHub client (injected fetch) and the password check", () => {
    const requesters = source.filter(({ text }) => /\b(fetch|fetchImpl)\(/.test(text)).map(({ path }) => path).sort();
    expect(requesters).toEqual(["src/lib/github/client.ts", "src/lib/password.ts"]);
  });

  it("the CSP adds no origin: the browser never talks to GitHub", () => {
    expect(readFileSync("src/proxy.ts", "utf8")).not.toMatch(/github/i);
  });

  it("the token is read only on the server and never logged", () => {
    const readers = source.filter(({ text }) => /GITHUB_TOKEN/.test(text)).map(({ path }) => path).sort();
    expect(readers).toEqual(["src/lib/env.server.ts", "src/lib/portfolio/snapshot.ts"]);
    for (const { path, text } of source) expect(text, path).not.toMatch(/console\.\w+\([^)]*(token|GITHUB_TOKEN)/i);
  });

  it("runtime dependencies did not change in phase 4 (a new one needs the plan's justification)", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { dependencies: Record<string, string> };
    expect(Object.keys(pkg.dependencies).sort()).toEqual([
      "@fontsource/inter",
      "@supabase/ssr",
      "@supabase/supabase-js",
      "class-variance-authority",
      "cn",
      "input-otp",
      "lucide-react",
      "next",
      "radix-ui",
      "react",
      "react-dom",
      "server-only",
      "shadcn",
      "tw-animate-css",
      "yaml",
      "zod",
    ]);
  });
});

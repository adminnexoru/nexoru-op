// T013: one reading of the portfolio in either refresh mode (specs/004-github-readonly research
// R10). Actualizar (withGitHub) queries GitHub; the automatic re-read (localOnly) never does and
// keeps the stored GitHub data, its status and its cache. Pure apart from the reader and the
// client it receives: no Supabase here.
import { carryOverGithub, fetchPortfolioGithub } from "@/lib/github/fetch-portfolio";
import { createGithubClient, type GithubClient } from "@/lib/github/client";
import { resolveGithubApiOrigin } from "@/lib/github/origin";
import type { GithubState } from "@/lib/github/types";
import { readPortfolio } from "./read-portfolio";
import type { PortfolioReading } from "./types";

export type RefreshMode = "withGitHub" | "localOnly";

/** The GitHub part of a stored reading. */
export function storedGithub(reading: PortfolioReading | null): GithubState | null {
  if (!reading) return null;
  return {
    github: Object.fromEntries(reading.projects.map((project) => [project.folder, project.github])),
    githubStatus: reading.githubStatus,
    githubCache: reading.githubCache,
  };
}

export async function buildReading(
  projectsRoot: string | undefined,
  options: {
    mode: RefreshMode;
    previous: PortfolioReading | null;
    /** null when GitHub cannot be queried in this environment; `unavailableReason` says why. */
    client: GithubClient | null;
    unavailableReason?: string;
    now?: Date;
  },
): Promise<PortfolioReading> {
  const now = options.now ?? new Date();
  const previous = storedGithub(options.previous);
  return readPortfolio(projectsRoot, now, {
    github: async (targets) => {
      if (options.mode === "withGitHub" && options.client) return fetchPortfolioGithub(targets, previous, { client: options.client, now });
      const carried = carryOverGithub(targets, previous);
      if (options.mode === "localOnly" || !options.unavailableReason) return carried;
      return { ...carried, githubStatus: { ...carried.githubStatus, stoppedReason: options.unavailableReason } };
    },
  });
}

/**
 * The GitHub client of an environment, or why GitHub cannot be queried there: in the test
 * environment without the fake GitHub, the real one is never queried (research R7).
 */
export function githubClientFor(
  env: { supabaseUrl: string | undefined; override: string | undefined; token: string | undefined },
  fetchImpl: typeof fetch,
): { client: GithubClient | null; reason?: string } {
  try {
    const origin = resolveGithubApiOrigin({ supabaseUrl: env.supabaseUrl, override: env.override });
    return { client: createGithubClient({ fetch: fetchImpl, origin, token: env.token || undefined }) };
  } catch {
    return { client: null, reason: "GitHub no disponible en este entorno" };
  }
}

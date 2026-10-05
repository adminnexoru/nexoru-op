import "server-only";
import { getServerEnv } from "@/lib/env.server";
import { createClient } from "@/lib/supabase/server";
import { buildReading, githubClientFor, type RefreshMode } from "./refresh";
import { isStale, parseSnapshot } from "./snapshot-format";
import { FORMAT_VERSION, type PortfolioReading } from "./types";

// T034: the regenerable index in portfolio_snapshots (research R8, R9). Read with the owner's
// session (RLS); written only through save_portfolio_snapshot.

/** The stored reading and when it was stored (the read_at column decides the expiry), or null. */
export async function loadSnapshot(): Promise<{ reading: PortfolioReading; readAt: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolio_snapshots")
    .select("read_at, format_version, payload")
    .maybeSingle();
  if (error) throw new Error(`loading the portfolio index failed: ${error.code}`);
  const reading = parseSnapshot(data);
  return reading && data ? { reading, readAt: data.read_at } : null;
}

export async function saveSnapshot(reading: PortfolioReading): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_portfolio_snapshot", {
    p_payload: reading,
    p_read_at: reading.readAt,
    p_format_version: FORMAT_VERSION,
  });
  if (error) throw new Error(`saving the portfolio index failed: ${error.code}`);
}

/**
 * Reads PROJECTS_ROOT now and stores the result. Actualizar (withGitHub) also queries GitHub; the
 * automatic re-read (localOnly) keeps the stored GitHub data (specs/004-github-readonly FR-005).
 */
export async function refreshSnapshot(mode: RefreshMode): Promise<PortfolioReading> {
  const previous = (await loadSnapshot())?.reading ?? null;
  const env = getServerEnv();
  const { client, reason } =
    mode === "withGitHub"
      ? githubClientFor({ supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL, override: env.GITHUB_API_ORIGIN, token: env.GITHUB_TOKEN }, globalThis.fetch)
      : { client: null, reason: undefined };
  const reading = await buildReading(env.PROJECTS_ROOT, { mode, previous, client, unavailableReason: reason });
  await saveSnapshot(reading);
  return reading;
}

/** The index, read again first when it is empty, invalid or older than 10 minutes (FR-012, FR-013). */
export async function getPortfolio(): Promise<PortfolioReading> {
  const stored = await loadSnapshot();
  if (stored && !isStale(stored.readAt, new Date())) return stored.reading;
  return refreshSnapshot("localOnly");
}

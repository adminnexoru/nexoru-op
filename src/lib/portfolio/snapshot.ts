import "server-only";
import { getServerEnv } from "@/lib/env.server";
import { createClient } from "@/lib/supabase/server";
import { readPortfolio } from "./read-portfolio";
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

/** Reads PROJECTS_ROOT now and stores the result. */
export async function refreshSnapshot(): Promise<PortfolioReading> {
  const reading = await readPortfolio(getServerEnv().PROJECTS_ROOT);
  await saveSnapshot(reading);
  return reading;
}

/** The index, read again first when it is empty, invalid or older than 10 minutes (FR-012, FR-013). */
export async function getPortfolio(): Promise<PortfolioReading> {
  const stored = await loadSnapshot();
  if (stored && !isStale(stored.readAt, new Date())) return stored.reading;
  return refreshSnapshot();
}

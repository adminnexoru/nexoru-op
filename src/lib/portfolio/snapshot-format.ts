// T034 (pure part): expiry and validation of the stored index (FR-012, FR-013, data-model §3-4).
import { FORMAT_VERSION, portfolioReadingSchema, type PortfolioReading } from "./types";

/** The dashboard reads the portfolio again when the last reading is older than this. */
export const STALE_AFTER_MS = 600_000;

export function isStale(readAt: string, now: Date): boolean {
  return now.getTime() - new Date(readAt).getTime() > STALE_AFTER_MS;
}

/** A stored row as a reading, or null (empty index) when absent, of another format or invalid. */
export function parseSnapshot(row: { format_version: number; payload: unknown } | null): PortfolioReading | null {
  if (!row || row.format_version !== FORMAT_VERSION) return null;
  const parsed = portfolioReadingSchema.safeParse(row.payload);
  return parsed.success ? parsed.data : null;
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertTestEnv } from "../../../scripts/env-guard";

// Test data helpers against the LOCAL Supabase stack only. Never point these at production.

let admin: SupabaseClient | undefined;

export function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required (see .env.example)");
  // Never the owner's use environment, never a remote project (FR-034).
  assertTestEnv(url);
  admin ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

// Child tables first. audit_events is append-only by design (FR-028) and is never cleaned:
// tests must filter events by the ids of the users they create.
const TABLES: Array<{ table: string; key: string }> = [
  { table: "portfolio_snapshots", key: "id" },
  { table: "recovery_codes", key: "id" },
  { table: "app_sessions", key: "session_id" },
  { table: "auth_attempts", key: "email" },
  { table: "invitations", key: "id" },
  { table: "profiles", key: "id" },
];

/** Removes every user and all app data except the audit log. */
export async function resetAppData(): Promise<void> {
  const db = adminClient();
  for (const { table, key } of TABLES) {
    const { error } = await db.from(table).delete().not(key, "is", null);
    // Tables that later phases create may not exist yet.
    if (error && error.code !== "42P01" && error.code !== "PGRST205") {
      throw new Error(`Cleaning ${table} failed: ${error.message}`);
    }
  }

  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (error) throw error;
    if (data.users.length === 0) break;
    for (const user of data.users) {
      const { error: deleteError } = await db.auth.admin.deleteUser(user.id);
      if (deleteError) throw deleteError;
    }
  }
}

/** Makes the stored portfolio index look older, to test the 10-minute expiry (FR-012). */
export async function ageSnapshot(minutes: number): Promise<string> {
  const readAt = new Date(Date.now() - minutes * 60_000).toISOString();
  const { data, error } = await adminClient().from("portfolio_snapshots").update({ read_at: readAt }).not("id", "is", null).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("there is no portfolio snapshot to age");
  return readAt;
}

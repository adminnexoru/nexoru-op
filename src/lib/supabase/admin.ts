import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import { getServerEnv } from "@/lib/env.server";

/**
 * Client with the secret key: bypasses RLS and can use the Auth Admin API.
 * Server-only (constitution principle II). Use it only for the operations listed in
 * contracts/actions.md as "service role".
 */
export function createAdminClient() {
  return createClient(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL, getServerEnv().SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

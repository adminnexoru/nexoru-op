// op:fingerprint — read-only fingerprint of the USE environment, to prove that running the
// test suite does not touch it (SC-012, quickstart scenario 8). It never writes anything.
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadOpsEnv } from "./ops-env";

async function main(): Promise<void> {
  const env = loadOpsEnv();
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: users, error: usersError } = await db.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (usersError) throw usersError;
  const accounts = [];
  for (const user of users.users) {
    const { data: factors } = await db.auth.admin.mfa.listFactors({ userId: user.id });
    accounts.push({ id: user.id, email: user.email, factors: (factors?.factors ?? []).map((f) => f.id).sort() });
  }

  const table = async (name: string, columns: string, order: string) => {
    const { data, error } = await db.from(name).select(columns).order(order);
    if (error) throw error;
    return data;
  };
  const snapshot = {
    accounts,
    profiles: await table("profiles", "id, email, role, status", "id"),
    recoveryCodes: await table("recovery_codes", "id, used_at", "id"),
    invitations: await table("invitations", "id, status", "id"),
    auditEvents: (await table("audit_events", "id", "id")).length,
  };

  const hash = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex").slice(0, 16);
  console.log(`Cuentas: ${accounts.length} · Códigos de recuperación: ${snapshot.recoveryCodes.length} · Eventos: ${snapshot.auditEvents}`);
  console.log(`Huella del entorno de uso: ${hash}`);
}

main().catch((error: unknown) => {
  console.error("op:fingerprint falló:", error instanceof Error ? error.message : error);
  process.exit(1);
});

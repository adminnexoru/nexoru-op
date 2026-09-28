// T063: creates the owner's single-use activation link and prints it in the terminal
// (FR-010, FR-036, research R4). No email is sent (FR-032).
// Run it in the VS Code integrated terminal:
//   npm run bootstrap:owner      → test environment (.env.local)
//   npm run op:bootstrap-owner   → use environment (.env.op.local)

import { assertTestEnv } from "./env-guard";
import { loadOpsEnv } from "./ops-env";
import { newToken, tokenHashParam } from "../src/lib/auth/token";
import { getServerEnv } from "../src/lib/env.server";
import { createAdminClient } from "../src/lib/supabase/admin";

const OWNER_EMAIL = "admin@nexoru.ai";
const LINK_LIFETIME_MS = 60 * 60 * 1000;

export type Environment = "test" | "ops";

/** Loads and checks the environment's variables before touching any database (FR-034). */
function prepareEnvironment(environment: Environment): void {
  if (environment === "ops") {
    loadOpsEnv();
    return;
  }
  // Local convenience: if the terminal has no Supabase variables at all, use .env.local.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      process.loadEnvFile(".env.local");
    } catch {
      // No .env.local: the guard below reports it.
    }
  }
  assertTestEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

async function bootstrapOwner(): Promise<number> {
  const admin = createAdminClient();

  const { data: owner, error: ownerError } = await admin.from("profiles").select("id").eq("role", "owner").maybeSingle();
  if (ownerError) throw ownerError;
  if (owner) {
    console.log("Ya existe un Dueño: no se crea ningún enlace de activación.");
    return 0;
  }

  // Only one valid link at a time: running the script again revokes the previous one.
  const { data: revoked, error: revokeError } = await admin
    .from("invitations")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("role", "owner")
    .eq("status", "pending")
    .select("id");
  if (revokeError) throw revokeError;
  await Promise.all(
    (revoked ?? []).map(() =>
      admin.rpc("log_audit_event", {
        p_action: "invitation_revoked",
        p_result: "success",
        p_attempted_email: OWNER_EMAIL,
        p_metadata: { email: OWNER_EMAIL, role: "owner" },
      }),
    ),
  );

  const token = newToken();
  const expiresAt = new Date(Date.now() + LINK_LIFETIME_MS);
  const { error: insertError } = await admin.from("invitations").insert({
    email: OWNER_EMAIL,
    role: "owner",
    token_hash: tokenHashParam(token),
    invited_by: null,
    expires_at: expiresAt.toISOString(),
  });
  if (insertError) throw insertError;

  await admin.rpc("log_audit_event", {
    p_action: "invitation_sent",
    p_result: "success",
    p_attempted_email: OWNER_EMAIL,
    p_metadata: { email: OWNER_EMAIL, role: "owner" },
  });

  const link = `${getServerEnv().APP_URL}/invite/${token}`;
  console.log("Enlace de activación de admin@nexoru.ai (un solo uso; caduca en 1 hora):");
  console.log(link);
  console.log("Ábrelo en el navegador de esta máquina. No lo compartas.");
  return 0;
}

/** Runs the script for one environment and exits with its status. */
export function runBootstrapOwner(environment: Environment): void {
  try {
    prepareEnvironment(environment);
  } catch (error) {
    console.error("bootstrap-owner falló:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
  bootstrapOwner().then(
    (code) => process.exit(code),
    (error: unknown) => {
      console.error("bootstrap-owner falló:", error instanceof Error ? error.message : error);
      process.exit(1);
    },
  );
}

// `npm run bootstrap:owner` → test environment.
if (process.argv[1]?.endsWith("bootstrap-owner.ts") && !process.argv[1].endsWith("op-bootstrap-owner.ts")) {
  runBootstrapOwner("test");
}

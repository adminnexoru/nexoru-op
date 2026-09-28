// T046: creates the owner's bootstrap invitation (FR-010) and emails the activation link.
// Run with `npm run bootstrap:owner` in the VS Code integrated terminal, with the variables
// of the target environment exported in that terminal session only (quickstart §6).

import { tokenHashParam, newToken } from "../src/lib/auth/token";
import { sendEmail } from "../src/lib/email/send";
import { createAdminClient } from "../src/lib/supabase/admin";
import { getServerEnv } from "../src/lib/env.server";

const OWNER_EMAIL = "admin@nexoru.ai";

async function main(): Promise<number> {
  const admin = createAdminClient();

  const { data: owner, error: ownerError } = await admin.from("profiles").select("id").eq("role", "owner").maybeSingle();
  if (ownerError) throw ownerError;
  if (owner) {
    console.log("Ya existe un Dueño: no se crea ninguna invitación.");
    return 0;
  }

  const { data: pending, error: pendingError } = await admin
    .from("invitations")
    .select("id")
    .eq("role", "owner")
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (pendingError) throw pendingError;
  if (pending) {
    console.log("Ya hay una invitación de Dueño pendiente: revisa el correo de admin@nexoru.ai.");
    return 0;
  }

  const token = newToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
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
  const sent = await sendEmail(OWNER_EMAIL, { name: "invitation", link, role: "owner", expiresAt });
  if (!sent) {
    console.error("La invitación se creó, pero el correo no se pudo enviar. Revisa la configuración SMTP.");
    return 1;
  }
  console.log("Invitación enviada a admin@nexoru.ai. Caduca en 7 días.");
  return 0;
}

// Local convenience only: if the terminal has no Supabase variables at all, use .env.local.
// If any variable is exported (production), nothing is loaded, so environments never mix.
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // No .env.local: getServerEnv() will report the missing variables.
  }
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error("bootstrap-owner falló:", error instanceof Error ? error.message : error);
    process.exit(1);
  },
);

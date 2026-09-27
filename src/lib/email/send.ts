import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getServerEnv } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderEmail, type EmailTemplate } from "./templates";

let transport: Transporter | undefined;

function getTransport() {
  if (!transport) {
    const env = getServerEnv();
    transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    });
  }
  return transport;
}

/**
 * Sends a transactional email. It never throws: a failed send must not block or revert the
 * action that triggered it (FR-031b). Failures are recorded as `email_failed` in the audit log.
 */
export async function sendEmail(
  to: string,
  template: EmailTemplate,
  context: { targetId?: string } = {},
): Promise<boolean> {
  try {
    const { subject, text, html } = renderEmail(template);
    await getTransport().sendMail({ from: getServerEnv().EMAIL_FROM, to, subject, text, html });
    return true;
  } catch (error) {
    console.error("Email send failed:", template.name, error instanceof Error ? error.message : "unknown error");
    try {
      await createAdminClient().rpc("log_audit_event", {
        p_action: "email_failed",
        p_result: "failure",
        p_target_id: context.targetId ?? null,
        p_attempted_email: context.targetId ? null : to,
        p_metadata: { template: template.name },
      });
    } catch {
      // Logging must not throw either; the console line above remains.
    }
    return false;
  }
}

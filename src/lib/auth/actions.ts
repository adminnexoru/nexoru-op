"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sendEmail } from "@/lib/email/send";
import { getClientIp } from "@/lib/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { authErrorMessage } from "./errors";
import { MESSAGES } from "./messages";
import { normalizeRecoveryCode } from "./recovery-code";

// Server actions of user story 1 (contracts/actions.md). Every attempt is checked against
// the email + IP lockout before touching Supabase Auth (FR-005), and every failure is recorded.

export type FormState = { error?: string };
export type EnrollState = { error?: string; recoveryCodes?: string[] };

type Factor = "password" | "totp" | "recovery_code";

// Set when a recovery code was used, so the next sign-in is logged with that method.
const RECOVERY_COOKIE = "nx_recovery_signin";

async function clientIpOrReject(email: string, factor: Factor): Promise<string | null> {
  const ip = getClientIp(await headers());
  if (!ip) {
    await createAdminClient().rpc("log_audit_event", {
      p_action: "sign_in_failed",
      p_result: "failure",
      p_attempted_email: email || null,
      p_metadata: { factor, reason: "untrusted_ip" },
    });
  }
  return ip;
}

async function isLocked(email: string, ip: string): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("is_locked", { p_email: email, p_ip: ip });
  if (error) throw new Error(`is_locked failed: ${error.message}`);
  return data === true;
}

/** Records a failure; returns the message to show (lock message when this failure locked it). */
async function recordFailure(email: string, ip: string, factor: Factor, message: string): Promise<string> {
  const { data: notify, error } = await createAdminClient().rpc("record_auth_failure", {
    p_email: email,
    p_ip: ip,
    p_factor: factor,
  });
  if (error) throw new Error(`record_auth_failure failed: ${error.message}`);
  if (notify === true) await sendEmail(email, { name: "notice_account_locked", at: new Date() });
  return (await isLocked(email, ip)) ? MESSAGES.locked : message;
}

async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

async function verifiedTotpFactorId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data } = await supabase.auth.mfa.listFactors();
  return data?.totp.find((f) => f.status === "verified")?.id ?? null;
}

const credentials = z.object({ email: z.email().max(254), password: z.string().min(1).max(200) });

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: MESSAGES.badCredentials };
  const email = parsed.data.email.toLowerCase();

  const ip = await clientIpOrReject(email, "password");
  if (!ip) return { error: MESSAGES.untrustedConnection };
  if (await isLocked(email, ip)) return { error: MESSAGES.locked };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
  if (error) return { error: await recordFailure(email, ip, "password", MESSAGES.badCredentials) };

  redirect((await verifiedTotpFactorId(supabase)) ? "/login/mfa" : "/mfa/enroll");
}

const totpCode = z.string().regex(/^\d{6}$/);

export async function verifyTotp(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await currentUser();
  if (!user?.email) redirect("/login");
  const email = user.email.toLowerCase();

  const ip = await clientIpOrReject(email, "totp");
  if (!ip) return { error: MESSAGES.untrustedConnection };
  if (await isLocked(email, ip)) return { error: MESSAGES.locked };

  const factorId = await verifiedTotpFactorId(supabase);
  if (!factorId) redirect("/mfa/enroll");

  const code = totpCode.safeParse(String(formData.get("code") ?? "").trim());
  const { error } = code.success
    ? await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.data })
    : { error: { code: "mfa_verification_failed" } };
  if (error) return { error: await recordFailure(email, ip, "totp", MESSAGES.badCode) };

  const { error: signInError } = await supabase.rpc("record_sign_in", { p_ip: ip, p_method: "totp" });
  if (signInError) throw new Error(`record_sign_in failed: ${signInError.message}`);
  redirect("/");
}

export async function redeemRecoveryCode(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await currentUser();
  if (!user?.email) redirect("/login");
  const email = user.email.toLowerCase();

  const ip = await clientIpOrReject(email, "recovery_code");
  if (!ip) return { error: MESSAGES.untrustedConnection };
  if (await isLocked(email, ip)) return { error: MESSAGES.locked };

  const code = normalizeRecoveryCode(String(formData.get("code") ?? ""));
  if (!code) return { error: await recordFailure(email, ip, "recovery_code", MESSAGES.badCode) };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_recovery_code", { p_user_id: user.id, p_code: code, p_ip: ip });
  if (error) throw new Error(`consume_recovery_code failed: ${error.message}`);
  const result = (Array.isArray(data) ? data[0] : data) as { accepted: boolean; notify_lock: boolean };

  if (!result.accepted) {
    if (result.notify_lock) await sendEmail(email, { name: "notice_account_locked", at: new Date() });
    return { error: (await isLocked(email, ip)) ? MESSAGES.locked : MESSAGES.badCode };
  }

  // The lost authenticator stops working; a new one is mandatory (FR-003a).
  const { data: factors, error: listError } = await admin.auth.admin.mfa.listFactors({ userId: user.id });
  if (listError) throw new Error(`listFactors failed: ${listError.message}`);
  for (const factor of factors.factors) {
    const { error: deleteError } = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: user.id });
    if (deleteError) {
      await admin.rpc("log_audit_event", {
        p_action: "auth_sync_failed",
        p_result: "failure",
        p_actor_id: user.id,
        p_target_id: user.id,
        p_metadata: { operation: "delete_factor" },
      });
      throw new Error(`deleteFactor failed: ${deleteError.message}`);
    }
  }

  await sendEmail(email, { name: "notice_recovery_code_used", at: new Date() }, { targetId: user.id });
  (await cookies()).set(RECOVERY_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 15 * 60 });
  redirect("/mfa/enroll");
}

/** Creates a fresh, unverified TOTP factor for the enrollment screen. */
export async function prepareTotpEnrollment(): Promise<{ factorId: string; qrCode: string; secret: string }> {
  const { supabase, user } = await currentUser();
  if (!user) redirect("/login");

  // Drop leftovers from abandoned enrollments so they do not pile up.
  const { data: existing } = await supabase.auth.mfa.listFactors();
  for (const factor of existing?.all ?? []) {
    if (factor.factor_type === "totp" && factor.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `Nexoru Op ${new Date().toISOString()}`,
    issuer: "Nexoru Op",
  });
  if (error) throw new Error(`mfa.enroll failed: ${error.message}`);
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export async function confirmTotp(_prev: EnrollState, formData: FormData): Promise<EnrollState> {
  const { supabase, user } = await currentUser();
  if (!user?.email) redirect("/login");
  const email = user.email.toLowerCase();

  const ip = await clientIpOrReject(email, "totp");
  if (!ip) return { error: MESSAGES.untrustedConnection };
  if (await isLocked(email, ip)) return { error: MESSAGES.locked };

  const factorId = String(formData.get("factorId") ?? "");
  const code = totpCode.safeParse(String(formData.get("code") ?? "").trim());
  const { error } = code.success
    ? await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.data })
    : { error: { code: "mfa_verification_failed" } };
  if (error) return { error: await recordFailure(email, ip, "totp", authErrorMessage(error)) };

  const { error: enrollError } = await supabase.rpc("complete_mfa_enrollment");
  if (enrollError) throw new Error(`complete_mfa_enrollment failed: ${enrollError.message}`);
  const { data: codes, error: codesError } = await supabase.rpc("regenerate_recovery_codes");
  if (codesError) throw new Error(`regenerate_recovery_codes failed: ${codesError.message}`);

  const cookieStore = await cookies();
  const method = cookieStore.get(RECOVERY_COOKIE) ? "recovery_code" : "totp";
  cookieStore.delete(RECOVERY_COOKIE);
  const { error: signInError } = await supabase.rpc("record_sign_in", { p_ip: ip, p_method: method });
  if (signInError) throw new Error(`record_sign_in failed: ${signInError.message}`);

  await sendEmail(email, { name: "notice_mfa_enrolled", at: new Date() }, { targetId: user.id });
  return { recoveryCodes: codes as string[] };
}

export async function regenerateRecoveryCodes(): Promise<EnrollState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("regenerate_recovery_codes");
  if (error) return { error: MESSAGES.unexpected };
  return { recoveryCodes: data as string[] };
}

async function endSession(reason: "manual" | "idle"): Promise<void> {
  const { supabase, user } = await currentUser();
  if (user) {
    await createAdminClient().rpc("log_audit_event", {
      p_action: reason === "idle" ? "session_expired" : "sign_out",
      p_result: "success",
      p_actor_id: user.id,
      p_target_id: user.id,
      p_ip: getClientIp(await headers()),
      p_metadata: reason === "idle" ? { reason: "idle" } : {},
    });
  }
  await supabase.auth.signOut({ scope: "local" });
}

/** Manual sign-out (FR-008). */
export async function signOut(): Promise<void> {
  await endSession("manual");
  redirect("/login");
}

/** Called by the client idle timer after 30 minutes without activity (FR-007). */
export async function signOutIdle(): Promise<void> {
  await endSession("idle");
  redirect("/login?reason=idle");
}

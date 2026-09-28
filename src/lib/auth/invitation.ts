"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { validatePassword } from "@/lib/password";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { MESSAGES } from "./messages";
import { tokenHashParam } from "./token";
import type { FormState } from "./actions";

type PendingInvitation = { id: string; email: string; role: string };

/** The pending, unexpired invitation behind a token, or null (FR-011, research R4). */
export async function findInvitation(token: string): Promise<PendingInvitation | null> {
  const { data, error } = await createAdminClient().rpc("invitation_for_token", { p_token_hash: tokenHashParam(token) });
  if (error) throw new Error(`invitation_for_token failed: ${error.message}`);
  return (data as PendingInvitation[])[0] ?? null;
}

const acceptSchema = z.object({
  token: z.string().min(20).max(200),
  fullName: z.string().trim().min(1).max(120),
  password: z.string().max(200),
  confirm: z.string().max(200),
});

export async function acceptInvitation(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = acceptSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: MESSAGES.invalidInvitation };
  const { token, fullName, password, confirm } = parsed.data;

  const invitation = await findInvitation(token);
  if (!invitation) return { error: MESSAGES.invalidInvitation };
  if (password !== confirm) return { error: MESSAGES.passwordMismatch };
  if (!(await validatePassword(password)).ok) return { error: MESSAGES.weakPassword };

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) return { error: MESSAGES.invalidInvitation };

  const { error: acceptError } = await admin.rpc("accept_invitation", {
    p_token_hash: tokenHashParam(token),
    p_user_id: created.user.id,
    p_full_name: fullName,
  });
  if (acceptError) {
    // Without a profile the account is unusable: remove it so the invitation can be retried.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: MESSAGES.invalidInvitation };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: invitation.email, password });
  if (signInError) redirect("/login");
  redirect("/mfa/enroll");
}

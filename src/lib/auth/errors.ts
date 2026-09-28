import { MESSAGES } from "./messages";

// Supabase Auth error codes arrive in English; map them to Spanish (FR-031).
// Credential-related codes map to the same generic message (FR-006).
const BY_CODE: Record<string, string> = {
  invalid_credentials: MESSAGES.badCredentials,
  email_not_confirmed: MESSAGES.badCredentials,
  user_banned: MESSAGES.badCredentials,
  user_not_found: MESSAGES.badCredentials,
  mfa_verification_failed: MESSAGES.badCode,
  mfa_challenge_expired: MESSAGES.badCode,
  mfa_factor_not_found: MESSAGES.badCode,
  weak_password: MESSAGES.weakPassword,
  over_request_rate_limit: MESSAGES.locked,
  over_email_send_rate_limit: MESSAGES.locked,
};

export function authErrorMessage(error: { code?: string } | null | undefined): string {
  return (error?.code && BY_CODE[error.code]) || MESSAGES.unexpected;
}

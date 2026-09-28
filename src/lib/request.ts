import { isIP } from "node:net";

export const LOCAL_FALLBACK_IP = "0.0.0.0";

/** Header set by Vercel with the client IP; clients cannot forge it (research R5). */
const TRUSTED_IP_HEADER = "x-vercel-forwarded-for";

/**
 * Client IP for the email + IP lockout and the audit log (FR-005, SC-011).
 *
 * The IP comes only from `x-vercel-forwarded-for`, which Vercel sets on every request.
 * `X-Forwarded-For` and `x-real-ip` are ignored on purpose: they are what a client would forge.
 * This rule is only valid behind Vercel; if the app moves elsewhere it must be revisited.
 *
 * Without a trusted IP: outside Vercel (local development and tests) it returns 0.0.0.0;
 * on Vercel it returns null and the caller must reject the attempt.
 */
export function getClientIp(
  headers: Headers,
  { onVercel = process.env.VERCEL === "1" }: { onVercel?: boolean } = {},
): string | null {
  const candidate = headers.get(TRUSTED_IP_HEADER)?.split(",")[0]?.trim() ?? "";
  if (isIP(candidate)) return candidate;

  if (onVercel) {
    console.warn(`Trusted client IP header ${TRUSTED_IP_HEADER} missing or invalid on Vercel`);
    return null;
  }
  console.warn(`Trusted client IP header missing; using ${LOCAL_FALLBACK_IP} (local only)`);
  return LOCAL_FALLBACK_IP;
}

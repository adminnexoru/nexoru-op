import { isIP } from "node:net";

export const UNKNOWN_IP = "0.0.0.0";

/**
 * Client IP for the email + IP lockout and the audit log (research R5).
 *
 * Only valid behind Vercel: Vercel sets `x-real-ip` and rewrites `x-forwarded-for`, so the
 * browser cannot spoof them. If the app ever moves off Vercel, this rule must be revisited.
 * When no valid IP is present it returns 0.0.0.0 (all such attempts share one counter).
 */
export function getClientIp(headers: Headers): string {
  const candidate =
    headers.get("x-real-ip")?.trim() || headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";

  if (isIP(candidate)) return candidate;

  console.warn("Client IP header missing or invalid; using 0.0.0.0");
  return UNKNOWN_IP;
}

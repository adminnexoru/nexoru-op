import { createHash } from "node:crypto";

export const MIN_PASSWORD_LENGTH = 12;

export type PasswordCheck = { ok: true } | { ok: false; reason: "too_short" | "pwned" };

/**
 * Password policy (FR-004, research R9): at least 12 characters and not present in Have I Been
 * Pwned. Only the first 5 hex characters of the SHA-1 hash leave the server (k-anonymity).
 * If HIBP is unreachable the check fails open, so an outage there never blocks sign-in flows.
 */
export async function validatePassword(password: string): Promise<PasswordCheck> {
  if (password.length < MIN_PASSWORD_LENGTH) return { ok: false, reason: "too_short" };

  const hash = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error(`HIBP responded ${response.status}`);
    const body = await response.text();
    const pwned = body.split("\n").some((line) => {
      const [candidate, count] = line.trim().split(":");
      return candidate === suffix && Number(count) > 0;
    });
    return pwned ? { ok: false, reason: "pwned" } : { ok: true };
  } catch (error) {
    console.warn("HIBP check skipped:", error instanceof Error ? error.message : "unknown error");
    return { ok: true };
  }
}

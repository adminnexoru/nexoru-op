/** Alphabet of recovery codes: no 0/O, 1/I/L (research R7). Must match regenerate_recovery_codes(). */
export const RECOVERY_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const LENGTH = 10;
const VALID = new RegExp(`^[${RECOVERY_CODE_ALPHABET}]{${LENGTH}}$`);

/** Uppercases and strips spaces and dashes; returns null when it cannot be a recovery code. */
export function normalizeRecoveryCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, "");
  return VALID.test(code) ? code : null;
}

/** "ABCDE23456" → "ABCDE-23456", easier to read and copy. */
export function formatRecoveryCode(code: string): string {
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

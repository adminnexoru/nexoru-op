// T038: recovery code format (FR-003, research R7).
import { describe, expect, it } from "vitest";
import { RECOVERY_CODE_ALPHABET, formatRecoveryCode, normalizeRecoveryCode } from "@/lib/auth/recovery-code";

describe("recovery codes", () => {
  it("uses an alphabet without ambiguous characters", () => {
    for (const ambiguous of ["0", "O", "1", "I", "L"]) expect(RECOVERY_CODE_ALPHABET).not.toContain(ambiguous);
  });

  it("formats a code as two groups of five", () => {
    expect(formatRecoveryCode("ABCDE23456")).toBe("ABCDE-23456");
  });

  it("normalizes case, dashes and spaces", () => {
    expect(normalizeRecoveryCode(" abcde-23456 ")).toBe("ABCDE23456");
    expect(normalizeRecoveryCode("abcde 23456")).toBe("ABCDE23456");
  });

  it("rejects codes of the wrong length or with characters outside the alphabet", () => {
    expect(normalizeRecoveryCode("ABCDE2345")).toBeNull();
    expect(normalizeRecoveryCode("ABCDE234567")).toBeNull();
    expect(normalizeRecoveryCode("ABCDE2345O")).toBeNull();
    expect(normalizeRecoveryCode("")).toBeNull();
  });
});

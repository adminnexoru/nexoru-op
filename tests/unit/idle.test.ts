// T037: 30-minute inactivity limit used by the client timer (FR-007, research R6).
import { describe, expect, it } from "vitest";
import { IDLE_TIMEOUT_MS, isIdleExpired } from "@/lib/auth/idle";

const minute = 60_000;
const start = new Date("2026-09-28T10:00:00Z").getTime();

describe("isIdleExpired", () => {
  it("uses a 30-minute limit", () => {
    expect(IDLE_TIMEOUT_MS).toBe(30 * minute);
  });

  it("is not expired before 30 minutes", () => {
    expect(isIdleExpired(start, start + 30 * minute - 1)).toBe(false);
  });

  it("is expired at exactly 30 minutes", () => {
    expect(isIdleExpired(start, start + 30 * minute)).toBe(true);
  });

  it("accepts Date values", () => {
    expect(isIdleExpired(new Date(start), new Date(start + 31 * minute))).toBe(true);
  });
});

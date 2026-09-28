// T019 (updated 2026-09-28): client IP only from the header Vercel sets (research R5, SC-011).
import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientIp } from "@/lib/request";

afterEach(() => vi.restoreAllMocks());

const onVercel = { onVercel: true };
const local = { onVercel: false };

describe("getClientIp", () => {
  it("takes the IP from x-vercel-forwarded-for", () => {
    expect(getClientIp(new Headers({ "x-vercel-forwarded-for": "192.0.2.1" }), onVercel)).toBe("192.0.2.1");
    expect(getClientIp(new Headers({ "x-vercel-forwarded-for": "2001:db8::1" }), local)).toBe("2001:db8::1");
  });

  it("ignores X-Forwarded-For and x-real-ip, which a client could forge", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "192.0.2.1",
      "x-forwarded-for": "203.0.113.9",
      "x-real-ip": "203.0.113.10",
    });
    expect(getClientIp(headers, onVercel)).toBe("192.0.2.1");
  });

  it("never falls back to X-Forwarded-For or x-real-ip when the trusted header is missing", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const forged = new Headers({ "x-forwarded-for": "203.0.113.9", "x-real-ip": "203.0.113.10" });
    expect(getClientIp(forged, local)).toBe("0.0.0.0");
    expect(getClientIp(forged, onVercel)).toBeNull();
  });

  it("outside Vercel, without a trusted IP, uses 0.0.0.0 and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(getClientIp(new Headers(), local)).toBe("0.0.0.0");
    expect(warn).toHaveBeenCalledOnce();
  });

  it("on Vercel, without a trusted IP, returns null so the attempt is rejected", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(getClientIp(new Headers(), onVercel)).toBeNull();
    expect(getClientIp(new Headers({ "x-vercel-forwarded-for": "not-an-ip" }), onVercel)).toBeNull();
  });

  it("detects Vercel from the VERCEL environment variable by default", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("VERCEL", "1");
    expect(getClientIp(new Headers())).toBeNull();
    vi.stubEnv("VERCEL", "");
    expect(getClientIp(new Headers())).toBe("0.0.0.0");
    vi.unstubAllEnvs();
  });
});

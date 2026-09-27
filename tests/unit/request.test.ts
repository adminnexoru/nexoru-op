// T019: client IP from Vercel headers, with the 0.0.0.0 fallback (research R5).
import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientIp } from "@/lib/request";

afterEach(() => vi.restoreAllMocks());

describe("getClientIp", () => {
  it("prefers x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": "192.0.2.1", "x-forwarded-for": "198.51.100.7, 192.0.2.99" });
    expect(getClientIp(headers)).toBe("192.0.2.1");
  });

  it("falls back to the first x-forwarded-for value", () => {
    const headers = new Headers({ "x-forwarded-for": " 198.51.100.7 , 192.0.2.99" });
    expect(getClientIp(headers)).toBe("198.51.100.7");
  });

  it("accepts IPv6 addresses", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "2001:db8::1" }))).toBe("2001:db8::1");
  });

  it("returns 0.0.0.0 and warns when there is no IP header", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(getClientIp(new Headers())).toBe("0.0.0.0");
    expect(warn).toHaveBeenCalledOnce();
  });

  it("returns 0.0.0.0 when the header is not a valid IP", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(getClientIp(new Headers({ "x-real-ip": "not-an-ip" }))).toBe("0.0.0.0");
    expect(getClientIp(new Headers({ "x-forwarded-for": "evil<script>" }))).toBe("0.0.0.0");
  });
});

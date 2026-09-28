// T018: password policy (FR-004, research R9).
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validatePassword } from "@/lib/password";

const sha1 = (value: string) => createHash("sha1").update(value).digest("hex").toUpperCase();

function mockHibp(body: string, ok = true) {
  const fetchMock = vi.fn<(input: string) => Promise<Response>>(async () => new Response(body, { status: ok ? 200 : 503 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("validatePassword", () => {
  it("rejects passwords shorter than 12 characters without calling HIBP", async () => {
    const fetchMock = mockHibp("");
    await expect(validatePassword("corta-11ch!")).resolves.toEqual({ ok: false, reason: "too_short" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends only the first 5 characters of the SHA-1 hash and rejects a pwned password", async () => {
    const password = "contraseña-filtrada-123";
    const hash = sha1(password);
    const fetchMock = mockHibp(`0000000000000000000000000000000000A:2\r\n${hash.slice(5)}:57\r\n`);

    await expect(validatePassword(password)).resolves.toEqual({ ok: false, reason: "pwned" });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toBe(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`);
    expect(url).not.toContain(hash.slice(5));
    expect(url).not.toContain(password);
  });

  it("accepts a long password that is not in the HIBP response", async () => {
    mockHibp("0000000000000000000000000000000000A:2\r\n");
    await expect(validatePassword("una-contraseña-larga-y-única")).resolves.toEqual({ ok: true });
  });

  it("fails open when HIBP does not respond, and logs a warning without the password", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const password = "otra-contraseña-larga-segura";

    await expect(validatePassword(password)).resolves.toEqual({ ok: true });
    expect(warn).toHaveBeenCalled();
    expect(JSON.stringify(warn.mock.calls)).not.toContain(password);
  });
});

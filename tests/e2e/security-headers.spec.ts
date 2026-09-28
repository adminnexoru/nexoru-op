// T040: security headers on every response (research R12).
import { expect, test, type APIResponse } from "@playwright/test";

function expectSecurityHeaders(response: APIResponse) {
  const headers = response.headers();
  expect(headers["strict-transport-security"]).toBe("max-age=63072000; includeSubDomains");
  const csp = headers["content-security-policy"] ?? "";
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
}

test.describe("security headers", () => {
  test("on the login page", async ({ request }) => {
    const response = await request.get("/login");
    expect(response.status()).toBe(200);
    expectSecurityHeaders(response);
  });

  test("on an invalid invitation page", async ({ request }) => {
    const response = await request.get("/invite/token-que-no-existe");
    expectSecurityHeaders(response);
  });

  test("on the redirect from a protected route without a session", async ({ request }) => {
    const response = await request.get("/", { maxRedirects: 0 });
    expect([302, 303, 307, 308]).toContain(response.status());
    expect(response.headers()["location"]).toContain("/login");
    expectSecurityHeaders(response);
  });
});

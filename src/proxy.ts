import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// T049: runs before every page, Server Function and redirect (contracts/actions.md).
// 1. Builds a per-request CSP with a nonce (research R12).
// 2. Refreshes the Supabase session.
// 3. AAL1 → second-factor screens only; AAL2 → check_session() on every request.

const PUBLIC_PATHS = [/^\/login$/, /^\/forgot-password$/, /^\/invite\/[^/]+$/, /^\/auth\//];
const MFA_PATHS = [/^\/login\/mfa$/, /^\/login\/recovery-code$/];
const ENROLL_PATH = /^\/mfa\/enroll$/;

// Static security headers also sent by next.config.ts; set here on redirects, which the proxy
// answers itself.
const STATIC_SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function buildCsp(nonce: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    // data: only for the TOTP QR code returned by Supabase (mfa.enroll).
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${supabaseUrl}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  // Next.js reads the nonce from the request's CSP header and applies it to its scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const next = () => {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", csp);
    return response;
  };
  let response = next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          requestHeaders.set("cookie", request.cookies.toString());
          response = next();
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  const redirectTo = (pathname: string) => {
    const redirect = NextResponse.redirect(new URL(pathname, request.url));
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    redirect.headers.set("Content-Security-Policy", csp);
    for (const [name, value] of Object.entries(STATIC_SECURITY_HEADERS)) redirect.headers.set(name, value);
    return redirect;
  };

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => p.test(path));
  const isMfaStep = MFA_PATHS.some((p) => p.test(path));
  const isEnroll = ENROLL_PATH.test(path);

  // Validates the JWT (refreshing it if needed).
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    return isPublic ? response : redirectTo("/login");
  }

  if (claims.aal !== "aal2") {
    // Password verified, second factor pending: only the second-factor screens (FR-001, FR-002).
    if (isPublic) return response;
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const hasVerifiedTotp = factors?.totp.some((f) => f.status === "verified") ?? false;
    if (hasVerifiedTotp) return isMfaStep ? response : redirectTo("/login/mfa");
    return isEnroll ? response : redirectTo("/mfa/enroll");
  }

  // Full session. The enrollment screen stays reachable while it shows the recovery codes.
  if (isMfaStep || path === "/login") return redirectTo("/");

  const { data: state, error } = await supabase.rpc("check_session");
  if (error || state !== "ok") {
    const reason = error ? "idle" : String(state);
    await supabase.auth.signOut({ scope: "local" });
    return redirectTo(`/login?reason=${encodeURIComponent(reason)}`);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimization.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

// T002: where the GitHub client may send requests (contracts/github-client.md, research R7).
// The real API in the use environment; in the test environment only the fake GitHub on 127.0.0.1,
// so no test can reach the real GitHub. Pure: no network, no process.env.

export const GITHUB_API_ORIGIN = "https://api.github.com";
const TEST_SUPABASE_PORT = "54321";
const FAKE_ORIGIN = /^http:\/\/127\.0\.0\.1:\d{2,5}$/;

function isTestEnvironment(supabaseUrl: string | undefined): boolean {
  try {
    const url = new URL(supabaseUrl ?? "");
    return url.hostname === "127.0.0.1" && url.port === TEST_SUPABASE_PORT;
  } catch {
    return false;
  }
}

export function resolveGithubApiOrigin({ supabaseUrl, override }: { supabaseUrl: string | undefined; override: string | undefined }): string {
  const test = isTestEnvironment(supabaseUrl);
  if (!override) {
    if (test) throw new Error("En el entorno de pruebas no se consulta el GitHub real: falta GITHUB_API_ORIGIN del GitHub simulado.");
    return GITHUB_API_ORIGIN;
  }
  if (!test) throw new Error("GITHUB_API_ORIGIN no se permite en el entorno de uso: solo existe para las pruebas.");
  if (!FAKE_ORIGIN.test(override)) throw new Error("GITHUB_API_ORIGIN solo puede ser el GitHub simulado en http://127.0.0.1:<puerto>.");
  return override;
}

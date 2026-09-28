// Guards that keep the TEST and USE environments apart (FR-034, research R13).
// Tests refuse to touch the use instance; op:* scripts refuse to touch the test instance.

const TEST_API_PORT = "54321";
const USE_API_PORT = "55321";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

function parseLocal(url: string | undefined): URL {
  if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL: no se sabe a qué instancia de Supabase conectar.");
  const parsed = new URL(url);
  if (!LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(`${url} no es una URL local: Nexoru Op solo usa Supabase en esta máquina.`);
  }
  return parsed;
}

/** For tests and development: only the test instance (port 54321). */
export function assertTestEnv(url: string | undefined): void {
  const { port } = parseLocal(url);
  if (port === USE_API_PORT) {
    throw new Error("Las pruebas apuntan al entorno de uso del Dueño (puerto 55321). Usa .env.local, no .env.op.local.");
  }
  if (port !== TEST_API_PORT) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL usa el puerto ${port || "(ninguno)"}, pero las pruebas solo pueden usar la API de ` +
        `la instancia de pruebas (http://127.0.0.1:${TEST_API_PORT}).`,
    );
  }
}

/** For op:* scripts: only the use instance (port 55321). */
export function assertOpsEnv(url: string | undefined): void {
  const { port } = parseLocal(url);
  if (port === TEST_API_PORT) {
    throw new Error("Los scripts op:* apuntan a la instancia de pruebas (puerto 54321). Revisa .env.op.local.");
  }
  if (port !== USE_API_PORT) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL usa el puerto ${port || "(ninguno)"}, pero los scripts op:* solo pueden usar la API ` +
        `del entorno de uso (http://127.0.0.1:${USE_API_PORT}). Ojo: 55323 es Studio, no la API.`,
    );
  }
}

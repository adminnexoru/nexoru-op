// op:start — starts the owner's USE environment (FR-033, FR-035, research R14):
// Supabase (ops/) on a 127.0.0.1-only network, pending migrations, and the app on
// http://127.0.0.1:3200 in the background (PID and log in .op/).
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, openSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { OPS_APP_PORT, OPS_APP_URL, OPS_DIST_DIR, OPS_NETWORK, OPS_STATE_DIR, loadOpsEnv } from "./ops-env";
import { ensureLocalOnlyNetwork } from "./supabase-network";

function run(command: string, args: string[], env: NodeJS.ProcessEnv = process.env): void {
  execFileSync(command, args, { stdio: "inherit", env });
}

function assertPortFree(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", () => reject(new Error(`El puerto ${port} está ocupado. ¿Ya está en marcha? Usa npm run op:stop.`)));
    server.listen(port, "127.0.0.1", () => server.close(() => resolve()));
  });
}

async function waitForApp(url: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`La app no respondió en ${url}. Revisa ${join(OPS_STATE_DIR, "app.log")}.`);
}

async function main(): Promise<void> {
  // Supabase first: on the very first run the owner reads its keys with `supabase status`.
  ensureLocalOnlyNetwork(OPS_NETWORK);
  run("npx", ["supabase", "start", "--workdir", "ops"]);
  run("npx", ["supabase", "migration", "up", "--workdir", "ops", "--local"]);

  const env = { ...loadOpsEnv(), NEXT_DIST_DIR: OPS_DIST_DIR };
  await assertPortFree(OPS_APP_PORT);
  run("npx", ["next", "build"], env);

  mkdirSync(OPS_STATE_DIR, { recursive: true });
  const log = openSync(join(OPS_STATE_DIR, "app.log"), "a");
  const app = spawn("npx", ["next", "start", "-H", "127.0.0.1", "-p", String(OPS_APP_PORT)], {
    env,
    detached: true,
    stdio: ["ignore", log, log],
  });
  if (!app.pid) throw new Error("No se pudo lanzar la app.");
  writeFileSync(join(OPS_STATE_DIR, "app.pid"), String(app.pid));
  app.unref();

  await waitForApp(`${OPS_APP_URL}/login`);
  console.log(`Nexoru Op en marcha: ${OPS_APP_URL} (solo en esta máquina). Para detenerlo: npm run op:stop`);
}

main().catch((error: unknown) => {
  console.error("op:start falló:", error instanceof Error ? error.message : error);
  process.exit(1);
});

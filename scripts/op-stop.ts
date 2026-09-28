// op:stop — stops the app and the USE Supabase instance without deleting data (FR-035).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { OPS_STATE_DIR } from "./ops-env";

const pidFile = join(OPS_STATE_DIR, "app.pid");

if (existsSync(pidFile)) {
  const pid = Number(readFileSync(pidFile, "utf8"));
  try {
    // The app was started detached, in its own process group.
    process.kill(-pid, "SIGTERM");
    console.log("App detenida.");
  } catch {
    console.log("La app ya no estaba en marcha.");
  }
  rmSync(pidFile);
} else {
  console.log("No hay registro de la app en marcha.");
}

// Without --no-backup: the database volume (account and audit log) is kept.
execFileSync("npx", ["supabase", "stop", "--workdir", "ops"], { stdio: "inherit" });

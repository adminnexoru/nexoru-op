// Loads the USE environment (.env.op.local) for op:* scripts (research R13, R14).
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { assertOpsEnv } from "./env-guard";

export const OPS_ENV_FILE = ".env.op.local";
export const OPS_NETWORK = "supabase_network_nexoru-op-live";
export const OPS_APP_URL = "http://127.0.0.1:3200";
export const OPS_APP_PORT = 3200;
export const OPS_DIST_DIR = ".next-op";
export const OPS_STATE_DIR = ".op";

const REQUIRED = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY", "APP_URL"] as const;

/**
 * Reads .env.op.local and applies it over process.env, so a test value exported in the shell
 * can never leak into the use environment. Returns the resulting environment.
 */
export function loadOpsEnv(): NodeJS.ProcessEnv {
  if (!existsSync(OPS_ENV_FILE)) {
    throw new Error(`Falta ${OPS_ENV_FILE}. Créalo a partir de .env.example (quickstart, Parte 1 §2).`);
  }
  const values = parseEnv(readFileSync(OPS_ENV_FILE, "utf8"));
  const missing = REQUIRED.filter((key) => !values[key]);
  if (missing.length > 0) throw new Error(`Faltan en ${OPS_ENV_FILE}: ${missing.join(", ")}.`);
  assertOpsEnv(values.NEXT_PUBLIC_SUPABASE_URL);
  if (values.APP_URL !== OPS_APP_URL) throw new Error(`APP_URL de ${OPS_ENV_FILE} debe ser ${OPS_APP_URL}.`);
  Object.assign(process.env, values);
  return process.env;
}

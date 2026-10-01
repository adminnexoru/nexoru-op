import "server-only";
import { z } from "zod";

// Server-only variables (constitution principle II): never imported from client components.
const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  APP_URL: z.url(),
  // Portfolio folder (constitution XIII). Optional: without it the dashboard explains what is
  // missing; the reader validates that it is an absolute path to a directory.
  PROJECTS_ROOT: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

export function getServerEnv(): ServerEnv {
  return serverSchema.parse(process.env);
}

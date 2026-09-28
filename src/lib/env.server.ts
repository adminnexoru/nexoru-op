import "server-only";
import { z } from "zod";

// Server-only variables (constitution principle II): never imported from client components.
const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  APP_URL: z.url(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

export function getServerEnv(): ServerEnv {
  return serverSchema.parse(process.env);
}

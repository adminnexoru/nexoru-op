import "server-only";
import { z } from "zod";

// Server-only variables (constitution principle II): never imported from client components.
const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  APP_URL: z.url(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  EMAIL_FROM: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverSchema>;

export function getServerEnv(): ServerEnv {
  return serverSchema.parse(process.env);
}

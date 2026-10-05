import "server-only";
import { z } from "zod";
import { resolveGithubApiOrigin } from "@/lib/github/origin";

// Server-only variables (constitution principle II): never imported from client components.
const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  APP_URL: z.url(),
  // Portfolio folder (constitution XIII). Optional: without it the dashboard explains what is
  // missing; the reader validates that it is an absolute path to a directory.
  PROJECTS_ROOT: z.string().optional(),
  // Optional fine-grained, read-only GitHub token (constitution II v2.0.1): only in .env.op.local.
  // Never sent to the browser, logged or stored (specs/004-github-readonly contracts/github-client.md).
  GITHUB_TOKEN: z.string().optional(),
  // Fake GitHub for E2E tests only; resolveGithubApiOrigin rejects it in the use environment.
  GITHUB_API_ORIGIN: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
}).superRefine((env, ctx) => {
  // The use environment refuses to work with GITHUB_API_ORIGIN (research R7).
  if (!env.GITHUB_API_ORIGIN) return;
  try {
    resolveGithubApiOrigin({ supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL, override: env.GITHUB_API_ORIGIN });
  } catch (error) {
    ctx.addIssue({ code: "custom", path: ["GITHUB_API_ORIGIN"], message: error instanceof Error ? error.message : "GITHUB_API_ORIGIN no válido" });
  }
});

export type ServerEnv = z.infer<typeof serverSchema>;

export function getServerEnv(): ServerEnv {
  return serverSchema.parse(process.env);
}

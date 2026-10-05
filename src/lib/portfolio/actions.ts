"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { refreshSnapshot } from "./snapshot";

// T035: the "Actualizar" button (contracts/ui.md). No parameters: the client cannot choose what
// is read. The database function also requires the owner with aal2.

export type RefreshState = { error?: string };

export async function refreshPortfolio(): Promise<RefreshState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims.aal !== "aal2") return { error: "Tu sesión no es válida. Vuelve a iniciar sesión." };
  try {
    await refreshSnapshot("withGitHub");
  } catch (error) {
    // FR-029: no file contents in logs, only the error name.
    console.error("refreshPortfolio failed:", error instanceof Error ? error.message : "unknown error");
    return { error: "No se pudo actualizar el portafolio. Inténtalo de nuevo." };
  }
  revalidatePath("/");
  return {};
}

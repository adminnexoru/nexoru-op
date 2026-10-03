import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { IdleTimer } from "@/components/idle-timer";
import { signOut } from "@/lib/auth/actions";
import { roleLabel, type Role } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

// Second barrier after src/proxy.ts: nothing renders without aal2 and an active account.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims.aal !== "aal2") redirect("/login");

  const { data: active } = await supabase.rpc("is_active_user");
  if (active !== true) redirect("/login?reason=inactive_user");

  const [{ data: role }, { data: remaining }, { data: profile }] = await Promise.all([
    supabase.rpc("current_user_role"),
    supabase.rpc("remaining_recovery_codes"),
    supabase.from("profiles").select("full_name").eq("id", data.claims.sub).single(),
  ]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <IdleTimer />
      <header className="border-b">
        <div className="flex w-full items-center gap-6 px-6 py-3">
          <Link href="/" className="font-semibold text-foreground">
            Nexoru Op
          </Link>
          <nav className="flex flex-1 gap-4 text-sm">
            <Link href="/" className="text-foreground">Portafolio</Link>
            <Link href="/account" className="text-foreground">Mi cuenta</Link>
          </nav>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {profile?.full_name} · {role ? roleLabel(role as Role) : ""}
          </span>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </header>
      {/* Full width for tables and charts; long text limits itself (max-w-prose). */}
      <main className="w-full min-w-0 flex-1 px-6 py-6">
        {typeof remaining === "number" && remaining <= 2 ? (
          <Alert className="mb-6">
            <AlertDescription>
              Te quedan {remaining} códigos de recuperación. <Link href="/account" className="underline">Regenera tus códigos</Link> para no quedarte sin forma de recuperar el acceso.
            </AlertDescription>
          </Alert>
        ) : null}
        {children}
      </main>
    </div>
  );
}

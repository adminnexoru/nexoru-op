import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecoveryCodesPanel } from "@/components/app/recovery-codes-panel";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const { data: remaining } = await (await createClient()).rpc("remaining_recovery_codes");
  return (
    <section className="grid gap-6">
      <h1 className="text-2xl font-semibold">Mi cuenta</h1>
      <Card>
        <CardHeader>
          <CardTitle>Códigos de recuperación</CardTitle>
          <CardDescription>Sirven para entrar si pierdes tu app autenticadora (FR-003).</CardDescription>
        </CardHeader>
        <CardContent>
          <RecoveryCodesPanel remaining={typeof remaining === "number" ? remaining : 0} />
        </CardContent>
      </Card>
    </section>
  );
}

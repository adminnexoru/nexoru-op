import { AuthCard } from "@/components/auth/auth-card";
import { EnrollForm } from "@/components/auth/enroll-form";
import { prepareTotpEnrollment } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";

export default async function EnrollPage() {
  // With a full (aal2) session this page only shows the recovery codes that the form just
  // received; it must never start another enrollment (the page re-renders when cookies change).
  const { data } = await (await createClient()).auth.getClaims();
  const enrollment = data?.claims.aal === "aal2" ? null : await prepareTotpEnrollment();

  return (
    <AuthCard title="Registra tu app autenticadora" description="El segundo factor es obligatorio para entrar a Nexoru Op.">
      <EnrollForm enrollment={enrollment} />
    </AuthCard>
  );
}

import { AuthCard } from "@/components/auth/auth-card";
import { TotpForm } from "@/components/auth/totp-form";

export default function MfaPage() {
  return (
    <AuthCard title="Segundo factor" description="Introduce el código que muestra tu app autenticadora.">
      <TotpForm />
    </AuthCard>
  );
}

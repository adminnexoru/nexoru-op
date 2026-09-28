import { AuthCard } from "@/components/auth/auth-card";
import { RecoveryCodeForm } from "@/components/auth/recovery-code-form";

export default function RecoveryCodePage() {
  return (
    <AuthCard
      title="Código de recuperación"
      description="Úsalo si perdiste tu app autenticadora. Después tendrás que registrar una nueva."
    >
      <RecoveryCodeForm />
    </AuthCard>
  );
}

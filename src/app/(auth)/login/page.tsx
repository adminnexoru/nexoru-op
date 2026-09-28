import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { SESSION_REASONS } from "@/lib/auth/messages";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { reason } = await searchParams;
  const notice = typeof reason === "string" ? SESSION_REASONS[reason] : undefined;
  return (
    <AuthCard title="Iniciar sesión">
      <div className="grid gap-4">
        {notice ? (
          <Alert>
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ) : null}
        <LoginForm />
      </div>
    </AuthCard>
  );
}

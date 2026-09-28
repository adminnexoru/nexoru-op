"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyTotp, type FormState } from "@/lib/auth/actions";
import { FormError } from "./form-error";

export function TotpForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(verifyTotp, {});
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="code">Código de 6 dígitos</Label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
        />
      </div>
      <FormError message={state.error} />
      <Button type="submit" disabled={pending}>
        Verificar
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login/recovery-code" className="underline underline-offset-4">
          Usar un código de recuperación
        </Link>
      </p>
    </form>
  );
}

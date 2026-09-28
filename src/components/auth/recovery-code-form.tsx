"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redeemRecoveryCode, type FormState } from "@/lib/auth/actions";
import { FormError } from "./form-error";

export function RecoveryCodeForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(redeemRecoveryCode, {});
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="code">Código de recuperación</Label>
        <Input id="code" name="code" autoComplete="off" spellCheck={false} placeholder="XXXXX-XXXXX" required autoFocus />
      </div>
      <FormError message={state.error} />
      <Button type="submit" disabled={pending}>
        Continuar
      </Button>
    </form>
  );
}

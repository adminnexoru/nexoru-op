"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { RecoveryCodesList } from "@/components/auth/recovery-codes-list";
import { FormError } from "@/components/auth/form-error";
import { regenerateRecoveryCodes, type EnrollState } from "@/lib/auth/actions";

export function RecoveryCodesPanel({ remaining }: { remaining: number }) {
  const [state, action, pending] = useActionState<EnrollState, FormData>(() => regenerateRecoveryCodes(), {});

  if (state.recoveryCodes) {
    return (
      <div className="grid gap-3">
        <p className="text-sm">Estos son tus códigos nuevos. Los anteriores ya no sirven. No se volverán a mostrar.</p>
        <RecoveryCodesList codes={state.recoveryCodes} />
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-3">
      <p className="text-sm">
        Te quedan <strong>{remaining}</strong> códigos de recuperación sin usar.
      </p>
      <FormError message={state.error} />
      <Button type="submit" variant="outline" disabled={pending} className="justify-self-start">
        Regenerar códigos
      </Button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/auth/actions";
import { acceptInvitation } from "@/lib/auth/invitation";
import { FormError } from "./form-error";

export function AcceptInvitationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(acceptInvitation, {});
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <div className="grid gap-2">
        <Label htmlFor="fullName">Nombre completo</Label>
        <Input id="fullName" name="fullName" autoComplete="name" maxLength={120} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required />
        <p className="text-xs text-muted-foreground">Al menos 12 caracteres.</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm">Confirma la contraseña</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={12} required />
      </div>
      <FormError message={state.error} />
      <Button type="submit" disabled={pending}>
        Activar cuenta
      </Button>
    </form>
  );
}

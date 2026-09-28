"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmTotp, type EnrollState } from "@/lib/auth/actions";
import { FormError } from "./form-error";
import { RecoveryCodesList } from "./recovery-codes-list";

type Enrollment = { factorId: string; qrCode: string; secret: string };

export function EnrollForm({ enrollment }: { enrollment: Enrollment | null }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<EnrollState, FormData>(confirmTotp, {});

  if (state.recoveryCodes) {
    return (
      <div className="grid gap-4">
        <h2 className="text-lg font-semibold">Guarda tus códigos de recuperación</h2>
        <p className="text-sm text-muted-foreground">
          Cada código sirve una sola vez si pierdes tu app autenticadora. Guárdalos fuera del teléfono: no se
          volverán a mostrar.
        </p>
        <RecoveryCodesList codes={state.recoveryCodes} />
        <Button type="button" onClick={() => router.push("/")}>
          Ya los guardé
        </Button>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <p className="text-sm">
        Tu segundo factor ya está activo. <Link href="/" className="underline">Ir al inicio</Link>
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Escanea el código con tu app autenticadora o escribe la clave a mano. Después introduce el código de 6 dígitos
        que muestre.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- data: URI from Supabase, allowed by img-src data: */}
      <img src={enrollment.qrCode} alt="Código QR para la app autenticadora" width={180} height={180} className="mx-auto" />
      <p className="text-center text-sm">
        Clave: <code data-testid="totp-secret" className="font-mono break-all">{enrollment.secret}</code>
      </p>
      <input type="hidden" name="factorId" value={enrollment.factorId} />
      <div className="grid gap-2">
        <Label htmlFor="code">Código de 6 dígitos</Label>
        <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required />
      </div>
      <FormError message={state.error} />
      <Button type="submit" disabled={pending}>
        Verificar y activar
      </Button>
    </form>
  );
}

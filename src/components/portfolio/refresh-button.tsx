"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { refreshPortfolio, type RefreshState } from "@/lib/portfolio/actions";

export function RefreshButton() {
  const [state, action, pending] = useActionState<RefreshState, FormData>(refreshPortfolio, {});
  return (
    <form action={action} className="flex items-center gap-3">
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Leyendo…" : "Actualizar"}
      </Button>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

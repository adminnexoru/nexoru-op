"use client";

import { Button } from "@/components/ui/button";
import { formatRecoveryCode } from "@/lib/auth/recovery-code";

/** Shows freshly generated recovery codes once, with copy and download (FR-003). */
export function RecoveryCodesList({ codes }: { codes: string[] }) {
  const text = codes.map(formatRecoveryCode).join("\n");

  const download = () => {
    const url = URL.createObjectURL(new Blob([`Códigos de recuperación de Nexoru Op\n\n${text}\n`], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "nexoru-op-codigos-de-recuperacion.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-3">
      <ul data-testid="recovery-codes" className="grid grid-cols-2 gap-2 rounded-md border bg-muted/40 p-3 font-mono text-sm">
        {codes.map((code) => (
          <li key={code}>{formatRecoveryCode(code)}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(text)}>
          Copiar
        </Button>
        <Button type="button" variant="outline" onClick={download}>
          Descargar .txt
        </Button>
      </div>
    </div>
  );
}

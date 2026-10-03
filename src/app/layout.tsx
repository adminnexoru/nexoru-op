import type { Metadata } from "next";
import { connection } from "next/server";
// Inter bundled locally (OFL-1.1): served from this server, no external requests (strict CSP).
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexoru Op",
  description: "Dashboard local, de solo lectura, del portafolio de Nexoru.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Every page renders per request so Next.js can apply the CSP nonce from src/proxy.ts (research R12).
  await connection();
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

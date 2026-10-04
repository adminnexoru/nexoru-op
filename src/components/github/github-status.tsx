import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { agoText, count } from "@/lib/format";
import type { PortfolioReading } from "@/lib/portfolio/types";

// T024: age of the GitHub data, rate limit and token of the portfolio (contracts/github-ui.md).
// Never the token value: only whether there is one and when it expires.

const DAY_MS = 86_400_000;
const EXPIRY_WARNING_DAYS = 14;
const time = new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });

export function GithubStatus({ portfolio, now }: { portfolio: PortfolioReading; now: Date }) {
  const status = portfolio.githubStatus;
  if (!status.fetchedAt) {
    return (
      <p data-testid="github-status" className="text-sm text-muted-foreground">
        Sin datos de GitHub: pulsa Actualizar
      </p>
    );
  }
  const parts = [`Datos de GitHub de ${agoText(status.fetchedAt, now)}`];
  if (status.rateLimit) {
    parts.push(`Consultas a GitHub: ${status.rateLimit.remaining} restantes, se restablece a las ${time.format(new Date(status.rateLimit.resetAt))}`);
  }
  if (!status.tokenPresent) parts.push("Sin token: solo repos públicos, 60 consultas por hora");
  else if (status.tokenExpiresAt) parts.push(`Token de GitHub: vence el ${status.tokenExpiresAt.slice(0, 10)}`);
  else parts.push("Token de GitHub: sin fecha de vencimiento informada");
  return (
    <p data-testid="github-status" className="text-sm text-muted-foreground">
      {parts.join(" · ")}
    </p>
  );
}

export function GithubAlerts({ portfolio, now }: { portfolio: PortfolioReading; now: Date }) {
  const status = portfolio.githubStatus;
  const expiresAt = status.tokenPresent ? status.tokenExpiresAt : null;
  const daysLeft = expiresAt ? Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / DAY_MS) : null;
  const invalidToken = portfolio.projects.some((p) => p.github.repoInfo.reason === "el token de GitHub no es válido");
  // US4: only how many repos have open alerts; never anything of the alerts themselves.
  const withAlerts = portfolio.projects.filter((p) => (p.github.secretAlerts.value ?? 0) > 0).length;
  return (
    <>
      {expiresAt && daysLeft !== null && daysLeft <= EXPIRY_WARNING_DAYS ? (
        <Alert data-testid="github-token-expiry">
          <AlertTitle>El token de GitHub está por vencer</AlertTitle>
          <AlertDescription className="max-w-prose">
            El token de GitHub vence el {expiresAt.slice(0, 10)} ({daysLeft <= 0 ? "ya venció" : `en ${count(daysLeft, "día", "días")}`}).
            Crea uno nuevo con los mismos permisos y reemplázalo en .env.op.local.
          </AlertDescription>
        </Alert>
      ) : null}
      {invalidToken ? (
        <Alert data-testid="github-token-invalid">
          <AlertTitle>El token de GitHub no es válido</AlertTitle>
          <AlertDescription className="max-w-prose">GitHub lo rechazó: revisa que no haya vencido ni se haya revocado.</AlertDescription>
        </Alert>
      ) : null}
      {withAlerts > 0 ? (
        <Alert data-testid="secret-alerts-banner">
          <AlertTitle>Alertas de secretos abiertas</AlertTitle>
          <AlertDescription className="max-w-prose">
            {withAlerts === 1 ? "1 repo tiene alertas de secretos abiertas" : `${withAlerts} repos tienen alertas de secretos abiertas`} (secret
            scanning de GitHub). Revísalas en la pestaña Security de cada repo y rota los secretos expuestos.
          </AlertDescription>
        </Alert>
      ) : null}
      {status.stoppedReason?.startsWith("límite") ? (
        <Alert data-testid="github-rate-limit">
          <AlertTitle>La consulta a GitHub se detuvo</AlertTitle>
          <AlertDescription className="max-w-prose">{status.stoppedReason}. Se muestran los datos guardados con su fecha.</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}

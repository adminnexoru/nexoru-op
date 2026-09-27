import { roleLabel, type Role } from "@/lib/permissions";

// Transactional emails in Spanish (contracts/audit-and-emails.md, FR-031, FR-031a).
// Notices never carry access links; nothing here ever receives a password or a code.

export type EmailTemplate =
  | { name: "invitation"; link: string; role: Role; expiresAt: Date }
  | { name: "forced_password_reset"; link: string }
  | { name: "notice_password_changed"; at: Date; via: "self" | "recovery" | "forced" }
  | { name: "notice_mfa_enrolled"; at: Date }
  | { name: "notice_mfa_reset"; at: Date; by: string }
  | { name: "notice_recovery_code_used"; at: Date; remaining: number }
  | { name: "notice_role_changed"; at: Date; from: Role; to: Role; by: string }
  | { name: "notice_account_locked"; at: Date }
  | { name: "notice_deactivated"; at: Date; by: string }
  | { name: "notice_reactivated"; at: Date; by: string };

export type RenderedEmail = { subject: string; text: string; html: string };

type Content = {
  subject: string;
  paragraphs: string[];
  action?: { label: string; link: string };
  notice: boolean;
};

const CONTACT = "Si no fuiste tú, contacta de inmediato a admin@nexoru.ai.";

const dateFormat = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Mexico_City",
});

const when = (date: Date) => `${dateFormat.format(date)} (hora del centro de México)`;

function content(template: EmailTemplate): Content {
  switch (template.name) {
    case "invitation":
      return {
        subject: "Te invitaron a Nexoru Op",
        paragraphs: [
          `Te invitaron a Nexoru Op con el rol ${roleLabel(template.role)}.`,
          "Para activar tu cuenta, abre el enlace, define tu contraseña y registra una app autenticadora (segundo factor obligatorio).",
          `La invitación caduca el ${when(template.expiresAt)} y solo se puede usar una vez.`,
        ],
        action: { label: "Activar mi cuenta", link: template.link },
        notice: false,
      };
    case "forced_password_reset":
      return {
        subject: "Tu administrador pidió que cambies tu contraseña",
        paragraphs: [
          "Un administrador de Nexoru Op pidió que definas una contraseña nueva. Tus sesiones abiertas se cerraron.",
          "El enlace caduca en 1 hora. Después, al iniciar sesión, se te seguirá pidiendo tu código de la app autenticadora.",
        ],
        action: { label: "Definir contraseña nueva", link: template.link },
        notice: false,
      };
    case "notice_password_changed": {
      const how = { self: "desde tu cuenta", recovery: "con un enlace de recuperación", forced: "tras un reinicio pedido por un administrador" }[template.via];
      return {
        subject: "Tu contraseña de Nexoru Op cambió",
        paragraphs: [`La contraseña de tu cuenta cambió ${how} el ${when(template.at)}.`],
        notice: true,
      };
    }
    case "notice_mfa_enrolled":
      return {
        subject: "Registraste una app autenticadora en Nexoru Op",
        paragraphs: [`Se registró una app autenticadora en tu cuenta el ${when(template.at)}.`],
        notice: true,
      };
    case "notice_mfa_reset":
      return {
        subject: "Se reinició tu segundo factor en Nexoru Op",
        paragraphs: [
          `${template.by} reinició tu segundo factor el ${when(template.at)}. Tus sesiones se cerraron.`,
          "En tu próximo inicio de sesión tendrás que registrar una app autenticadora nueva.",
        ],
        notice: true,
      };
    case "notice_recovery_code_used":
      return {
        subject: "Se usó un código de recuperación en tu cuenta de Nexoru Op",
        paragraphs: [
          `Se usó uno de tus códigos de recuperación el ${when(template.at)}. Te quedan ${template.remaining}.`,
          "Tu app autenticadora anterior dejó de funcionar y se pidió registrar una nueva.",
        ],
        notice: true,
      };
    case "notice_role_changed":
      return {
        subject: "Tu rol en Nexoru Op cambió",
        paragraphs: [
          `${template.by} cambió tu rol de ${roleLabel(template.from)} a ${roleLabel(template.to)} el ${when(template.at)}.`,
        ],
        notice: true,
      };
    case "notice_account_locked":
      return {
        subject: "Bloqueamos intentos de acceso a tu cuenta de Nexoru Op",
        paragraphs: [
          `El ${when(template.at)} hubo 5 intentos fallidos seguidos de iniciar sesión con tu cuenta desde una misma dirección. Bloqueamos esos intentos durante 15 minutos.`,
          "Desde tus dispositivos habituales puedes seguir entrando con normalidad.",
        ],
        notice: true,
      };
    case "notice_deactivated":
      return {
        subject: "Tu cuenta de Nexoru Op fue dada de baja",
        paragraphs: [`${template.by} dio de baja tu cuenta el ${when(template.at)}. Ya no puedes iniciar sesión.`],
        notice: true,
      };
    case "notice_reactivated":
      return {
        subject: "Tu cuenta de Nexoru Op fue reactivada",
        paragraphs: [
          `${template.by} reactivó tu cuenta el ${when(template.at)}. Puedes entrar con tu contraseña y tu app autenticadora de siempre.`,
        ],
        notice: true,
      };
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderEmail(template: EmailTemplate): RenderedEmail {
  const { subject, paragraphs, action, notice } = content(template);
  const closing = notice ? [CONTACT] : [];

  const text = [
    ...paragraphs,
    ...(action ? [`${action.label}: ${action.link}`] : []),
    ...closing,
    "— Nexoru Op",
  ].join("\n\n");

  const body = [
    ...paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`),
    ...(action
      ? [`<p><a href="${escapeHtml(action.link)}" style="display:inline-block;padding:10px 16px;background:#1a1a1a;color:#ffffff;border-radius:6px;text-decoration:none">${escapeHtml(action.label)}</a></p>`]
      : []),
    ...closing.map((p) => `<p><strong>${escapeHtml(p)}</strong></p>`),
  ].join("\n");

  const html = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="font-family:system-ui,sans-serif;color:#1a1a1a;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
<h1 style="font-size:18px">${escapeHtml(subject)}</h1>
${body}
<p style="color:#6b6b6b;font-size:13px">— Nexoru Op</p>
</body>
</html>`;

  return { subject, text, html };
}

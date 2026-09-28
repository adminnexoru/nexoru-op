// T020: email templates (contracts/audit-and-emails.md, FR-031, FR-031a).
import { describe, expect, it } from "vitest";
import { renderEmail, type EmailTemplate } from "@/lib/email/templates";

const at = new Date("2026-09-27T15:04:00Z");
const link = "https://op.example.test/invite/abc";

const templates: EmailTemplate[] = [
  { name: "invitation", link, role: "reader", expiresAt: at },
  { name: "forced_password_reset", link: "https://op.example.test/auth/confirm?x=1" },
  { name: "notice_password_changed", at, via: "self" },
  { name: "notice_mfa_enrolled", at },
  { name: "notice_mfa_reset", at, by: "Admin de prueba" },
  { name: "notice_recovery_code_used", at },
  { name: "notice_role_changed", at, from: "reader", to: "collaborator", by: "Dueño de prueba" },
  { name: "notice_account_locked", at },
  { name: "notice_deactivated", at, by: "Dueño de prueba" },
  { name: "notice_reactivated", at, by: "Dueño de prueba" },
];

describe("email templates", () => {
  for (const template of templates) {
    describe(template.name, () => {
      const email = renderEmail(template);

      it("has a Spanish subject, text and html", () => {
        expect(email.subject.length).toBeGreaterThan(5);
        expect(email.text.length).toBeGreaterThan(20);
        expect(email.html).toContain('lang="es"');
        expect(email.text).toMatch(/Nexoru Op/);
      });

      it("never contains long digit runs that could be codes", () => {
        expect(email.text).not.toMatch(/\d{6,}/);
        expect(email.html).not.toMatch(/\d{6,}/);
      });

      if (template.name.startsWith("notice_")) {
        it("has no access links and tells the user who to contact", () => {
          expect(email.text).not.toMatch(/https?:\/\//);
          expect(email.html).not.toMatch(/https?:\/\//);
          expect(email.text).toContain("Si no fuiste tú");
          expect(email.text).toContain("admin@nexoru.ai");
        });
      }
    });
  }

  it("includes the link in the invitation and the forced reset", () => {
    expect(renderEmail(templates[0]).text).toContain(link);
    expect(renderEmail(templates[1]).html).toContain("https://op.example.test/auth/confirm?x=1");
  });

  it("the recovery code notice says the codes were replaced, without a remaining count", () => {
    const email = renderEmail({ name: "notice_recovery_code_used", at });
    expect(email.text).toContain("reemplazados por un juego nuevo");
    expect(email.text).not.toMatch(/Te quedan/i);
  });

  it("escapes HTML in interpolated values", () => {
    const email = renderEmail({ name: "notice_deactivated", at, by: "<script>alert(1)</script>" });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
});
